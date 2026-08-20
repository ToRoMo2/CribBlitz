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
  /**
   * Rehausse le seul Compte de la main (jamais la Boite) pour que la defausse reste une
   * decision tranchee : la simulation de l'etape 1 a montre qu'une Boite a 9 cartes ecrase
   * les mains. Couche roguelike, au-dessus des valeurs de base du cribbage (carnet §1.4, §7).
   */
  readonly multiplicateurMain: number
}

export const CONFIG_PAR_DEFAUT: ConfigPartie = {
  cribbage: REGLES_CRIBBAGE,
  pose: REGLES_POSE,
  manche: REGLES_MANCHE,
  voies: VOIES,
  niveaux: NIVEAUX_INITIAUX,
  // ×2 : point de croisement mesure ou suivre aveuglement « tout Boite » et « tout main »
  // coute a peu pres pareil (~20 vs ~24 pts/Donne). Aucun reflexe ne domine : la defausse
  // redevient une decision a deux faces. Voir le balayage de l'etape 2.
  multiplicateurMain: 2,
}

export { REGLES_CRIBBAGE, REGLES_MANCHE, REGLES_POSE, VOIES, NIVEAUX_INITIAUX }
export type { ReglesCribbage, ReglesManche, ReglesPose, NiveauxVoies, Voie }
