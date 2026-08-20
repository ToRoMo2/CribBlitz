import { LE_SOURD } from './le-sourd.js'
import { LE_MESQUIN } from './le-mesquin.js'
import type { DefinitionAdversaire } from './types.js'

/**
 * Les 2 Adversaires de l'etape 2 (carnet §4.4). Le Sourd attaque la Boite, Le Mesquin les
 * Voies : les deux plus informatifs pour tester si un build tient face a une contrainte.
 */
export const ADVERSAIRES: readonly DefinitionAdversaire[] = [LE_SOURD, LE_MESQUIN]

export function adversaireParId(id: string): DefinitionAdversaire {
  const trouve = ADVERSAIRES.find((adversaire) => adversaire.id === id)
  if (trouve === undefined) throw new Error(`Adversaire inconnu : ${id}`)
  return trouve
}

export { LE_SOURD, LE_MESQUIN }
