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
  /** L'Ordonne (§4.4) : chaque carte posee doit avoir un rang strictement superieur. */
  readonly ordreCroissantImpose: boolean
  /**
   * Ce qu'un point de Pose vaut en Mult sur le Compte de la main qui suit, dans la meme
   * Donne. C'est par la que la Pose entre dans la couche roguelike : ses points ne
   * s'ajoutent plus au score, ils multiplient celui de la main.
   *
   * A zero, la Pose ne rapporte plus rien du tout — c'est le temoin, pas un reglage.
   */
  readonly multParPointDePose: number
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
  ordreCroissantImpose: false,
  /**
   * CALIBRE. Un point de Pose vaut un Mult — la regle la plus lisible possible, et la seule
   * valeur du balayage qui rende le taux de victoire a son repere : 40 % en « achete tout »
   * contre 37 % vises, quand 0,25 a 0,75 tombent tous a 33 % et que 1,5 et 2 montent a 43 %
   * et 45 %. A ce taux la Pose pese ~29 % du Mult d'une Donne : un levier, sans ecraser les
   * cinq Voies.
   */
  multParPointDePose: 1,
}
