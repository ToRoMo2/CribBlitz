import type { Modificateur } from '../core/modificateurs.js'
import type { DefinitionAdversaire } from './types.js'

const SEUIL = 100
const BOND = 5

const MODIFICATEUR: Modificateur = {
  id: 'le-vorace',
  nom: 'Le Vorace',
  description: `Il bondit de ${BOND} Trous chaque fois que vous marquez plus de ${SEUIL}.`,
  famille: 'ADVERSAIRE',
  surCheville: (cible, ctx) => (ctx.scoreDeLaDonne > SEUIL ? cible + BOND : cible),
}

/**
 * Le Vorace (§4.4) — il se nourrit de vos gros scores. Le seul Adversaire qui punit la
 * reussite : marquer gros le fait avancer, donc une Donne enorme ne vaut pas toujours mieux
 * que deux Donnes moyennes. Il attaque la strategie, pas les cartes.
 */
export const LE_VORACE: DefinitionAdversaire = {
  id: MODIFICATEUR.id,
  nom: MODIFICATEUR.nom,
  description: MODIFICATEUR.description,
  instancier: (rng) => ({
    modificateur: MODIFICATEUR,
    annonce: `Le Vorace bondit de ${BOND} Trous chaque fois qu'une Donne vous rapporte plus de ${SEUIL}.`,
    rng,
  }),
}
