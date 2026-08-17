import type { Combinaison, TypeCombinaison } from './compte.js'
import {
  MULT_DE_BASE,
  NIVEAUX_INITIAUX,
  ORDRE_VOIES,
  VOIES,
  type NiveauxVoies,
  type Voie,
} from '../presets/voies.js'

export interface OccurrenceScoree {
  readonly combinaison: Combinaison
  /** Points de la combinaison une fois le niveau de sa Voie applique. */
  readonly points: number
}

export interface ScoreCompte {
  readonly points: number
  readonly mult: number
  readonly score: number
  readonly voiesDeclenchees: readonly TypeCombinaison[]
  readonly occurrences: readonly OccurrenceScoree[]
}

/**
 * SCORE = POINTS x MULT (carnet §2.1).
 *
 * POINTS additionne chaque occurrence ; MULT n'additionne chaque Voie qu'une fois. C'est
 * cette asymetrie qui cree les deux philosophies de build opposees, et elle est le seul
 * endroit du moteur ou elle est ecrite.
 *
 * Cette fonction ignore la Donne, la Manche et la Pose : elle ne voit que des combinaisons.
 */
export function calculerScore(
  combinaisons: readonly Combinaison[],
  niveaux: NiveauxVoies = NIVEAUX_INITIAUX,
  voies: Readonly<Record<TypeCombinaison, Voie>> = VOIES,
): ScoreCompte {
  const occurrences = combinaisons.map((combinaison) => ({
    combinaison,
    points: pointsAvecNiveau(combinaison, niveaux[combinaison.type], voies[combinaison.type]),
  }))

  const declenchees = new Set(combinaisons.map((combinaison) => combinaison.type))
  const voiesDeclenchees = ORDRE_VOIES.filter((type) => declenchees.has(type))

  const points = occurrences.reduce((somme, occurrence) => somme + occurrence.points, 0)
  const mult = voiesDeclenchees.reduce(
    (somme, type) => somme + multAvecNiveau(niveaux[type], voies[type]),
    MULT_DE_BASE,
  )

  return { points, mult, score: Math.round(points * mult), voiesDeclenchees, occurrences }
}

function pointsAvecNiveau(combinaison: Combinaison, niveau: number, voie: Voie): number {
  const echelle = voie.pointsParCarte ? combinaison.cartes.length : 1
  return combinaison.points + voie.pointsParNiveau * (niveau - 1) * echelle
}

function multAvecNiveau(niveau: number, voie: Voie): number {
  return voie.multBase + voie.multParNiveau * (niveau - 1)
}
