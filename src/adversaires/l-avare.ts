import type { Modificateur } from '../core/modificateurs.js'
import type { DefinitionAdversaire } from './types.js'

const CARTES_PAR_DONNE = 5

const MODIFICATEUR: Modificateur = {
  id: 'l-avare',
  nom: "L'Avare",
  description: `Vous ne recevez que ${CARTES_PAR_DONNE} cartes par Donne.`,
  famille: 'ADVERSAIRE',
  // Une carte de moins recue, mais toujours 2 pour la Boite : il ne reste que 3 cartes en
  // main. Le Compte et la Pose maigrissent tous les deux, et le choix de defausse se ferme.
  configManche: (regles) => ({ ...regles, cartesParDonne: CARTES_PAR_DONNE }),
}

/**
 * L'Avare (§4.4) — cinq cartes au lieu de six. Il n'enleve pas des points, il enleve du
 * choix : 10 defausses possibles au lieu de 15, et une main de 3 cartes a compter.
 */
export const L_AVARE: DefinitionAdversaire = {
  id: MODIFICATEUR.id,
  nom: MODIFICATEUR.nom,
  description: MODIFICATEUR.description,
  instancier: (rng) => ({
    modificateur: MODIFICATEUR,
    annonce: `L'Avare ne vous donne que ${CARTES_PAR_DONNE} cartes par Donne.`,
    rng,
  }),
}
