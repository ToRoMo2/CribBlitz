import { describe, expect, it } from 'vitest'
import { parseCarte, parseCartes } from '../src/core/carte.js'
import { compterMain, totalPoints, type Combinaison } from '../src/core/compte.js'
import { calculerScore } from '../src/core/voies.js'
import {
  plierCombinaisons,
  plierScore,
  collecterEncaissement,
  plierConfigManche,
  plierEconomie,
  type Modificateur,
} from '../src/core/modificateurs.js'
import { REGLES_MANCHE } from '../src/presets/manche.js'
import { LE_COMPTEUR } from '../src/reliques/le-compteur.js'
import { LA_FOURCHE } from '../src/reliques/la-fourche.js'
import { LE_SAC } from '../src/reliques/le-sac.js'
import { LE_DOUBLE_FOND } from '../src/reliques/le-double-fond.js'
import { LA_PINCE } from '../src/reliques/la-pince.js'
import { LE_CRAN_D_ARRET } from '../src/reliques/le-cran-d-arret.js'
import { LE_PENDU } from '../src/reliques/le-pendu.js'
import { L_USURIER } from '../src/reliques/l-usurier.js'
import { RELIQUES } from '../src/reliques/catalogue.js'

function combinaisons(main: string, retourne: string, estBoite = false): Combinaison[] {
  return compterMain(parseCartes(main), parseCarte(retourne), estBoite)
}

/** Applique surCombinaisons puis surScore d'une relique, comme le fait le cœur. */
function score(
  relique: Modificateur,
  main: string,
  retourne: string,
  origine: 'MAIN' | 'BOITE',
) {
  const cartes = parseCartes(main)
  const carteRetourne = parseCarte(retourne)
  const base = compterMain(cartes, carteRetourne, origine === 'BOITE')
  const apres = plierCombinaisons([relique], base, { origine, cartes, retourne: carteRetourne })
  const brut = calculerScore(apres)
  return plierScore([relique], { points: brut.points, mult: brut.mult }, {
    origine,
    occurrences: brut.occurrences,
    effets: [],
  })
}

describe('le catalogue', () => {
  it('contient exactement les 8 reliques, tous id uniques', () => {
    expect(RELIQUES).toHaveLength(8)
    expect(new Set(RELIQUES.map((r) => r.id)).size).toBe(8)
  })
})

describe('Le Compteur — +1 Mult par quinzaine', () => {
  it('ajoute autant de Mult qu’il y a de quinzaines', () => {
    // 5♠ 5♣ 5♦ V♥ + 5♥ : 8 quinzaines. Mult de base 1 + 1 (Quinzaine) + 1 (Paire) + 5 (Valet) = 8.
    const s = score(LE_COMPTEUR, '5♠ 5♣ 5♦ V♥', '5♥', 'MAIN')
    expect(s.mult).toBe(8 + 8)
  })

  it('ne touche pas les Points', () => {
    const base = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠'))
    const s = score(LE_COMPTEUR, '4♠ 5♥ 5♦ 6♣', '6♠', 'MAIN')
    expect(s.points).toBe(base.points)
    expect(s.mult).toBeGreaterThan(base.mult)
  })

  it('plafonne le Mult au-delà de 8 quinzaines (bombe de Boîte)', () => {
    // Une main de 5 cartes ne dépasse jamais 8 quinzaines, donc n'est jamais plafonnée ;
    // une Boîte surdimensionnée, si. On sollicite le hook avec 20 quinzaines fictives.
    if (LE_COMPTEUR.surScore === undefined) throw new Error('hook absent')
    const occurrences = Array.from({ length: 20 }, () => ({
      combinaison: { type: 'QUINZAINE' as const, cartes: [], points: 2 },
      points: 2,
    }))
    const s = LE_COMPTEUR.surScore({ points: 40, mult: 3 }, {
      origine: 'BOITE', occurrences, effets: [],
    })
    expect(s.mult).toBe(3 + 8) // +20 aurait été la spirale ; le plafond la coupe
  })
})

describe('La Fourche — un rang manquant', () => {
  it('4-5-7 vaut une suite de 3', () => {
    const cartes = parseCartes('4♠ 5♥ 7♦ R♣')
    const retourne = parseCarte('9♠')
    const base = compterMain(cartes, retourne, false)
    expect(base.filter((c) => c.type === 'SUITE')).toHaveLength(0)

    const apres = plierCombinaisons([LA_FOURCHE], base, { origine: 'MAIN', cartes, retourne })
    const suites = apres.filter((c) => c.type === 'SUITE')
    expect(suites).toHaveLength(1)
    expect(suites[0]?.points).toBe(3)
  })

  it('un seul trou sur tout le groupe, pas un trou par palier', () => {
    // Le cas qui surprend en partie : une Boite 3 5 6 7 7 7 9 9 10. Le trou est consomme
    // entre le 3 et le 5, donc la suite s'arrete au 7 — le 9 demanderait un second trou.
    // La relique dit « un rang manquant », au singulier, et c'est la regle.
    const cartes = parseCartes('5♥ 10♥ 9♥ 6♥ 9♦ 7♦ 3♠ 7♠')
    const retourne = parseCarte('7♥')
    const apres = plierCombinaisons([LA_FOURCHE], compterMain(cartes, retourne, true), {
      origine: 'BOITE', cartes, retourne,
    })
    const suites = apres.filter((c) => c.type === 'SUITE')
    // Trois exemplaires, un par 7, chacun long de 4 cartes : 3-5-6-7.
    expect(suites).toHaveLength(3)
    expect(suites.every((suite) => suite.points === 4)).toBe(true)
    const rangs = suites[0]?.cartes.map((carte) => carte.rang)
    expect(rangs).toEqual(['3', '5', '6', '7'])
    // Aucune suite ne contient de 9 : il est de l'autre cote du second trou.
    expect(suites.some((suite) => suite.cartes.some((carte) => carte.rang === '9'))).toBe(false)
  })

  it('laisse une vraie suite intacte (zéro trou)', () => {
    const cartes = parseCartes('4♠ 5♥ 6♦ R♣')
    const retourne = parseCarte('9♠')
    const apres = plierCombinaisons([LA_FOURCHE], compterMain(cartes, retourne, false), {
      origine: 'MAIN', cartes, retourne,
    })
    const suites = apres.filter((c) => c.type === 'SUITE')
    expect(suites).toHaveLength(1)
    expect(suites[0]?.points).toBe(3)
  })

  it('refuse deux trous : 3-5-7 n’est pas une suite', () => {
    const cartes = parseCartes('3♠ 5♥ 7♦ R♣')
    const retourne = parseCarte('9♥')
    const apres = plierCombinaisons([LA_FOURCHE], compterMain(cartes, retourne, false), {
      origine: 'MAIN', cartes, retourne,
    })
    expect(apres.filter((c) => c.type === 'SUITE')).toHaveLength(0)
  })
})

