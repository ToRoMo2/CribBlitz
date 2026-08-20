import type { Carte } from '../core/carte.js'
import type { TypeCombinaison } from '../core/compte.js'
import type { Evenement } from '../core/evenements.js'
import { REGLES_SCANSION, type NomVoix, type ReglesScansion } from '../presets/scansion.js'
import { VOIES } from '../presets/voies.js'

/**
 * La partition : le flux d'evenements du coeur traduit en coups horodates.
 *
 * C'est le meme geste que `src/sim/format.ts`, qui rejoue ce flux en texte — mais vers le
 * temps au lieu du papier. Fonction pure : aucune horloge, aucun DOM, aucun Web Audio.
 * Toute la logique du feel est donc testable sous Node, comme le reste du projet.
 *
 * Le Mult n'arrive qu'apres les combinaisons dans le flux. Ce n'est pas un probleme : on
 * recoit le tableau entier et on planifie en deux passes, donc on connait le Mult final
 * avant de placer le premier coup. Le coeur n'a rien a changer.
 */

/** L'etat du comptage scande a l'instant d'un coup : ce que la scene affiche et surligne. */
export interface CoupScande {
  /** « quinze quatre », « paire dix » — le rituel du carnet §2.3. */
  readonly libelle: string
  readonly total: number
  readonly voie: TypeCombinaison
  readonly cartes: readonly Carte[]
  readonly rangDansLeCompte: number
  readonly tailleDuCompte: number
  /** Le premier coup d'une Voie prend l'accent : c'est la respiration entre deux phrases. */
  readonly premierDeSaVoie: boolean
}

export interface Coup {
  /** Millisecondes depuis le debut de la partition. */
  readonly instant: number
  readonly evenement: Evenement
  readonly voix: NomVoix | null
  /** Transposition en demi-tons au-dessus de la frequence de la voix. */
  readonly demiTons: number
  readonly intensite: number
  readonly scande: CoupScande | null
}

export interface Partition {
  readonly coups: readonly Coup[]
  readonly duree: number
}

export function planifier(
  evenements: readonly Evenement[],
  regles: ReglesScansion = REGLES_SCANSION,
): Partition {
  const tempos = decouperLesComptes(evenements, regles)
  const coups: Coup[] = []
  let instant = 0
  let total = 0
  let voiePrecedente: TypeCombinaison | null = null

  for (let index = 0; index < evenements.length; index++) {
    const evenement = evenements[index]
    if (evenement === undefined) continue

    if (evenement.type !== 'COMBINAISON_TROUVEE') {
      coups.push({
        instant,
        evenement,
        voix: regles.voix[evenement.type],
        demiTons: 0,
        intensite: 1,
        scande: null,
      })
      instant += regles.delais[evenement.type]
      // MULT_APPLIQUE ferme un Compte : le total et la montee repartent de zero au suivant.
      if (evenement.type === 'MULT_APPLIQUE') {
        total = 0
        voiePrecedente = null
      }
      continue
    }

    const tempo = tempos.get(index)
    if (tempo === undefined) throw new Error(`Combinaison hors de tout Compte (index ${index})`)

    const voie = evenement.combinaison.type
    const premierDeSaVoie = voie !== voiePrecedente
    voiePrecedente = voie
    total += evenement.points

    coups.push({
      instant,
      evenement,
      voix: regles.voix.COMBINAISON_TROUVEE,
      demiTons: (tempo.rang * regles.demiTonParCombinaison) % regles.fenetreDemiTons,
      intensite: intensite(tempo.rang, tempo.taille, premierDeSaVoie, regles),
      scande: {
        libelle: libelle(voie, total),
        total,
        voie,
        cartes: evenement.combinaison.cartes,
        rangDansLeCompte: tempo.rang,
        tailleDuCompte: tempo.taille,
        premierDeSaVoie,
      },
    })

    const dernier = tempo.rang === tempo.taille - 1
    instant += tempo.intervalle + (dernier ? regles.respirationAvantMult : 0)
  }

  return { coups, duree: instant }
}

