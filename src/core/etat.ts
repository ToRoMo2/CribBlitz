import type { Carte } from './carte.js'
import type { Evenement } from './evenements.js'
import type { EtatPose } from './pose.js'
import type { Rng } from './rng.js'
import type { ScoreCompte } from './voies.js'
import type { ConfigPartie } from '../presets/index.js'

export type Phase = 'DEFAUSSE' | 'POSE' | 'MANCHE_TERMINEE'

export type Action =
  | { readonly type: 'DEFAUSSER'; readonly indices: readonly number[] }
  | { readonly type: 'POSER'; readonly index: number }
  | { readonly type: 'ENCAISSER' }

export interface EtatDonne {
  readonly numero: number
  /** Les 6 cartes recues, conservees pour le resume : c'est le choix de defausse qu'on mesure. */
  readonly recue: readonly Carte[]
  readonly main: readonly Carte[]
  readonly defaussee: readonly Carte[]
  readonly retourne: Carte | null
  readonly pose: EtatPose | null
  readonly talons: number
}

/** Ce que la simulation mesure, et ce que la CLI affiche en fin de Manche. */
export interface ResumeDonne {
  readonly numero: number
  readonly recue: readonly Carte[]
  readonly gardee: readonly Carte[]
  readonly defaussee: readonly Carte[]
  readonly retourne: Carte
  readonly pointsMain: number
  readonly multMain: number
  readonly scoreMain: number
  readonly pointsPose: number
  readonly explosee: boolean
  readonly talons: number
  readonly scoreDonne: number
}

export interface EtatPartie {
  readonly config: ConfigPartie
  readonly rng: Rng
  readonly paquet: readonly Carte[]
  readonly boite: readonly Carte[]
  readonly donne: EtatDonne
  readonly phase: Phase
  readonly trou: number
  readonly reste: number
  readonly cible: number
  readonly historique: readonly ResumeDonne[]
  readonly scoreBoite: ScoreCompte | null
  readonly gagnee: boolean | null
}

export interface Resultat {
  readonly state: EtatPartie
  readonly events: Evenement[]
}
