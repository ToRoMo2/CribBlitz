import type { Effet, Modificateur } from '../core/modificateurs.js'

const EFFET = 'EQUILIBRISTE_PARFAIT'
const BONUS = 6

/**
 * L'Equilibriste — atteindre exactement le seuil de la Pose donne +6 Mult a la main.
 *
 * Le carnet §1.3 note que le seuil parfait « est une prouesse : bonus dedie, a definir ».
 * Le voici, et il est en Mult plutot qu'en points parce que c'est la monnaie de la Pose
 * depuis §1.3. Il ne se declenche que sur le seuil courant, donc il se combine avec Le
 * Funambule sans le savoir : la prouesse devient viser 36 au lieu de 31.
 */
export const L_EQUILIBRISTE: Modificateur = {
  id: 'l-equilibriste',
  nom: "L'Equilibriste",
  description: `Terminer la Pose exactement sur le seuil donne +${BONUS} Mult a la main.`,
  famille: 'POSE',
  surEncaissement: (ctx): readonly Effet[] =>
    !ctx.explosee && ctx.total === ctx.seuil ? [{ type: EFFET, valeur: BONUS }] : [],
  surScore: (contrib, ctx) => {
    if (ctx.origine !== 'MAIN') return contrib
    const bonus = ctx.effets
      .filter((effet) => effet.type === EFFET)
      .reduce((somme, effet) => somme + effet.valeur, 0)
    return { points: contrib.points, mult: contrib.mult + bonus }
  },
}
