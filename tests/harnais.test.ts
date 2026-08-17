import { describe, expect, it } from 'vitest'
import { creerManche, reduire } from '../src/core/manche.js'
import { jouerManche, mesurerDesaccords, simuler } from '../src/sim/harnais.js'
import { choisirPose, OPTIONS_PAR_DEFAUT, strategieParNom } from '../src/sim/strategies.js'

const RAPIDE = { retournesBoite: 3 }

describe('le harnais', () => {
  it('rejoue la même Manche pour une graine donnée', () => {
    const strategie = strategieParNom('totale')
    const a = jouerManche(11, strategie, RAPIDE)
    const b = jouerManche(11, strategie, RAPIDE)
    expect(a).toEqual(b)
  })

  it('joue bien 4 Donnes par Manche', () => {
    const mesures = jouerManche(3, strategieParNom('aleatoire'), RAPIDE)
    expect(mesures.scoresDonne).toHaveLength(4)
    expect(mesures.totalManche).toBe(
      mesures.scoresDonne.reduce((a, b) => a + b, 0) + mesures.scoreBoite,
    )
  })

  it('refuse une stratégie inconnue', () => {
    expect(() => strategieParNom('geniale')).toThrow()
  })
})

describe('les stratégies de défausse', () => {
  const manches = 40

  it('la défausse optimale bat nettement la défausse aléatoire', () => {
    const hasard = simuler(strategieParNom('aleatoire'), manches, 1, RAPIDE)
    const optimale = simuler(strategieParNom('totale'), manches, 1, RAPIDE)
    expect(optimale.totalMoyen).toBeGreaterThan(hasard.totalMoyen)
  })

  it('« main » marque plus en Donne, « boite » marque plus en Boîte', () => {
    const main = simuler(strategieParNom('main'), manches, 1, RAPIDE)
    const boite = simuler(strategieParNom('boite'), manches, 1, RAPIDE)
    expect(main.donneMoyenne).toBeGreaterThan(boite.donneMoyenne)
    expect(boite.boiteMoyenne).toBeGreaterThan(main.boiteMoyenne)
  })

  it('ne défausse jamais deux fois la même carte', () => {
    const strategie = strategieParNom('totale')
    const { state } = creerManche(5)
    const choix = strategie.choisir(state, { etat: 1 }, OPTIONS_PAR_DEFAUT)
    expect(new Set(choix.indices).size).toBe(choix.indices.length)
    expect(choix.indices).toHaveLength(2)
  })
})

describe('la mesure « décision ou réflexe »', () => {
  const desaccords = mesurerDesaccords(10, 1, RAPIDE)

  it('observe une défausse par Donne', () => {
    expect(desaccords.decisions).toBe(40)
  })

  it('mesure une part de désaccord entre 0 et 1', () => {
    expect(desaccords.partDesaccord).toBeGreaterThanOrEqual(0)
    expect(desaccords.partDesaccord).toBeLessThanOrEqual(1)
  })

  it('les 15 défausses ne se valent pas', () => {
    expect(desaccords.etendueMoyenne).toBeGreaterThan(0)
    expect(desaccords.etendueMoyenne).toBeGreaterThanOrEqual(desaccords.margeMoyenne)
  })

  it('suivre une seule philosophie coûte quelque chose, jamais rien de négatif', () => {
    expect(desaccords.coutToutBoite).toBeGreaterThanOrEqual(0)
    expect(desaccords.coutToutMain).toBeGreaterThan(0)
  })
})

describe('la stratégie de Pose', () => {
  it('n’explose jamais', () => {
    for (let graine = 1; graine <= 30; graine++) {
      const mesures = jouerManche(graine, strategieParNom('totale'), RAPIDE)
      expect(mesures.explosions).toBe(0)
    }
  })

  it('encaisse quand plus aucune carte n’est posable', () => {
    let { state } = creerManche(42)
    state = reduire(state, { type: 'DEFAUSSER', indices: [0, 1] }).state
    while (state.phase === 'POSE') {
      const action = choisirPose(state)
      state = reduire(state, action).state
    }
    const pose = state.historique[0]
    expect(pose?.explosee).toBe(false)
  })
})
