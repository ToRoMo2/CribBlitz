/**
 * L'economie de fin de Manche (carnet §4.5). L'interet est ce qui rend « ne pas acheter »
 * excitant ; il n'est pas optionnel.
 */
export interface ReglesEconomie {
  readonly base: number
  /** +1 ¤ par Trou depasse au-dela de la cible adverse, jusqu'a un plafond. */
  readonly primeParTrou: number
  readonly primeMax: number
  /** +1 ¤ par tranche de N ¤ epargnes, jusqu'a un plafond. */
  readonly tailleTranche: number
  readonly interetParTranche: number
  readonly interetMax: number
}

export const REGLES_ECONOMIE: ReglesEconomie = {
  base: 4,
  primeParTrou: 1,
  primeMax: 5,
  tailleTranche: 5,
  interetParTranche: 1,
  interetMax: 5,
}
