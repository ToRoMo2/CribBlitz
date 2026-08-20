import { calculerGains, type DetailGains } from './economie.js'
import type { Action, EtatPartie, Resultat } from './etat.js'
import { creerManche, reduire } from './manche.js'
import type { Modificateur } from './modificateurs.js'
import { creerRng, melanger, type Rng } from './rng.js'
import type { Progression } from './trous.js'
import { CONFIG_PAR_DEFAUT, type ConfigPartie, type NiveauxVoies } from '../presets/index.js'
import { REGLES_ECONOMIE, type ReglesEconomie } from '../presets/economie.js'
import { REGLES_RUN, rueDeLaManche, type ReglesRun } from '../presets/run.js'
import { ADVERSAIRES } from '../adversaires/catalogue.js'
import type { AdversaireInstancie, DefinitionAdversaire } from '../adversaires/types.js'

/**
 * Une run entiere : 4 Rues de 3 Manches, un Adversaire a la fin de chaque Rue, une boutique
 * entre les Manches, une defaite possible a chacune. La run est un etat separe qui pilote le
 * reducteur de Manche ; entre deux Manches, elle passe en phase BOUTIQUE, ou la couche
 * superieure applique les achats.
 *
 * La run possede la piste. Une Manche ne fait que la parcourir (carnet §4.2).
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
  /** Un Adversaire par Rue, tire et annonce des le depart pour qu'on puisse acheter contre. */
  readonly adversaires: readonly AdversaireInstancie[]
  readonly indexManche: number
  readonly statut: StatutRun
  readonly manche: EtatPartie
  readonly dernierGain: DetailGains | null
  /**
   * La piste. Une Manche ne la possede pas, elle la parcourt : la run la transporte pour que
   * les 121 Trous du carnet §4.2 forment une seule progression sur les 12 Manches.
   */
  readonly progression: Progression
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

  // Les Adversaires des 4 Rues sont tires et instancies d'un coup, des le depart : chacun est
  // annonce avant la boutique qui le precede, pour qu'on puisse acheter contre (carnet §4.4).
  const tirage = tirerLesAdversaires(
    creerRng(graine),
    disponibles,
    reglesRun.indicesAdversaires.length,
  )

  const depart: Progression = { trou: 0, reste: 0 }
  const debutManche = demarrerManche(
    {
      config,
      reglesRun,
      niveaux: config.niveaux,
      reliquesEquipees: [],
      adversaires: tirage.adversaires,
      graine,
    },
    0,
    depart,
  )

  const run: EtatRun = {
    config,
    reglesRun,
    economie,
    rng: tirage.rng,
    graine,
    argent: reglesRun.argentInitial,
    reliquesEquipees: [],
    niveaux: config.niveaux,
    adversaires: tirage.adversaires,
    indexManche: 0,
    statut: 'MANCHE',
    manche: debutManche.state,
    dernierGain: null,
    progression: depart,
  }
  return { run, events: debutManche.events }
}

/** Applique une Action de Manche. Quand la Manche se termine, resout la victoire/defaite. */
export function reduireRun(run: EtatRun, action: Action): { run: EtatRun; events: Resultat['events'] } {
  if (run.statut !== 'MANCHE') throw new Error(`La run n'attend pas d'action de Manche (statut ${run.statut})`)

  const resultat = reduire(run.manche, action)
  // La cheville avance a chaque Donne : la run suit la piste en continu, pas seulement en
  // fin de Manche. C'est ce qui permet de gagner en cours de Rue (carnet §8.5).
  const progression: Progression = { trou: resultat.state.trou, reste: resultat.state.reste }
  if (resultat.state.phase !== 'MANCHE_TERMINEE') {
    return { run: { ...run, manche: resultat.state, progression }, events: resultat.events }
  }
  return { run: resoudreManche({ ...run, progression }, resultat.state), events: resultat.events }
}

