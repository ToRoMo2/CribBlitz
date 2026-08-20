/**
 * La structure d'une run courte de l'etape 2 : 3 Manches enchainees, cibles croissantes,
 * defaite possible (carnet §4.1, PROTOTYPE §Etape 2). Le plateau persistant de 121 Trous est
 * un sujet d'etape 3 : ici chaque Manche repart de zero avec sa propre cible.
 *
 * [À CALIBRER PAR SIMULATION] — les cibles sont reglees a l'etape 8 du plan.
 */
export interface ReglesRun {
  readonly nombreDeManches: number
  /** Cible adverse de chaque Manche non-Adversaire, dans l'ordre. */
  readonly cibles: readonly number[]
  /** Quelle Manche (index 0) affronte l'Adversaire. */
  readonly indexAdversaire: number
  /**
   * Cible du boss par identifiant d'Adversaire : chacun handicape differemment, donc une
   * cible plate serait injuste (mesure de l'etape 2 : Le Sourd atteint ~34, Le Mesquin ~12
   * avec un bon jeu et 2 reliques). A defaut, on retombe sur cibles[indexAdversaire].
   */
  readonly ciblesBoss: Readonly<Record<string, number>>
  readonly argentInitial: number
  readonly emplacementsReliques: number
}

export const REGLES_RUN: ReglesRun = {
  nombreDeManches: 3,
  cibles: [14, 24, 30],
  indexAdversaire: 2,
  ciblesBoss: { 'le-sourd': 34, 'le-mesquin': 12 },
  argentInitial: 0,
  emplacementsReliques: 5,
}
