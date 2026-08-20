import { VOIX, type Voix } from '../presets/scansion.js'
import type { Coup, Partition } from './partition.js'

/**
 * Le lecteur : il joue une Partition et sert d'horloge a tout le reste.
 *
 * **L'audio est le maitre du temps, le visuel le suit.** `setTimeout` derive de 10 a 30 ms,
 * et sur une scansion ca s'entend immediatement. On programme donc tous les coups sur
 * `AudioContext.currentTime`, qui est cadence a l'echantillon, et la scene se contente de
 * lire cette horloge a chaque image.
 *
 * Tous les timbres sont synthetises a la volee : aucun echantillon, donc aucune direction
 * artistique a choisir — ce que l'etape 3 interdit explicitement.
 */

/** Avance laissee au navigateur avant le premier coup, pour ne pas le rater. */
const AMORCE = 0.06
const DUREE_BRUIT = 0.4
const PLANCHER_GAIN = 0.0001
/** Le filet du minuteur quand l'onglet est cache et que `requestAnimationFrame` se tait. */
const SECOURS = 120

export type SurCoup = (coup: Coup) => void

export class Lecteur {
  private contexte: AudioContext | null = null
  private bus: AudioNode | null = null
  private bruitBlanc: AudioBuffer | null = null
  /** Incremente a chaque interruption : les boucles d'une lecture perimee s'arretent seules. */
  private generation = 0

  /**
   * A appeler depuis un geste utilisateur : les navigateurs refusent de demarrer l'audio
   * autrement. Idempotent.
   */
  reveiller(): void {
    if (this.contexte !== null) {
      void this.contexte.resume()
      return
    }
    const contexte = new AudioContext()
    // Une Boite qui roule empile jusqu'a six coups par extinction. Sans compression, ca
    // sature ; avec, le roulement reste un roulement.
    const compresseur = contexte.createDynamicsCompressor()
    compresseur.threshold.value = -18
    compresseur.ratio.value = 12
    compresseur.attack.value = 0.003
    compresseur.release.value = 0.12

    const maitre = contexte.createGain()
    maitre.gain.value = 0.9
    compresseur.connect(maitre).connect(contexte.destination)

    this.contexte = contexte
    this.bus = compresseur
    this.bruitBlanc = creerBruitBlanc(contexte)
  }

  get pret(): boolean {
    return this.contexte !== null
  }

  /**
   * Joue la partition et rend la main quand elle est finie. `surCoup` est appele au moment
   * exact de chaque coup, cale sur l'horloge audio.
   *
   * Toute la partition est programmee d'un coup plutot que par fenetres glissantes : elle
   * dure quelques secondes et compte quelques centaines de coups, ce qui ne justifie pas
   * un ordonnanceur a lookahead.
   */
  async jouer(partition: Partition, surCoup: SurCoup = () => {}): Promise<void> {
    this.reveiller()
    const contexte = this.contexte
    if (contexte === null) throw new Error('Contexte audio indisponible')

    this.generation += 1
    const generation = this.generation
    const depart = contexte.currentTime + AMORCE

    for (const coup of partition.coups) {
      if (coup.voix === null) continue
      this.frapper(VOIX[coup.voix], coup.demiTons, coup.intensite, depart + coup.instant / 1000)
    }

    return this.suivre(partition, depart, generation, surCoup)
  }

  /** Coupe la lecture en cours. Les coups deja programmes s'eteignent, les rappels cessent. */
  interrompre(): void {
    this.generation += 1
  }

