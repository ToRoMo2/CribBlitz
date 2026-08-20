import { memeCarte, type Carte } from '../core/carte.js'
import type { Combinaison } from '../core/compte.js'
import type { Modificateur } from '../core/modificateurs.js'
import type { DefinitionAdversaire } from './types.js'

/**
 * Le Bavard (§4.4) — **DÉVIATION ASSUMÉE PAR RAPPORT AU CARNET.**
 *
 * Le carnet le decrit comme « la Retourne est revelee apres la defausse, pas avant ». Mais
 * c'est deja notre comportement par defaut depuis l'etape 1 : le carnet supposait l'inverse.
 * Tel qu'ecrit, Le Bavard ne fait donc rien. Inverser la regle ne donne rien non plus,
 * puisque la Pose n'utilise pas la Retourne : la deplacer ne change aucun calcul.
 *
 * Effet retenu a la place, dans le meme esprit — il parle par-dessus la carte commune :
 * **la Retourne ne participe a aucune combinaison.** On compte main et Boite comme si elle
 * n'etait pas la. C'est la regle la plus profonde du cribbage qui saute (« une meme carte
 * participe a autant de combinaisons qu'elle veut », §1.2), et ca fait mal partout a la
 * fois : les quinzaines qui s'appuyaient sur elle, les suites qu'elle completait, et le
 * Valet de la Retourne, qui devient impossible par construction.
 *
 * A faire valider, puis a reporter dans le carnet §4.4.
 */

const MODIFICATEUR: Modificateur = {
  id: 'le-bavard',
  nom: 'Le Bavard',
  description: 'La Retourne ne compte dans aucune combinaison.',
  famille: 'ADVERSAIRE',
  surCombinaisons: (combinaisons, ctx) =>
    combinaisons.flatMap((combinaison) => sansLaRetourne(combinaison, ctx.retourne)),
}

/**
 * Une combinaison qui n'utilise pas la Retourne passe telle quelle. Une combinaison qui
 * l'utilise disparait — sauf la Couleur, qu'on retrograde d'une carte au lieu de la
 * supprimer : sans ca, une Retourne assortie ferait *baisser* la valeur d'une couleur,
 * ce qui serait absurde.
 */
function sansLaRetourne(combinaison: Combinaison, retourne: Carte): Combinaison[] {
  const utilise = combinaison.cartes.some((carte) => memeCarte(carte, retourne))
  if (!utilise) return [combinaison]
  if (combinaison.type !== 'COULEUR') return []

  const cartes = combinaison.cartes.filter((carte) => !memeCarte(carte, retourne))
  if (cartes.length === 0) return []
  // Les points par carte se deduisent de la combinaison elle-meme : le modificateur n'a pas
  // a connaitre les regles du cribbage pour la retrograder.
  const parCarte = combinaison.points / combinaison.cartes.length
  return [{ ...combinaison, cartes, points: Math.round(parCarte * cartes.length) }]
}

export const LE_BAVARD: DefinitionAdversaire = {
  id: MODIFICATEUR.id,
  nom: MODIFICATEUR.nom,
  description: MODIFICATEUR.description,
  instancier: (rng) => ({
    modificateur: MODIFICATEUR,
    annonce: 'Le Bavard parle par-dessus la Retourne : elle ne compte dans aucune combinaison.',
    rng,
  }),
}
