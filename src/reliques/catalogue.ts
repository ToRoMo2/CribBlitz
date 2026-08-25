import type { Modificateur } from '../core/modificateurs.js'
import { LE_COMPTEUR } from './le-compteur.js'
import { LA_FOURCHE } from './la-fourche.js'
import { LE_SAC } from './le-sac.js'
import { LE_DOUBLE_FOND } from './le-double-fond.js'
import { LA_PINCE } from './la-pince.js'
import { LE_CRAN_D_ARRET } from './le-cran-d-arret.js'
import { LE_PENDU } from './le-pendu.js'
import { L_USURIER } from './l-usurier.js'
import { LE_FUNAMBULE } from './le-funambule.js'
import { L_EQUILIBRISTE } from './l-equilibriste.js'
import { LE_METRONOME } from './le-metronome.js'
import { LE_CONTREPOIDS } from './le-contrepoids.js'
import { LE_CHANGEUR } from './le-changeur.js'
import { LE_BEGUE } from './le-begue.js'
import { LA_LOUPE } from './la-loupe.js'
import { LE_PURISTE } from './le-puriste.js'
import { LE_PRISME } from './le-prisme.js'

/**
 * Le catalogue (carnet §5.2, §5.3). Une simple liste de donnees : ajouter une relique, c'est
 * un fichier de plus et une ligne ici. Le moteur ne connait aucun de ces id.
 *
 * Les huit premieres sont celles de l'etape 2, les seules contre lesquelles la courbe des
 * couts du §4.2 a ete calibree. Les suivantes viennent de l'etape 5, famille par famille.
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
  // Etape 5 — la famille Pose, la plus creuse du §5.3 (1 relique pour 5 visees).
  LE_FUNAMBULE,
  L_EQUILIBRISTE,
  LE_METRONOME,
  LE_CONTREPOIDS,
  // Etape 5 — la famille Compte, le plus gros contingent du §5.3 (30 %).
  LE_CHANGEUR,
  LE_BEGUE,
  LA_LOUPE,
  LE_PURISTE,
  LE_PRISME,
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
  LE_FUNAMBULE,
  L_EQUILIBRISTE,
  LE_METRONOME,
  LE_CONTREPOIDS,
  LE_CHANGEUR,
  LE_BEGUE,
  LA_LOUPE,
  LE_PURISTE,
  LE_PRISME,
}
