import type { Modificateur } from '../core/modificateurs.js'
import type { Rng } from '../core/rng.js'

/**
 * Un Adversaire n'est pas un joueur : c'est un Modificateur (meme infrastructure que les
 * reliques) qui casse une regle, plus une annonce affichee avant la boutique precedente pour
 * qu'on puisse acheter contre (carnet §4.4). Certains tirent au sort une partie de leur
 * comportement — d'ou l'instanciation seedee.
 */
export interface DefinitionAdversaire {
  readonly id: string
  readonly nom: string
  readonly description: string
  readonly instancier: (rng: Rng) => AdversaireInstancie
}

export interface AdversaireInstancie {
  readonly modificateur: Modificateur
  readonly annonce: string
  readonly rng: Rng
}
