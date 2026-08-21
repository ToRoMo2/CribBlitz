import { acheterRelique, ameliorerVoie, genererOffre } from '../core/boutique.js'
import { creerRng, type Rng } from '../core/rng.js'
import {
  adversaireDeLaManche,
  commencerMancheSuivante,
  creerRun,
  reduireRun,
  type EtatRun,
  type OptionsRun,
} from '../core/run.js'
import { coutDuTrou } from '../core/trous.js'
import { REGLES_RUN, rueDeLaManche } from '../presets/run.js'
import { choisirPose, strategieParNom, type OptionsStrategie } from './strategies.js'

/**
 * Le harnais de l'etape 4 : il joue des runs entieres sans rien afficher et rend des
 * nombres. C'est ici que se mesure la seule question de l'etape — est-ce qu'atteindre le
 * Trou 121 exige d'avoir casse quelque chose, sans jamais etre hors d'atteinte ?
 *
 * Toutes les politiques d'achat rejouent exactement les memes graines, donc la comparaison
 * est appariee : l'ecart mesure la boutique, et rien d'autre.
 */

export interface MesureManche {
  readonly index: number
  readonly rue: number
  readonly cible: number
  readonly trouAvant: number
  readonly trouApres: number
  /** Points marques pendant la Manche, toutes Donnes plus la Boite. */
  readonly score: number
  /** Ce que coutait un Trou au depart de cette Manche. */
  readonly coutDuTrou: number
  readonly gagnee: boolean
  readonly estAdversaire: boolean
  readonly argentApres: number
  readonly reliques: number
  /** La banque : points convertis en aucun Trou, reportes sur la Manche suivante. */
  readonly resteApres: number
}

export interface MesuresRun {
  readonly graine: number
  readonly gagnee: boolean
  /** Index de la Manche perdue, ou null si la run est allee au bout. */
  readonly mancheDeMort: number | null
  readonly trouAtteint: number
  readonly manches: readonly MesureManche[]
}

/**
 * Une politique d'achat. Elle ne voit qu'une offre et un porte-monnaie : elle ne sait rien
 * des Adversaires a venir, donc elle mesure le plancher de la boutique, pas son plafond.
 */
export interface PolitiqueAchat {
  readonly nom: string
  readonly description: string
  readonly acheter: (run: EtatRun) => EtatRun
}

export const POLITIQUES: readonly PolitiqueAchat[] = [
  {
    nom: 'rien',
    description: 'n’achète jamais — le plancher',
    acheter: (run) => run,
  },
  {
    nom: 'voies',
    description: 'n’achète que des niveaux de Voie',
    acheter: (run) => acheterSelon(run, { reliques: false, voies: true }),
  },
  {
    nom: 'reliques',
    description: 'n’achète que des reliques',
    acheter: (run) => acheterSelon(run, { reliques: true, voies: false }),
  },
  {
    nom: 'tout',
    description: 'achète tout ce qui est abordable — le plafond naïf',
    acheter: (run) => acheterSelon(run, { reliques: true, voies: true }),
  },
]

export function politiqueParNom(nom: string): PolitiqueAchat {
  const trouvee = POLITIQUES.find((politique) => politique.nom === nom)
  if (trouvee === undefined) {
    throw new Error(`Politique inconnue : ${nom} (connues : ${POLITIQUES.map((p) => p.nom).join(', ')})`)
  }
  return trouvee
}

/**
 * Achete dans l'ordre : les reliques d'abord (elles occupent un emplacement rare), puis les
 * niveaux de Voie. Aucune relance : on mesure la courbe, pas l'optimisation de boutique.
 */
function acheterSelon(run: EtatRun, quoi: { reliques: boolean; voies: boolean }): EtatRun {
  const genere = genererOffre(run)
  let courant: EtatRun = { ...run, rng: genere.rng }

  if (quoi.reliques) {
    for (const offre of genere.offre.reliques) {
      if (!offre.placeDisponible) break
      if (courant.reliquesEquipees.length >= courant.reglesRun.emplacementsReliques) break
      if (courant.argent < offre.cout) continue
      courant = acheterRelique(courant, offre)
    }
  }
  if (quoi.voies && courant.argent >= genere.offre.voie.cout) {
    courant = ameliorerVoie(courant, genere.offre.voie)
  }
  return courant
}

export function jouerRunComplete(
  graine: number,
  politique: PolitiqueAchat,
  options: OptionsStrategie,
  optionsRun: OptionsRun = {},
): MesuresRun {
  const strategie = strategieParNom('totale')
  let { run } = creerRun(graine, optionsRun)
  // Un PRNG distinct de celui du coeur : la strategie ne doit pas perturber la distribution.
  let rng: Rng = creerRng(graine * 7919 + 13)

  const manches: MesureManche[] = []
  let trouAvant = run.progression.trou
  let coutAuDepart = coutDuTrou(trouAvant + 1, run.manche.config.manche)

  for (;;) {
    if (run.statut === 'GAGNEE' || run.statut === 'PERDUE') {
      manches.push(mesurer(run, trouAvant, coutAuDepart))
      break
    }
    if (run.statut === 'BOUTIQUE') {
      manches.push(mesurer(run, trouAvant, coutAuDepart))
      run = politique.acheter(run)
      run = commencerMancheSuivante(run).run
      trouAvant = run.progression.trou
      coutAuDepart = coutDuTrou(trouAvant + 1, run.manche.config.manche)
      continue
    }

    if (run.manche.phase === 'DEFAUSSE') {
      const choix = strategie.choisir(run.manche, rng, options)
      rng = choix.rng
      run = reduireRun(run, { type: 'DEFAUSSER', indices: choix.indices }).run
    } else {
      run = reduireRun(run, choisirPose(run.manche)).run
    }
  }

  const perdue = manches.find((manche) => !manche.gagnee)
  return {
    graine,
    gagnee: run.statut === 'GAGNEE',
    mancheDeMort: run.statut === 'PERDUE' && perdue !== undefined ? perdue.index : null,
    trouAtteint: run.manche.trou,
    manches,
  }
}

