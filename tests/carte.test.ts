import { describe, expect, it } from 'vitest'
import {
  formatCarte,
  paquet52,
  parseCarte,
  parseCartes,
  rangOrdinal,
  valeurAdditive,
} from '../src/core/carte.js'
import { creerRng, melanger } from '../src/core/rng.js'

describe('valeur additive [RÈGLE §1.1]', () => {
  it('As vaut 1', () => {
    expect(valeurAdditive(parseCarte('A♠'))).toBe(1)
  })

  it('les cartes numérotées valent leur face', () => {
    expect(valeurAdditive(parseCarte('7♥'))).toBe(7)
    expect(valeurAdditive(parseCarte('10♦'))).toBe(10)
  })

  it('Valet, Dame et Roi valent 10', () => {
    expect(valeurAdditive(parseCarte('V♣'))).toBe(10)
    expect(valeurAdditive(parseCarte('D♣'))).toBe(10)
    expect(valeurAdditive(parseCarte('R♣'))).toBe(10)
  })
})

describe('rang ordinal [RÈGLE §1.1]', () => {
  it('ne confond pas les figures entre elles', () => {
    expect(rangOrdinal(parseCarte('V♣'))).toBe(11)
    expect(rangOrdinal(parseCarte('D♣'))).toBe(12)
    expect(rangOrdinal(parseCarte('R♣'))).toBe(13)
  })

  it("l'As est bas", () => {
    expect(rangOrdinal(parseCarte('A♠'))).toBe(1)
  })
})

describe('le paquet', () => {
  it('contient 52 cartes toutes distinctes', () => {
    const paquet = paquet52()
    expect(paquet).toHaveLength(52)
    expect(new Set(paquet.map(formatCarte)).size).toBe(52)
  })
})

describe('format et parse', () => {
  it('font l’aller-retour', () => {
    for (const carte of paquet52()) {
      expect(parseCarte(formatCarte(carte))).toEqual(carte)
    }
  })

  it('refusent une carte illisible', () => {
    expect(() => parseCarte('Z♠')).toThrow()
    expect(() => parseCarte('5X')).toThrow()
  })

  it('lisent une suite de cartes', () => {
    expect(parseCartes('5♥ 6♠ 7♦')).toHaveLength(3)
  })
})

describe('le PRNG', () => {
  it('est déterministe pour une graine donnée', () => {
    const a = melanger(creerRng(1234), paquet52())
    const b = melanger(creerRng(1234), paquet52())
    expect(a.melange.map(formatCarte)).toEqual(b.melange.map(formatCarte))
  })

  it('donne un mélange différent pour une graine différente', () => {
    const a = melanger(creerRng(1), paquet52())
    const b = melanger(creerRng(2), paquet52())
    expect(a.melange.map(formatCarte)).not.toEqual(b.melange.map(formatCarte))
  })

  it('conserve les 52 cartes', () => {
    const { melange } = melanger(creerRng(7), paquet52())
    expect(new Set(melange.map(formatCarte)).size).toBe(52)
  })

  it('ne modifie pas le tableau reçu', () => {
    const paquet = paquet52()
    const avant = paquet.map(formatCarte)
    melanger(creerRng(9), paquet)
    expect(paquet.map(formatCarte)).toEqual(avant)
  })
})
