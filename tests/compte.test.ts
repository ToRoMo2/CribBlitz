import { describe, expect, it } from 'vitest'
import { formatCarte, parseCarte, parseCartes } from '../src/core/carte.js'
import { compterMain, totalPoints, type Combinaison } from '../src/core/compte.js'

function compter(main: string, retourne: string, estBoite = false): Combinaison[] {
  return compterMain(parseCartes(main), parseCarte(retourne), estBoite)
}

function total(main: string, retourne: string, estBoite = false): number {
  return totalPoints(compter(main, retourne, estBoite))
}

function duType(combinaisons: readonly Combinaison[], type: Combinaison['type']): Combinaison[] {
  return combinaisons.filter((combinaison) => combinaison.type === type)
}

describe('les suites [RÈGLE §1.2]', () => {
  it('une suite de 5 vaut 5', () => {
    const suites = duType(compter('3♠ 4♥ 5♦ 6♣', '7♠'), 'SUITE')
    expect(suites).toHaveLength(1)
    expect(suites[0]?.points).toBe(5)
    expect(total('3♠ 4♥ 5♦ 6♣', '7♠')).toBe(9)
  })

  it('une suite de 4 en double exemplaire donne 2 suites de 4 points', () => {
    const suites = duType(compter('A♠ 2♥ 3♦ 4♣', '4♠'), 'SUITE')
    expect(suites).toHaveLength(2)
    expect(suites.every((suite) => suite.points === 4)).toBe(true)
    expect(total('A♠ 2♥ 3♦ 4♣', '4♠')).toBe(10)
  })

  it('une suite de 3 en quadruple exemplaire donne 12 points (carnet 4-5-5-6-6)', () => {
    const suites = duType(compter('4♠ 5♥ 5♦ 6♣', '6♠'), 'SUITE')
    expect(suites).toHaveLength(4)
    expect(totalPoints(suites)).toBe(12)
  })

  it('une suite de 3 en triple exemplaire donne 9 points', () => {
    const suites = duType(compter('4♠ 5♥ 5♦ 5♣', '6♠'), 'SUITE')
    expect(suites).toHaveLength(3)
    expect(totalPoints(suites)).toBe(9)
    expect(total('4♠ 5♥ 5♦ 5♣', '6♠')).toBe(23)
  })

  it('2-3-4-9-10 ne compte que la suite de 3 (carnet §1.2)', () => {
    const suites = duType(compter('2♠ 3♥ 4♦ 9♣', '10♠'), 'SUITE')
    expect(suites).toHaveLength(1)
    expect(suites[0]?.points).toBe(3)
  })

  it('Dame-Roi-As n’est pas une suite : l’As est toujours bas', () => {
    expect(duType(compter('D♠ R♥ A♦ 5♣', '9♠'), 'SUITE')).toHaveLength(0)
    expect(total('D♠ R♥ A♦ 5♣', '9♠')).toBe(6)
  })

  it('Roi-As-2 ne boucle pas', () => {
    expect(duType(compter('D♠ R♥ A♦ 2♣', '9♠'), 'SUITE')).toHaveLength(0)
  })

  it('10-Valet-Dame-Roi est bien une suite de 4', () => {
    const suites = duType(compter('10♠ V♥ D♦ R♣', 'A♠'), 'SUITE')
    expect(suites).toHaveLength(1)
    expect(suites[0]?.cartes).toHaveLength(4)
    expect(total('10♠ V♥ D♦ R♣', 'A♠')).toBe(4)
  })

  it('deux suites disjointes coexistent dans une Boîte de 9 cartes', () => {
    // Une main de 5 cartes ne peut pas contenir deux suites disjointes ; une Boîte, si.
    const combinaisons = compter('A♠ 2♥ 3♦ V♠ D♥ R♦ 7♣ 8♠', '7♥', true)
    const suites = duType(combinaisons, 'SUITE')
    expect(suites).toHaveLength(2)
    expect(suites.every((suite) => suite.points === 3)).toBe(true)
    expect(totalPoints(combinaisons)).toBe(20)
  })
})

describe('les paires [RÈGLE §1.2]', () => {
  it('un brelan produit 3 paires, soit 6 points', () => {
    const paires = duType(compter('7♠ 7♥ 7♦ 2♣', '9♠'), 'PAIRE')
    expect(paires).toHaveLength(3)
    expect(totalPoints(paires)).toBe(6)
    expect(total('7♠ 7♥ 7♦ 2♣', '9♠')).toBe(6)
  })

  it('un carré produit 6 paires, soit 12 points, sans cas particulier', () => {
    const paires = duType(compter('5♠ 5♥ 5♦ 5♣', 'R♠'), 'PAIRE')
    expect(paires).toHaveLength(6)
    expect(totalPoints(paires)).toBe(12)
    expect(total('5♠ 5♥ 5♦ 5♣', 'R♠')).toBe(28)
  })

  it('Valet, Dame et Roi ne sont pas des paires entre eux', () => {
    expect(duType(compter('10♠ V♥ D♦ R♣', 'A♠'), 'PAIRE')).toHaveLength(0)
  })
})

