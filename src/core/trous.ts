import type { ReglesManche } from '../presets/manche.js'

export interface Progression {
  readonly trou: number
  /** Points non encore convertis, reportes sur la Donne suivante (carnet §4.2). */
  readonly reste: number
}

export interface Avancee {
  readonly progression: Progression
  readonly trousGagnes: number
}

/** Le cout d'entree dans un Trou donne. Chaque Rue coute plus cher que la precedente. */
export function coutDuTrou(numero: number, regles: ReglesManche): number {
  for (const palier of regles.coutsDesTrous) {
    if (numero <= palier.jusquAuTrou) return palier.cout
  }
  return Number.POSITIVE_INFINITY
}

/**
 * Convertit un score en Trous. La cheville avance tant que le reste paie le Trou suivant,
 * et le reliquat est reporte — c'est ce qui rend une petite Donne utile.
 */
export function avancer(
  progression: Progression,
  score: number,
  regles: ReglesManche,
): Avancee {
  let trou = progression.trou
  let reste = progression.reste + score

  while (trou < regles.trouFinal) {
    const cout = coutDuTrou(trou + 1, regles)
    if (reste < cout) break
    reste -= cout
    trou++
  }

  return {
    progression: { trou, reste: regles.reporterLeReste ? reste : 0 },
    trousGagnes: trou - progression.trou,
  }
}
