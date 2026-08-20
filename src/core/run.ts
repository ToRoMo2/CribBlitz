import { calculerGains, type DetailGains } from './economie.js'
import type { Action, EtatPartie, Resultat } from './etat.js'
import { creerManche, reduire } from './manche.js'
import type { Modificateur } from './modificateurs.js'
import { creerRng, entier, type Rng } from './rng.js'
import { CONFIG_PAR_DEFAUT, type ConfigPartie, type NiveauxVoies } from '../presets/index.js'
import { REGLES_ECONOMIE, type ReglesEconomie } from '../presets/economie.js'
import { REGLES_RUN, type ReglesRun } from '../presets/run.js'
import { ADVERSAIRES } from '../adversaires/catalogue.js'
import type { AdversaireInstancie, DefinitionAdversaire } from '../adversaires/types.js'

/**
 * Une run courte : 3 Manches, l'Adversaire sur la derniere, une boutique entre elles, une
 * defaite possible. La run est un etat separe qui pilote le reducteur de Manche ; entre deux
 * Manches, elle passe en phase BOUTIQUE, ou la couche superieure applique les achats.
 */

export type StatutRun = 'MANCHE' | 'BOUTIQUE' | 'GAGNEE' | 'PERDUE'

export interface EtatRun {
  readonly config: ConfigPartie
  readonly reglesRun: ReglesRun
  readonly economie: ReglesEconomie
  readonly rng: Rng
  readonly graine: number
  readonly argent: number
  readonly reliquesEquipees: readonly Modificateur[]
  readonly niveaux: NiveauxVoies
  readonly adversaire: AdversaireInstancie
  readonly indexManche: number
  readonly statut: StatutRun
  readonly manche: EtatPartie
  readonly dernierGain: DetailGains | null
}

export interface OptionsRun {
  readonly config?: ConfigPartie
  readonly reglesRun?: ReglesRun
  readonly economie?: ReglesEconomie
  readonly adversairesDisponibles?: readonly DefinitionAdversaire[]
}

export function creerRun(graine: number, options: OptionsRun = {}): { run: EtatRun; events: Resultat['events'] } {
  const config = options.config ?? CONFIG_PAR_DEFAUT
  const reglesRun = options.reglesRun ?? REGLES_RUN
  const economie = options.economie ?? REGLES_ECONOMIE
  const disponibles = options.adversairesDisponibles ?? ADVERSAIRES

  // L'Adversaire de la run est tire et instancie une fois, des le depart : son comportement
  // est annonce avant la boutique pour qu'on puisse acheter contre (carnet §4.4).
  const tirage = entier(creerRng(graine), disponibles.length)
  const definition = disponibles[tirage.valeur] as DefinitionAdversaire
  const adversaire = definition.instancier(tirage.rng)

  const debutManche = demarrerManche(
    { config, reglesRun, niveaux: config.niveaux, reliquesEquipees: [], adversaire, graine },
    0,
  )

  const run: EtatRun = {
    config,
    reglesRun,
    economie,
    rng: adversaire.rng,
    graine,
    argent: reglesRun.argentInitial,
    reliquesEquipees: [],
    niveaux: config.niveaux,
    adversaire,
    indexManche: 0,
    statut: 'MANCHE',
    manche: debutManche.state,
    dernierGain: null,
  }
  return { run, events: debutManche.events }
}

/** Applique une Action de Manche. Quand la Manche se termine, resout la victoire/defaite. */
export function reduireRun(run: EtatRun, action: Action): { run: EtatRun; events: Resultat['events'] } {
  if (run.statut !== 'MANCHE') throw new Error(`La run n'attend pas d'action de Manche (statut ${run.statut})`)

  const resultat = reduire(run.manche, action)
  if (resultat.state.phase !== 'MANCHE_TERMINEE') {
    return { run: { ...run, manche: resultat.state }, events: resultat.events }
  }
  return { run: resoudreManche(run, resultat.state), events: resultat.events }
}

function resoudreManche(run: EtatRun, manche: EtatPartie): EtatRun {
  if (manche.gagnee !== true) {
    return { ...run, manche, statut: 'PERDUE' }
  }

  const gain = calculerGains(
    manche.trou,
    manche.cible,
    run.argent,
    run.reliquesEquipees,
    run.economie,
  )
  const argent = run.argent + gain.total
  const derniere = run.indexManche >= run.reglesRun.nombreDeManches - 1

  return {
    ...run,
    manche,
    argent,
    dernierGain: gain,
    statut: derniere ? 'GAGNEE' : 'BOUTIQUE',
  }
}

/** Depuis la phase BOUTIQUE, lance la Manche suivante (apres que les achats ont ete appliques). */
export function commencerMancheSuivante(run: EtatRun): { run: EtatRun; events: Resultat['events'] } {
  if (run.statut !== 'BOUTIQUE') throw new Error('On ne peut avancer qu’en phase BOUTIQUE')

  const index = run.indexManche + 1
  const debut = demarrerManche(run, index)
  return {
    run: { ...run, indexManche: index, statut: 'MANCHE', manche: debut.state, dernierGain: null },
    events: debut.events,
  }
}

/** Les modificateurs actifs a une Manche donnee : reliques equipees + Adversaire si c'est sa Manche. */
export function modificateursDeLaManche(
  reliquesEquipees: readonly Modificateur[],
  adversaire: AdversaireInstancie,
  reglesRun: ReglesRun,
  index: number,
): readonly Modificateur[] {
  return index === reglesRun.indexAdversaire
    ? [...reliquesEquipees, adversaire.modificateur]
    : reliquesEquipees
}

function demarrerManche(
  contexte: {
    config: ConfigPartie
    reglesRun: ReglesRun
    niveaux: NiveauxVoies
    reliquesEquipees: readonly Modificateur[]
    adversaire: AdversaireInstancie
    graine: number
  },
  index: number,
): Resultat {
  const { reglesRun } = contexte
  // Le boss tire sa cible de l'Adversaire (chacun handicape differemment) ; les autres
  // Manches, du tableau. L'Usurier (+3 cible) s'applique ensuite via son hook configManche.
  const estBoss = index === reglesRun.indexAdversaire
  const cibleBoss = estBoss
    ? reglesRun.ciblesBoss[contexte.adversaire.modificateur.id]
    : undefined
  const cible = cibleBoss ?? reglesRun.cibles[index]
  if (cible === undefined) throw new Error(`Pas de cible pour la Manche ${index}`)

  const config: ConfigPartie = {
    ...contexte.config,
    niveaux: contexte.niveaux,
    manche: { ...contexte.config.manche, cibleAdversaire: cible },
  }
  const mods = modificateursDeLaManche(
    contexte.reliquesEquipees,
    contexte.adversaire,
    contexte.reglesRun,
    index,
  )
  // Chaque Manche a sa propre graine derivee, pour que la run soit rejouable a l'identique.
  return creerManche(contexte.graine * 100 + index, config, mods)
}
