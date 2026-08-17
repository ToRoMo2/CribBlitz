/** Le marquage de la Pose (carnet §1.3). */
export interface ReglesPose {
  readonly seuil: number
  /** Totaux qui marquent au passage. */
  readonly paliers: readonly { readonly total: number; readonly points: number }[]
  /** Indexe par le nombre de cartes consecutives de meme rang : 2 -> 2, 3 -> 6, 4 -> 12. */
  readonly pointsParRepetition: readonly number[]
  readonly longueurSuiteMin: number
  readonly pointsSuiteParCarte: number
  readonly pointsDerniereCarte: number
  /**
   * Le carnet §1.3 dit « bonus dedie, a definir » pour un 31 pile. A zero tant qu'il n'est
   * pas calibre. A noter : 31 n'est atteignable qu'avec les 4 cartes (3 cartes plafonnent a
   * 30), donc ce bonus et la « derniere carte » se declenchent toujours ensemble.
   */
  readonly bonusSeuilParfait: number
}

export const REGLES_POSE: ReglesPose = {
  seuil: 31,
  paliers: [
    { total: 15, points: 2 },
    { total: 31, points: 2 },
  ],
  pointsParRepetition: [0, 0, 2, 6, 12],
  longueurSuiteMin: 3,
  pointsSuiteParCarte: 1,
  pointsDerniereCarte: 1,
  bonusSeuilParfait: 0,
}
