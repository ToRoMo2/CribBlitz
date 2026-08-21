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
 * Le Trou le plus loin ou la cheville peut aller cette Manche. Sans plafond, c'est la fin de
 * la piste : le score seul decide, et une Manche assez grosse traverse une Rue entiere.
 */
export function plafondDeLaManche(cible: number, regles: ReglesManche): number {
  if (regles.plafondAuDelaDeLaCible === null) return regles.trouFinal
  return Math.min(regles.trouFinal, cible + regles.plafondAuDelaDeLaCible)
}

/**
 * Convertit un score en Trous. La cheville avance tant que le reste paie le Trou suivant,
 * et le reliquat est reporte — c'est ce qui rend une petite Donne utile.
 *
 * Quand la Manche a un plafond, la cheville s'y arrete et tout le surplus reste au report :
 * rien n'est perdu, tout est differe. Un score enorme n'achete plus de la distance, il
 * achete de l'avance en banque.
 */
export function avancer(
  progression: Progression,
  score: number,
  regles: ReglesManche,
  cible: number = regles.cibleAdversaire,
): Avancee {
  let trou = progression.trou
  let reste = progression.reste + score
  const plafond = plafondDeLaManche(cible, regles)

  while (trou < plafond) {
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
