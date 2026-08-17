import { REGLES_CRIBBAGE, type ReglesCribbage } from './cribbage.js'
import { REGLES_MANCHE, type ReglesManche } from './manche.js'
import { REGLES_POSE, type ReglesPose } from './pose.js'
import { NIVEAUX_INITIAUX, VOIES, type NiveauxVoies, type Voie } from './voies.js'
import type { TypeCombinaison } from '../core/compte.js'

/** Tous les chiffres du jeu, en un seul objet injecte dans l'etat. Rien en dur ailleurs. */
export interface ConfigPartie {
  readonly cribbage: ReglesCribbage
  readonly pose: ReglesPose
  readonly manche: ReglesManche
  readonly voies: Readonly<Record<TypeCombinaison, Voie>>
  readonly niveaux: NiveauxVoies
}

export const CONFIG_PAR_DEFAUT: ConfigPartie = {
  cribbage: REGLES_CRIBBAGE,
  pose: REGLES_POSE,
  manche: REGLES_MANCHE,
  voies: VOIES,
  niveaux: NIVEAUX_INITIAUX,
}

export { REGLES_CRIBBAGE, REGLES_MANCHE, REGLES_POSE, VOIES, NIVEAUX_INITIAUX }
export type { ReglesCribbage, ReglesManche, ReglesPose, NiveauxVoies, Voie }
