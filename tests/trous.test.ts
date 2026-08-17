import { describe, expect, it } from 'vitest'
import { avancer, coutDuTrou } from '../src/core/trous.js'
import { REGLES_MANCHE } from '../src/presets/manche.js'

describe('le cout des Trous [carnet §4.2]', () => {
  it('suit les quatre Rues', () => {
    expect(coutDuTrou(1, REGLES_MANCHE)).toBe(8)
    expect(coutDuTrou(30, REGLES_MANCHE)).toBe(8)
    expect(coutDuTrou(31, REGLES_MANCHE)).toBe(45)
    expect(coutDuTrou(61, REGLES_MANCHE)).toBe(300)
    expect(coutDuTrou(91, REGLES_MANCHE)).toBe(2200)
  })

  it('le dernier Trou coûte plus cher que les 120 autres', () => {
    const cent20 = 30 * 8 + 30 * 45 + 30 * 300 + 30 * 2200
    expect(coutDuTrou(121, REGLES_MANCHE)).toBeGreaterThan(0)
    expect(coutDuTrou(121, REGLES_MANCHE)).toBe(18000)
    expect(cent20).toBeGreaterThan(coutDuTrou(121, REGLES_MANCHE)) // le carnet exagere un peu
  })
})

describe('la conversion en Trous', () => {
  it('avance d’un Trou par tranche de 8 en Rue I', () => {
    const avancee = avancer({ trou: 0, reste: 0 }, 24, REGLES_MANCHE)
    expect(avancee.trousGagnes).toBe(3)
    expect(avancee.progression.trou).toBe(3)
    expect(avancee.progression.reste).toBe(0)
  })

  it('reporte le reste sur la Donne suivante [carnet §4.2]', () => {
    const premiere = avancer({ trou: 0, reste: 0 }, 20, REGLES_MANCHE)
    expect(premiere.progression.trou).toBe(2)
    expect(premiere.progression.reste).toBe(4)

    const seconde = avancer(premiere.progression, 4, REGLES_MANCHE)
    expect(seconde.progression.trou).toBe(3)
    expect(seconde.progression.reste).toBe(0)
  })

  it('change de tarif en franchissant une Rue', () => {
    // 30 Trous a 8 = 240, puis le 31e coute 45
    const avancee = avancer({ trou: 0, reste: 0 }, 240 + 45, REGLES_MANCHE)
    expect(avancee.progression.trou).toBe(31)
    expect(avancee.progression.reste).toBe(0)
  })

  it('n’avance pas sans les points', () => {
    const avancee = avancer({ trou: 0, reste: 0 }, 7, REGLES_MANCHE)
    expect(avancee.trousGagnes).toBe(0)
    expect(avancee.progression.reste).toBe(7)
  })

  it('s’arrête au Trou final', () => {
    const avancee = avancer({ trou: 0, reste: 0 }, 10_000_000, REGLES_MANCHE)
    expect(avancee.progression.trou).toBe(121)
  })

  it('peut perdre le reste si la règle le demande', () => {
    const sansReport = { ...REGLES_MANCHE, reporterLeReste: false }
    const avancee = avancer({ trou: 0, reste: 0 }, 20, sansReport)
    expect(avancee.progression.trou).toBe(2)
    expect(avancee.progression.reste).toBe(0)
  })
})
