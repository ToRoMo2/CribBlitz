import { describe, expect, it } from 'vitest'
import { avancer, coutDuTrou, plafondDeLaManche } from '../src/core/trous.js'
import { REGLES_ECONOMIE } from '../src/presets/economie.js'
import { REGLES_MANCHE } from '../src/presets/manche.js'

describe('le cout des Trous [carnet §4.2]', () => {
  it('suit les quatre Rues', () => {
    expect(coutDuTrou(1, REGLES_MANCHE)).toBe(30)
    expect(coutDuTrou(30, REGLES_MANCHE)).toBe(30)
    expect(coutDuTrou(31, REGLES_MANCHE)).toBe(135)
    expect(coutDuTrou(61, REGLES_MANCHE)).toBe(320)
    expect(coutDuTrou(91, REGLES_MANCHE)).toBe(720)
  })

  it('le dernier Trou coûte plus cher que les 120 autres', () => {
    const cent20 = 30 * 30 + 30 * 135 + 30 * 320 + 30 * 720
    expect(coutDuTrou(121, REGLES_MANCHE)).toBe(2000)
    // « Le dernier trou coute plus cher que les 120 autres » (carnet §4.2) reste une figure
    // de style : il coute 2,8 Trous de Rue IV, ce qui suffit a en faire le dernier obstacle.
    expect(coutDuTrou(121, REGLES_MANCHE)).toBeGreaterThan(720)
    expect(cent20).toBeGreaterThan(coutDuTrou(121, REGLES_MANCHE))
  })
})

/**
 * La conversion pure, sans le plafond ni la borne du report : ces tests-la parlent de la
 * courbe des couts, et rien d'autre. Le plafond a son propre describe plus bas.
 */
const SANS_PLAFOND = {
  ...REGLES_MANCHE,
  plafondAuDelaDeLaCible: null,
  reportMaximumEnTrous: null,
}

describe('la conversion en Trous', () => {
  it('avance d’un Trou par tranche de 30 en Rue I', () => {
    const avancee = avancer({ trou: 0, reste: 0 }, 90, REGLES_MANCHE)
    expect(avancee.trousGagnes).toBe(3)
    expect(avancee.progression.trou).toBe(3)
    expect(avancee.progression.reste).toBe(0)
  })

  it('reporte le reste sur la Donne suivante [carnet §4.2]', () => {
    const premiere = avancer({ trou: 0, reste: 0 }, 80, REGLES_MANCHE)
    expect(premiere.progression.trou).toBe(2)
    expect(premiere.progression.reste).toBe(20)

    const seconde = avancer(premiere.progression, 10, REGLES_MANCHE)
    expect(seconde.progression.trou).toBe(3)
    expect(seconde.progression.reste).toBe(0)
  })

  it('change de tarif en franchissant une Rue', () => {
    // 30 Trous a 30 = 900, puis le 31e coute 135
    const avancee = avancer({ trou: 0, reste: 0 }, 900 + 135, SANS_PLAFOND)
    expect(avancee.progression.trou).toBe(31)
    expect(avancee.progression.reste).toBe(0)
  })

  it('n’avance pas sans les points', () => {
    const avancee = avancer({ trou: 0, reste: 0 }, 7, REGLES_MANCHE)
    expect(avancee.trousGagnes).toBe(0)
    expect(avancee.progression.reste).toBe(7)
  })

  it('s’arrête au Trou final', () => {
    const avancee = avancer({ trou: 0, reste: 0 }, 10_000_000, SANS_PLAFOND)
    expect(avancee.progression.trou).toBe(121)
  })

  it('peut perdre le reste si la règle le demande', () => {
    const sansReport = { ...REGLES_MANCHE, reporterLeReste: false }
    const avancee = avancer({ trou: 0, reste: 0 }, 80, sansReport)
    expect(avancee.progression.trou).toBe(2)
    expect(avancee.progression.reste).toBe(0)
  })
})

