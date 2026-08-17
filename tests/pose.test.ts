import { describe, expect, it } from 'vitest'
import { formatCarte, parseCartes, type Carte } from '../src/core/carte.js'
import { creerPose, encaisser, indicesPosables, poser, type EtatPose } from '../src/core/pose.js'
import type { Evenement } from '../src/core/evenements.js'

/** Joue une sequence de cartes designees par leur nom, dans l'ordre. */
function jouer(main: string, sequence: string): { etat: EtatPose; evenements: Evenement[] } {
  let etat = creerPose(parseCartes(main))
  const evenements: Evenement[] = []
  for (const nom of sequence.split(/\s+/).filter((mot) => mot.length > 0)) {
    const index = etat.enMain.findIndex((carte: Carte) => formatCarte(carte) === nom)
    if (index < 0) throw new Error(`${nom} n'est pas en main`)
    const resultat = poser(etat, index)
    etat = resultat.etat
    evenements.push(...resultat.evenements)
  }
  return { etat, evenements }
}

function raisons(evenements: readonly Evenement[]): string[] {
  return evenements
    .filter((evenement) => evenement.type === 'POSE_MARQUE')
    .map((evenement) => evenement.raison)
}

describe('les paliers de la Pose [RÈGLE §1.3]', () => {
  it('le total exact de 15 vaut 2', () => {
    const { etat } = jouer('5♠ 10♥ 3♦ 8♣', '5♠ 10♥')
    expect(etat.total).toBe(15)
    expect(etat.points).toBe(2)
  })

  it('un total de 15 dépassé ne vaut rien', () => {
    const { etat } = jouer('9♠ 8♥ 3♦ 2♣', '9♠ 8♥')
    expect(etat.total).toBe(17)
    expect(etat.points).toBe(0)
  })

  it('le total exact de 31 vaut 2, et la dernière carte 1', () => {
    const { etat } = jouer('10♠ D♥ R♦ A♣', '10♠ D♥ R♦ A♣')
    expect(etat.total).toBe(31)
    expect(etat.points).toBe(3)
    expect(etat.terminee).toBe(true)
    expect(etat.explosee).toBe(false)
  })

  it('les 4 cartes posées sans dépasser 31 valent 1 de plus', () => {
    const { evenements } = jouer('2♠ 4♥ 7♦ 9♣', '2♠ 4♥ 7♦ 9♣')
    expect(raisons(evenements)).toContain('DERNIERE_CARTE')
  })
})

describe('les répétitions de la Pose [RÈGLE §1.3]', () => {
  it('une paire vaut 2, un brelan 6, un carré 12', () => {
    const un = jouer('5♠ 5♥ 5♦ 5♣', '5♠ 5♥')
    expect(un.etat.points).toBe(2)

    const deux = jouer('5♠ 5♥ 5♦ 5♣', '5♠ 5♥ 5♦')
    // 10 = paire 2 + quinzaine 2 (le total atteint 15) + brelan 6
    expect(deux.etat.points).toBe(10)

    const trois = jouer('5♠ 5♥ 5♦ 5♣', '5♠ 5♥ 5♦ 5♣')
    expect(trois.etat.points).toBe(23)
  })

  it('deux rangs différents ne font pas une répétition', () => {
    const { etat } = jouer('5♠ 6♥ 3♦ 2♣', '5♠ 6♥')
    expect(etat.points).toBe(0)
  })
})

