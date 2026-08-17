/**
 * Les valeurs de base du cribbage (carnet §1.2, marquees [RÈGLE]). Elles ne sont jamais
 * modifiees par le design : ni les niveaux de Voie ni les Reliques ne touchent a ce fichier,
 * ils s'appliquent en couche au-dessus (carnet §1.4).
 */
export interface ReglesCribbage {
  readonly sommeQuinzaine: number
  readonly tailleMinQuinzaine: number
  readonly pointsQuinzaine: number
  readonly pointsPaire: number
  readonly longueurSuiteMin: number
  readonly pointsSuiteParCarte: number
  /**
   * 1 point par carte de la couleur : donne exactement les 4 et 5 du carnet pour une main,
   * et c'est la seule lecture qui s'etend a une Boite de 9 cartes, ou le carnet est muet.
   */
  readonly pointsCouleurParCarte: number
  readonly pointsValetRetourne: number
  readonly pointsTalons: number
}

export const REGLES_CRIBBAGE: ReglesCribbage = {
  sommeQuinzaine: 15,
  tailleMinQuinzaine: 2,
  pointsQuinzaine: 2,
  pointsPaire: 2,
  longueurSuiteMin: 3,
  pointsSuiteParCarte: 1,
  pointsCouleurParCarte: 1,
  pointsValetRetourne: 1,
  pointsTalons: 2,
}