describe('le plafond d’avance [carnet §4.3, question §8.7]', () => {
  // Le plafond seul : la borne du report a son propre describe.
  const avecPlafond = {
    ...REGLES_MANCHE,
    cibleAdversaire: 6,
    plafondAuDelaDeLaCible: 6,
    reportMaximumEnTrous: null,
  }

  it('sans plafond, un score énorme traverse la piste entière', () => {
    const avancee = avancer({ trou: 0, reste: 0 }, 1_000_000, SANS_PLAFOND)
    expect(avancee.progression.trou).toBe(121)
  })

  it('la cheville s’arrête à la cible plus le plafond', () => {
    const avancee = avancer({ trou: 0, reste: 0 }, 1_000_000, avecPlafond)
    expect(avancee.progression.trou).toBe(12)
    expect(plafondDeLaManche(6, avecPlafond)).toBe(12)
  })

  it('le surplus n’est pas perdu : il part au report', () => {
    // 12 Trous de Rue I coutent 360 ; les 640 restants attendent la Manche suivante.
    const avancee = avancer({ trou: 0, reste: 0 }, 1000, avecPlafond)
    expect(avancee.progression.trou).toBe(12)
    expect(avancee.progression.reste).toBe(1000 - 12 * 30)
  })

  it('le plafond suit la cible vivante, pas celle du départ', () => {
    // Le Regulier pousse la cible de 6 a 14 en cours de Manche : le plafond suit.
    expect(plafondDeLaManche(14, avecPlafond)).toBe(20)
    expect(avancer({ trou: 0, reste: 0 }, 1_000_000, avecPlafond, 14).progression.trou).toBe(20)
  })

  it('une cheville déjà au-delà du plafond ne recule pas — elle attend', () => {
    const avancee = avancer({ trou: 30, reste: 0 }, 5000, avecPlafond)
    expect(avancee.progression.trou).toBe(30)
    expect(avancee.trousGagnes).toBe(0)
    expect(avancee.progression.reste).toBe(5000)
  })

  it('le plafond ne dépasse jamais le dernier Trou', () => {
    const derniere = { ...avecPlafond, cibleAdversaire: 121 }
    expect(plafondDeLaManche(121, derniere)).toBe(121)
  })
})

describe('la borne du report [carnet §8 q4]', () => {
  it('sans borne, la banque garde tout le surplus', () => {
    const avancee = avancer({ trou: 0, reste: 0 }, 100_000, {
      ...REGLES_MANCHE,
      cibleAdversaire: 6,
      plafondAuDelaDeLaCible: 6,
      reportMaximumEnTrous: null,
    })
    expect(avancee.progression.reste).toBe(100_000 - 12 * 30)
  })

  it('bornée, la banque ne garde que N Trous d’avance et le reste est perdu', () => {
    // Plafonnee a 12, la cheville s'arrete la ; le Trou 13 coute 30, donc 2 Trous = 60.
    const avancee = avancer({ trou: 0, reste: 0 }, 100_000, {
      ...REGLES_MANCHE,
      cibleAdversaire: 6,
      plafondAuDelaDeLaCible: 6,
      reportMaximumEnTrous: 2,
    })
    expect(avancee.progression.trou).toBe(12)
    expect(avancee.progression.reste).toBe(60)
  })

  it('la borne se lit dans la Rue où la cheville se trouve, pas dans la première', () => {
    // Au Trou 60, le Trou suivant est en Rue III et coute 320 : 2 Trous = 640.
    const avancee = avancer({ trou: 60, reste: 0 }, 100_000, {
      ...REGLES_MANCHE,
      cibleAdversaire: 57,
      plafondAuDelaDeLaCible: 6,
      reportMaximumEnTrous: 2,
    })
    expect(avancee.progression.trou).toBe(63)
    expect(avancee.progression.reste).toBe(640)
  })

  it('une banque plus petite que la borne n’est pas touchée', () => {
    const avancee = avancer({ trou: 0, reste: 0 }, 35, { ...REGLES_MANCHE, reportMaximumEnTrous: 2 })
    expect(avancee.progression.trou).toBe(1)
    expect(avancee.progression.reste).toBe(5)
  })
})

describe('les réglages retenus pour §8.7', () => {
  it('le plateau est d’accord avec le porte-monnaie', () => {
    // `primeMax = 5` dit qu'au-dela de +5 Trous le depassement ne rapporte plus rien ;
    // le plafond a 6 fait dire la meme chose a la piste.
    const plafond = REGLES_MANCHE.plafondAuDelaDeLaCible
    expect(plafond).toBe(6)
    expect(REGLES_ECONOMIE.primeMax).toBe((plafond ?? 0) - 1)
  })

  it('la banque ne peut pas payer une Rue d’avance', () => {
    expect(REGLES_MANCHE.reportMaximumEnTrous).toBe(3)
    // Le risque mesure : 30 866 points de report en Rue IV, soit 42 Trous d'avance sur les
    // 30 que compte la Rue. Bornee a 3 Trous, la banque ne peut plus payer une Rue entiere.
    const rue = 30
    expect(REGLES_MANCHE.reportMaximumEnTrous).toBeLessThan(rue)
  })
})
