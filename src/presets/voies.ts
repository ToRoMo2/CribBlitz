import type { TypeCombinaison } from '../core/compte.js'

/**
 * Les cinq Voies (carnet §2.1). Une Voie est une donnee : quatre nombres et un drapeau,
 * appliques par une formule unique. Le moteur ne fait aucun `switch` sur un identifiant.
 *
 * Calibrage : les Voies frequentes donnent des Points, les Voies rares donnent du Mult.
 */
export interface Voie {
  readonly id: TypeCombinaison
  readonly nom: string
  /** Points ajoutes par niveau au-dela du premier. `parCarte` les multiplie par la taille. */
  readonly pointsParNiveau: number
  readonly pointsParCarte: boolean
  /** Mult ajoute une seule fois, quel que soit le nombre d'occurrences. */
  readonly multBase: number
  readonly multParNiveau: number
}

/** L'ordre du carnet §2.2, qui est aussi celui du comptage scande. */
export const ORDRE_VOIES: readonly TypeCombinaison[] = [
  'QUINZAINE',
  'PAIRE',
  'SUITE',
  'COULEUR',
  'VALET',
]

export const VOIES: Readonly<Record<TypeCombinaison, Voie>> = {
  QUINZAINE: {
    id: 'QUINZAINE',
    nom: 'Quinzaine',
    pointsParNiveau: 2,
    pointsParCarte: false,
    multBase: 1,
    multParNiveau: 0.5,
  },
  PAIRE: {
    id: 'PAIRE',
    nom: 'Paire',
    pointsParNiveau: 2,
    pointsParCarte: false,
    multBase: 1,
    multParNiveau: 0.5,
  },
  SUITE: {
    id: 'SUITE',
    nom: 'Suite',
    pointsParNiveau: 1,
    pointsParCarte: true,
    multBase: 2,
    multParNiveau: 1,
  },
  COULEUR: {
    id: 'COULEUR',
    nom: 'Couleur',
    pointsParNiveau: 4,
    pointsParCarte: false,
    multBase: 3,
    multParNiveau: 1,
  },
  VALET: {
    id: 'VALET',
    nom: 'Valet',
    pointsParNiveau: 1,
    pointsParCarte: false,
    multBase: 5,
    multParNiveau: 2,
  },
}

export type NiveauxVoies = Readonly<Record<TypeCombinaison, number>>

export const NIVEAUX_INITIAUX: NiveauxVoies = {
  QUINZAINE: 1,
  PAIRE: 1,
  SUITE: 1,
  COULEUR: 1,
  VALET: 1,
}

/** Le Mult de depart, avant toute Voie declenchee. */
export const MULT_DE_BASE = 1
