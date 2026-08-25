import type { Effet, Modificateur } from '../core/modificateurs.js'

const EFFET = 'CONTREPOIDS_SAUVE'
const TROUS = 2

/**
 * Le Contrepoids — une Pose explosee ne perd plus ses points, mais la cheville adverse
 * avance de 2 Trous.
 *
 * Le risque cesse d'etre une perte pour devenir une dette : on garde le Mult, on paie en
 * terrain. C'est la seule relique du catalogue qui deplace la cheville adverse sans etre un
 * Adversaire, et elle rend l'explosion jouable au lieu d'etre seulement subie.
 */
export const LE_CONTREPOIDS: Modificateur = {
  id: 'le-contrepoids',
  nom: 'Le Contrepoids',
  description: `Exploser ne perd plus les points de Pose, mais l'Adversaire avance de ${TROUS} Trous.`,
  famille: 'POSE',
  surEncaissement: (ctx): readonly Effet[] =>
    ctx.explosee && ctx.pointsPerdus > 0 ? [{ type: EFFET, valeur: ctx.pointsPerdus }] : [],
  surScore: (contrib, ctx) => {
    if (ctx.origine !== 'MAIN') return contrib
    const rendus = ctx.effets
      .filter((effet) => effet.type === EFFET)
      .reduce((somme, effet) => somme + effet.valeur, 0)
    return { points: contrib.points, mult: contrib.mult + rendus }
  },
  surCheville: (cible, ctx) => (ctx.explosee ? cible + TROUS : cible),
}
