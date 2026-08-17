import { describe, expect, it } from 'vitest'
import { parseCarte, parseCartes } from '../src/core/carte.js'
import { compterMain } from '../src/core/compte.js'
import { calculerScore } from '../src/core/voies.js'
import { NIVEAUX_INITIAUX, type NiveauxVoies } from '../src/presets/voies.js'

function scorer(main: string, retourne: string, niveaux: NiveauxVoies = NIVEAUX_INITIAUX) {
  return calculerScore(compterMain(parseCartes(main), parseCarte(retourne), false), niveaux)
}

describe('les vérifications chiffrées du carnet §2.1', () => {
  it('4♠ 5♥ 5♦ 6♣ + 6♠ donne 24 x 5 = 120', () => {
    const resultat = scorer('4♠ 5♥ 5♦ 6♣', '6♠')
    expect(resultat.points).toBe(24)
    expect(resultat.mult).toBe(5)
    expect(resultat.score).toBe(120)
  })

  it('5♠ 5♣ 5♦ V♥ + 5♥ donne 29 x 8 = 232', () => {
    const resultat = scorer('5♠ 5♣ 5♦ V♥', '5♥')
    expect(resultat.points).toBe(29)
    expect(resultat.mult).toBe(8)
    expect(resultat.score).toBe(232)
  })
})

describe('la distinction Points / Mult [carnet §2.1]', () => {
  it('une Voie déclenchée quatre fois ne compte qu’une fois dans le Mult', () => {
    const resultat = scorer('4♠ 5♥ 5♦ 6♣', '6♠')
    expect(resultat.occurrences.filter((o) => o.combinaison.type === 'SUITE')).toHaveLength(4)
    expect(resultat.voiesDeclenchees.filter((voie) => voie === 'SUITE')).toHaveLength(1)
  })

  it('déclencher toutes les Voies une fois donne un gros Mult', () => {
    // 4 quinzaines... non : une main a la fois maigre en Points et large en Voies.
    const resultat = scorer('2♠ 3♠ 4♠ 5♠', 'R♥')
    expect(resultat.voiesDeclenchees).toEqual(['QUINZAINE', 'SUITE', 'COULEUR'])
    expect(resultat.mult).toBe(1 + 1 + 2 + 3)
  })

  it('une main à zéro point garde le Mult de base et un score nul', () => {
    const resultat = scorer('2♠ 4♥ 6♦ 8♣', '10♠')
    expect(resultat.points).toBe(0)
    expect(resultat.mult).toBe(1)
    expect(resultat.score).toBe(0)
    expect(resultat.voiesDeclenchees).toEqual([])
  })

  it('les Voies déclenchées sortent dans l’ordre du carnet', () => {
    const resultat = scorer('5♠ 5♣ 5♦ V♥', '5♥')
    expect(resultat.voiesDeclenchees).toEqual(['QUINZAINE', 'PAIRE', 'VALET'])
  })
})

describe('les niveaux de Voie', () => {
  it('Quinzaine niveau 2 ajoute 2 points par quinzaine et 0,5 de mult', () => {
    const resultat = scorer('4♠ 5♥ 5♦ 6♣', '6♠', { ...NIVEAUX_INITIAUX, QUINZAINE: 2 })
    expect(resultat.points).toBe(32) // 4 quinzaines a 4 pts, + 12 de suites, + 4 de paires
    expect(resultat.mult).toBe(5.5)
    expect(resultat.score).toBe(176)
  })

  it('Suite niveau 2 ajoute 1 point par carte de la suite', () => {
    const resultat = scorer('4♠ 5♥ 5♦ 6♣', '6♠', { ...NIVEAUX_INITIAUX, SUITE: 2 })
    expect(resultat.points).toBe(36) // 4 suites de 3 cartes a 6 pts
    expect(resultat.mult).toBe(6)
    expect(resultat.score).toBe(216)
  })

  it('Couleur niveau 2 ajoute 4 points, pas 4 par carte', () => {
    const resultat = scorer('2♠ 3♠ 4♠ 5♠', 'R♥', { ...NIVEAUX_INITIAUX, COULEUR: 2 })
    expect(resultat.points).toBe(16) // 4 (quinzaines) + 4 (suite) + 8 (couleur)
    expect(resultat.mult).toBe(8)
  })

  it('Valet niveau 2 fait mal : +2 de mult pour une Voie rare', () => {
    const resultat = scorer('V♥ 2♠ 4♦ 8♣', '9♥', { ...NIVEAUX_INITIAUX, VALET: 2 })
    expect(resultat.mult).toBe(1 + 1 + 7)
  })

  it('un niveau qui produit un mult fractionnaire arrondit le score final', () => {
    const resultat = scorer('7♠ 7♥ 7♦ 2♣', '9♠', { ...NIVEAUX_INITIAUX, PAIRE: 2 })
    expect(resultat.points).toBe(12) // 3 paires a 4 points
    expect(resultat.mult).toBe(2.5)
    expect(resultat.score).toBe(30)
  })
})

describe('la séparation des responsabilités', () => {
  it('le score ne voit que des combinaisons, jamais des cartes', () => {
    const sansRien = calculerScore([])
    expect(sansRien).toEqual({
      points: 0,
      mult: 1,
      score: 0,
      voiesDeclenchees: [],
      occurrences: [],
    })
  })
})
