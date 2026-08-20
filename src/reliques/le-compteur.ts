import type { Modificateur } from '../core/modificateurs.js'

/**
 * Plafond du Mult ajoute par Compte. Cale sur le maximum de quinzaines d'une vraie main de
 * 5 cartes (la main parfaite aux cinq 5), donc une main n'est JAMAIS bridee : le plafond ne
 * mord que sur une Boite surdimensionnee (Le Sac), ou l'explosion combinatoire du nombre de
 * quinzaines rendait Le Compteur + Le Sac ~35x la Manche de base. Mesure de l'etape 2.
 */
const PLAFOND_MULT = 8

/**
 * Le Compteur — chaque quinzaine trouvee donne +1 Mult, en gardant ses Points (§5.2,
 * lecture litterale), jusqu'a un plafond par Compte. Synergie ciblee : recompense un build
 * riche en quinzaines (les 5).
 */
export const LE_COMPTEUR: Modificateur = {
  id: 'le-compteur',
  nom: 'Le Compteur',
  description: `Chaque quinzaine donne +1 Mult (max +${PLAFOND_MULT} par Compte).`,
  famille: 'COMPTE',
  surScore: (contrib, ctx) => {
    const quinzaines = ctx.occurrences.filter((o) => o.combinaison.type === 'QUINZAINE').length
    return { points: contrib.points, mult: contrib.mult + Math.min(quinzaines, PLAFOND_MULT) }
  },
}
