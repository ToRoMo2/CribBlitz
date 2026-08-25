import { compterMain, type Combinaison } from '../core/compte.js'
import type { Modificateur } from '../core/modificateurs.js'
import { REGLES_CRIBBAGE } from '../presets/cribbage.js'

const SOMME = 14

/**
 * Le Changeur — les quinzaines se font a 14 (§5.2, etape 5).
 *
 * Une quinzaine vaut toujours 2 points : c'est la cible qui bouge, pas la valeur, donc le
 * §1.4 est tenu. L'effet est violent sans etre un « +X » : il ne donne rien, il redessine
 * quelles cartes vont ensemble. Un deck de 4 et de 10 devient soudain une machine, et les
 * 5 — l'aimant a quinzaines du cribbage — perdent leur statut.
 */
export const LE_CHANGEUR: Modificateur = {
  id: 'le-changeur',
  nom: 'Le Changeur',
  description: `Les quinzaines se font a ${SOMME} au lieu de 15.`,
  famille: 'COMPTE',
  surCombinaisons: (combinaisons, ctx): Combinaison[] => {
    const sansQuinzaines = combinaisons.filter((c) => c.type !== 'QUINZAINE')
    const recomptees = compterMain(ctx.cartes, ctx.retourne, ctx.origine === 'BOITE', {
      ...REGLES_CRIBBAGE,
      sommeQuinzaine: SOMME,
    })
    return [...recomptees.filter((c) => c.type === 'QUINZAINE'), ...sansQuinzaines]
  },
}