/**
 * Le releve d'une Manche terminee. Le score se relit depuis l'historique de la Manche plutot
 * que de s'accumuler au fil des actions : la Manche porte deja le detail par Donne, et la
 * Boite s'y ajoute a la fin.
 */
function mesurer(run: EtatRun, trouAvant: number, coutAuDepart: number): MesureManche {
  const score =
    run.manche.historique.reduce((somme, donne) => somme + donne.scoreDonne, 0) +
    (run.manche.scoreBoite ?? 0)
  return {
    index: run.indexManche,
    rue: rueDeLaManche(run.indexManche, run.reglesRun),
    cible: run.manche.cible,
    trouAvant,
    trouApres: run.manche.trou,
    score,
    coutDuTrou: coutAuDepart,
    gagnee: run.manche.gagnee === true || run.statut === 'GAGNEE',
    estAdversaire: adversaireDeLaManche(run.adversaires, run.reglesRun, run.indexManche) !== null,
    argentApres: run.argent,
    reliques: run.reliquesEquipees.length,
    resteApres: run.manche.reste,
  }
}

// ── L'agregation : ce que PROTOTYPE §Etape 4 demande de mesurer ──

export interface BilanRue {
  readonly rue: number
  /** Part des runs encore vivantes en entrant dans cette Rue. */
  readonly survie: number
  readonly scoreMoyen: number
  readonly coutMoyenDuTrou: number
  /**
   * Le verdict de l'etape : combien de Trous une Manche moyenne paie dans cette Rue. En
   * dessous de 1, la cheville n'avance plus et la Rue est un mur.
   */
  readonly trousParManche: number
  readonly margeMoyenne: number
}

export interface BilanRun {
  readonly politique: PolitiqueAchat
  readonly runs: number
  readonly tauxVictoire: number
  readonly trouMedian: number
  /** Repartition des Manches de mort, index 0 a 11. */
  readonly mortsParManche: readonly number[]
  readonly rues: readonly BilanRue[]
}

export function simulerRuns(
  politique: PolitiqueAchat,
  nombre: number,
  graineDepart: number,
  options: OptionsStrategie,
  optionsRun: OptionsRun = {},
): BilanRun {
  const reglesRun = optionsRun.reglesRun ?? REGLES_RUN
  const mesures: MesuresRun[] = []
  for (let i = 0; i < nombre; i++) {
    mesures.push(jouerRunComplete(graineDepart + i, politique, options, optionsRun))
  }

  const mortsParManche = Array.from({ length: reglesRun.nombreDeManches }, () => 0)
  for (const mesure of mesures) {
    if (mesure.mancheDeMort !== null) {
      const compteur = mortsParManche[mesure.mancheDeMort]
      if (compteur !== undefined) mortsParManche[mesure.mancheDeMort] = compteur + 1
    }
  }

  const nombreDeRues = Math.ceil(reglesRun.nombreDeManches / reglesRun.manchesParRue)
  const rues: BilanRue[] = []
  for (let rue = 1; rue <= nombreDeRues; rue++) {
    const dansLaRue = mesures.flatMap((mesure) => mesure.manches.filter((m) => m.rue === rue))
    const atteintes = mesures.filter((mesure) => mesure.manches.some((m) => m.rue === rue)).length
    rues.push({
      rue,
      survie: atteintes / nombre,
      scoreMoyen: moyenneDe(dansLaRue.map((m) => m.score)),
      coutMoyenDuTrou: moyenneDe(dansLaRue.map((m) => m.coutDuTrou)),
      trousParManche: moyenneDe(dansLaRue.map((m) => m.trouApres - m.trouAvant)),
      margeMoyenne: moyenneDe(dansLaRue.map((m) => m.trouApres - m.cible)),
    })
  }

  const trous = mesures.map((mesure) => mesure.trouAtteint).sort((a, b) => a - b)
  return {
    politique,
    runs: nombre,
    tauxVictoire: mesures.filter((mesure) => mesure.gagnee).length / nombre,
    trouMedian: trous[Math.floor(trous.length / 2)] ?? 0,
    mortsParManche,
    rues,
  }
}

function moyenneDe(valeurs: readonly number[]): number {
  return valeurs.length === 0
    ? 0
    : valeurs.reduce((somme, valeur) => somme + valeur, 0) / valeurs.length
}
