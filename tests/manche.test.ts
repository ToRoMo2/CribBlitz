import { describe, expect, it } from 'vitest'
import { estValet, formatCarte } from '../src/core/carte.js'
import type { Evenement } from '../src/core/evenements.js'
import type { EtatPartie } from '../src/core/etat.js'
import { creerManche, reduire } from '../src/core/manche.js'
import { CONFIG_PAR_DEFAUT } from '../src/presets/index.js'
import { indicesPosables } from '../src/core/pose.js'

/** Une Manche entiere, jouee betement : on defausse les 2 dernieres, on pose sans exploser. */
function jouerManche(graine: number): { state: EtatPartie; events: Evenement[] } {
  let resultat = creerManche(graine)
  const events: Evenement[] = [...resultat.events]

  while (resultat.state.phase !== 'MANCHE_TERMINEE') {
    if (resultat.state.phase === 'DEFAUSSE') {
      const suivant = reduire(resultat.state, { type: 'DEFAUSSER', indices: [4, 5] })
      resultat = { state: suivant.state, events: [] }
      events.push(...suivant.events)
      continue
    }
    const pose = resultat.state.donne.pose
    if (pose === null) throw new Error('Pose absente')
    const posables = indicesPosables(pose)
    const action = posables[0] === undefined
      ? ({ type: 'ENCAISSER' } as const)
      : ({ type: 'POSER', index: posables[0] } as const)
    const suivant = reduire(resultat.state, action)
    resultat = { state: suivant.state, events: [] }
    events.push(...suivant.events)
  }

  return { state: resultat.state, events }
}

describe('une Manche complète [carnet §3]', () => {
  const { state, events } = jouerManche(2026)

  it('joue exactement 4 Donnes', () => {
    expect(state.historique).toHaveLength(4)
    expect(state.historique.map((donne) => donne.numero)).toEqual([1, 2, 3, 4])
  })

  it('accumule 8 cartes dans la Boîte, 2 par Donne', () => {
    expect(state.boite).toHaveLength(8)
    const defaussees = state.historique.flatMap((donne) => donne.defaussee)
    expect(defaussees.map(formatCarte)).toEqual(state.boite.map(formatCarte))
  })

  it('ne compte la Boîte qu’une fois, à la fin, avec la Retourne de la 4e Donne', () => {
    const comptages = events.filter((evenement) => evenement.type === 'BOITE_COMPTEE')
    expect(comptages).toHaveLength(1)

    const combinaisonsBoite = events.filter(
      (evenement) => evenement.type === 'COMBINAISON_TROUVEE' && evenement.origine === 'BOITE',
    )
    const derniereRetourne = state.historique.at(-1)?.retourne
    expect(derniereRetourne).toBeDefined()
    for (const evenement of combinaisonsBoite) {
      if (evenement.type !== 'COMBINAISON_TROUVEE') continue
      const cartes = evenement.combinaison.cartes.map(formatCarte)
      const horsBoite = cartes.filter(
        (carte) => !state.boite.map(formatCarte).includes(carte),
      )
      // Seule la Retourne de la derniere Donne peut apparaitre hors de la Boite.
      expect(horsBoite.every((carte) => carte === formatCarte(derniereRetourne!))).toBe(true)
    }
  })

  it('termine sur une victoire ou une défaite, jamais entre les deux', () => {
    expect(state.phase).toBe('MANCHE_TERMINEE')
    expect(typeof state.gagnee).toBe('boolean')
    const dernier = events.at(-1)
    expect(dernier?.type === 'MANCHE_GAGNEE' || dernier?.type === 'MANCHE_PERDUE').toBe(true)
  })

  it('n’utilise jamais deux fois la même carte', () => {
    const vues = [
      ...state.historique.flatMap((donne) => [...donne.recue, donne.retourne]),
    ].map(formatCarte)
    expect(new Set(vues).size).toBe(vues.length)
  })
})

