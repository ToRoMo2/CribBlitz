import { formatCarte, type Carte } from '../core/carte.js'
import type { EtatPartie } from '../core/etat.js'
import { indicesPosables } from '../core/pose.js'
import { coutDuTrou } from '../core/trous.js'
import type { Coup } from './partition.js'

/**
 * La scene : le seul fichier qui touche au DOM du jeu.
 *
 * Elle fait deux choses distinctes. `rendre` resynchronise tout depuis l'etat, entre deux
 * actions. `appliquer` rejoue un coup, pendant la lecture, par retouches ciblees — sans
 * jamais reconstruire, sinon les surlignages et les animations sauteraient a chaque image.
 */

const ROUGES = new Set(['♥', '♦'])
const LARGEUR_PISTE = 48

interface Zones {
  readonly plateau: HTMLElement
  readonly donne: HTMLElement
  readonly boite: HTMLElement
  readonly retourne: HTMLElement
  readonly pose: HTMLElement
  readonly posee: HTMLElement
  readonly main: HTMLElement
  readonly consigne: HTMLElement
  readonly actions: HTMLElement
  readonly bonus: HTMLElement
}

export interface EcouteursScene {
  readonly surCarte: (index: number) => void
  readonly surEncaisser: () => void
}

export class Scene {
  private readonly zones: Zones
  private selection: number[] = []

  constructor(private readonly ecouteurs: EcouteursScene) {
    this.zones = {
      plateau: exiger('plateau'),
      donne: exiger('donne'),
      boite: exiger('boite'),
      retourne: exiger('retourne'),
      pose: exiger('pose'),
      posee: exiger('posee'),
      main: exiger('main'),
      consigne: exiger('consigne'),
      actions: exiger('actions'),
      bonus: exiger('bonus'),
    }
    exiger('encaisser').addEventListener('click', () => this.ecouteurs.surEncaisser())
  }

  /** La selection de defausse vit dans la scene : elle n'existe pas pour le coeur. */
  basculerSelection(index: number, attendu: number): number[] {
    this.selection = this.selection.includes(index)
      ? this.selection.filter((autre) => autre !== index)
      : [...this.selection, index].slice(-attendu)
    for (const carte of this.zones.main.children) {
      carte.classList.toggle('choisie', this.selection.includes(Number(carte.getAttribute('data-index'))))
    }
    return this.selection
  }

  viderSelection(): void {
    this.selection = []
  }

  /** Poser cette carte ferait depasser le seuil. Consultatif : poser reste libre (carnet §1.3). */
  exploserait(state: EtatPartie, index: number): boolean {
    const pose = state.donne.pose
    if (pose === null) return false
    return !indicesPosables(pose, state.config.pose).includes(index)
  }

  /** Le premier clic sur une carte explosive arme, le second pose. */
  armer(index: number): void {
    for (const carte of this.zones.main.children) {
      carte.classList.toggle('armee', Number(carte.getAttribute('data-index')) === index)
    }
    remplacer(this.zones.consigne, texte('Cette carte fait exploser la Pose. Encore un clic pour la poser.'))
  }

  rendre(state: EtatPartie): void {
    this.dessinerLePlateau(state)
    this.afficherLesBonus(state)
    remplacer(this.zones.donne, texte(`Donne ${state.donne.numero} / ${state.config.manche.nombreDeDonnes}`))
    remplacer(this.zones.boite, ...state.boite.map((carte) => this.carte(carte)))

    const retourne = state.donne.retourne
    remplacer(this.zones.retourne, ...(retourne === null ? [dos()] : [this.carte(retourne)]))

    const pose = state.donne.pose
    remplacer(this.zones.posee, ...(pose?.posees ?? []).map((carte) => this.carte(carte)))
    remplacer(
      this.zones.pose,
      texte(pose === null ? '' : `total ${pose.total} / ${state.config.pose.seuil}   ·   ${pose.points} pts acquis`),
    )

    const enMain = pose === null ? state.donne.main : pose.enMain
    const posables = pose === null ? null : new Set(indicesPosables(pose, state.config.pose))
    remplacer(
      this.zones.main,
      ...enMain.map((carte, index) => {
        const element = this.carte(carte, index)
        element.classList.add('jouable')
        if (posables !== null && !posables.has(index)) element.classList.add('explosive')
        element.addEventListener('click', () => this.ecouteurs.surCarte(index))
        return element
      }),
    )

    this.zones.actions.classList.toggle('pose', state.phase === 'POSE')
    remplacer(this.zones.consigne, texte(consigne(state, this.selection.length)))
  }

  /**
   * Les bonus permanents, annonces avant qu'on compte quoi que ce soit. Le multiplicateur de
   * main ne figure pas dans la formule du carnet §2.1 ; l'afficher des le depart en fait une
   * regle connue du joueur au lieu d'un facteur surgi a la fin du Compte.
   */
  private afficherLesBonus(state: EtatPartie): void {
    const multiplicateur = state.config.multiplicateurMain
    remplacer(
      this.zones.bonus,
      ...(multiplicateur === 1 ? [] : [texte(`bonus permanent · les mains comptent × ${multiplicateur}`)]),
    )
  }

