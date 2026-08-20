import type { Carte } from './carte.js'
import type { Combinaison } from './compte.js'
import type { OccurrenceScoree } from './voies.js'
import type { Origine } from './evenements.js'
import type { ReglesManche } from '../presets/manche.js'
import type { ReglesPose } from '../presets/pose.js'

/**
 * Le point d'extension du jeu. Une Relique et un Adversaire sont la meme chose : un objet
 * declaratif qui casse une regle via un sous-ensemble de hooks. Le coeur, a des points fixes
 * du pipeline, replie la liste des modificateurs actifs — il appelle des fonctions qu'il ne
 * connait pas. **Aucun `switch` sur un identifiant nulle part dans le moteur.**
 *
 * Ajouter une relique = un fichier neuf sous src/reliques/ qui exporte un Modificateur.
 * Le coeur ne bouge pas.
 */

export type Famille =
  | 'COMPTE'
  | 'POSE'
  | 'BOITE'
  | 'DEFAUSSE'
  | 'RETOURNE'
  | 'STRUCTURE'
  | 'ADVERSAIRE'

/** La contribution d'un Compte avant conversion en score : Points et Mult, que les hooks tordent. */
export interface ContribScore {
  readonly points: number
  readonly mult: number
}

/**
 * Un message entre deux points du pipeline. Seul Le Cran d'Arret s'en sert aujourd'hui :
 * produit a l'encaissement de la Pose, lu au Compte de la meme Donne. Le coeur ne l'inspecte
 * jamais — il le transporte, les modificateurs le lisent.
 */
export interface Effet {
  readonly type: string
  readonly valeur: number
}

export interface CtxCompte {
  readonly origine: Origine
  readonly cartes: readonly Carte[]
  readonly retourne: Carte
}

export interface CtxScore {
  readonly origine: Origine
  readonly occurrences: readonly OccurrenceScoree[]
  readonly effets: readonly Effet[]
}

export interface CtxEncaissement {
  readonly explosee: boolean
}

export interface Gains {
  readonly argent: number
}

export interface CtxEconomie {
  readonly trouAtteint: number
  readonly cible: number
}

/**
 * Ce qu'un Adversaire sait a la fin d'une Donne pour decider d'avancer sa cheville. C'est
 * tout ce dont Le Regulier, Le Vorace et Le Tranchant ont besoin — aucun d'eux ne joue aux
 * cartes, ils ne font que reagir a ce qui vient de se passer (carnet §4.4).
 */
export interface CtxCheville {
  readonly donne: number
  readonly scoreDeLaDonne: number
  readonly explosee: boolean
}

export interface Modificateur {
  readonly id: string
  readonly nom: string
  readonly description: string
  readonly famille: Famille
  /** Transforme les regles de la Manche avant qu'elle commence (params, drapeaux, cible). */
  readonly configManche?: (regles: ReglesManche) => ReglesManche
  /** Transforme les regles de la Pose avant qu'elle commence. */
  readonly configPose?: (regles: ReglesPose) => ReglesPose
  /** Deplace la cheville adverse a la fin de chaque Donne. C'est de la meteo, pas un joueur. */
  readonly surCheville?: (cible: number, ctx: CtxCheville) => number
  /** Transforme la liste des combinaisons juste apres le Compte, avant le score. */
  readonly surCombinaisons?: (combinaisons: readonly Combinaison[], ctx: CtxCompte) => Combinaison[]
  /** Tord Points et Mult apres le calcul, avant conversion en score. */
  readonly surScore?: (contrib: ContribScore, ctx: CtxScore) => ContribScore
  /** Produit des effets quand une Pose se termine (encaissee ou explosee). */
  readonly surEncaissement?: (ctx: CtxEncaissement) => readonly Effet[]
  /** Modifie les gains de fin de Manche. */
  readonly surEconomie?: (gains: Gains, ctx: CtxEconomie) => Gains
}

// ── Les replis. Chacun est pur et ignore l'identite des modificateurs. ──

export function plierConfigManche(
  modificateurs: readonly Modificateur[],
  regles: ReglesManche,
): ReglesManche {
  return modificateurs.reduce(
    (courant, modificateur) => modificateur.configManche?.(courant) ?? courant,
    regles,
  )
}

export function plierConfigPose(
  modificateurs: readonly Modificateur[],
  regles: ReglesPose,
): ReglesPose {
  return modificateurs.reduce(
    (courant, modificateur) => modificateur.configPose?.(courant) ?? courant,
    regles,
  )
}

export function plierCheville(
  modificateurs: readonly Modificateur[],
  cible: number,
  ctx: CtxCheville,
): number {
  return modificateurs.reduce(
    (courant, modificateur) => modificateur.surCheville?.(courant, ctx) ?? courant,
    cible,
  )
}

export function plierCombinaisons(
  modificateurs: readonly Modificateur[],
  combinaisons: readonly Combinaison[],
  ctx: CtxCompte,
): Combinaison[] {
  return modificateurs.reduce<Combinaison[]>(
    (courant, modificateur) => modificateur.surCombinaisons?.(courant, ctx) ?? courant,
    [...combinaisons],
  )
}

export function plierScore(
  modificateurs: readonly Modificateur[],
  contrib: ContribScore,
  ctx: CtxScore,
): ContribScore {
  return modificateurs.reduce(
    (courant, modificateur) => modificateur.surScore?.(courant, ctx) ?? courant,
    contrib,
  )
}

export function collecterEncaissement(
  modificateurs: readonly Modificateur[],
  ctx: CtxEncaissement,
): Effet[] {
  return modificateurs.flatMap((modificateur) => [...(modificateur.surEncaissement?.(ctx) ?? [])])
}

export function plierEconomie(
  modificateurs: readonly Modificateur[],
  gains: Gains,
  ctx: CtxEconomie,
): Gains {
  return modificateurs.reduce(
    (courant, modificateur) => modificateur.surEconomie?.(courant, ctx) ?? courant,
    gains,
  )
}
