import type { Modificateur } from '../core/modificateurs.js'
import type { DefinitionAdversaire } from './types.js'

const MODIFICATEUR: Modificateur = {
  id: 'l-ordonne',
  nom: "L'Ordonne",
  description: 'La Pose doit etre en ordre de rang strictement croissant.',
  famille: 'ADVERSAIRE',
  configPose: (regles) => ({ ...regles, ordreCroissantImpose: true }),
}

/**
 * L'Ordonne (§4.4) — il casse la liberte d'ordre de la Pose, qui etait jusqu'ici gratuite.
 * On ne peut plus garder une petite carte pour finir : les paires deviennent impossibles a
 * la Pose (deux rangs egaux ne sont pas croissants) et la plupart des Poses s'arretent tot.
 */
export const L_ORDONNE: DefinitionAdversaire = {
  id: MODIFICATEUR.id,
  nom: MODIFICATEUR.nom,
  description: MODIFICATEUR.description,
  instancier: (rng) => ({
    modificateur: MODIFICATEUR,
    annonce: "L'Ordonne impose une Pose en ordre strictement croissant.",
    rng,
  }),
}
