import { describe, expect, it } from 'vitest'
import type { Evenement } from '../src/core/evenements.js'
import type { EtatPartie } from '../src/core/etat.js'
import { creerManche, reduire } from '../src/core/manche.js'
import type { Modificateur } from '../src/core/modificateurs.js'
import { creerRng } from '../src/core/rng.js'
import { indicesPosables } from '../src/core/pose.js'
import {
  ADVERSAIRES,
  LE_BAVARD,
  LE_MESQUIN,
  LE_REGULIER,
  LE_SOURD,
  LE_TRANCHANT,
  LE_VORACE,
  L_AVARE,
  L_ORDONNE,
} from '../src/adversaires/catalogue.js'
import { parseCarte, parseCartes } from '../src/core/carte.js'
import { compterMain } from '../src/core/compte.js'
import { creerPose, poser } from '../src/core/pose.js'
import { REGLES_POSE } from '../src/presets/pose.js'

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
      const posables = indicesPosables(pose, resultat.state.config.pose)
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
  it('contient les 8 du carnet §4.4', () => {
    expect(ADVERSAIRES).toHaveLength(8)
    expect(ADVERSAIRES.map((a) => a.id)).toEqual([
      'le-regulier',
      'le-sourd',
      'le-mesquin',
      'l-avare',
      'le-vorace',
      'le-tranchant',
      'le-bavard',
      'l-ordonne',
    ])
  })

  it('chacun casse une règle : aucun ne se contente d’un hook d’économie', () => {
    for (const definition of ADVERSAIRES) {
      const { modificateur } = definition.instancier(creerRng(1))
      const casseUneRegle =
        modificateur.configManche !== undefined ||
        modificateur.configPose !== undefined ||
        modificateur.surCombinaisons !== undefined ||
        modificateur.surCheville !== undefined
      expect(casseUneRegle, definition.id).toBe(true)
      expect(modificateur.famille).toBe('ADVERSAIRE')
    }
  })
})

describe('Le Régulier — la cheville qui avance seule', () => {
  const { modificateur } = LE_REGULIER.instancier(creerRng(1))

  it('déplace la cible de 2 Trous après chaque Donne', () => {
    const { state } = jouer(2026, [modificateur])
    const depart = state.config.manche.cibleAdversaire
    expect(state.cible).toBe(depart + 2 * state.config.manche.nombreDeDonnes)
  })

  it('annonce chaque avancée par un événement', () => {
    const { state, events } = jouer(2026, [modificateur])
    const avancees = events.filter((e) => e.type === 'CIBLE_AVANCE')
    expect(avancees).toHaveLength(state.config.manche.nombreDeDonnes)
  })
})

describe('L’Avare — cinq cartes', () => {
  const { modificateur } = L_AVARE.instancier(creerRng(1))

  it('ne distribue que 5 cartes, donc n’en garde que 3', () => {
    const { state } = creerManche(7, undefined, [modificateur])
    expect(state.donne.main).toHaveLength(5)
    const apres = reduire(state, { type: 'DEFAUSSER', indices: [0, 1] })
    expect(apres.state.donne.main).toHaveLength(3)
  })
})

describe('Le Vorace — il se nourrit des gros scores', () => {
  const { modificateur } = LE_VORACE.instancier(creerRng(1))

  it('bondit au-dessus du seuil, et pas en dessous', () => {
    const ctx = { donne: 1, explosee: false }
    expect(modificateur.surCheville?.(20, { ...ctx, scoreDeLaDonne: 101 })).toBe(25)
    expect(modificateur.surCheville?.(20, { ...ctx, scoreDeLaDonne: 100 })).toBe(20)
  })
})

describe('Le Tranchant — l’explosion coûte des Trous', () => {
  const { modificateur } = LE_TRANCHANT.instancier(creerRng(1))

  it('n’avance que sur une explosion', () => {
    const ctx = { donne: 1, scoreDeLaDonne: 500 }
    expect(modificateur.surCheville?.(20, { ...ctx, explosee: true })).toBe(28)
    expect(modificateur.surCheville?.(20, { ...ctx, explosee: false })).toBe(20)
  })
})

