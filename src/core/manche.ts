import { estValet, paquet52, type Carte } from './carte.js'
import { compterMain } from './compte.js'
import type { Evenement } from './evenements.js'
import { creerPose, encaisser, poser, type EtatPose } from './pose.js'
import { creerRng, melanger } from './rng.js'
import { avancer } from './trous.js'
import { calculerScore, type ScoreCompte } from './voies.js'
import type { Action, EtatPartie, Resultat, ResumeDonne } from './etat.js'
import { CONFIG_PAR_DEFAUT, type ConfigPartie } from '../presets/index.js'

/**
 * Une Manche : 4 Donnes, la Boite qui accumule les defausses, et son Compte d'un seul coup
 * a la fin (carnet §3). Un seul paquet de 52 melange par Manche, tire sans remise.
 */
export function creerManche(graine: number, config: ConfigPartie = CONFIG_PAR_DEFAUT): Resultat {
  const { rng, melange } = melanger(creerRng(graine), paquet52())
  const { tirees, reste } = tirer(melange, config.manche.cartesParDonne)

  const state: EtatPartie = {
    config,
    rng,
    paquet: reste,
    boite: [],
    donne: donneNeuve(1, tirees),
    phase: 'DEFAUSSE',
    trou: 0,
    reste: 0,
    cible: config.manche.cibleAdversaire,
    historique: [],
    scoreBoite: null,
    gagnee: null,
  }

  return { state, events: [{ type: 'DONNE_DISTRIBUEE', donne: 1, cartes: tirees }] }
}

/** La signature unique du coeur. Aucun rendu, aucune horloge, aucun Math.random. */
export function reduire(state: EtatPartie, action: Action): Resultat {
  switch (action.type) {
    case 'DEFAUSSER':
      return defausser(state, action.indices)
    case 'POSER':
      return appliquerPose(state, (pose) => poser(pose, action.index, state.config.pose))
    case 'ENCAISSER':
      return appliquerPose(state, (pose) => encaisser(pose))
  }
}

function defausser(state: EtatPartie, indices: readonly number[]): Resultat {
  if (state.phase !== 'DEFAUSSE') throw new Error('Ce n’est pas le moment de defausser')
  const attendu = state.config.manche.defaussesParDonne
  if (indices.length !== attendu) throw new Error(`Il faut defausser exactement ${attendu} cartes`)
  if (new Set(indices).size !== indices.length) throw new Error('Indices en double')

  const main = state.donne.main
  const defaussee = indices.map((index) => {
    const carte = main[index]
    if (carte === undefined) throw new Error(`Aucune carte a l'index ${index}`)
    return carte
  })
  const gardee = main.filter((_, index) => !indices.includes(index))
  const boite = [...state.boite, ...defaussee]

  const events: Evenement[] = [
    { type: 'CARTES_DEFAUSSEES', cartes: defaussee, tailleBoite: boite.length },
  ]

  // La Retourne n'est revelee qu'apres la defausse : c'est le cribbage reel, et c'est ce qui
  // fait du choix des 2 cartes un pari plutot qu'un calcul.
  const { tirees, reste } = tirer(state.paquet, 1)
  const retourne = tirees[0]
  if (retourne === undefined) throw new Error('Paquet epuise')
  events.push({ type: 'RETOURNE_REVELEE', carte: retourne })

  const talons = estValet(retourne) ? state.config.cribbage.pointsTalons : 0
  if (talons > 0) events.push({ type: 'TALONS', points: talons })

  return {
    state: {
      ...state,
      paquet: reste,
      boite,
      donne: {
        ...state.donne,
        main: gardee,
        defaussee,
        retourne,
        pose: creerPose(gardee),
        talons,
      },
      phase: 'POSE',
    },
    events,
  }
}

function appliquerPose(
  state: EtatPartie,
  transition: (pose: EtatPose) => { etat: EtatPose; evenements: Evenement[] },
): Resultat {
  if (state.phase !== 'POSE') throw new Error('Ce n’est pas le moment de poser')
  const pose = state.donne.pose
  if (pose === null) throw new Error('Aucune Pose en cours')

  const { etat, evenements } = transition(pose)
  const apres: EtatPartie = { ...state, donne: { ...state.donne, pose: etat } }
  if (!etat.terminee) return { state: apres, events: evenements }

  return terminerDonne(apres, etat, evenements)
}

