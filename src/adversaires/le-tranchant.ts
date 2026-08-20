import type { Modificateur } from '../core/modificateurs.js'
import type { DefinitionAdversaire } from './types.js'

const BOND = 8

const MODIFICATEUR: Modificateur = {
  id: 'le-tranchant',
  nom: 'Le Tranchant',
  description: `Chaque explosion a la Pose le fait avancer de ${BOND} Trous.`,
  famille: 'ADVERSAIRE',
  surCheville: (cible, ctx) => (ctx.explosee ? cible + BOND : cible),
}

/**
 * Le Tranchant (§4.4) — il double le prix de l'explosion. Perdre ses points de Pose devient
 * le moindre mal : c'est la ligne d'arrivee qui recule. Il rend l'encaissement volontaire,
 * jusqu'ici un garde-fou tiede, brusquement interessant.
 */
export const LE_TRANCHANT: DefinitionAdversaire = {
  id: MODIFICATEUR.id,
  nom: MODIFICATEUR.nom,
  description: MODIFICATEUR.description,
  instancier: (rng) => ({
    modificateur: MODIFICATEUR,
    annonce: `Le Tranchant avance de ${BOND} Trous a chaque explosion a la Pose.`,
    rng,
  }),
}
