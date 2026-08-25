import type { Effet, Modificateur } from '../core/modificateurs.js'

const EFFET = 'METRONOME_INTEGRAL'

/**
 * Le Metronome — poser toutes ses cartes sans exploser double les points de Pose, donc le
 * Mult qu'ils achetent (§1.3). Encaisser en chemin ne double rien.
 *
 * C'est la relique qui rend tranchante la seule decision de la Pose : s'arreter ou continuer.
 * Elle ne donne rien par elle-meme — elle amplifie ce que le joueur a deja gagne, et
 * uniquement s'il est alle au bout. Aucun « +X ».
 */
export const LE_METRONOME: Modificateur = {
  id: 'le-metronome',
  nom: 'Le Metronome',
  description: 'Poser ses quatre cartes sans exploser double les points de Pose.',
  famille: 'POSE',
  surEncaissement: (ctx): readonly Effet[] =>
    !ctx.explosee && ctx.restantes === 0 && ctx.points > 0
      ? [{ type: EFFET, valeur: ctx.points }]
      : [],
  surScore: (contrib, ctx) => {
    if (ctx.origine !== 'MAIN') return contrib
    // La valeur portee est le nombre de points de Pose ; les doubler revient a en ajouter
    // autant, et un point de Pose vaut un Mult.
    const bonus = ctx.effets
      .filter((effet) => effet.type === EFFET)
      .reduce((somme, effet) => somme + effet.valeur, 0)
    return { points: contrib.points, mult: contrib.mult + bonus }
  },
}
