import { describe, expect, it } from 'vitest'
import { parseCarte, parseCartes } from '../src/core/carte.js'
import { compterMain } from '../src/core/compte.js'
import type { Evenement, Origine } from '../src/core/evenements.js'
import { creerManche, reduire } from '../src/core/manche.js'
import { creerRng } from '../src/core/rng.js'
import { calculerScore } from '../src/core/voies.js'
import { REGLES_SCANSION, type ReglesScansion } from '../src/presets/scansion.js'
import { intervalles, planifier, ratioDuMult, type Coup } from '../src/rendu/partition.js'
import { choisirPose, strategieParNom } from '../src/sim/strategies.js'

/**
 * La partition est la seule partie de l'etape 3 qui contienne de la logique. Elle est pure,
 * donc elle se teste sous Node, sans navigateur et sans horloge — comme le reste du projet.
 */

/** Reproduit ce que `manche.ts` emet pour un Compte, sans faire tourner une Manche entiere. */
function evenementsDuCompte(main: string, retourne: string, origine: Origine = 'MAIN'): Evenement[] {
  const estBoite = origine === 'BOITE'
  const score = calculerScore(compterMain(parseCartes(main), parseCarte(retourne), estBoite))
  return [
    ...score.occurrences.map((occurrence): Evenement => ({
      type: 'COMBINAISON_TROUVEE',
      combinaison: occurrence.combinaison,
      points: occurrence.points,
      origine,
    })),
    { type: 'MULT_APPLIQUE', mult: score.mult, voies: score.voiesDeclenchees, origine },
    { type: 'SCORE_CALCULE', points: score.points, mult: score.mult, score: score.score, origine },
  ]
}

function scandes(coups: readonly Coup[]): Coup[] {
  return coups.filter((coup) => coup.scande !== null)
}

describe('le rituel scandé [carnet §2.3]', () => {
  const partition = planifier(evenementsDuCompte('5♥ 6♠ 7♦ 8♣', '4♠'))

  it('scande « quinze deux, quinze quatre » — le total, pas le compteur de coups', () => {
    const libelles = scandes(partition.coups).map((coup) => coup.scande?.libelle)
    expect(libelles.slice(0, 2)).toEqual(['quinze 2', 'quinze 4'])
  })

  it('annonce la suite au total cumulé, comme « et la suite fait treize »', () => {
    const suites = scandes(partition.coups).filter((coup) => coup.scande?.voie === 'SUITE')
    expect(suites).toHaveLength(1)
    expect(suites[0]?.scande?.libelle).toBe('suite 9')
  })

  it('surligne exactement les cartes de la combinaison annoncée', () => {
    const premier = scandes(partition.coups)[0]
    expect(premier?.scande?.cartes.map((carte) => carte.rang)).toEqual(['7', '8'])
  })

  it('accentue le premier coup de chaque Voie, et lui seul', () => {
    const accentues = scandes(partition.coups).filter((coup) => coup.scande?.premierDeSaVoie)
    expect(accentues.map((coup) => coup.scande?.voie)).toEqual(['QUINZAINE', 'SUITE'])
  })
})

describe('la montée chromatique', () => {
  it('monte d’un demi-ton par combinaison', () => {
    const partition = planifier(evenementsDuCompte('5♠ 5♣ 5♦ V♥', '5♥'))
    const hauteurs = scandes(partition.coups).slice(0, 5).map((coup) => coup.demiTons)
    expect(hauteurs).toEqual([0, 1, 2, 3, 4])
  })

  it('se replie dans la fenêtre : sans repli, la Boîte mesurée monterait de 22 octaves', () => {
    const beaucoup = Array.from({ length: 30 }, (): Evenement => ({
      type: 'COMBINAISON_TROUVEE',
      combinaison: { type: 'QUINZAINE', cartes: parseCartes('7♠ 8♥'), points: 2 },
      points: 2,
      origine: 'BOITE',
    }))
    const partition = planifier([
      ...beaucoup,
      { type: 'MULT_APPLIQUE', mult: 2, voies: ['QUINZAINE'], origine: 'BOITE' },
    ])
    const hauteurs = scandes(partition.coups).map((coup) => coup.demiTons)
    expect(Math.max(...hauteurs)).toBeLessThan(REGLES_SCANSION.fenetreDemiTons)
    expect(hauteurs[REGLES_SCANSION.fenetreDemiTons]).toBe(0)
  })
})

describe('le tempo vient d’un budget, pas d’une constante', () => {
  it('une main ordinaire tient le plafond et claque', () => {
    expect(intervalles(3, 1)).toEqual([
      REGLES_SCANSION.intervalleMax,
      REGLES_SCANSION.intervalleMax,
      REGLES_SCANSION.intervalleMax,
    ])
  })

  it('un Compte moyen tient dans le budget', () => {
    const durees = intervalles(20, 1)
    const total = durees.reduce((somme, duree) => somme + duree, 0)
    expect(total).toBeCloseTo(REGLES_SCANSION.budgetCompte, 0)
  })

  it('la Boîte mesurée à 274 combinaisons tombe au plancher : c’est le roulement', () => {
    const durees = intervalles(274, 5)
    expect(Math.min(...durees)).toBe(REGLES_SCANSION.intervalleMin)
    expect(durees.every((duree) => duree <= REGLES_SCANSION.intervalleMax)).toBe(true)
  })
})

