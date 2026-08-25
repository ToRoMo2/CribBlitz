import { rangOrdinal, type Carte } from '../core/carte.js'
import type { Combinaison } from '../core/compte.js'
import type { Modificateur } from '../core/modificateurs.js'
import { REGLES_CRIBBAGE } from '../presets/cribbage.js'

/**
 * Le Begue — deux cartes de rangs voisins forment une paire : un 7 et un 8 se repetent.
 *
 * Le pendant de La Fourche sur les paires. La regle exacte est fixee ici, dans le fichier de
 * la relique : deux cartes s'apparient si leurs rangs sont a distance 0 ou 1. Le cas
 * « distance 0 » redonne la paire classique, donc Le Begue etend le cœur sans le contredire.
 */
export const LE_BEGUE: Modificateur = {
  id: 'le-begue',
  nom: 'Le Begue',
  description: 'Deux rangs voisins forment une paire : 7 et 8 se repetent.',
  famille: 'COMPTE',
  surCombinaisons: (combinaisons, ctx): Combinaison[] => {
    const sansPaires = combinaisons.filter((c) => c.type !== 'PAIRE')
    return [...sansPaires, ...pairesVoisines([...ctx.cartes, ctx.retourne])]
  },
}

function pairesVoisines(ensemble: readonly Carte[]): Combinaison[] {
  const trouvees: Combinaison[] = []
  for (let i = 0; i < ensemble.length; i++) {
    for (let j = i + 1; j < ensemble.length; j++) {
      const a = ensemble[i] as Carte
      const b = ensemble[j] as Carte
      if (Math.abs(rangOrdinal(a) - rangOrdinal(b)) <= 1) {
        trouvees.push({ type: 'PAIRE', cartes: [a, b], points: REGLES_CRIBBAGE.pointsPaire })
      }
    }
  }
  return trouvees
}
