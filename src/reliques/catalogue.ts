import type { Modificateur } from '../core/modificateurs.js'
import { LE_COMPTEUR } from './le-compteur.js'
import { LA_FOURCHE } from './la-fourche.js'
import { LE_SAC } from './le-sac.js'
import { LE_DOUBLE_FOND } from './le-double-fond.js'
import { LA_PINCE } from './la-pince.js'
import { LE_CRAN_D_ARRET } from './le-cran-d-arret.js'
import { LE_PENDU } from './le-pendu.js'
import { L_USURIER } from './l-usurier.js'

/**
 * Les 8 reliques de l'etape 2 (carnet §5.2). Une simple liste de donnees : ajouter une
 * relique, c'est un fichier de plus et une ligne ici. Le moteur ne connait aucun de ces id.
 */
export const RELIQUES: readonly Modificateur[] = [
  LE_COMPTEUR,
  LA_FOURCHE,
  LE_SAC,
  LE_DOUBLE_FOND,
  LA_PINCE,
  LE_CRAN_D_ARRET,
  LE_PENDU,
  L_USURIER,
]

export function reliqueParId(id: string): Modificateur {
  const trouvee = RELIQUES.find((relique) => relique.id === id)
  if (trouvee === undefined) throw new Error(`Relique inconnue : ${id}`)
  return trouvee
}

export {
  LE_COMPTEUR,
  LA_FOURCHE,
  LE_SAC,
  LE_DOUBLE_FOND,
  LA_PINCE,
  LE_CRAN_D_ARRET,
  LE_PENDU,
  L_USURIER,
}