describe('L’Ordonné — la Pose en ordre croissant', () => {
  const { modificateur } = L_ORDONNE.instancier(creerRng(1))
  const regles = modificateur.configPose?.(REGLES_POSE) ?? REGLES_POSE

  it('n’autorise que les rangs strictement supérieurs', () => {
    const pose = creerPose(parseCartes('5♠ 3♥ 7♦ 5♣'))
    const apres = poser(pose, 1, regles).etat
    // 3 pose : ne restent posables que 5♠, 7♦, 5♣ — tous strictement au-dessus de 3.
    expect(indicesPosables(apres, regles)).toHaveLength(3)
    const apresLe5 = poser(apres, 0, regles).etat
    // 5 posé : le second 5 n'est plus posable, seul le 7♦ l'est — retombé à l'index 0.
    expect(apresLe5.enMain.map((carte) => carte.rang)).toEqual(['7', '5'])
    expect(indicesPosables(apresLe5, regles)).toEqual([0])
  })

  it('refuse de poser hors ordre', () => {
    const pose = creerPose(parseCartes('5♠ 3♥'))
    const apres = poser(pose, 0, regles).etat
    expect(() => poser(apres, 0, regles)).toThrow()
  })

  it('sans lui, tout ordre reste permis', () => {
    const pose = creerPose(parseCartes('5♠ 3♥ 7♦ 5♣'))
    const apres = poser(pose, 0, REGLES_POSE).etat
    expect(indicesPosables(apres, REGLES_POSE)).toHaveLength(3)
  })
})

describe('Le Bavard — la Retourne ne compte pas', () => {
  const { modificateur } = LE_BAVARD.instancier(creerRng(1))

  function compterAvecLeBavard(main: string, retourneTexte: string) {
    const cartes = parseCartes(main)
    const retourne = parseCarte(retourneTexte)
    const brutes = compterMain(cartes, retourne, false)
    return {
      brutes,
      filtrees: modificateur.surCombinaisons?.(brutes, { origine: 'MAIN', cartes, retourne }) ?? [],
      retourne,
    }
  }

  it('supprime toute combinaison qui s’appuie sur la Retourne', () => {
    // 5♥ 6♠ 7♦ 8♣ + 4♠ : la suite de 5 et une quinzaine passent par la Retourne.
    const { brutes, filtrees, retourne } = compterAvecLeBavard('5♥ 6♠ 7♦ 8♣', '4♠')
    expect(filtrees.length).toBeLessThan(brutes.length)
    const utiliseLaRetourne = filtrees.some((combinaison) =>
      combinaison.cartes.some((carte) => carte.rang === retourne.rang && carte.couleur === retourne.couleur),
    )
    expect(utiliseLaRetourne).toBe(false)
  })

  it('rend le Valet de la Retourne impossible par construction', () => {
    const { filtrees } = compterAvecLeBavard('V♠ 2♥ 4♦ 9♣', '7♠')
    expect(filtrees.filter((combinaison) => combinaison.type === 'VALET')).toHaveLength(0)
  })

  it('rétrograde la Couleur au lieu de la supprimer', () => {
    // 2♠ 3♠ 4♠ 5♠ + K♠ : couleur de 5 cartes, Retourne assortie.
    const { filtrees } = compterAvecLeBavard('2♠ 3♠ 4♠ 5♠', 'R♠')
    const couleur = filtrees.find((combinaison) => combinaison.type === 'COULEUR')
    expect(couleur?.cartes).toHaveLength(4)
    expect(couleur?.points).toBe(4)
  })

  it('ne pénalise pas une couleur dont la Retourne est d’une autre famille', () => {
    const { filtrees } = compterAvecLeBavard('2♠ 3♠ 4♠ 5♠', 'R♥')
    const couleur = filtrees.find((combinaison) => combinaison.type === 'COULEUR')
    expect(couleur?.points).toBe(4)
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
