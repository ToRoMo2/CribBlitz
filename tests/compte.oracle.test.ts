import { describe, expect, it } from 'vitest'
import { parseCarte, parseCartes } from '../src/core/carte.js'
import { compterMain, totalPoints } from '../src/core/compte.js'

/**
 * Les cinq cas d'oracle du carnet §1.2. Ils passent avant qu'une seule ligne de roguelike
 * ne soit ecrite. Une erreur ici serait invisible et empoisonnerait toutes les mesures.
 *
 * Le carnet ecrit le Roi « K » ; le glossaire du code dit « R » (Roi). Meme carte.
 */
function total(main: string, retourne: string, estBoite = false): number {
  return totalPoints(compterMain(parseCartes(main), parseCarte(retourne), estBoite))
}

describe("l'oracle du carnet §1.2", () => {
  it('5♥ 6♠ 7♦ 8♣ + 4♠ vaut 9 — 2 quinzaines et une suite de 5', () => {
    expect(total('5♥ 6♠ 7♦ 8♣', '4♠')).toBe(9)
  })

  it('4♠ 5♥ 5♦ 6♣ + 6♠ vaut 24 — 8 + 12 + 4', () => {
    expect(total('4♠ 5♥ 5♦ 6♣', '6♠')).toBe(24)
  })

  it('5♠ 5♣ 5♦ V♥ + 5♥ vaut 29 — le maximum absolu', () => {
    expect(total('5♠ 5♣ 5♦ V♥', '5♥')).toBe(29)
  })

  it('A♠ 2♥ 3♦ 4♣ + 5♠ vaut 7 — une quinzaine et une suite de 5', () => {
    expect(total('A♠ 2♥ 3♦ 4♣', '5♠')).toBe(7)
  })

  it('2♠ 3♠ 4♠ 5♠ + R♥ vaut 12 — 4 + 4 + couleur 4 cartes', () => {
    expect(total('2♠ 3♠ 4♠ 5♠', 'R♥')).toBe(12)
  })
})

describe("le detail de la main parfaite", () => {
  const combinaisons = compterMain(parseCartes('5♠ 5♣ 5♦ V♥'), parseCarte('5♥'), false)

  it('trouve 8 quinzaines', () => {
    expect(combinaisons.filter((c) => c.type === 'QUINZAINE')).toHaveLength(8)
  })

  it('trouve 6 paires — le carre, sans cas particulier', () => {
    expect(combinaisons.filter((c) => c.type === 'PAIRE')).toHaveLength(6)
  })

  it('trouve le valet de la retourne', () => {
    expect(combinaisons.filter((c) => c.type === 'VALET')).toHaveLength(1)
  })

  it('ne trouve ni suite ni couleur', () => {
    expect(combinaisons.filter((c) => c.type === 'SUITE')).toHaveLength(0)
    expect(combinaisons.filter((c) => c.type === 'COULEUR')).toHaveLength(0)
  })
})