describe('la couleur [RÈGLE §1.2]', () => {
  it('en main : 4 cartes de la même couleur valent 4', () => {
    const couleurs = duType(compter('2♠ 4♠ 8♠ R♠', '9♥'), 'COULEUR')
    expect(couleurs).toHaveLength(1)
    expect(couleurs[0]?.points).toBe(4)
    expect(total('2♠ 4♠ 8♠ R♠', '9♥')).toBe(6)
  })

  it('en main : la Retourne qui suit fait passer à 5', () => {
    const couleurs = duType(compter('2♠ 4♠ 8♠ R♠', '9♠'), 'COULEUR')
    expect(couleurs[0]?.points).toBe(5)
    expect(couleurs[0]?.cartes).toHaveLength(5)
    expect(total('2♠ 4♠ 8♠ R♠', '9♠')).toBe(7)
  })

  it('en main : une seule carte d’une autre couleur annule tout', () => {
    expect(duType(compter('2♠ 4♠ 8♥ R♠', '9♠'), 'COULEUR')).toHaveLength(0)
  })

  it('en Boîte : la même couleur ne compte pas si la Retourne ne suit pas', () => {
    expect(duType(compter('2♠ 4♠ 8♠ R♠', '9♥', true), 'COULEUR')).toHaveLength(0)
    expect(total('2♠ 4♠ 8♠ R♠', '9♥', true)).toBe(2)
  })

  it('en Boîte : la couleur compte si la Retourne suit', () => {
    const couleurs = duType(compter('2♠ 4♠ 8♠ R♠', '9♠', true), 'COULEUR')
    expect(couleurs[0]?.points).toBe(5)
    expect(total('2♠ 4♠ 8♠ R♠', '9♠', true)).toBe(7)
  })

  it('en Boîte : une couleur de 9 cartes vaut 9', () => {
    const couleurs = duType(compter('2♠ 3♠ 4♠ 6♠ 8♠ 9♠ V♠ R♠', 'D♠', true), 'COULEUR')
    expect(couleurs).toHaveLength(1)
    expect(couleurs[0]?.points).toBe(9)
  })
})

describe('le valet de la Retourne [RÈGLE §1.2]', () => {
  it('vaut 1 point quand il suit la Retourne', () => {
    const valets = duType(compter('V♥ 2♠ 4♦ 8♣', '9♥'), 'VALET')
    expect(valets).toHaveLength(1)
    expect(valets[0]?.points).toBe(1)
    expect(total('V♥ 2♠ 4♦ 8♣', '9♥')).toBe(3)
  })

  it('ne vaut rien dans une autre couleur', () => {
    expect(duType(compter('V♠ 2♠ 4♦ 8♣', '9♥'), 'VALET')).toHaveLength(0)
    expect(total('V♠ 2♠ 4♦ 8♣', '9♥')).toBe(2)
  })

  it('la Retourne ne se compte jamais elle-même — les Talons sont ailleurs', () => {
    expect(duType(compter('2♠ 4♦ 8♣ 9♥', 'V♥'), 'VALET')).toHaveLength(0)
    expect(total('2♠ 4♦ 8♣ 9♥', 'V♥')).toBe(2)
  })

  it('compte dans la Boîte comme dans la main', () => {
    expect(duType(compter('V♥ 2♠ 4♦ 8♣', '9♥', true), 'VALET')).toHaveLength(1)
  })
})

describe('les mains à zéro point', () => {
  it('2♠ 4♥ 6♦ 8♣ + 10♠ ne rapporte rien', () => {
    expect(compter('2♠ 4♥ 6♦ 8♣', '10♠')).toHaveLength(0)
    expect(total('2♠ 4♥ 6♦ 8♣', '10♠')).toBe(0)
  })

  it('D♠ R♥ A♦ 2♣ + 9♠ ne rapporte rien', () => {
    expect(total('D♠ R♥ A♦ 2♣', '9♠')).toBe(0)
  })
})

describe("l'ordre et la forme du resultat [carnet §2.2]", () => {
  it('énumère les quinzaines par taille croissante', () => {
    const quinzaines = duType(compter('5♥ 6♠ 7♦ 8♣', '4♠'), 'QUINZAINE')
    expect(quinzaines).toHaveLength(2)
    expect(quinzaines[0]?.cartes).toHaveLength(2)
    expect(quinzaines[1]?.cartes).toHaveLength(3)
  })

  it('suit l’ordre quinzaines, paires, suites, couleur, valet', () => {
    const types = compter('2♠ 3♠ 4♠ 5♠', 'R♥').map((combinaison) => combinaison.type)
    expect(types).toEqual(['QUINZAINE', 'QUINZAINE', 'SUITE', 'COULEUR'])
  })

  it('renvoie une liste, pas un total : chaque combinaison porte ses cartes', () => {
    const combinaisons = compter('4♠ 5♥ 5♦ 6♣', '6♠')
    expect(combinaisons.length).toBeGreaterThan(1)
    expect(combinaisons.every((c) => c.cartes.length >= 2)).toBe(true)
  })

  it('une même carte participe à autant de combinaisons qu’elle veut', () => {
    const combinaisons = compter('4♠ 5♥ 5♦ 6♣', '6♠')
    const apparitions = combinaisons.filter((c) =>
      c.cartes.some((carte) => formatCarte(carte) === '4♠'),
    )
    expect(apparitions.length).toBeGreaterThan(4)
  })
})

describe('la pureté du moteur', () => {
  it('donne le même résultat deux fois', () => {
    expect(compter('4♠ 5♥ 5♦ 6♣', '6♠')).toEqual(compter('4♠ 5♥ 5♦ 6♣', '6♠'))
  })

  it('ne modifie pas les cartes reçues', () => {
    const main = parseCartes('4♠ 5♥ 5♦ 6♣')
    const avant = main.map(formatCarte)
    compterMain(main, parseCarte('6♠'), false)
    expect(main.map(formatCarte)).toEqual(avant)
  })

  it('ne dépend pas de l’ordre des cartes de la main', () => {
    expect(total('6♣ 5♦ 4♠ 5♥', '6♠')).toBe(total('4♠ 5♥ 5♦ 6♣', '6♠'))
  })
})