describe('Le Sac — 3 cartes dans la Boîte', () => {
  it('porte les défausses par Donne à 3', () => {
    const regles = plierConfigManche([LE_SAC], REGLES_MANCHE)
    expect(regles.defaussesParDonne).toBe(3)
  })
})

describe('Le Double Fond — Boîte comptée deux fois', () => {
  it('double le score de la Boîte, pas celui de la main', () => {
    const boite = score(LE_DOUBLE_FOND, '4♠ 5♥ 5♦ 6♣', '6♠', 'BOITE')
    const boiteBase = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠', true))
    expect(boite.points).toBe(boiteBase.points * 2)

    const main = score(LE_DOUBLE_FOND, '4♠ 5♥ 5♦ 6♣', '6♠', 'MAIN')
    expect(main.points).toBe(calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠')).points)
  })
})

describe('La Pince — Retourne avant défausse', () => {
  it('lève le drapeau de révélation anticipée', () => {
    const regles = plierConfigManche([LA_PINCE], REGLES_MANCHE)
    expect(regles.revelerRetourneAvantDefausse).toBe(true)
  })
})

describe("Le Cran d'Arrêt — Pose sûre = +1 Mult", () => {
  it('produit un effet quand la Pose n’a pas explosé, rien sinon', () => {
    expect(collecterEncaissement([LE_CRAN_D_ARRET], { explosee: false })).toHaveLength(1)
    expect(collecterEncaissement([LE_CRAN_D_ARRET], { explosee: true })).toHaveLength(0)
  })

  it('consomme l’effet en +1 Mult sur la main', () => {
    const effets = collecterEncaissement([LE_CRAN_D_ARRET], { explosee: false })
    const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠'))
    const avec = plierScore([LE_CRAN_D_ARRET], { points: brut.points, mult: brut.mult }, {
      origine: 'MAIN', occurrences: brut.occurrences, effets,
    })
    expect(avec.mult).toBe(brut.mult + 1)
  })

  it('n’affecte pas la Boîte', () => {
    const effets = collecterEncaissement([LE_CRAN_D_ARRET], { explosee: false })
    const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠', true))
    const avec = plierScore([LE_CRAN_D_ARRET], { points: brut.points, mult: brut.mult }, {
      origine: 'BOITE', occurrences: brut.occurrences, effets,
    })
    expect(avec.mult).toBe(brut.mult)
  })
})

describe('Le Pendu — Valets de la Boîte à 5', () => {
  it('chaque Valet de la Boîte vaut 5, toute couleur', () => {
    const cartes = parseCartes('V♠ V♥ 2♦ 8♣ 9♠ 3♦ 4♠ 7♣')
    const retourne = parseCarte('10♦') // ne suit aucun Valet : le cœur seul donnerait 0 Valet
    const base = compterMain(cartes, retourne, true)
    expect(base.filter((c) => c.type === 'VALET')).toHaveLength(0)

    const apres = plierCombinaisons([LE_PENDU], base, { origine: 'BOITE', cartes, retourne })
    const valets = apres.filter((c) => c.type === 'VALET')
    expect(valets).toHaveLength(2)
    expect(totalPoints(valets)).toBe(10)
  })

  it('n’agit pas sur la main', () => {
    const cartes = parseCartes('V♠ 2♦ 8♣ 9♠')
    const retourne = parseCarte('10♦')
    const apres = plierCombinaisons([LE_PENDU], compterMain(cartes, retourne, false), {
      origine: 'MAIN', cartes, retourne,
    })
    expect(apres.filter((c) => c.type === 'VALET')).toHaveLength(0)
  })
})

describe("L'Usurier — argent contre cible", () => {
  it('éloigne la cible de 3 Trous', () => {
    const regles = plierConfigManche([L_USURIER], REGLES_MANCHE)
    expect(regles.cibleAdversaire).toBe(REGLES_MANCHE.cibleAdversaire + 3)
  })

  it('ajoute 2 ¤ aux gains', () => {
    const gains = plierEconomie([L_USURIER], { argent: 4 }, { trouAtteint: 10, cible: 6 })
    expect(gains.argent).toBe(6)
  })
})