  /**
   * Un coup pendant la lecture. Seuls les evenements qui deplacent une carte ou surlignent
   * quelque chose ont un effet ici : le reste est l'affaire du compteur.
   */
  appliquer(coup: Coup): void {
    const evenement = coup.evenement

    if (coup.scande !== null) {
      this.surligner(coup.scande.cartes)
      return
    }
    if (evenement.type === 'RETOURNE_REVELEE') {
      remplacer(this.zones.retourne, this.carte(evenement.carte))
      this.zones.retourne.classList.add('revelee')
      return
    }
    if (evenement.type === 'CARTES_DEFAUSSEES') {
      for (const carte of evenement.cartes) this.zones.boite.append(this.carte(carte, undefined, 'entrante'))
      return
    }
    if (evenement.type === 'POSE_CARTE') {
      this.retirerDeLaMain(evenement.carte)
      this.zones.posee.append(this.carte(evenement.carte, undefined, 'entrante'))
      remplacer(this.zones.pose, texte(`total ${evenement.total}`))
      return
    }
    if (evenement.type === 'POSE_EXPLOSE') {
      this.zones.posee.classList.add('explosion')
      window.setTimeout(() => this.zones.posee.classList.remove('explosion'), 600)
    }
  }

  /** Le surlignage du carnet : « le jeu compte a votre place et surligne chaque combinaison ». */
  private surligner(cartes: readonly Carte[]): void {
    for (const marquee of document.querySelectorAll('.carte.comptee')) {
      marquee.classList.remove('comptee')
    }
    for (const carte of cartes) {
      for (const element of document.querySelectorAll(`[data-carte="${formatCarte(carte)}"]`)) {
        element.classList.remove('comptee')
        // Forcer un reflow relance l'animation quand la meme carte enchaine deux combinaisons.
        void (element as HTMLElement).offsetWidth
        element.classList.add('comptee')
      }
    }
  }

  private retirerDeLaMain(carte: Carte): void {
    const cible = this.zones.main.querySelector(`[data-carte="${formatCarte(carte)}"]`)
    cible?.remove()
  }

  private carte(carte: Carte, index?: number, classe?: string): HTMLElement {
    const element = document.createElement('div')
    element.className = `carte${ROUGES.has(carte.couleur) ? ' rouge' : ''}${classe ? ` ${classe}` : ''}`
    element.setAttribute('data-carte', formatCarte(carte))
    if (index !== undefined) element.setAttribute('data-index', String(index))
    const rang = document.createElement('span')
    rang.className = 'rang'
    rang.textContent = carte.rang
    const couleur = document.createElement('span')
    couleur.className = 'couleur'
    couleur.textContent = carte.couleur
    element.append(rang, couleur)
    return element
  }

  /** La piste de 121 trous, l'objet que le joueur lit en permanence (carnet §4.2). */
  private dessinerLePlateau(state: EtatPartie): void {
    const position = (trou: number): number =>
      Math.min(LARGEUR_PISTE - 1, Math.round((trou / state.config.manche.trouFinal) * (LARGEUR_PISTE - 1)))

    const piste = Array.from({ length: LARGEUR_PISTE }, () => '·')
    piste[position(state.cible)] = 'A'
    piste[position(state.trou)] = state.trou === state.cible ? 'X' : 'V'

    const cout = coutDuTrou(state.trou + 1, state.config.manche)
    remplacer(
      this.zones.plateau,
      texte(`vous ▸ Trou ${state.trou}     adversaire ▸ Trou ${state.cible}     report ${state.reste} / ${cout} pts`),
      texte(`[${piste.join('')}]`, 'piste'),
    )
  }
}

function consigne(state: EtatPartie, choisies: number): string {
  if (state.phase === 'MANCHE_TERMINEE') {
    return state.gagnee === true
      ? `Manche gagnée — Trou ${state.trou} contre ${state.cible}.`
      : `Manche perdue — Trou ${state.trou} contre ${state.cible}.`
  }
  if (state.phase === 'DEFAUSSE') {
    const attendu = state.config.manche.defaussesParDonne
    return `Choisissez ${attendu} cartes pour la Boîte  (${choisies}/${attendu})`
  }
  return 'Posez une carte, ou encaissez.'
}

function exiger(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (element === null) throw new Error(`Element introuvable : ${id}`)
  return element
}

function texte(contenu: string, classe?: string): HTMLElement {
  const element = document.createElement('div')
  if (classe !== undefined) element.className = classe
  element.textContent = contenu
  return element
}

function dos(): HTMLElement {
  const element = document.createElement('div')
  element.className = 'carte dos'
  element.textContent = '?'
  return element
}

function remplacer(zone: HTMLElement, ...enfants: readonly Node[]): void {
  zone.replaceChildren(...enfants)
}
