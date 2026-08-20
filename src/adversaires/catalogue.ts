import { LE_SOURD } from './le-sourd.js'
import { LE_MESQUIN } from './le-mesquin.js'
import { LE_REGULIER } from './le-regulier.js'
import { L_AVARE } from './l-avare.js'
import { LE_VORACE } from './le-vorace.js'
import { LE_TRANCHANT } from './le-tranchant.js'
import { LE_BAVARD } from './le-bavard.js'
import { L_ORDONNE } from './l-ordonne.js'
import type { DefinitionAdversaire } from './types.js'

/**
 * Les 8 Adversaires du carnet §4.4. Chacun **casse une regle** au lieu de gonfler un
 * chiffre, et chacun est une donnee dans son propre fichier : le moteur ne connait aucun de
 * ces identifiants et ne fait aucun `switch` dessus.
 *
 * Ils attaquent quatre surfaces differentes — la Boite, les Voies, les cartes recues, et la
 * Pose — plus deux qui ne touchent pas au joueur mais deplacent la ligne d'arrivee.
 */
export const ADVERSAIRES: readonly DefinitionAdversaire[] = [
  LE_REGULIER,
  LE_SOURD,
  LE_MESQUIN,
  L_AVARE,
  LE_VORACE,
  LE_TRANCHANT,
  LE_BAVARD,
  L_ORDONNE,
]

export function adversaireParId(id: string): DefinitionAdversaire {
  const trouve = ADVERSAIRES.find((adversaire) => adversaire.id === id)
  if (trouve === undefined) throw new Error(`Adversaire inconnu : ${id}`)
  return trouve
}

export {
  LE_REGULIER,
  LE_SOURD,
  LE_MESQUIN,
  L_AVARE,
  LE_VORACE,
  LE_TRANCHANT,
  LE_BAVARD,
  L_ORDONNE,
}
