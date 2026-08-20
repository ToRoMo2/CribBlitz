import type { Effet, Modificateur } from '../core/modificateurs.js'

const EFFET = 'CRAN_MULT_MAIN'

/**
 * Le Cran d'Arret — encaisser a la Pose sans avoir explose donne +1 Mult a la main qui suit
 * (§5.2). La « main qui suit » est le Compte de la meme Donne, juste apres la Pose : l'effet
 * est produit a la fin de la Pose et consomme au Compte, sans etat inter-Donne. Lie la Pose
 * (surface 2) et le Compte (surface 1).
 */
export const LE_CRAN_D_ARRET: Modificateur = {
  id: 'le-cran-d-arret',
  nom: "Le Cran d'Arret",
  description: 'Terminer la Pose sans exploser donne +1 Mult a la main de la Donne.',
  famille: 'POSE',
  surEncaissement: (ctx): readonly Effet[] =>
    ctx.explosee ? [] : [{ type: EFFET, valeur: 1 }],
  surScore: (contrib, ctx) => {
    if (ctx.origine !== 'MAIN') return contrib
    const bonus = ctx.effets
      .filter((effet) => effet.type === EFFET)
      .reduce((somme, effet) => somme + effet.valeur, 0)
    return { points: contrib.points, mult: contrib.mult + bonus }
  },
}
