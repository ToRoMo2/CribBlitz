import { describe, expect, it } from 'vitest'
import { indicesPosables } from '../src/core/pose.js'
import {
  commencerMancheSuivante,
  creerRun,
  reduireRun,
  type EtatRun,
  type OptionsRun,
} from '../src/core/run.js'
import { REGLES_RUN } from '../src/presets/run.js'

/**
 * Pilote une run entiere avec une strategie betise : defausse les dernieres cartes, pose
 * sans exploser, et lance chaque Manche suivante sans rien acheter. Sert a tester la machine
 * a etats de la run, pas la calibration.
 */
function jouerRun(graine: number, options: OptionsRun = {}): EtatRun {
  let { run } = creerRun(graine, options)
  for (;;) {
    if (run.statut === 'GAGNEE' || run.statut === 'PERDUE') return run
    if (run.statut === 'BOUTIQUE') {
      run = commencerMancheSuivante(run).run
      continue
    }
    if (run.manche.phase === 'DEFAUSSE') {
      const attendu = run.manche.config.manche.defaussesParDonne
      const indices = Array.from({ length: attendu }, (_, i) => run.manche.donne.main.length - 1 - i)
      run = reduireRun(run, { type: 'DEFAUSSER', indices }).run
    } else {
      const pose = run.manche.donne.pose
      if (pose === null) throw new Error('pose absente')
      const posables = indicesPosables(pose)
      const action = posables[0] === undefined
        ? ({ type: 'ENCAISSER' } as const)
        : ({ type: 'POSER', index: posables[0] } as const)
      run = reduireRun(run, action).run
    }
  }
}

// Le boss tire sa cible de ciblesBoss ; on la cale sur la valeur de la Manche 3 pour que
// forcer cibles([…, X]) force bien l'issue du boss aussi.
const cibles = (valeurs: readonly number[]): OptionsRun => ({
  reglesRun: {
    ...REGLES_RUN,
    cibles: valeurs,
    ciblesBoss: { 'le-sourd': valeurs[2] ?? 0, 'le-mesquin': valeurs[2] ?? 0 },
  },
})

describe('la structure de la run', () => {
  it('enchaîne 3 Manches et met l’Adversaire sur la dernière', () => {
    expect(REGLES_RUN.nombreDeManches).toBe(3)
    expect(REGLES_RUN.indexAdversaire).toBe(2)
    const { run } = creerRun(1)
    expect(run.indexManche).toBe(0)
    expect(run.statut).toBe('MANCHE')
    // La Manche 1 n'a pas l'Adversaire.
    expect(run.manche.modificateurs).toHaveLength(0)
  })

  it('applique l’Adversaire uniquement à la Manche 3', () => {
    let { run } = creerRun(1, cibles([1, 1, 1]))
    // Manche 1 et 2 : aucun modificateur.
    expect(run.manche.modificateurs).toHaveLength(0)
    run = jouerJusquA(run, 2)
    expect(run.indexManche).toBe(2)
    expect(run.manche.modificateurs).toHaveLength(1)
    expect(run.manche.modificateurs[0]?.famille).toBe('ADVERSAIRE')
  })
})

describe('la victoire et la défaite', () => {
  it('des cibles triviales donnent une run gagnée', () => {
    const run = jouerRun(1, cibles([1, 1, 1]))
    expect(run.statut).toBe('GAGNEE')
    expect(run.indexManche).toBe(2)
  })

  it('une cible inatteignable donne une défaite dès la Manche 1', () => {
    const run = jouerRun(1, cibles([100000, 1, 1]))
    expect(run.statut).toBe('PERDUE')
    expect(run.indexManche).toBe(0)
  })

  it('une défaite en Manche 3 arrête la run', () => {
    const run = jouerRun(1, cibles([1, 1, 100000]))
    expect(run.statut).toBe('PERDUE')
    expect(run.indexManche).toBe(2)
  })
})

describe('l’économie de la run', () => {
  it('verse des gains entre les Manches', () => {
    let { run } = creerRun(1, cibles([1, 1, 1]))
    run = joueUneManche(run)
    expect(run.statut).toBe('BOUTIQUE')
    expect(run.argent).toBeGreaterThan(0)
    expect(run.dernierGain).not.toBeNull()
  })
})

describe('le déterminisme', () => {
  it('la même graine rejoue la même run', () => {
    const a = jouerRun(42)
    const b = jouerRun(42)
    expect(a.statut).toBe(b.statut)
    expect(a.argent).toBe(b.argent)
    expect(a.indexManche).toBe(b.indexManche)
  })
})

/** Joue la Manche courante jusqu'a son terme (BOUTIQUE, GAGNEE ou PERDUE). */
function joueUneManche(run: EtatRun): EtatRun {
  let courant = run
  while (courant.statut === 'MANCHE') {
    if (courant.manche.phase === 'DEFAUSSE') {
      const attendu = courant.manche.config.manche.defaussesParDonne
      const indices = Array.from({ length: attendu }, (_, i) => courant.manche.donne.main.length - 1 - i)
      courant = reduireRun(courant, { type: 'DEFAUSSER', indices }).run
    } else {
      const pose = courant.manche.donne.pose
      if (pose === null) throw new Error('pose absente')
      const posables = indicesPosables(pose)
      const action = posables[0] === undefined
        ? ({ type: 'ENCAISSER' } as const)
        : ({ type: 'POSER', index: posables[0] } as const)
      courant = reduireRun(courant, action).run
    }
  }
  return courant
}

/** Avance la run jusqu'a etre en train de jouer la Manche d'index voulu. */
function jouerJusquA(run: EtatRun, index: number): EtatRun {
  let courant = run
  while (courant.indexManche < index && courant.statut !== 'PERDUE' && courant.statut !== 'GAGNEE') {
    courant = joueUneManche(courant)
    if (courant.statut === 'BOUTIQUE') courant = commencerMancheSuivante(courant).run
  }
  return courant
}
