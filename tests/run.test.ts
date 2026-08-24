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
import { CONFIG_PAR_DEFAUT } from '../src/presets/index.js'

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

/**
 * Force les cibles, et raccourcit la run a leur nombre : ces tests pilotent la machine a
 * etats de la run, pas la calibration des 12 Manches.
 */
const cibles = (valeurs: readonly number[]): OptionsRun => ({
  reglesRun: {
    ...REGLES_RUN,
    nombreDeManches: valeurs.length,
    cibles: valeurs,
    indicesAdversaires: [valeurs.length - 1],
    ajustementsBoss: {},
  },
})

describe('la structure de la run', () => {
  it('enchaîne 12 Manches et met un Adversaire à la fin de chaque Rue', () => {
    expect(REGLES_RUN.nombreDeManches).toBe(12)
    expect(REGLES_RUN.indicesAdversaires).toEqual([2, 5, 8, 11])
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

describe('le plateau persistant [carnet §4.2]', () => {
  it('la cheville ne repart pas de zéro à la Manche suivante', () => {
    let { run } = creerRun(1, cibles([1, 1, 1]))
    run = joueUneManche(run)
    const apresLaPremiere = run.manche.trou
    expect(apresLaPremiere).toBeGreaterThan(0)

    run = commencerMancheSuivante(run).run
    expect(run.manche.trou).toBe(apresLaPremiere)
    expect(run.indexManche).toBe(1)
  })

  it('reporte aussi les points non convertis d’une Manche à l’autre', () => {
    let { run } = creerRun(1, cibles([1, 1, 1]))
    run = joueUneManche(run)
    const reste = run.manche.reste
    run = commencerMancheSuivante(run).run
    expect(run.manche.reste).toBe(reste)
  })

  it('la run transporte la piste, la Manche ne fait que la parcourir', () => {
    let { run } = creerRun(1, cibles([1, 1, 1]))
    run = joueUneManche(run)
    expect(run.progression).toEqual({ trou: run.manche.trou, reste: run.manche.reste })
  })

  it('les 12 cibles du carnet sont des positions absolues, donc croissantes', () => {
    const croissantes = REGLES_RUN.cibles.every(
      (cible, index) => index === 0 || cible > (REGLES_RUN.cibles[index - 1] as number),
    )
    expect(croissantes).toBe(true)
  })
})

describe('dépasser le dernier Trou [carnet §8.5, amendé §8.7]', () => {
  /** Un Trou a 1 point : la premiere Manche pulveriserait la piste entiere. */
  function pisteMinuscule(plafond: number | null): OptionsRun {
    return {
      ...cibles([1, 1, 1]),
      config: {
        ...CONFIG_PAR_DEFAUT,
        manche: {
          ...CONFIG_PAR_DEFAUT.manche,
          trouFinal: 20,
          coutsDesTrous: [{ jusquAuTrou: 20, cout: 1 }],
          plafondAuDelaDeLaCible: plafond,
        },
      },
    }
  }

  it('sans plafond, gagne la run séance tenante, sans attendre la dernière Manche', () => {
    const run = jouerRun(1, pisteMinuscule(null))
    expect(run.statut).toBe('GAGNEE')
    // Gagnee des la Manche 1, et non a la troisieme.
    expect(run.indexManche).toBe(0)
    expect(run.manche.trou).toBeGreaterThanOrEqual(20)
  })

  it('la règle tient toujours : atteindre le dernier Trou gagne, quelle que soit la Manche', () => {
    // Le plafond ne change pas la regle du §8.5, il change ce qui est atteignable : ici la
    // cible de la Manche 1 est deja le dernier Trou, donc le plafond ne bride rien.
    const run = jouerRun(1, {
      ...cibles([20, 20, 20]),
      config: {
        ...CONFIG_PAR_DEFAUT,
        manche: {
          ...CONFIG_PAR_DEFAUT.manche,
          trouFinal: 20,
          coutsDesTrous: [{ jusquAuTrou: 20, cout: 1 }],
        },
      },
    })
    expect(run.statut).toBe('GAGNEE')
    expect(run.indexManche).toBe(0)
  })

  it('avec le plafond, la cheville ne peut plus doubler la cible et la run continue', () => {
    // C'est la reponse a §8.7 : la piste ne se traverse plus en une Manche, donc la Rue IV
    // et son Adversaire cessent d'etre decoratifs.
    const run = jouerRun(1, pisteMinuscule(6))
    expect(run.manche.trou).toBeLessThanOrEqual(1 + 6)
    expect(run.indexManche).toBeGreaterThan(0)
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
