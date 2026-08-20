import { estValet } from '../core/carte.js'
import type { Combinaison } from '../core/compte.js'
import type { Modificateur } from '../core/modificateurs.js'

/**
 * Le Pendu — chaque Valet dans la Boite vaut 5 points, quelle que soit la couleur (§5.2).
 * Rend une Voie rare (le Valet) viable une fois surinvestie. On remplace le Valet-de-la-
 * Retourne classique de la Boite (1 pt, couleur exigee) par un Valet a 5 pts par Valet
 * present, toutes couleurs.
 */
export const LE_PENDU: Modificateur = {
  id: 'le-pendu',
  nom: 'Le Pendu',
  description: 'Chaque Valet dans la Boite vaut 5 points, toute couleur.',
  famille: 'BOITE',
  surCombinaisons: (combinaisons, ctx) => {
    if (ctx.origine !== 'BOITE') return [...combinaisons]
    const sansValet = combinaisons.filter((c) => c.type !== 'VALET')
    const valets: Combinaison[] = ctx.cartes
      .filter(estValet)
      .map((valet) => ({ type: 'VALET', cartes: [valet], points: 5 }))
    return [...sansValet, ...valets]
  },
}
