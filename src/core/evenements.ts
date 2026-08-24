import type { Carte } from './carte.js'
import type { Combinaison, TypeCombinaison } from './compte.js'

/** D'ou vient le Compte en cours : la main d'une Donne, ou la Boite de fin de Manche. */
export type Origine = 'MAIN' | 'BOITE'

export type RaisonPose =
  | 'QUINZAINE'
  | 'SEUIL'
  | 'REPETITION'
  | 'SUITE'
  | 'DERNIERE_CARTE'
  | 'SEUIL_PARFAIT'

/**
 * Le flux que la couche de presentation rejouera pour animer et sonoriser. Le coeur ignore
 * qu'une animation existe : il se contente de produire cette liste, dans l'ordre.
 */
export type Evenement =
  | { readonly type: 'DONNE_DISTRIBUEE'; readonly donne: number; readonly cartes: readonly Carte[] }
  | { readonly type: 'CARTES_DEFAUSSEES'; readonly cartes: readonly Carte[]; readonly tailleBoite: number }
  | { readonly type: 'RETOURNE_REVELEE'; readonly carte: Carte }
  | { readonly type: 'TALONS'; readonly points: number }
  | { readonly type: 'POSE_CARTE'; readonly carte: Carte; readonly total: number }
  | {
      readonly type: 'POSE_MARQUE'
      readonly raison: RaisonPose
      readonly points: number
      readonly cartes: readonly Carte[]
    }
  | { readonly type: 'POSE_ENCAISSE'; readonly points: number }
  | { readonly type: 'POSE_EXPLOSE'; readonly total: number; readonly pointsPerdus: number }
  | {
      readonly type: 'COMBINAISON_TROUVEE'
      readonly combinaison: Combinaison
      readonly points: number
      readonly origine: Origine
    }
  | {
      readonly type: 'MULT_APPLIQUE'
      readonly mult: number
      readonly voies: readonly TypeCombinaison[]
      readonly origine: Origine
    }
  | {
      readonly type: 'SCORE_CALCULE'
      readonly points: number
      readonly mult: number
      readonly score: number
      readonly origine: Origine
    }
  | { readonly type: 'BOITE_COMPTEE'; readonly cartes: readonly Carte[]; readonly score: number }
  /** La cheville adverse bouge. Ce n'est pas un joueur qui decide : c'est de la meteo. */
  | {
      readonly type: 'CIBLE_AVANCE'
      readonly de: number
      readonly a: number
      readonly adversaire: string
    }
  | {
      readonly type: 'CHEVILLE_AVANCE'
      readonly de: number
      readonly a: number
      readonly reste: number
    }
  /**
   * La cheville bute sur le plafond de la Manche. Meme raison que CIBLE_AVANCE : une piste
   * qui refuse d'avancer en silence, ou des points qui s'evaporent sans le dire, seraient
   * incomprehensibles. `pointsPerdus` est ce que la banque n'a pas pu garder.
   */
  | {
      readonly type: 'CHEVILLE_PLAFONNEE'
      readonly trou: number
      readonly plafond: number
      readonly reste: number
      readonly pointsPerdus: number
    }
  | { readonly type: 'MANCHE_GAGNEE'; readonly trou: number; readonly cible: number }
  | { readonly type: 'MANCHE_PERDUE'; readonly trou: number; readonly cible: number }
