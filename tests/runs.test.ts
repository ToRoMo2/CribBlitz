import { describe, expect, it } from 'vitest'
import type { OptionsRun } from '../src/core/run.js'
import { CONFIG_PAR_DEFAUT } from '../src/presets/index.js'
import { REGLES_RUN } from '../src/presets/run.js'
import { jouerRunComplete, politiqueParNom, simulerRuns } from '../src/sim/runs.js'

/**
 * Le harnais de l'etape 4. Ces tests verifient la machine a mesurer, pas la calibration :
 * les chiffres du jeu bougeront, la mecanique de mesure ne doit pas.
 */

const OPTIONS = { retournesBoite: 2 }

/** Une run courte et facile : on teste le harnais, pas la difficulte. */
const facile: OptionsRun = {
  reglesRun: {
    ...REGLES_RUN,
    nombreDeManches: 3,
    cibles: [1, 2, 3],
    indicesAdversaires: [2],
    ajustementsBoss: {},
  },
}

describe('le harnais de runs complètes', () => {
  it('joue une run jusqu’à son terme et relève chaque Manche', () => {
    const mesures = jouerRunComplete(1, politiqueParNom('rien'), OPTIONS, facile)
    expect(mesures.gagnee).toBe(true)
    expect(mesures.mancheDeMort).toBeNull()
    expect(mesures.manches.length).toBeGreaterThan(0)
    expect(mesures.manches[0]?.index).toBe(0)
  })

  it('relève une piste continue : chaque Manche part où la précédente s’est arrêtée', () => {
    const mesures = jouerRunComplete(2, politiqueParNom('rien'), OPTIONS, facile)
    for (let i = 1; i < mesures.manches.length; i++) {
      const precedente = mesures.manches[i - 1]
      const courante = mesures.manches[i]
      expect(courante?.trouAvant).toBe(precedente?.trouApres)
    }
  })

  it('la cheville ne recule jamais', () => {
    const mesures = jouerRunComplete(3, politiqueParNom('tout'), OPTIONS, facile)
    for (const manche of mesures.manches) {
      expect(manche.trouApres).toBeGreaterThanOrEqual(manche.trouAvant)
    }
  })

  it('désigne la Manche de mort quand la run échoue', () => {
    const impossible: OptionsRun = {
      reglesRun: { ...facile.reglesRun!, cibles: [1, 100000, 3] },
    }
    const mesures = jouerRunComplete(1, politiqueParNom('rien'), OPTIONS, impossible)
    expect(mesures.gagnee).toBe(false)
    expect(mesures.mancheDeMort).toBe(1)
  })

  it('la politique « rien » n’achète rien, « tout » achète', () => {
    const sans = jouerRunComplete(4, politiqueParNom('rien'), OPTIONS, facile)
    const avec = jouerRunComplete(4, politiqueParNom('tout'), OPTIONS, facile)
    expect(sans.manches.every((manche) => manche.reliques === 0)).toBe(true)
    expect(avec.manches.some((manche) => manche.reliques > 0)).toBe(true)
  })
})

describe('l’agrégation par Rue', () => {
  const bilan = simulerRuns(politiqueParNom('rien'), 4, 1, OPTIONS, facile)

  it('rend une ligne par Rue', () => {
    expect(bilan.rues).toHaveLength(1)
    expect(bilan.rues[0]?.rue).toBe(1)
  })

  it('compte les morts sur autant de cases qu’il y a de Manches', () => {
    expect(bilan.mortsParManche).toHaveLength(3)
  })

  it('mesure des Trous par Manche cohérents avec la piste', () => {
    const rue = bilan.rues[0]
    expect(rue?.trousParManche).toBeGreaterThan(0)
    expect(rue?.coutMoyenDuTrou).toBeGreaterThanOrEqual(
      CONFIG_PAR_DEFAUT.manche.coutsDesTrous[0]?.cout ?? 0,
    )
  })
})