describe("l'ordre de resolution [carnet §2.2]", () => {
  const { events } = jouerManche(7)
  const types = events.map((evenement) => evenement.type)

  it('distribue avant de défausser', () => {
    expect(types[0]).toBe('DONNE_DISTRIBUEE')
    expect(types.indexOf('CARTES_DEFAUSSEES')).toBeGreaterThan(0)
  })

  it('révèle la Retourne après la défausse', () => {
    expect(types.indexOf('RETOURNE_REVELEE')).toBeGreaterThan(types.indexOf('CARTES_DEFAUSSEES'))
  })

  it('pose avant de compter la main', () => {
    expect(types.indexOf('COMBINAISON_TROUVEE')).toBeGreaterThan(types.indexOf('POSE_CARTE'))
  })

  it('applique le Mult puis calcule le score', () => {
    expect(types.indexOf('SCORE_CALCULE')).toBeGreaterThan(types.indexOf('MULT_APPLIQUE'))
  })

  it('compte la Boîte en dernier, juste avant le verdict', () => {
    expect(types.lastIndexOf('BOITE_COMPTEE')).toBeGreaterThan(types.lastIndexOf('POSE_ENCAISSE'))
    expect(types.at(-1)).toMatch(/^MANCHE_/)
  })

  it('fait avancer la cheville une fois par Donne, plus une fois pour la Boîte', () => {
    expect(types.filter((type) => type === 'CHEVILLE_AVANCE')).toHaveLength(5)
  })
})

describe('les Talons [RÈGLE §1.2]', () => {
  it('valent 2 points quand la Retourne est un Valet, et rien sinon', () => {
    let vus = 0
    for (let graine = 1; graine <= 60; graine++) {
      const { state, events } = jouerManche(graine)
      const talons = events.filter((evenement) => evenement.type === 'TALONS')
      const valets = state.historique.filter((donne) => estValet(donne.retourne))
      expect(talons).toHaveLength(valets.length)
      expect(talons.every((e) => e.type === 'TALONS' && e.points === 2)).toBe(true)
      vus += valets.length
    }
    expect(vus).toBeGreaterThan(0)
  })
})

describe('le déterminisme', () => {
  it('la même graine rejoue exactement la même Manche', () => {
    const a = jouerManche(99)
    const b = jouerManche(99)
    expect(a.state.trou).toBe(b.state.trou)
    expect(a.state.boite.map(formatCarte)).toEqual(b.state.boite.map(formatCarte))
    expect(a.events).toEqual(b.events)
  })

  it('une graine différente donne une autre Manche', () => {
    const a = jouerManche(1)
    const b = jouerManche(2)
    expect(a.state.boite.map(formatCarte)).not.toEqual(b.state.boite.map(formatCarte))
  })
})

describe('les actions invalides', () => {
  it('refusent une défausse qui n’a pas la bonne taille', () => {
    const { state } = creerManche(1)
    expect(() => reduire(state, { type: 'DEFAUSSER', indices: [0] })).toThrow()
    expect(() => reduire(state, { type: 'DEFAUSSER', indices: [0, 1, 2] })).toThrow()
    expect(() => reduire(state, { type: 'DEFAUSSER', indices: [0, 0] })).toThrow()
  })

  it('refusent de poser avant d’avoir défaussé', () => {
    const { state } = creerManche(1)
    expect(() => reduire(state, { type: 'POSER', index: 0 })).toThrow()
  })

  it('refusent de défausser deux fois', () => {
    const premiere = reduire(creerManche(1).state, { type: 'DEFAUSSER', indices: [0, 1] })
    expect(() => reduire(premiere.state, { type: 'DEFAUSSER', indices: [0, 1] })).toThrow()
  })
})

describe('le coeur reste pur', () => {
  it('ne modifie pas l’état reçu', () => {
    const { state } = creerManche(5)
    const avant = state.donne.main.map(formatCarte)
    reduire(state, { type: 'DEFAUSSER', indices: [0, 1] })
    expect(state.donne.main.map(formatCarte)).toEqual(avant)
    expect(state.boite).toHaveLength(0)
    expect(state.phase).toBe('DEFAUSSE')
  })
})

