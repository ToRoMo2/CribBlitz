import { describe, expect, it } from 'vitest'
import { acheterRelique, ameliorerVoie, genererOffre, relancer } from '../src/core/boutique.js'
import { creerRun, type EtatRun } from '../src/core/run.js'
import { REGLES_RUN } from '../src/presets/run.js'

/** Une run fraiche avec assez d'argent pour tester les achats. */
function runRiche(argent: number): EtatRun {
  return { ...creerRun(1).run, argent }
}

describe('la boutique', () => {
  it('offre 2 reliques et un niveau de Voie', () => {
    const { offre } = genererOffre(runRiche(20))
    expect(offre.reliques).toHaveLength(2)
    expect(offre.voie.niveauActuel).toBe(1)
    expect(offre.coutRelance).toBeGreaterThan(0)
  })

  it('n’offre pas une relique déjà équipée', () => {
    let run = runRiche(20)
    const premiere = genererOffre(run).offre.reliques[0]
    if (premiere === undefined) throw new Error('offre vide')
    run = acheterRelique({ ...run, rng: genererOffre(run).rng }, premiere)
    const suivante = genererOffre(run).offre
    expect(suivante.reliques.some((o) => o.relique.id === premiere.relique.id)).toBe(false)
  })

  it('équipe une relique et débite l’argent', () => {
    const run = runRiche(20)
    const { offre } = genererOffre(run)
    const cible = offre.reliques[0]
    if (cible === undefined) throw new Error('offre vide')
    const apres = acheterRelique(run, cible)
    expect(apres.reliquesEquipees).toHaveLength(1)
    expect(apres.argent).toBe(20 - cible.cout)
  })

  it('refuse un achat trop cher', () => {
    const run = runRiche(0)
    const { offre } = genererOffre(run)
    const cible = offre.reliques[0]
    if (cible === undefined) throw new Error('offre vide')
    expect(() => acheterRelique(run, cible)).toThrow()
  })

  it('respecte le plafond d’emplacements', () => {
    let run = runRiche(1000)
    for (let i = 0; i < REGLES_RUN.emplacementsReliques; i++) {
      const genere = genererOffre(run)
      const cible = genere.offre.reliques.find(
        (o) => !run.reliquesEquipees.some((r) => r.id === o.relique.id),
      )
      if (cible === undefined) break
      run = acheterRelique({ ...run, rng: genere.rng }, cible)
    }
    expect(run.reliquesEquipees).toHaveLength(REGLES_RUN.emplacementsReliques)

    const genere = genererOffre(run)
    const restante = genere.offre.reliques[0]
    if (restante !== undefined) {
      expect(() => acheterRelique({ ...run, rng: genere.rng }, restante)).toThrow()
    }
  })

  it('améliore une Voie et débite l’argent', () => {
    const run = runRiche(20)
    const { offre } = genererOffre(run)
    const apres = ameliorerVoie(run, offre.voie)
    expect(apres.niveaux[offre.voie.voie]).toBe(offre.voie.niveauActuel + 1)
    expect(apres.argent).toBe(20 - offre.voie.cout)
  })

  it('la relance débite et change l’offre', () => {
    const run = runRiche(20)
    const relance = relancer(run)
    expect(relance.run.argent).toBe(20 - relance.offre.coutRelance)
    expect(relance.offre.reliques).toHaveLength(2)
  })
})
