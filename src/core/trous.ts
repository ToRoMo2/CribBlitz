import type { ReglesManche } from '../presets/manche.js'

export interface Progression {
  readonly trou: number
  /** Points non encore convertis, reportes sur la Donne suivante (carnet §4.2). */
  readonly reste: number
}

export interface Avancee {
  readonly progression: Progression
  readonly trousGagnes: number
  /** Ce que la borne du report a jete. Zero quand la banque a tout garde. */
  readonly reportPerdu: number
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
/**
 * Borne la banque de report a quelques Trous d'avance. Sans elle, un plafond d'avance ne
 * supprime pas le depassement : il le met de cote, et la fin de run se retrouve payee avant
 * d'etre jouee. `null` = aucune borne, tout le surplus est garde (carnet §8 q4).
 */
function plafonnerLeReport(reste: number, trou: number, regles: ReglesManche): number {
  if (regles.reportMaximumEnTrous === null) return reste
  return Math.min(reste, regles.reportMaximumEnTrous * coutDuTrou(trou + 1, regles))
}

export function plafondDeLaManche(cible: number, regles: ReglesManche): number {
  if (regles.plafondAuDelaDeLaCible === null) return regles.trouFinal
  return Math.min(regles.trouFinal, cible + regles.plafondAuDelaDeLaCible)
}

/**
 * Convertit un score en Trous. La cheville avance tant que le reste paie le Trou suivant,
 * et le reliquat est reporte — c'est ce qui rend une petite Donne utile.
 *
 * Quand la Manche a un plafond, la cheville s'y arrete et le surplus part au report : un
 * score enorme n'achete plus de la distance, il achete de l'avance. Et comme le report est
 * lui-meme borne, l'avance a une limite — au-dela, marquer plus ne sert plus a rien.
 * C'est ce couple qui rend la fin de run jouable au lieu d'etre payee d'avance (§8.7).
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

  const garde = regles.reporterLeReste ? plafonnerLeReport(reste, trou, regles) : 0
  return {
    progression: { trou, reste: garde },
    trousGagnes: trou - progression.trou,
    reportPerdu: regles.reporterLeReste ? reste - garde : 0,
  }
}
