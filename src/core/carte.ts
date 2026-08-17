/**
 * Les deux systemes de valeur du cribbage sont volontairement separes en deux fonctions
 * distinctes : les confondre est l'erreur classique, et elle serait invisible (carnet §1.1).
 */

export const COULEURS = ['♠', '♥', '♦', '♣'] as const
export type Couleur = (typeof COULEURS)[number]

export const RANGS = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R',
] as const
export type Rang = (typeof RANGS)[number]

export interface Carte {
  readonly rang: Rang
  readonly couleur: Couleur
}

/** Valeur additive : quinzaines et total de la Pose. Valet = Dame = Roi = 10. */
const VALEURS_ADDITIVES: Readonly<Record<Rang, number>> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, V: 10, D: 10, R: 10,
}

/** Rang ordinal : suites uniquement. L'As est toujours bas, pas de bouclage. */
const RANGS_ORDINAUX: Readonly<Record<Rang, number>> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, V: 11, D: 12, R: 13,
}

export function valeurAdditive(carte: Carte): number {
  return VALEURS_ADDITIVES[carte.rang]
}

export function rangOrdinal(carte: Carte): number {
  return RANGS_ORDINAUX[carte.rang]
}

export function estValet(carte: Carte): boolean {
  return carte.rang === 'V'
}

export function memeCarte(a: Carte, b: Carte): boolean {
  return a.rang === b.rang && a.couleur === b.couleur
}

export function paquet52(): Carte[] {
  const cartes: Carte[] = []
  for (const couleur of COULEURS) {
    for (const rang of RANGS) {
      cartes.push({ rang, couleur })
    }
  }
  return cartes
}

export function formatCarte(carte: Carte): string {
  return `${carte.rang}${carte.couleur}`
}

export function formatCartes(cartes: readonly Carte[]): string {
  return cartes.map(formatCarte).join(' ')
}

function estCouleur(valeur: string): valeur is Couleur {
  return (COULEURS as readonly string[]).includes(valeur)
}

function estRang(valeur: string): valeur is Rang {
  return (RANGS as readonly string[]).includes(valeur)
}

/** Reciproque de formatCarte. Sert aux tests et a la CLI ; jamais au moteur. */
export function parseCarte(texte: string): Carte {
  const couleur = texte.slice(-1)
  const rang = texte.slice(0, -1)
  if (!estCouleur(couleur) || !estRang(rang)) {
    throw new Error(`Carte illisible : ${texte}`)
  }
  return { rang, couleur }
}

export function parseCartes(texte: string): Carte[] {
  return texte.split(/\s+/).filter((mot) => mot.length > 0).map(parseCarte)
}