describe('la Pose multiplie la main au lieu de s’ajouter [carnet §1.3, §2.1]', () => {
  /** Joue une Donne entiere avec une Pose choisie, et rend le resume et les evenements. */
  function premiereDonne(
    multParPointDePose: number,
    exploser: boolean,
  ): { resume: EtatPartie['historique'][number]; events: Evenement[] } {
    // Pour exploser a coup sur, on abaisse le seuil : la premiere carte le depasse deja.
    // Le seuil est une donnee, donc le test n'a besoin d'aucune main truquee.
    const config = {
      ...CONFIG_PAR_DEFAUT,
      pose: {
        ...CONFIG_PAR_DEFAUT.pose,
        multParPointDePose,
        ...(exploser ? { seuil: 1 } : {}),
      },
    }
    let resultat = creerManche(2026, config)
    const events: Evenement[] = []
    resultat = reduire(resultat.state, { type: 'DEFAUSSER', indices: [4, 5] })
    events.push(...resultat.events)

    while (resultat.state.historique.length === 0) {
      const pose = resultat.state.donne.pose
      if (pose === null) throw new Error('Pose absente')
      // Les regles de CETTE Manche, pas les regles par defaut : avec un seuil abaisse,
      // les cartes posables ne sont pas les memes.
      const posables = indicesPosables(pose, config.pose)
      // Pour exploser, on pose une carte interdite ; sinon on suit les cartes posables.
      const index = exploser
        ? pose.enMain.findIndex((_, i) => !posables.includes(i))
        : posables[0]
      const action = index === undefined || index < 0
        ? ({ type: 'ENCAISSER' } as const)
        : ({ type: 'POSER', index } as const)
      const suivant = reduire(resultat.state, action)
      resultat = suivant
      events.push(...suivant.events)
    }

    const resume = resultat.state.historique[0]
    if (resume === undefined) throw new Error('Donne inachevee')
    return { resume, events }
  }

  it('les points de Pose ne s’ajoutent plus au score de la Donne', () => {
    const { resume } = premiereDonne(0.5, false)
    // Le score de la Donne, c'est la main comptee plus les talons — la Pose n'y entre plus.
    expect(resume.scoreDonne).toBe(resume.scoreMain + resume.talons)
  })

  it('ils deviennent du Mult sur le Compte de la même Donne', () => {
    const sans = premiereDonne(0, false).resume
    const avec = premiereDonne(0.5, false).resume
    expect(sans.pointsPose).toBeGreaterThan(0)
    expect(avec.pointsPose).toBe(sans.pointsPose)
    expect(avec.multMain).toBeCloseTo(sans.multMain + sans.pointsPose * 0.5)
    expect(avec.scoreMain).toBeGreaterThan(sans.scoreMain)
  })

  it('à zéro, la Pose ne rapporte plus rien — le témoin', () => {
    const sans = premiereDonne(0, false).resume
    expect(sans.scoreDonne).toBe(sans.scoreMain + sans.talons)
  })

  it('l’annonce précède le Compte, sinon le Mult sort de nulle part', () => {
    const { events } = premiereDonne(0.5, false)
    const rangMult = events.findIndex((evenement) => evenement.type === 'POSE_MULT')
    const rangCompte = events.findIndex((evenement) => evenement.type === 'MULT_APPLIQUE')
    expect(rangMult).toBeGreaterThanOrEqual(0)
    expect(rangMult).toBeLessThan(rangCompte)
  })

  it('une Pose explosée n’achète aucun Mult', () => {
    const { resume, events } = premiereDonne(0.5, true)
    expect(resume.explosee).toBe(true)
    expect(resume.pointsPose).toBe(0)
    const annonce = events.find((evenement) => evenement.type === 'POSE_MULT')
    expect(annonce).toEqual({ type: 'POSE_MULT', pointsDePose: 0, mult: 0 })
  })
})
