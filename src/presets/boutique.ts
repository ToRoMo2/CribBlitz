/**
 * Les prix de la boutique (carnet §5.2 pour les reliques, PROTOTYPE §Etape 2 pour la
 * structure : 2 reliques, 1 niveau de Voie, 1 relance payante).
 *
 * [À CALIBRER PAR SIMULATION] — les couts refletent grossierement la puissance ; l'etape 8
 * mesure s'ils poussent a acheter la plus chere par reflexe (mauvais signe) ou a apparier.
 */
export interface ReglesBoutique {
  readonly reliquesOffertes: number
  readonly coutNiveauVoie: number
  readonly coutRelance: number
  /** Cout d'achat par identifiant de relique. */
  readonly coutsReliques: Readonly<Record<string, number>>
}

export const REGLES_BOUTIQUE: ReglesBoutique = {
  reliquesOffertes: 2,
  coutNiveauVoie: 4,
  coutRelance: 2,
  coutsReliques: {
    'le-compteur': 6,
    'la-fourche': 5,
    'le-sac': 5,
    'le-double-fond': 6,
    'la-pince': 4,
    'le-cran-d-arret': 4,
    'le-pendu': 5,
    'l-usurier': 3,
    'le-funambule': 5,
    'l-equilibriste': 5,
    'le-metronome': 6,
    'le-contrepoids': 4,
  },
}

export function coutRelique(id: string, regles: ReglesBoutique = REGLES_BOUTIQUE): number {
  return regles.coutsReliques[id] ?? 5
}