/**
 * L'intervalle entre deux combinaisons d'un meme Compte.
 *
 * Le tempo vient d'un budget, pas d'une constante : `budget / N`, borne. Une main ordinaire
 * (3 combinaisons mesurees) tient le plafond et claque ; une Boite a 274 combinaisons tombe
 * au plancher et devient un roulement. C'est le son du moment « j'ai casse le jeu ».
 *
 * Le tempo accelere ensuite pendant le Compte (carnet §2.3), et la pente vient du Mult
 * final. La progression est geometrique, puis renormalisee sur la moyenne arithmetique de
 * ses facteurs : accelerer redistribue le temps sans en ajouter. Sans cette renormalisation
 * un gros Mult allongerait le Compte de 3 %, et le budget ne serait plus un budget.
 */
export function intervalles(
  nombre: number,
  mult: number,
  regles: ReglesScansion = REGLES_SCANSION,
): number[] {
  if (nombre <= 0) return []
  const moyen = borner(regles.budgetCompte / nombre, regles.intervalleMin, regles.intervalleMax)
  if (nombre === 1) return [moyen]

  const ratio = ratioDuMult(mult, regles)
  const facteurs = Array.from({ length: nombre }, (_, rang) =>
    Math.pow(ratio, rang / (nombre - 1)),
  )
  const moyenne = facteurs.reduce((somme, facteur) => somme + facteur, 0) / nombre
  return facteurs.map((facteur) => Math.max(regles.intervalleMin, (moyen * facteur) / moyenne))
}

/** Rapport entre le dernier intervalle et le premier : 1 = tempo plat, 0,45 = ca s'emballe. */
export function ratioDuMult(mult: number, regles: ReglesScansion = REGLES_SCANSION): number {
  const etendue = regles.multSature - regles.multDeBase
  const avancement = etendue <= 0 ? 1 : borner((mult - regles.multDeBase) / etendue, 0, 1)
  return regles.ratioAuMultDeBase + avancement * (regles.ratioAuMultSature - regles.ratioAuMultDeBase)
}

interface Tempo {
  readonly rang: number
  readonly taille: number
  readonly intervalle: number
}

/**
 * Un Compte est une suite de COMBINAISON_TROUVEE fermee par MULT_APPLIQUE — y compris
 * quand elle est vide, ce qu'une main a zero point produit. On segmente sur cet evenement
 * de fermeture plutot que sur le changement d'origine : c'est le seul repere garanti.
 */
function decouperLesComptes(
  evenements: readonly Evenement[],
  regles: ReglesScansion,
): Map<number, Tempo> {
  const tempos = new Map<number, Tempo>()
  let enCours: number[] = []

  for (let index = 0; index < evenements.length; index++) {
    const evenement = evenements[index]
    if (evenement === undefined) continue
    if (evenement.type === 'COMBINAISON_TROUVEE') {
      enCours.push(index)
      continue
    }
    if (evenement.type !== 'MULT_APPLIQUE') continue

    const durees = intervalles(enCours.length, evenement.mult, regles)
    enCours.forEach((indexCombinaison, rang) => {
      tempos.set(indexCombinaison, {
        rang,
        taille: enCours.length,
        intervalle: durees[rang] ?? regles.intervalleMax,
      })
    })
    enCours = []
  }

  return tempos
}

function intensite(
  rang: number,
  taille: number,
  premierDeSaVoie: boolean,
  regles: ReglesScansion,
): number {
  const avancement = taille <= 1 ? 0 : rang / (taille - 1)
  const accent = premierDeSaVoie ? regles.accentDeVoie : 1
  return (1 + regles.crescendo * avancement) * accent
}

/** « quinze deux, quinze quatre, quinze six, et la paire fait dix » (carnet §2.3). */
function libelle(voie: TypeCombinaison, total: number): string {
  const nom = voie === 'QUINZAINE' ? 'quinze' : VOIES[voie].nom.toLowerCase()
  return `${nom} ${total}`
}

function borner(valeur: number, plancher: number, plafond: number): number {
  return Math.min(plafond, Math.max(plancher, valeur))
}
