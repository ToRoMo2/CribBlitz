import type { Modificateur } from '../core/modificateurs.js'
import type { DefinitionAdversaire } from './types.js'

/** Ce qu'il gagne a chaque Donne, quoi qu'il arrive. */
const TROUS_PAR_DONNE = 2

const MODIFICATEUR: Modificateur = {
  id: 'le-regulier',
  nom: 'Le Regulier',
  description: `Sa cheville avance de ${TROUS_PAR_DONNE} Trous apres chaque Donne.`,
  famille: 'ADVERSAIRE',
  surCheville: (cible) => cible + TROUS_PAR_DONNE,
}

/**
 * Le Regulier (§4.4) — il avance, c'est tout. Le seul Adversaire qui ne casse aucune regle
 * du joueur : il deplace la ligne d'arrivee pendant qu'on joue. C'est la meteo pure, et il
 * sert d'etalon aux autres.
 */
export const LE_REGULIER: DefinitionAdversaire = {
  id: MODIFICATEUR.id,
  nom: MODIFICATEUR.nom,
  description: MODIFICATEUR.description,
  instancier: (rng) => ({
    modificateur: MODIFICATEUR,
    annonce: `Le Regulier avance de ${TROUS_PAR_DONNE} Trous apres chaque Donne, quoi qu'il arrive.`,
    rng,
  }),
}
