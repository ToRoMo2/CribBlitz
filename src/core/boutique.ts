import type { TypeCombinaison } from './compte.js'
import type { Modificateur } from './modificateurs.js'
import { melanger, type Rng } from './rng.js'
import type { EtatRun } from './run.js'
import { ORDRE_VOIES, VOIES } from '../presets/voies.js'
import { coutRelique, REGLES_BOUTIQUE, type ReglesBoutique } from '../presets/boutique.js'
import { RELIQUES } from '../reliques/catalogue.js'

/**
 * La boutique entre deux Manches. Couche d'assemblage : elle connait le catalogue des
 * reliques (donnee injectable), pas le moteur de comptage. Ajouter une relique n'oblige pas
 * a la toucher — elle lit la liste.
 */

export interface OffreRelique {
  readonly relique: Modificateur
  readonly cout: number
  readonly abordable: boolean
  readonly placeDisponible: boolean
}

export interface OffreVoie {
  readonly voie: TypeCombinaison
  readonly niveauActuel: number
  readonly cout: number
  readonly abordable: boolean
}

export interface Offre {
  readonly reliques: readonly OffreRelique[]
  readonly voie: OffreVoie
  readonly coutRelance: number
}

export function genererOffre(
  run: EtatRun,
  regles: ReglesBoutique = REGLES_BOUTIQUE,
  pool: readonly Modificateur[] = RELIQUES,
): { offre: Offre; rng: Rng } {
  const placeDisponible = run.reliquesEquipees.length < run.reglesRun.emplacementsReliques
  const equipees = new Set(run.reliquesEquipees.map((relique) => relique.id))
  const candidates = pool.filter((relique) => !equipees.has(relique.id))

  const tirage = melanger(run.rng, candidates)
  const reliques: OffreRelique[] = tirage.melange.slice(0, regles.reliquesOffertes).map((relique) => {
    const cout = coutRelique(relique.id, regles)
    return { relique, cout, abordable: run.argent >= cout, placeDisponible }
  })

  const tirageVoie = melanger(tirage.rng, ORDRE_VOIES)
  const voieChoisie = tirageVoie.melange[0] as TypeCombinaison
  const voie: OffreVoie = {
    voie: voieChoisie,
    niveauActuel: run.niveaux[voieChoisie],
    cout: regles.coutNiveauVoie,
    abordable: run.argent >= regles.coutNiveauVoie,
  }

  return { offre: { reliques, voie, coutRelance: regles.coutRelance }, rng: tirageVoie.rng }
}

export function acheterRelique(run: EtatRun, offre: OffreRelique): EtatRun {
  if (run.reliquesEquipees.length >= run.reglesRun.emplacementsReliques) {
    throw new Error('Plus d’emplacement de relique libre')
  }
  if (run.argent < offre.cout) throw new Error('Pas assez d’argent')
  return {
    ...run,
    argent: run.argent - offre.cout,
    reliquesEquipees: [...run.reliquesEquipees, offre.relique],
  }
}

export function ameliorerVoie(run: EtatRun, offre: OffreVoie): EtatRun {
  if (run.argent < offre.cout) throw new Error('Pas assez d’argent')
  return {
    ...run,
    argent: run.argent - offre.cout,
    niveaux: { ...run.niveaux, [offre.voie]: run.niveaux[offre.voie] + 1 },
  }
}

export function relancer(
  run: EtatRun,
  regles: ReglesBoutique = REGLES_BOUTIQUE,
  pool: readonly Modificateur[] = RELIQUES,
): { run: EtatRun; offre: Offre } {
  if (run.argent < regles.coutRelance) throw new Error('Pas assez d’argent pour relancer')
  const paye: EtatRun = { ...run, argent: run.argent - regles.coutRelance }
  const genere = genererOffre(paye, regles, pool)
  return { run: { ...paye, rng: genere.rng }, offre: genere.offre }
}

/** Nom lisible d'une Voie, pour l'affichage de la boutique. */
export function nomVoie(voie: TypeCombinaison): string {
  return VOIES[voie].nom
}
