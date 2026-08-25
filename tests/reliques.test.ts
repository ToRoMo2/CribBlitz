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
  type CtxEncaissement,
  type Modificateur,
} from '../src/core/modificateurs.js'
import { REGLES_MANCHE } from '../src/presets/manche.js'
import { REGLES_POSE } from '../src/presets/pose.js'
import { REGLES_BOUTIQUE } from '../src/presets/boutique.js'
import {
  RELIQUES,
  LE_FUNAMBULE,
  L_EQUILIBRISTE,
  LE_METRONOME,
  LE_CONTREPOIDS,
  LE_CHANGEUR,
  LE_BEGUE,
  LA_LOUPE,
  LE_PURISTE,
  LE_PRISME,
} from '../src/reliques/catalogue.js'
import { LE_COMPTEUR } from '../src/reliques/le-compteur.js'
import { LA_FOURCHE } from '../src/reliques/la-fourche.js'
import { LE_SAC } from '../src/reliques/le-sac.js'
import { LE_DOUBLE_FOND } from '../src/reliques/le-double-fond.js'
import { LA_PINCE } from '../src/reliques/la-pince.js'
import { LE_CRAN_D_ARRET } from '../src/reliques/le-cran-d-arret.js'
import { LE_PENDU } from '../src/reliques/le-pendu.js'
import { L_USURIER } from '../src/reliques/l-usurier.js'

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
  /** Les huit de l'étape 2 : le socle contre lequel la courbe du §4.2 a été calibrée. */
  const SOCLE = [
    'le-compteur', 'la-fourche', 'le-sac', 'le-double-fond',
    'la-pince', 'le-cran-d-arret', 'le-pendu', 'l-usurier',
  ]

  it('porte toujours les huit reliques de l’étape 2', () => {
    const ids = RELIQUES.map((relique) => relique.id)
    for (const id of SOCLE) expect(ids).toContain(id)
  })

  it('grandit vers les 24 de l’étape 5 sans jamais dépasser', () => {
    expect(RELIQUES.length).toBeGreaterThanOrEqual(SOCLE.length)
    expect(RELIQUES.length).toBeLessThanOrEqual(24)
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

/** Une Pose terminee sans histoire : le contexte complet, avec juste le drapeau qui varie. */
function encaissement(explosee: boolean): CtxEncaissement {
  return {
    explosee,
    points: explosee ? 0 : 4,
    pointsPerdus: explosee ? 4 : 0,
    total: explosee ? 34 : 24,
    seuil: 31,
    posees: 3,
    restantes: 1,
  }
}

describe("Le Cran d'Arrêt — Pose sûre = +1 Mult", () => {
  it('produit un effet quand la Pose n’a pas explosé, rien sinon', () => {
    expect(collecterEncaissement([LE_CRAN_D_ARRET], encaissement(false))).toHaveLength(1)
    expect(collecterEncaissement([LE_CRAN_D_ARRET], encaissement(true))).toHaveLength(0)
  })

  it('consomme l’effet en +1 Mult sur la main', () => {
    const effets = collecterEncaissement([LE_CRAN_D_ARRET], encaissement(false))
    const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠'))
    const avec = plierScore([LE_CRAN_D_ARRET], { points: brut.points, mult: brut.mult }, {
      origine: 'MAIN', occurrences: brut.occurrences, effets,
    })
    expect(avec.mult).toBe(brut.mult + 1)
  })

  it('n’affecte pas la Boîte', () => {
    const effets = collecterEncaissement([LE_CRAN_D_ARRET], encaissement(false))
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

// ── Étape 5 : la famille Pose ──

/** Un encaissement sur mesure, pour interroger une relique de Pose sur un cas précis. */
function pose(partiel: Partial<CtxEncaissement>): CtxEncaissement {
  return {
    explosee: false,
    points: 0,
    pointsPerdus: 0,
    total: 0,
    seuil: 31,
    posees: 0,
    restantes: 0,
    ...partiel,
  }
}

/** Le Mult de la main après application d'une relique, effets d'encaissement compris. */
function multMain(relique: Modificateur, ctx: CtxEncaissement, origine: 'MAIN' | 'BOITE' = 'MAIN'): number {
  const effets = collecterEncaissement([relique], ctx)
  const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠', origine === 'BOITE'))
  return plierScore([relique], { points: brut.points, mult: brut.mult }, {
    origine, occurrences: brut.occurrences, effets,
  }).mult
}

describe('Le Funambule — un seuil plus haut, une chute plus dure', () => {
  it('repousse le seuil de la Pose à 36', () => {
    expect(LE_FUNAMBULE.configPose?.(REGLES_POSE).seuil).toBe(36)
  })

  it('une explosion ramène le Mult de la main à 1', () => {
    expect(multMain(LE_FUNAMBULE, pose({ explosee: true, pointsPerdus: 6 }))).toBe(1)
  })

  it('sans explosion, il ne touche à rien', () => {
    const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠'))
    expect(multMain(LE_FUNAMBULE, pose({ points: 4, total: 30 }))).toBe(brut.mult)
  })

  it('n’écrase pas le Mult de la Boîte', () => {
    const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠', true))
    expect(multMain(LE_FUNAMBULE, pose({ explosee: true }), 'BOITE')).toBe(brut.mult)
  })
})

describe("L'Équilibriste — le seuil parfait", () => {
  it('donne +6 Mult quand la Pose finit pile sur le seuil', () => {
    const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠'))
    expect(multMain(L_EQUILIBRISTE, pose({ points: 4, total: 31 }))).toBe(brut.mult + 6)
  })

  it('ne donne rien à un Trou du seuil', () => {
    const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠'))
    expect(multMain(L_EQUILIBRISTE, pose({ points: 4, total: 30 }))).toBe(brut.mult)
  })

  it('suit le seuil courant, donc se combine avec Le Funambule', () => {
    // Avec Le Funambule le seuil est 36 : c'est 36 qui devient la prouesse, pas 31.
    expect(collecterEncaissement([L_EQUILIBRISTE], pose({ total: 36, seuil: 36 }))).toHaveLength(1)
    expect(collecterEncaissement([L_EQUILIBRISTE], pose({ total: 31, seuil: 36 }))).toHaveLength(0)
  })

  it('une explosion pile sur le seuil ne compte pas', () => {
    expect(collecterEncaissement([L_EQUILIBRISTE], pose({ explosee: true, total: 31 }))).toHaveLength(0)
  })
})

describe('Le Métronome — aller au bout', () => {
  it('double les points de Pose quand les 4 cartes sont posées', () => {
    const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠'))
    expect(multMain(LE_METRONOME, pose({ points: 5, posees: 4, restantes: 0 }))).toBe(brut.mult + 5)
  })

  it('ne donne rien si l’on encaisse en chemin', () => {
    const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠'))
    expect(multMain(LE_METRONOME, pose({ points: 5, posees: 2, restantes: 2 }))).toBe(brut.mult)
  })

  it('ne donne rien sur une Pose complète à zéro point — il amplifie, il ne crée pas', () => {
    expect(collecterEncaissement([LE_METRONOME], pose({ points: 0, restantes: 0 }))).toHaveLength(0)
  })
})

describe('Le Contrepoids — le risque devient une dette', () => {
  it('rend en Mult les points que l’explosion a emportés', () => {
    const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠'))
    expect(multMain(LE_CONTREPOIDS, pose({ explosee: true, pointsPerdus: 7 }))).toBe(brut.mult + 7)
  })

  it('fait avancer la cheville adverse de 2 Trous, mais seulement sur explosion', () => {
    expect(LE_CONTREPOIDS.surCheville?.(40, { donne: 1, scoreDeLaDonne: 0, explosee: true })).toBe(42)
    expect(LE_CONTREPOIDS.surCheville?.(40, { donne: 1, scoreDeLaDonne: 0, explosee: false })).toBe(40)
  })

  it('ne rend rien quand la Pose n’a pas explosé', () => {
    expect(collecterEncaissement([LE_CONTREPOIDS], pose({ points: 6 }))).toHaveLength(0)
  })
})

describe('le catalogue de l’étape 5', () => {
  it('la famille Pose compte 5 reliques', () => {
    expect(RELIQUES.filter((relique) => relique.famille === 'POSE')).toHaveLength(5)
  })

  it('aucune relique n’a d’identifiant en double', () => {
    expect(new Set(RELIQUES.map((relique) => relique.id)).size).toBe(RELIQUES.length)
  })

  it('chacune a un coût déclaré — jamais le défaut silencieux', () => {
    for (const relique of RELIQUES) {
      expect(REGLES_BOUTIQUE.coutsReliques[relique.id]).toBeDefined()
    }
  })
})

// ── Étape 5 : la famille Compte ──

/** Les combinaisons d'un type après application d'une relique. */
function apres(relique: Modificateur, main: string, retourne: string, estBoite = false) {
  const cartes = parseCartes(main)
  const carte = parseCarte(retourne)
  return plierCombinaisons([relique], compterMain(cartes, carte, estBoite), {
    origine: estBoite ? 'BOITE' : 'MAIN', cartes, retourne: carte,
  })
}

describe('Le Changeur — les quinzaines se font à 14', () => {
  it('compte les sommes de 14 et plus celles de 15', () => {
    // 9♠ 5♥ : 14. 9♠ 6♦ : 15, qui ne compte plus.
    const quinzaines = apres(LE_CHANGEUR, '9♠ 5♥ 6♦ R♣', '2♠').filter((c) => c.type === 'QUINZAINE')
    const paires = quinzaines.map((c) => c.cartes.map((x) => x.rang).sort().join('+'))
    expect(paires).toContain('5+9')
    expect(paires).not.toContain('6+9')
  })

  it('ne touche pas à la valeur d’une quinzaine — le §1.4 tient', () => {
    const quinzaines = apres(LE_CHANGEUR, '9♠ 5♥ 6♦ R♣', '2♠').filter((c) => c.type === 'QUINZAINE')
    expect(quinzaines.every((c) => c.points === 2)).toBe(true)
  })

  it('laisse les autres Voies intactes', () => {
    const sans = compterMain(parseCartes('9♠ 5♥ 6♦ R♣'), parseCarte('2♠'), false)
    const avec = apres(LE_CHANGEUR, '9♠ 5♥ 6♦ R♣', '2♠')
    for (const type of ['PAIRE', 'SUITE', 'COULEUR', 'VALET'] as const) {
      expect(avec.filter((c) => c.type === type)).toHaveLength(
        sans.filter((c) => c.type === type).length,
      )
    }
  })
})

describe('Le Bègue — les rangs voisins s’apparient', () => {
  it('7 et 8 forment une paire', () => {
    const paires = apres(LE_BEGUE, '7♠ 8♥ R♣ D♦', '2♠').filter((c) => c.type === 'PAIRE')
    expect(paires.some((c) => c.cartes.map((x) => x.rang).sort().join('+') === '7+8')).toBe(true)
  })

  it('garde les vraies paires — il étend, il ne remplace pas', () => {
    const paires = apres(LE_BEGUE, '7♠ 7♥ R♣ D♦', '2♠').filter((c) => c.type === 'PAIRE')
    expect(paires.some((c) => c.cartes.every((x) => x.rang === '7'))).toBe(true)
  })

  it('deux rangs d’écart ne s’apparient pas', () => {
    const paires = apres(LE_BEGUE, '7♠ 9♥ 2♣ 4♦', 'A♠').filter((c) => c.type === 'PAIRE')
    expect(paires.some((c) => c.cartes.map((x) => x.rang).sort().join('+') === '7+9')).toBe(false)
  })
})

describe('La Loupe — le sommet compté deux fois', () => {
  it('duplique la plus grosse combinaison', () => {
    const sans = compterMain(parseCartes('4♠ 5♥ 6♦ 7♣'), parseCarte('R♠'), false)
    const avec = apres(LA_LOUPE, '4♠ 5♥ 6♦ 7♣', 'R♠')
    const max = Math.max(...sans.map((c) => c.points))
    expect(avec).toHaveLength(sans.length + 1)
    expect(avec.filter((c) => c.points === max)).toHaveLength(
      sans.filter((c) => c.points === max).length + 1,
    )
  })

  it('ne fait rien sur un Compte vide', () => {
    const avec = apres(LA_LOUPE, '2♠ 4♥ 8♦ R♣', '6♥')
    const sans = compterMain(parseCartes('2♠ 4♥ 8♦ R♣'), parseCarte('6♥'), false)
    expect(avec.length).toBe(sans.length === 0 ? 0 : sans.length + 1)
  })
})

describe('Le Puriste — la pureté paie', () => {
  it('triple le Mult quand une seule Voie se déclenche', () => {
    // A♠ 2♠ 4♠ A♥ + 2♥ : deux paires et rien d'autre — ni quinzaine, ni suite, ni couleur.
    const brut = calculerScore(combinaisons('A♠ 2♠ 4♠ A♥', '2♥'))
    expect(new Set(brut.occurrences.map((o) => o.combinaison.type))).toEqual(new Set(['PAIRE']))

    const avec = plierScore([LE_PURISTE], { points: brut.points, mult: brut.mult }, {
      origine: 'MAIN', occurrences: brut.occurrences, effets: [],
    })
    expect(avec.mult).toBe(brut.mult * 3)
  })

  it('ne fait rien quand deux Voies ou plus se déclenchent', () => {
    const brut = calculerScore(combinaisons('4♠ 5♥ 5♦ 6♣', '6♠'))
    expect(new Set(brut.occurrences.map((o) => o.combinaison.type)).size).toBeGreaterThan(1)
    const avec = plierScore([LE_PURISTE], { points: brut.points, mult: brut.mult }, {
      origine: 'MAIN', occurrences: brut.occurrences, effets: [],
    })
    expect(avec.mult).toBe(brut.mult)
  })

  it('n’agit pas sur la Boîte', () => {
    const brut = calculerScore(combinaisons('A♠ 2♠ 4♠ A♥', '2♥', true))
    const avec = plierScore([LE_PURISTE], { points: brut.points, mult: brut.mult }, {
      origine: 'BOITE', occurrences: brut.occurrences, effets: [],
    })
    expect(avec.mult).toBe(brut.mult)
  })
})

describe('Le Prisme — la Couleur tolère une carte dépareillée', () => {
  it('donne une Couleur là où le cœur n’en voit aucune', () => {
    const sans = compterMain(parseCartes('2♥ 5♥ 8♥ R♠'), parseCarte('9♥'), false)
    expect(sans.filter((c) => c.type === 'COULEUR')).toHaveLength(0)
    const avec = apres(LE_PRISME, '2♥ 5♥ 8♥ R♠', '9♥').filter((c) => c.type === 'COULEUR')
    expect(avec).toHaveLength(1)
    expect(avec[0]?.points).toBe(4)
  })

  it('refuse deux cartes dépareillées', () => {
    const avec = apres(LE_PRISME, '2♥ 5♥ 8♥ R♠', '9♦').filter((c) => c.type === 'COULEUR')
    expect(avec).toHaveLength(0)
  })

  it('une couleur pleine vaut toujours ses cinq cartes', () => {
    const avec = apres(LE_PRISME, '2♥ 5♥ 8♥ R♥', '9♥').filter((c) => c.type === 'COULEUR')
    expect(avec[0]?.points).toBe(5)
  })
})
