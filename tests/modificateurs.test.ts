import { describe, expect, it } from 'vitest'
import type { Evenement } from '../src/core/evenements.js'
import type { EtatPartie } from '../src/core/etat.js'
import { creerManche, reduire } from '../src/core/manche.js'
import type { Modificateur } from '../src/core/modificateurs.js'
import { indicesPosables } from '../src/core/pose.js'

/** Joue une Manche entiere avec une strategie betise : defausse les 2 dernieres, pose sans exploser. */
function jouer(
  graine: number,
  modificateurs: readonly Modificateur[] = [],
): { state: EtatPartie; events: Evenement[] } {
  let resultat = creerManche(graine, undefined, modificateurs)
  const events: Evenement[] = [...resultat.events]
  while (resultat.state.phase !== 'MANCHE_TERMINEE') {
    if (resultat.state.phase === 'DEFAUSSE') {
      resultat = reduire(resultat.state, { type: 'DEFAUSSER', indices: [4, 5] })
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

const NEUTRE: Modificateur = {
  id: 'neutre',
  nom: 'Neutre',
  description: 'ne fait rien',
  famille: 'STRUCTURE',
}

describe('un modificateur neutre ne change RIEN', () => {
  it('produit exactement la même Manche que sans modificateur', () => {
    const sans = jouer(2026)
    const avec = jouer(2026, [NEUTRE])
    expect(avec.state.trou).toBe(sans.state.trou)
    expect(avec.state.scoreBoite).toBe(sans.state.scoreBoite)
    expect(avec.events).toEqual(sans.events)
  })

  it('laisse tourner la CLI de l’étape 1 à l’identique sur 30 graines', () => {
    for (let graine = 1; graine <= 30; graine++) {
      expect(jouer(graine, [NEUTRE]).state.trou).toBe(jouer(graine).state.trou)
    }
  })
})

describe('le repli des hooks fonctionne', () => {
  it('surScore reçoit et tord la contribution', () => {
    const doubleMult: Modificateur = {
      id: 'test-mult', nom: 'x2 mult', description: '', famille: 'COMPTE',
      surScore: (contrib) => ({ ...contrib, mult: contrib.mult * 2 }),
    }
    const sans = jouer(7)
    const avec = jouer(7, [doubleMult])
    // Doubler le mult ne peut qu'augmenter (ou egaler, si 0 point) le score.
    expect(avec.state.trou).toBeGreaterThanOrEqual(sans.state.trou)
    const scoresSans = sans.state.historique.map((d) => d.scoreMain)
    const scoresAvec = avec.state.historique.map((d) => d.scoreMain)
    expect(scoresAvec.some((s, i) => s > (scoresSans[i] ?? 0))).toBe(true)
  })

  it('surCombinaisons peut ajouter une combinaison', () => {
    const bonus: Modificateur = {
      id: 'test-combi', nom: '+1 quinzaine fictive', description: '', famille: 'COMPTE',
      surCombinaisons: (combis, ctx) =>
        ctx.origine === 'MAIN' ? [...combis, { type: 'QUINZAINE', cartes: [], points: 2 }] : [...combis],
    }
    const sans = jouer(3)
    const avec = jouer(3, [bonus])
    expect(avec.state.historique[0]?.pointsMain).toBeGreaterThan(sans.state.historique[0]?.pointsMain ?? 0)
  })

  it('les hooks se chaînent dans l’ordre de la liste', () => {
    const trace: string[] = []
    const a: Modificateur = {
      id: 'a', nom: 'a', description: '', famille: 'STRUCTURE',
      surScore: (c) => { trace.push('a'); return c },
    }
    const b: Modificateur = {
      id: 'b', nom: 'b', description: '', famille: 'STRUCTURE',
      surScore: (c) => { trace.push('b'); return c },
    }
    jouer(1, [a, b])
    // Le premier Compte doit voir a puis b.
    expect(trace.slice(0, 2)).toEqual(['a', 'b'])
  })
})

describe('configManche transforme les règles avant la Manche', () => {
  it('un modificateur qui scelle la Boîte la laisse vide', () => {
    const sourd: Modificateur = {
      id: 'test-sourd', nom: 'sourd', description: '', famille: 'ADVERSAIRE',
      configManche: (regles) => ({ ...regles, boiteScellee: true }),
    }
    const { state, events } = jouer(9, [sourd])
    expect(state.boite).toHaveLength(0)
    const comptage = events.find((e) => e.type === 'BOITE_COMPTEE')
    expect(comptage?.type === 'BOITE_COMPTEE' ? comptage.score : -1).toBe(0)
  })

  it('un modificateur qui révèle la Retourne avant la défausse le fait', () => {
    const pince: Modificateur = {
      id: 'test-pince', nom: 'pince', description: '', famille: 'RETOURNE',
      configManche: (regles) => ({ ...regles, revelerRetourneAvantDefausse: true }),
    }
    const { state, events } = creerManche(5, undefined, [pince])
    // La Retourne est connue avant toute défausse.
    expect(state.donne.retourne).not.toBeNull()
    expect(events.some((e) => e.type === 'RETOURNE_REVELEE')).toBe(true)
    expect(state.phase).toBe('DEFAUSSE')
  })
})