function resoudreManche(run: EtatRun, manche: EtatPartie): EtatRun {
  // Depasser le dernier Trou gagne la run seance tenante, meme au milieu d'une Rue
  // (carnet §8.5, recommandation retenue). La piste est l'arbitre, pas le calendrier.
  if (manche.trou >= run.config.manche.trouFinal) {
    return { ...run, manche, statut: 'GAGNEE' }
  }
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
  const debut = demarrerManche(run, index, run.progression)
  return {
    run: { ...run, indexManche: index, statut: 'MANCHE', manche: debut.state, dernierGain: null },
    events: debut.events,
  }
}

/** L'Adversaire d'une Manche, ou null si ce n'est pas une Manche d'Adversaire. */
export function adversaireDeLaManche(
  adversaires: readonly AdversaireInstancie[],
  reglesRun: ReglesRun,
  index: number,
): AdversaireInstancie | null {
  if (!reglesRun.indicesAdversaires.includes(index)) return null
  return adversaires[rueDeLaManche(index, reglesRun) - 1] ?? null
}

/** Les modificateurs actifs a une Manche donnee : reliques equipees + Adversaire si c'est sa Manche. */
export function modificateursDeLaManche(
  reliquesEquipees: readonly Modificateur[],
  adversaires: readonly AdversaireInstancie[],
  reglesRun: ReglesRun,
  index: number,
): readonly Modificateur[] {
  const adversaire = adversaireDeLaManche(adversaires, reglesRun, index)
  return adversaire === null ? reliquesEquipees : [...reliquesEquipees, adversaire.modificateur]
}

/**
 * Tire les Adversaires des Rues, sans repetition tant que le catalogue le permet. Le
 * catalogue n'en compte que deux pour l'instant : on recycle plutot que d'echouer, et la
 * contrainte disparait d'elle-meme quand les huit du carnet §4.4 seront ecrits.
 */
function tirerLesAdversaires(
  rng: Rng,
  disponibles: readonly DefinitionAdversaire[],
  combien: number,
): { adversaires: readonly AdversaireInstancie[]; rng: Rng } {
  if (disponibles.length === 0) throw new Error('Aucun Adversaire disponible')

  let courant = rng
  const choisis: DefinitionAdversaire[] = []
  while (choisis.length < combien) {
    const { rng: apres, melange } = melanger(courant, disponibles)
    courant = apres
    choisis.push(...melange.slice(0, combien - choisis.length))
  }

  const adversaires: AdversaireInstancie[] = []
  for (const definition of choisis) {
    const instancie = definition.instancier(courant)
    adversaires.push(instancie)
    courant = instancie.rng
  }
  return { adversaires, rng: courant }
}

function demarrerManche(
  contexte: {
    config: ConfigPartie
    reglesRun: ReglesRun
    niveaux: NiveauxVoies
    reliquesEquipees: readonly Modificateur[]
    adversaires: readonly AdversaireInstancie[]
    graine: number
  },
  index: number,
  depart: Progression,
): Resultat {
  const { reglesRun } = contexte
  const cibleDeLaRue = reglesRun.cibles[index]
  if (cibleDeLaRue === undefined) throw new Error(`Pas de cible pour la Manche ${index}`)

  // Chaque Adversaire handicape differemment, donc sa Manche decale la cible de la Rue.
  // L'Usurier (+3 cible) s'applique ensuite par-dessus, via son hook configManche.
  const boss = adversaireDeLaManche(contexte.adversaires, reglesRun, index)
  const ajustement = boss === null ? 0 : reglesRun.ajustementsBoss[boss.modificateur.id] ?? 0
  const cible = cibleDeLaRue + ajustement

  const config: ConfigPartie = {
    ...contexte.config,
    niveaux: contexte.niveaux,
    manche: { ...contexte.config.manche, cibleAdversaire: cible },
  }
  const mods = modificateursDeLaManche(
    contexte.reliquesEquipees,
    contexte.adversaires,
    contexte.reglesRun,
    index,
  )
  // Chaque Manche a sa propre graine derivee, pour que la run soit rejouable a l'identique.
  return creerManche(contexte.graine * 100 + index, config, mods, depart)
}
