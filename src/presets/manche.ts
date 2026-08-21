/**
 * La structure d'une Manche et le plateau (carnet §3, §4.2, §4.3).
 *
 * Les couts de Trou sont CALIBRES (etape 4, `npm run sim -- --runs`). Le carnet les donnait
 * comme un point de depart, et la mesure a montre qu'ils ne tenaient pas : les scores
 * atteignables croissent d'un facteur 17 sur une run, la courbe du carnet d'un facteur 275.
 * La Rue I se traversait en une Manche et demie, les Rues III et IV etaient infranchissables
 * — personne ne gagnait.
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
  /**
   * Combien de Trous la cheville peut depasser la cible avant de se bloquer pour la Manche.
   * `null` = aucun plafond, la piste seule arbitre (carnet §8.5).
   */
  readonly plafondAuDelaDeLaCible: number | null
  /**
   * Combien de Trous d'avance la banque de report peut contenir au plus, exprime en cout du
   * Trou suivant. `null` = aucune borne (carnet §8 q4, le report integral).
   */
  readonly reportMaximumEnTrous: number | null
}

export const REGLES_MANCHE: ReglesManche = {
  nombreDeDonnes: 4,
  cartesParDonne: 6,
  defaussesParDonne: 2,
  /**
   * Calibre par iteration : le cout de chaque Rue vise ~10 Trous par Manche, soit le rythme
   * de la cheville adverse, puis l'echelle d'ensemble a ete cherchee sur le taux de victoire.
   *
   * Mesure a 60 runs par politique d'achat : n'acheter rien = 0 % (mort a la Manche 5),
   * n'acheter que des Voies = 0 %, que des reliques = 7 %, tout acheter = 50 %. La survie par
   * Rue fait 100 / 100 / 92 / 50 % : la Rue IV redevient le mur qu'elle doit etre.
   *
   * Chaque Rue coute ~2,3x la precedente. C'est moins raide que le carnet, et c'est le prix
   * a payer pour que la piste soit franchissable avec le contenu qui existe.
   */
  coutsDesTrous: [
    { jusquAuTrou: 30, cout: 30 },
    { jusquAuTrou: 60, cout: 135 },
    { jusquAuTrou: 90, cout: 320 },
    { jusquAuTrou: 120, cout: 720 },
    // Le dernier Trou coute plus cher que les autres (carnet §4.2) : 2,8 Trous de Rue IV.
    // A 60 runs, il tue a lui seul 8 des 30 runs qui l'atteignent.
    { jusquAuTrou: 121, cout: 2000 },
  ],
  trouFinal: 121,
  reporterLeReste: true,
  cibleAdversaire: 6,
  victoireSiEgalite: true,
  revelerRetourneAvantDefausse: false,
  boiteScellee: false,
  plafondAuDelaDeLaCible: null,
  reportMaximumEnTrous: null,
}
