import type { Modificateur } from '../core/modificateurs.js'

/**
 * Le Double Fond — la Boite est comptee deux fois (§5.2). Doubler les Points de la Boite
 * double son score final (`points x 2 x mult`). Ne touche jamais la main.
 */
export const LE_DOUBLE_FOND: Modificateur = {
  id: 'le-double-fond',
  nom: 'Le Double Fond',
  description: 'La Boite est comptee deux fois.',
  famille: 'BOITE',
  surScore: (contrib, ctx) =>
    ctx.origine === 'BOITE' ? { points: contrib.points * 2, mult: contrib.mult } : contrib,
}
