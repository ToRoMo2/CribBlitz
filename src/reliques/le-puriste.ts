import type { TypeCombinaison } from '../core/compte.js'
import type { Modificateur } from '../core/modificateurs.js'

const FACTEUR = 3

/**
 * Le Puriste — si le Compte ne declenche qu'une seule Voie, son Mult est triple.
 *
 * L'exact contraire de la philosophie « declencher toutes les Voies une fois » du §2.1, et
 * c'est le but : le carnet decrit deux philosophies de build opposees, mais rien jusqu'ici ne
 * recompensait la purete. Une main de quatre 5 sans suite ni couleur devient un projet.
 *
 * Elle ne s'applique qu'a la main : une Boite de 9 cartes ne declenche presque jamais une
 * seule Voie, donc l'y autoriser n'aurait rien change tout en brouillant la lecture.
 */
export const LE_PURISTE: Modificateur = {
  id: 'le-puriste',
  nom: 'Le Puriste',
  description: `Un Compte qui ne declenche qu'une seule Voie voit son Mult multiplie par ${FACTEUR}.`,
  famille: 'COMPTE',
  surScore: (contrib, ctx) => {
    if (ctx.origine !== 'MAIN') return contrib
    const voies = new Set<TypeCombinaison>(
      ctx.occurrences.map((occurrence) => occurrence.combinaison.type),
    )
    return voies.size === 1 ? { points: contrib.points, mult: contrib.mult * FACTEUR } : contrib
  },
}