describe('le tempo accélère avec le Mult [carnet §2.3]', () => {
  it('sans Mult, le tempo est plat', () => {
    const durees = intervalles(10, REGLES_SCANSION.multDeBase)
    expect(new Set(durees.map((duree) => duree.toFixed(6))).size).toBe(1)
  })

  it('au Mult maximal, le dernier intervalle vaut le ratio du premier', () => {
    const durees = intervalles(10, REGLES_SCANSION.multSature)
    const premier = durees[0] as number
    const dernier = durees[durees.length - 1] as number
    expect(dernier / premier).toBeCloseTo(REGLES_SCANSION.ratioAuMultSature, 5)
  })

  it('sature au-delà du Mult de référence au lieu de s’emballer', () => {
    expect(ratioDuMult(40)).toBeCloseTo(REGLES_SCANSION.ratioAuMultSature, 10)
    expect(ratioDuMult(0)).toBeCloseTo(REGLES_SCANSION.ratioAuMultDeBase, 10)
  })

  it('accélérer ne rallonge ni ne raccourcit le Compte', () => {
    const plat = intervalles(20, REGLES_SCANSION.multDeBase)
    const emballe = intervalles(20, REGLES_SCANSION.multSature)
    const somme = (durees: readonly number[]): number => durees.reduce((a, b) => a + b, 0)
    expect(somme(emballe)).toBeCloseTo(somme(plat), 0)
  })
})

describe('la structure de la partition', () => {
  it('laisse une respiration avant la multiplication', () => {
    const partition = planifier(evenementsDuCompte('5♥ 6♠ 7♦ 8♣', '4♠'))
    const scandesDuCompte = scandes(partition.coups)
    const derniere = scandesDuCompte.at(-1) as Coup
    const mult = partition.coups.find((coup) => coup.evenement.type === 'MULT_APPLIQUE') as Coup
    const tempo = intervalles(scandesDuCompte.length, 4).at(-1) as number
    expect(mult.instant - derniere.instant).toBeCloseTo(
      tempo + REGLES_SCANSION.respirationAvantMult,
      5,
    )
  })

  it('remet le total et la hauteur à zéro entre le Compte de la main et celui de la Boîte', () => {
    const partition = planifier([
      ...evenementsDuCompte('5♥ 6♠ 7♦ 8♣', '4♠', 'MAIN'),
      ...evenementsDuCompte('4♠ 5♥ 5♦ 6♣', '6♠', 'BOITE'),
    ])
    const boite = scandes(partition.coups).filter(
      (coup) =>
        coup.evenement.type === 'COMBINAISON_TROUVEE' && coup.evenement.origine === 'BOITE',
    )
    expect(boite[0]?.scande?.total).toBe(2)
    expect(boite[0]?.demiTons).toBe(0)
    expect(boite[0]?.scande?.premierDeSaVoie).toBe(true)
  })

  it('encaisse une main à zéro point sans un seul coup scandé', () => {
    const partition = planifier(evenementsDuCompte('2♠ 4♥ 6♦ 8♣', 'R♠'))
    expect(scandes(partition.coups)).toHaveLength(0)
    expect(partition.coups).toHaveLength(2)
    expect(partition.duree).toBeGreaterThan(0)
  })
})

describe('la partition ne perd rien du flux du cœur', () => {
  /** Une Manche entiere jouee par le harnais : le flux reel, dans son ordre reel. */
  function evenementsDuneManche(graine: number): Evenement[] {
    const strategie = strategieParNom('totale')
    const depart = creerManche(graine)
    let state = depart.state
    let rng = creerRng(graine * 7919 + 13)
    const tous: Evenement[] = [...depart.events]

    while (state.phase !== 'MANCHE_TERMINEE') {
      if (state.phase === 'DEFAUSSE') {
        const choix = strategie.choisir(state, rng, { retournesBoite: 4 })
        rng = choix.rng
        const resultat = reduire(state, { type: 'DEFAUSSER', indices: choix.indices })
        tous.push(...resultat.events)
        state = resultat.state
        continue
      }
      const resultat = reduire(state, choisirPose(state))
      tous.push(...resultat.events)
      state = resultat.state
    }
    return tous
  }

  const graines = [1, 2, 3, 7, 42]

  it('produit exactement un coup par événement', () => {
    for (const graine of graines) {
      const evenements = evenementsDuneManche(graine)
      expect(planifier(evenements).coups).toHaveLength(evenements.length)
    }
  })

  it('place les coups dans un ordre chronologique', () => {
    for (const graine of graines) {
      const coups = planifier(evenementsDuneManche(graine)).coups
      for (let i = 1; i < coups.length; i++) {
        expect((coups[i] as Coup).instant).toBeGreaterThanOrEqual((coups[i - 1] as Coup).instant)
      }
    }
  })

  it('donne une voix à chaque combinaison et une durée finie à la Manche', () => {
    const partition = planifier(evenementsDuneManche(42))
    expect(scandes(partition.coups).every((coup) => coup.voix === 'compte')).toBe(true)
    expect(Number.isFinite(partition.duree)).toBe(true)
  })
})

describe('le feel est une donnée, pas une constante [CLAUDE.md]', () => {
  it('se règle entièrement depuis les presets', () => {
    const lent: ReglesScansion = { ...REGLES_SCANSION, budgetCompte: 9000, intervalleMax: 900 }
    const durees = intervalles(20, 1, lent)
    expect(durees.reduce((a, b) => a + b, 0)).toBeCloseTo(9000, 0)
  })
})
