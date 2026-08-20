/**
 * La structure d'une run entiere : 4 Rues de 3 Manches, une seule piste de 121 Trous
 * (carnet §4.1, §4.3, PROTOTYPE §Etape 4).
 *
 * Les cibles sont des **positions absolues** sur la piste, pas des quotas par Manche : la
 * cheville du joueur ne repart jamais de zero, donc valider une Manche, c'est avoir depasse
 * la cheville adverse la ou elle est postee.
 *
 * [À CALIBRER PAR SIMULATION] — c'est le travail de l'etape 4, et il se fait en chiffres.
 */
export interface ReglesRun {
  readonly nombreDeManches: number
  readonly manchesParRue: number
  /** Position absolue de la cheville adverse a chaque Manche (carnet §4.3). */
  readonly cibles: readonly number[]
  /** Les Manches qui affrontent un Adversaire : la derniere de chaque Rue. */
  readonly indicesAdversaires: readonly number[]
  /**
   * Decalage de cible par Adversaire. Chacun handicape differemment, donc une cible plate
   * serait injuste — la mesure de l'etape 2 l'avait deja montre. Sur une piste absolue, ce
   * decalage est relatif a la cible de la Rue et non une valeur en dur.
   *
   * [À CALIBRER] — tous a zero tant que la simulation n'a pas parle. Des valeurs qui ont
   * l'air reglees sans l'etre seraient pires que des zeros.
   */
  readonly ajustementsBoss: Readonly<Record<string, number>>
  readonly argentInitial: number
  readonly emplacementsReliques: number
}

/**
 * Les 12 cibles. Les quatre premieres sont celles du carnet §4.3 ; les huit autres
 * interpolent jusqu'au Trou 121, une Rue par tranche de trois.
 *
 * L'ecart entre deux cibles reste presque constant — une dizaine de Trous — alors que le
 * cout d'un Trou est multiplie par 275 entre la Rue I et la Rue IV. C'est la que se joue
 * toute la question de l'etape.
 */
const CIBLES = [6, 14, 24, 34, 45, 57, 68, 78, 88, 98, 109, 121] as const

export const REGLES_RUN: ReglesRun = {
  nombreDeManches: 12,
  manchesParRue: 3,
  cibles: CIBLES,
  indicesAdversaires: [2, 5, 8, 11],
  ajustementsBoss: {},
  argentInitial: 0,
  emplacementsReliques: 5,
}

/** La Rue (1 a 4) d'une Manche donnee. Sert a l'affichage et aux mesures par Rue. */
export function rueDeLaManche(index: number, regles: ReglesRun = REGLES_RUN): number {
  return Math.floor(index / regles.manchesParRue) + 1
}