function terminerDonne(state: EtatPartie, pose: EtatPose, events: Evenement[]): Resultat {
  const retourne = state.donne.retourne
  if (retourne === null) throw new Error('Retourne absente')

  const score = compterEtEmettre(state, state.donne.main, retourne, false, 'MAIN', events)
  const scoreDonne = score.score + pose.points + state.donne.talons
  const apres = faireAvancerLaCheville(state, scoreDonne, events)

  const resume: ResumeDonne = {
    numero: state.donne.numero,
    recue: state.donne.recue,
    gardee: state.donne.main,
    defaussee: state.donne.defaussee,
    retourne,
    pointsMain: score.points,
    multMain: score.mult,
    scoreMain: score.score,
    pointsPose: pose.points,
    explosee: pose.explosee,
    talons: state.donne.talons,
    scoreDonne,
  }
  const avecHistorique: EtatPartie = { ...apres, historique: [...apres.historique, resume] }

  if (state.donne.numero < state.config.manche.nombreDeDonnes) {
    return distribuerLaSuivante(avecHistorique, events)
  }
  return compterLaBoite(avecHistorique, retourne, events)
}

function distribuerLaSuivante(state: EtatPartie, events: Evenement[]): Resultat {
  const numero = state.donne.numero + 1
  const { tirees, reste } = tirer(state.paquet, state.config.manche.cartesParDonne)
  events.push({ type: 'DONNE_DISTRIBUEE', donne: numero, cartes: tirees })
  return {
    state: { ...state, paquet: reste, donne: donneNeuve(numero, tirees), phase: 'DEFAUSSE' },
    events,
  }
}

/**
 * Le climax de la Manche : 8 cartes accumulees plus la Retourne de la derniere Donne,
 * comptees d'un seul coup (carnet §3).
 */
function compterLaBoite(state: EtatPartie, retourne: Carte, events: Evenement[]): Resultat {
  const score = compterEtEmettre(state, state.boite, retourne, true, 'BOITE', events)
  events.push({ type: 'BOITE_COMPTEE', cartes: state.boite, score: score.score })

  const apres = faireAvancerLaCheville(state, score.score, events)
  const gagnee = state.config.manche.victoireSiEgalite
    ? apres.trou >= apres.cible
    : apres.trou > apres.cible
  events.push({
    type: gagnee ? 'MANCHE_GAGNEE' : 'MANCHE_PERDUE',
    trou: apres.trou,
    cible: apres.cible,
  })

  return { state: { ...apres, scoreBoite: score, phase: 'MANCHE_TERMINEE', gagnee }, events }
}

function compterEtEmettre(
  state: EtatPartie,
  cartes: readonly Carte[],
  retourne: Carte,
  estBoite: boolean,
  origine: 'MAIN' | 'BOITE',
  events: Evenement[],
): ScoreCompte {
  const combinaisons = compterMain(cartes, retourne, estBoite, state.config.cribbage)
  const score = calculerScore(combinaisons, state.config.niveaux, state.config.voies)

  for (const occurrence of score.occurrences) {
    events.push({
      type: 'COMBINAISON_TROUVEE',
      combinaison: occurrence.combinaison,
      points: occurrence.points,
      origine,
    })
  }
  events.push({
    type: 'MULT_APPLIQUE',
    mult: score.mult,
    voies: score.voiesDeclenchees,
    origine,
  })
  events.push({
    type: 'SCORE_CALCULE',
    points: score.points,
    mult: score.mult,
    score: score.score,
    origine,
  })

  return score
}

function faireAvancerLaCheville(
  state: EtatPartie,
  score: number,
  events: Evenement[],
): EtatPartie {
  const avancee = avancer({ trou: state.trou, reste: state.reste }, score, state.config.manche)
  events.push({
    type: 'CHEVILLE_AVANCE',
    de: state.trou,
    a: avancee.progression.trou,
    reste: avancee.progression.reste,
  })
  return { ...state, trou: avancee.progression.trou, reste: avancee.progression.reste }
}

function donneNeuve(numero: number, cartes: readonly Carte[]): EtatPartie['donne'] {
  return {
    numero,
    recue: cartes,
    main: cartes,
    defaussee: [],
    retourne: null,
    pose: null,
    talons: 0,
  }
}

function tirer(
  paquet: readonly Carte[],
  combien: number,
): { tirees: readonly Carte[]; reste: readonly Carte[] } {
  if (paquet.length < combien) throw new Error('Paquet epuise')
  return { tirees: paquet.slice(0, combien), reste: paquet.slice(combien) }
}
