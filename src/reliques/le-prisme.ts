import type { Carte } from '../core/carte.js'
import type { Combinaison } from '../core/compte.js'
import type { Modificateur } from '../core/modificateurs.js'
import { REGLES_CRIBBAGE } from '../presets/cribbage.js'

/**
 * Le Prisme — la Couleur tolere une carte depareillee.
 *
 * La Couleur est la Voie la plus dure du jeu : elle demande que toutes les cartes suivent,
 * et le §6 note qu'en faire une strategie exige d'avoir vide le paquet des trois autres
 * couleurs. Le Prisme la rend jouable sans la brader, comme Le Pendu rend le Valet viable.
 *
 * La regle exacte, fixee ici : on regarde l'ensemble complet, Retourne comprise ; si au plus
 * une carte depareille, la Couleur compte, et elle vaut le nombre de cartes de la couleur
 * majoritaire. La Retourne cesse donc d'avoir un statut special — elle est une carte comme
 * les autres, et c'est la simplification qui rend la relique lisible.
 */
export const LE_PRISME: Modificateur = {
  id: 'le-prisme',
  nom: 'Le Prisme',
  description: 'La Couleur tolere une carte depareillee.',
  famille: 'COMPTE',
  surCombinaisons: (combinaisons, ctx): Combinaison[] => {
    const sansCouleur = combinaisons.filter((c) => c.type !== 'COULEUR')
    const couleur = couleurTolerante([...ctx.cartes, ctx.retourne])
    return couleur === null ? sansCouleur : [...sansCouleur, couleur]
  },
}

function couleurTolerante(ensemble: readonly Carte[]): Combinaison | null {
  const parCouleur = new Map<Carte['couleur'], Carte[]>()
  for (const carte of ensemble) {
    const groupe = parCouleur.get(carte.couleur)
    if (groupe === undefined) parCouleur.set(carte.couleur, [carte])
    else groupe.push(carte)
  }

  let majoritaire: Carte[] = []
  for (const groupe of parCouleur.values()) {
    if (groupe.length > majoritaire.length) majoritaire = groupe
  }
  // Au plus une carte depareillee, et il faut de quoi parler de couleur.
  if (ensemble.length - majoritaire.length > 1) return null
  if (majoritaire.length < 4) return null

  return {
    type: 'COULEUR',
    cartes: majoritaire,
    points: majoritaire.length * REGLES_CRIBBAGE.pointsCouleurParCarte,
  }
}
