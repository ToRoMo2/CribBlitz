import type { Effet, Modificateur } from '../core/modificateurs.js'

const EFFET = 'FUNAMBULE_CHUTE'
const SEUIL = 36

/**
 * Le Funambule — le seuil de la Pose passe de 31 a 36, mais une explosion ne coute plus
 * seulement les points de Pose : elle ramene le Mult de la main a 1.
 *
 * La marge supplementaire n'est pas un cadeau, c'est une corde plus longue au-dessus d'un
 * vide plus profond. Depuis que la Pose achete du Mult (§1.3), aller plus loin vaut vraiment
 * plus cher — et tomber aussi. Casse une regle, et lie les deux surfaces dans le mauvais sens.
 */
export const LE_FUNAMBULE: Modificateur = {
  id: 'le-funambule',
  nom: 'Le Funambule',
  description: `Le seuil de la Pose passe a ${SEUIL}, mais exploser ramene le Mult de la main a 1.`,
  famille: 'POSE',
  configPose: (regles) => ({ ...regles, seuil: SEUIL }),
  surEncaissement: (ctx): readonly Effet[] => (ctx.explosee ? [{ type: EFFET, valeur: 1 }] : []),
  surScore: (contrib, ctx) => {
    if (ctx.origine !== 'MAIN') return contrib
    const tombe = ctx.effets.some((effet) => effet.type === EFFET)
    return tombe ? { points: contrib.points, mult: 1 } : contrib
  },
}
