import { plierEconomie, type Gains, type Modificateur } from './modificateurs.js'
import { REGLES_ECONOMIE, type ReglesEconomie } from '../presets/economie.js'

export interface DetailGains {
  readonly base: number
  readonly prime: number
  readonly interet: number
  readonly bonusModificateurs: number
  readonly total: number
}

/**
 * Les gains d'une Manche validee (carnet §4.5) : base + prime de depassement + interet sur
 * l'argent epargne, puis les hooks `surEconomie` des modificateurs (L'Usurier). Le detail
 * est renvoye pour que la CLI puisse le montrer poste par poste.
 */
export function calculerGains(
  trouAtteint: number,
  cible: number,
  argentEpargne: number,
  modificateurs: readonly Modificateur[] = [],
  regles: ReglesEconomie = REGLES_ECONOMIE,
): DetailGains {
  const depassement = Math.max(0, trouAtteint - cible)
  const prime = Math.min(regles.primeMax, depassement * regles.primeParTrou)
  const interet = Math.min(
    regles.interetMax,
    Math.floor(argentEpargne / regles.tailleTranche) * regles.interetParTranche,
  )

  const avantHooks: Gains = { argent: regles.base + prime + interet }
  const apres = plierEconomie(modificateurs, avantHooks, { trouAtteint, cible })

  return {
    base: regles.base,
    prime,
    interet,
    bonusModificateurs: apres.argent - avantHooks.argent,
    total: apres.argent,
  }
}
