import { describe, expect, it } from 'vitest'
import { calculerGains } from '../src/core/economie.js'
import { L_USURIER } from '../src/reliques/l-usurier.js'

describe('les gains de fin de Manche [carnet §4.5]', () => {
  it('la base est de 4 ¤ sans dépassement ni épargne', () => {
    const gains = calculerGains(6, 6, 0)
    expect(gains.base).toBe(4)
    expect(gains.prime).toBe(0)
    expect(gains.interet).toBe(0)
    expect(gains.total).toBe(4)
  })

  it('ajoute +1 ¤ par Trou dépassé, plafonné à 5', () => {
    expect(calculerGains(9, 6, 0).prime).toBe(3)
    expect(calculerGains(20, 6, 0).prime).toBe(5) // plafond
  })

  it('verse un intérêt de 1 ¤ par tranche de 5 épargnés, plafonné à 5', () => {
    expect(calculerGains(6, 6, 12).interet).toBe(2)
    expect(calculerGains(6, 6, 50).interet).toBe(5) // plafond
    expect(calculerGains(6, 6, 4).interet).toBe(0)
  })

  it('cumule base, prime et intérêt', () => {
    // base 4 + prime 3 (trou 9 vs 6) + interet 2 (11 ¤) = 9
    expect(calculerGains(9, 6, 11).total).toBe(9)
  })

  it('applique le hook surEconomie de L’Usurier (+2 ¤)', () => {
    const sans = calculerGains(9, 6, 0).total
    const avec = calculerGains(9, 6, 0, [L_USURIER]).total
    expect(avec).toBe(sans + 2)
    expect(calculerGains(9, 6, 0, [L_USURIER]).bonusModificateurs).toBe(2)
  })
})
