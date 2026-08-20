import { describe, expect, it } from 'vitest'
import type { Evenement } from '../src/core/evenements.js'
import type { EtatPartie } from '../src/core/etat.js'
import { creerManche, reduire } from '../src/core/manche.js'
import type { Modificateur } from '../src/core/modificateurs.js'
import { creerRng } from '../src/core/rng.js'
import { indicesPosables } from '../src/core/pose.js'
import { ADVERSAIRES, LE_MESQUIN, LE_SOURD } from '../src/adversaires/catalogue.js'

function jouer(graine: number, mods: readonly Modificateur[]): { state: EtatPartie; events: Evenement[] } {
  let resultat = creerManche(graine, undefined, mods)
  const events: Evenement[] = [...resultat.events]
  while (resultat.state.phase !== 'MANCHE_TERMINEE') {
    if (resultat.state.phase === 'DEFAUSSE') {
      const attendu = resultat.state.config.manche.defaussesParDonne
      const indices = Array.from({ length: attendu }, (_, i) => resultat.state.donne.main.length - 1 - i)
      resultat = reduire(resultat.state, { type: 'DEFAUSSER', indices })
    } else {
      const pose = resultat.state.donne.pose
      if (pose === null) throw new Error('pose absente')
      const posables = indicesPosables(pose)
      const action = posables[0] === undefined
        ? ({ type: 'ENCAISSER' } as const)
        : ({ type: 'POSER', index: posables[0] } as const)
      resultat = reduire(resultat.state, action)
    }
    events.push(...resultat.events)
  }
  return { state: resultat.state, events }
}

describe('le catalogue des Adversaires', () => {
  it('contient Le Sourd et Le Mesquin', () => {
    expect(ADVERSAIRES.map((a) => a.id)).toEqual(['le-sourd', 'le-mesquin'])
  })
})

describe('Le Sourd — Boîte scellée', () => {
  const { modificateur } = LE_SOURD.instancier(creerRng(1))

  it('laisse la Boîte vide et ne compte rien', () => {
    const { state, events } = jouer(2026, [modificateur])
    expect(state.boite).toHaveLength(0)
    expect(state.scoreBoite).toBe(0)
    const comptage = events.find((e) => e.type === 'BOITE_COMPTEE')
    expect(comptage?.type === 'BOITE_COMPTEE' ? comptage.score : -1).toBe(0)
  })

  it('les mains, elles, comptent toujours', () => {
    const { state } = jouer(2026, [modificateur])
    expect(state.historique.some((d) => d.scoreMain > 0)).toBe(true)
  })
})

describe('Le Mesquin — une seule Voie', () => {
  it('annonce une Voie et n’en compte pas d’autre', () => {
    const instance = LE_MESQUIN.instancier(creerRng(3))
    expect(instance.annonce).toMatch(/Voie/)

    const { events } = jouer(2026, [instance.modificateur])
    const combinaisons = events.filter((e) => e.type === 'COMBINAISON_TROUVEE')
    const types = new Set(
      combinaisons.map((e) => (e.type === 'COMBINAISON_TROUVEE' ? e.combinaison.type : '')),
    )
    // Au plus une Voie de combinaison apparait sur toute la Manche.
    expect(types.size).toBeLessThanOrEqual(1)
  })

  it('tire des Voies différentes selon la graine', () => {
    const voies = new Set(
      Array.from({ length: 20 }, (_, i) => LE_MESQUIN.instancier(creerRng(i + 1)).annonce),
    )
    expect(voies.size).toBeGreaterThan(1)
  })

  it('ne tire jamais une Voie rare (Valet, Couleur) dans le prototype', () => {
    const annonces = Array.from({ length: 100 }, (_, i) => LE_MESQUIN.instancier(creerRng(i + 1)).annonce)
    expect(annonces.some((a) => a.includes('Valet') || a.includes('Couleur'))).toBe(false)
    // Et il tire bien parmi les trois Voies fréquentes.
    const distinctes = new Set(annonces)
    expect(distinctes.size).toBe(3)
  })
})

describe('les Adversaires réutilisent l’infrastructure des reliques', () => {
  it('sont de simples Modificateurs, sans code moteur dédié', () => {
    const sourd = LE_SOURD.instancier(creerRng(1)).modificateur
    expect(typeof sourd.configManche).toBe('function')
    expect(sourd.famille).toBe('ADVERSAIRE')
  })
})
