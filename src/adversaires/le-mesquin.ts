import { entier } from '../core/rng.js'
import type { Modificateur } from '../core/modificateurs.js'
import type { TypeCombinaison } from '../core/compte.js'
import { VOIES } from '../presets/voies.js'
import type { DefinitionAdversaire } from './types.js'

/**
 * Le Mesquin ne tire que les Voies qu'on peut marquer chaque Manche. Valet et Couleur sont
 * exclus TANT QUE le catalogue n'a pas de reliques pour les rendre accessibles a la demande
 * (convertir une carte en Valet, ignorer les couleurs, consommables en poche) : sinon une
 * Manche Valet/Couleur est perdue d'avance, pas « dure ». Mesure de l'etape 2 : median trou 8
 * toutes Voies confondues. A rouvrir aux 5 Voies quand le contenu-contre existera.
 */
const VOIES_TIRABLES: readonly TypeCombinaison[] = ['QUINZAINE', 'PAIRE', 'SUITE']

function modificateurPour(voie: TypeCombinaison): Modificateur {
  return {
    id: 'le-mesquin',
    nom: 'Le Mesquin',
    description: `Seule la Voie ${VOIES[voie].nom} compte cette Manche.`,
    famille: 'ADVERSAIRE',
    // Une seule Voie compte : on ne garde que ses combinaisons, dans la main comme dans la Boite.
    surCombinaisons: (combinaisons) => combinaisons.filter((c) => c.type === voie),
  }
}

/**
 * Le Mesquin (§4.4) — une seule Voie compte cette Manche, tiree au sort et annoncee. Attaque
 * les Voies : force a savoir marquer hors de son build habituel.
 */
export const LE_MESQUIN: DefinitionAdversaire = {
  id: 'le-mesquin',
  nom: 'Le Mesquin',
  description: 'Une seule Voie compte cette Manche, tiree au sort.',
  instancier: (rng) => {
    const tirage = entier(rng, VOIES_TIRABLES.length)
    const voie = VOIES_TIRABLES[tirage.valeur] as TypeCombinaison
    return {
      modificateur: modificateurPour(voie),
      annonce: `Le Mesquin : seule la Voie ${VOIES[voie].nom} compte cette Manche.`,
      rng: tirage.rng,
    }
  },
}