  /**
   * La boucle visuelle. Elle ne compte pas le temps : elle lit celui de l'audio, image par
   * image, et declenche les coups franchis depuis la derniere.
   *
   * Un minuteur double le `requestAnimationFrame` : un onglet cache n'a plus d'images, alors
   * que les coups deja programmes continuent de sonner. Sans ce filet, changer d'onglet
   * pendant un Compte gelerait la scene et la lecture ne rendrait jamais la main.
   */
  private suivre(
    partition: Partition,
    depart: number,
    generation: number,
    surCoup: SurCoup,
  ): Promise<void> {
    const contexte = this.contexte
    if (contexte === null) return Promise.resolve()

    return new Promise((terminer) => {
      let prochain = 0
      const image = (): void => {
        if (generation !== this.generation) return terminer()

        const ecoule = (contexte.currentTime - depart) * 1000
        while (prochain < partition.coups.length) {
          const coup = partition.coups[prochain]
          if (coup === undefined || coup.instant > ecoule) break
          surCoup(coup)
          prochain += 1
        }

        if (prochain >= partition.coups.length && ecoule >= partition.duree) return terminer()
        prochaineImage()
      }

      const prochaineImage = (): void => {
        let deja = false
        const une = (): void => {
          if (deja) return
          deja = true
          image()
        }
        requestAnimationFrame(une)
        setTimeout(une, SECOURS)
      }

      prochaineImage()
    })
  }

  /**
   * Un coup percussif : une hauteur qui chute (le « toc »), une enveloppe raide, et une
   * pointe de bruit filtre pour le transitoire.
   */
  private frapper(voix: Voix, demiTons: number, intensite: number, instant: number): void {
    const contexte = this.contexte
    const bus = this.bus
    if (contexte === null || bus === null) return

    const frequence = voix.frequence * Math.pow(2, demiTons / 12)
    const attaque = voix.attaque / 1000
    const extinction = voix.extinction / 1000
    const sommet = Math.max(PLANCHER_GAIN * 2, voix.gain * intensite)
    const fin = instant + attaque + extinction

    const enveloppe = contexte.createGain()
    enveloppe.gain.setValueAtTime(PLANCHER_GAIN, instant)
    enveloppe.gain.exponentialRampToValueAtTime(sommet, instant + attaque)
    enveloppe.gain.exponentialRampToValueAtTime(PLANCHER_GAIN, fin)
    enveloppe.connect(bus)

    const oscillateur = contexte.createOscillator()
    oscillateur.type = voix.forme
    oscillateur.frequency.setValueAtTime(frequence, instant)
    oscillateur.frequency.exponentialRampToValueAtTime(frequence * 0.72, fin)
    oscillateur.connect(enveloppe)
    oscillateur.start(instant)
    oscillateur.stop(fin + 0.02)

    if (voix.bruit > 0) this.souffler(voix, sommet, instant, frequence)
  }

  /** Le transitoire bruite : court, filtre haut, cale sur la hauteur du coup. */
  private souffler(voix: Voix, sommet: number, instant: number, frequence: number): void {
    const contexte = this.contexte
    const bus = this.bus
    const bruitBlanc = this.bruitBlanc
    if (contexte === null || bus === null || bruitBlanc === null) return

    const duree = Math.min(DUREE_BRUIT, (voix.attaque + voix.extinction) / 1000) * 0.45
    const fin = instant + duree

    const enveloppe = contexte.createGain()
    enveloppe.gain.setValueAtTime(Math.max(PLANCHER_GAIN * 2, sommet * voix.bruit), instant)
    enveloppe.gain.exponentialRampToValueAtTime(PLANCHER_GAIN, fin)
    enveloppe.connect(bus)

    const filtre = contexte.createBiquadFilter()
    filtre.type = 'bandpass'
    filtre.frequency.value = Math.min(12000, frequence * 4)
    filtre.Q.value = 0.8
    filtre.connect(enveloppe)

    const source = contexte.createBufferSource()
    source.buffer = bruitBlanc
    source.connect(filtre)
    source.start(instant)
    source.stop(fin + 0.01)
  }
}

function creerBruitBlanc(contexte: AudioContext): AudioBuffer {
  const echantillons = Math.floor(contexte.sampleRate * DUREE_BRUIT)
  const tampon = contexte.createBuffer(1, echantillons, contexte.sampleRate)
  const donnees = tampon.getChannelData(0)
  for (let i = 0; i < echantillons; i++) donnees[i] = Math.random() * 2 - 1
  return tampon
}
