import type { Modificateur } from '../core/modificateurs.js'
import type { DefinitionAdversaire } from './types.js'

const MODIFICATEUR: Modificateur = {
  id: 'le-sourd',
  nom: 'Le Sourd',
  description: 'La Boite est scellee : vos defausses sont perdues.',
  famille: 'ADVERSAIRE',
  configManche: (regles) => ({ ...regles, boiteScellee: true }),
}

/**
 * Le Sourd (§4.4) — scelle la Boite. Attaque directement le meilleur objet du jeu : plus de
 * bombe de fin de Manche, il faut tout marquer sur les mains.
 */
export const LE_SOURD: DefinitionAdversaire = {
  id: 'le-sourd',
  nom: 'Le Sourd',
  description: MODIFICATEUR.description,
  instancier: (rng) => ({
    modificateur: MODIFICATEUR,
    annonce: 'Le Sourd scelle la Boite : les defausses sont perdues cette Manche.',
    rng,
  }),
}