describe('les suites de la Pose [RÈGLE §1.3]', () => {
  it('ne tiennent pas compte de l’ordre : 6 puis 4 puis 5 est une suite de 3', () => {
    const { etat, evenements } = jouer('6♠ 4♥ 5♦ R♣', '6♠ 4♥ 5♦')
    // 5 = quinzaine 2 (total 15) + suite de 3
    expect(etat.points).toBe(5)
    expect(raisons(evenements)).toContain('SUITE')
  })

  it('s’étendent à 4 cartes', () => {
    const { etat } = jouer('6♠ 4♥ 5♦ 7♣', '6♠ 4♥ 5♦ 7♣')
    // 2 (quinzaine) + 3 (suite de 3) + 4 (suite de 4) + 1 (derniere carte)
    expect(etat.points).toBe(10)
  })

  it('sont cassées par un rang répété', () => {
    const { etat } = jouer('4♠ 5♥ 6♦ 6♣', '4♠ 5♥ 6♦ 6♣')
    // 2 (quinzaine) + 3 (suite) + 2 (paire) + 1 (derniere carte)
    expect(etat.points).toBe(8)
  })

  it('ne comptent pas en dessous de 3 cartes', () => {
    const { etat } = jouer('4♠ 5♥ R♦ 2♣', '4♠ 5♥')
    expect(etat.points).toBe(0)
  })
})

describe("l'explosion [RÈGLE §1.3 adaptée]", () => {
  it('dépasser 31 fait perdre tous les points de Pose de la Donne', () => {
    const { etat, evenements } = jouer('5♠ 10♥ R♦ D♣', '5♠ 10♥ R♦ D♣')
    expect(etat.total).toBe(35)
    expect(etat.explosee).toBe(true)
    expect(etat.points).toBe(0)
    const explosion = evenements.find((evenement) => evenement.type === 'POSE_EXPLOSE')
    expect(explosion).toBeDefined()
    expect(explosion?.type === 'POSE_EXPLOSE' ? explosion.pointsPerdus : -1).toBe(2)
  })

  it('termine la Pose', () => {
    const { etat } = jouer('10♠ 10♥ R♦ D♣', '10♠ 10♥ R♦ D♣')
    expect(etat.terminee).toBe(true)
  })

  it('les cartes posables sont annoncées avant', () => {
    const { etat } = jouer('5♠ 10♥ R♦ D♣', '5♠ 10♥ R♦')
    expect(etat.total).toBe(25)
    expect(indicesPosables(etat)).toHaveLength(0)
  })
})

describe("l'encaissement volontaire [RÈGLE §1.3]", () => {
  it('conserve les points marqués et arrête la Pose', () => {
    const { etat } = jouer('5♠ 10♥ R♦ D♣', '5♠ 10♥')
    const apres = encaisser(etat)
    expect(apres.etat.terminee).toBe(true)
    expect(apres.etat.explosee).toBe(false)
    expect(apres.etat.points).toBe(2)
    expect(apres.evenements.at(-1)).toEqual({ type: 'POSE_ENCAISSE', points: 2 })
  })

  it('est possible sans avoir posé une seule carte', () => {
    const apres = encaisser(creerPose(parseCartes('5♠ 10♥ R♦ D♣')))
    expect(apres.etat.points).toBe(0)
    expect(apres.etat.terminee).toBe(true)
  })

  it('refuse d’encaisser deux fois', () => {
    const { etat } = jouer('5♠ 10♥ R♦ D♣', '5♠ 10♥')
    expect(() => encaisser(encaisser(etat).etat)).toThrow()
  })

  it('refuse de poser après la fin', () => {
    const { etat } = jouer('10♠ D♥ R♦ A♣', '10♠ D♥ R♦ A♣')
    expect(() => poser(etat, 0)).toThrow()
  })
})

describe('la pureté de la Pose', () => {
  it('ne modifie pas l’état reçu', () => {
    const avant = creerPose(parseCartes('5♠ 10♥ R♦ D♣'))
    poser(avant, 0)
    expect(avant.posees).toHaveLength(0)
    expect(avant.total).toBe(0)
  })

  it('émet un POSE_CARTE par carte posée', () => {
    const { evenements } = jouer('6♠ 4♥ 5♦ 7♣', '6♠ 4♥ 5♦ 7♣')
    expect(evenements.filter((evenement) => evenement.type === 'POSE_CARTE')).toHaveLength(4)
  })
})
