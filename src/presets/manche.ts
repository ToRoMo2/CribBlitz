/**
 * La structure d'une Manche et le plateau (carnet §3, §4.2, §4.3).
 *
 * [À CALIBRER PAR SIMULATION] — les couts de Trou et la cible sont recopies du carnet tels
 * quels. Le carnet lui-meme les donne comme des points de depart : c'est le harnais de
 * simulation qui doit dire s'ils tiennent, pas ce fichier.
 */
export interface PalierTrou {
  readonly jusquAuTrou: number
  readonly cout: number
}

export interface ReglesManche {
  readonly nombreDeDonnes: number
  readonly cartesParDonne: number
  readonly defaussesParDonne: number
  readonly coutsDesTrous: readonly PalierTrou[]
  readonly trouFinal: number
  /** Les points non convertis passent a la Donne suivante (carnet §4.2). */
  readonly reporterLeReste: boolean
  /** La cheville adverse est le quota. Manche 1 : Trou 6 (carnet §4.3). */
  readonly cibleAdversaire: number
  /** §4.3 dit « depasser », §4.5 implique que l'egalite gagne deja. On retient l'egalite. */
  readonly victoireSiEgalite: boolean
  /** La Pince (§5.2) : la Retourne est revelee avant la defausse au lieu d'apres. */
  readonly revelerRetourneAvantDefausse: boolean
  /** Le Sourd (§4.4) : la Boite est scellee, les defausses sont perdues et rien n'est compte. */
  readonly boiteScellee: boolean
}

export const REGLES_MANCHE: ReglesManche = {
  nombreDeDonnes: 4,
  cartesParDonne: 6,
  defaussesParDonne: 2,
  coutsDesTrous: [
    { jusquAuTrou: 30, cout: 8 },
    { jusquAuTrou: 60, cout: 45 },
    { jusquAuTrou: 90, cout: 300 },
    { jusquAuTrou: 120, cout: 2200 },
    { jusquAuTrou: 121, cout: 18000 },
  ],
  trouFinal: 121,
  reporterLeReste: true,
  cibleAdversaire: 6,
  victoireSiEgalite: true,
  revelerRetourneAvantDefausse: false,
  boiteScellee: false,
}
