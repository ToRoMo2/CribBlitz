import { estValet, paquet52, type Carte } from './carte.js'
import { compterMain } from './compte.js'
import type { Evenement } from './evenements.js'
import {
  collecterEncaissement,
  plierCheville,
  plierCombinaisons,
  plierConfigManche,
  plierConfigPose,
  plierScore,
  type CtxCheville,
  type Effet,
  type Modificateur,
} from './modificateurs.js'
import { creerPose, encaisser, poser, type EtatPose } from './pose.js'
import { creerRng, melanger } from './rng.js'
import { avancer, plafondDeLaManche, type Progression } from './trous.js'
import { calculerScore } from './voies.js'
import type { Action, EtatDonne, EtatPartie, Resultat, ResumeDonne } from './etat.js'
import { CONFIG_PAR_DEFAUT, type ConfigPartie } from '../presets/index.js'

/** Le depart par defaut : une Manche isolee commence au pied de la piste. */
const DEPART: Progression = { trou: 0, reste: 0 }

/**
 * Une Manche : 4 Donnes, la Boite qui accumule les defausses, et son Compte d'un seul coup
 * a la fin (carnet §3). Un seul paquet de 52 melange par Manche, tire sans remise.
 *
 * `depart` est la position de la cheville a l'ouverture. Une Manche ne possede pas la piste :
 * elle la parcourt. C'est la run qui la transporte d'une Manche a l'autre, pour que les 121
 * Trous du carnet §4.2 forment une seule progression et non douze remises a zero.
 *
 * Les modificateurs (reliques equipees + Adversaire) s'inserent aux points de hook du
 * pipeline. Le moteur ne connait aucun d'eux par son nom : il replie leurs fonctions.
 */
export function creerManche(
  graine: number,
  config: ConfigPartie = CONFIG_PAR_DEFAUT,
  modificateurs: readonly Modificateur[] = [],
  depart: Progression = DEPART,
): Resultat {
  // Les modificateurs transforment les regles de la Manche une fois, avant qu'elle commence.
  const configEffective: ConfigPartie = {
    ...config,
    manche: plierConfigManche(modificateurs, config.manche),
    pose: plierConfigPose(modificateurs, config.pose),
  }
  const { rng, melange } = melanger(creerRng(graine), paquet52())
  const distribution = tirer(melange, configEffective.manche.cartesParDonne)

  const events: Evenement[] = [{ type: 'DONNE_DISTRIBUEE', donne: 1, cartes: distribution.tirees }]
  const preparee = preparerDonne(1, distribution.tirees, distribution.reste, configEffective, events)

  const state: EtatPartie = {
    config: configEffective,
    modificateurs,
    rng,
    paquet: preparee.paquet,
    boite: [],
    donne: preparee.donne,
    phase: 'DEFAUSSE',
    trou: depart.trou,
    reste: depart.reste,
    cible: configEffective.manche.cibleAdversaire,
    historique: [],
    scoreBoite: null,
    gagnee: null,
  }

  return { state, events }
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
  // Le Sourd scelle la Boite : les defausses sont perdues.
  const boite = state.config.manche.boiteScellee ? state.boite : [...state.boite, ...defaussee]

  const events: Evenement[] = [
    { type: 'CARTES_DEFAUSSEES', cartes: defaussee, tailleBoite: boite.length },
  ]

  // La Retourne est deja revelee si La Pince est active ; sinon on la revele maintenant,
  // apres la defausse — le cribbage reel, qui fait du choix des 2 cartes un pari.
  let paquet = state.paquet
  let retourne = state.donne.retourne
  let talons = state.donne.talons
  if (retourne === null) {
    const revelation = revelerRetourne(paquet, state.config, events)
    paquet = revelation.paquet
    retourne = revelation.retourne
    talons = revelation.talons
  }

  return {
    state: {
      ...state,
      paquet,
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

  // Le Cran d'Arret : la Pose terminee sans explosion produit un effet que le Compte qui
  // suit — celui de cette meme Donne — consomme. Aucun etat inter-Donne n'est necessaire.
  const effets = collecterEncaissement(state.modificateurs, {
    explosee: pose.explosee,
    points: pose.points,
    pointsPerdus: pose.pointsPerdus,
    total: pose.total,
    seuil: state.config.pose.seuil,
    posees: pose.posees.length,
    restantes: pose.enMain.length,
  })

  // La Pose n'ajoute plus ses points au score : elle multiplie celui de la main (carnet
  // §1.3, §2.1). Mesure a l'appui, ajoutes bruts ils pesaient 4,2 % d'une Donne de Rue I et
  // 1,3 % en Rue IV — la deuxieme surface de score n'en etait pas une.
  const multDeLaPose = pose.points * state.config.pose.multParPointDePose
  events.push({ type: 'POSE_MULT', pointsDePose: pose.points, mult: multDeLaPose })

  const { contrib, effectif } = compterEtEmettre(
    state, state.donne.main, retourne, false, 'MAIN', state.config.multiplicateurMain, effets,
    multDeLaPose, events,
  )
  const scoreDonne = effectif + state.donne.talons
  const avance = faireAvancerLaCheville(state, scoreDonne, events)
  // La cheville adverse reagit a la Donne qui vient de finir : Le Regulier avance toujours,
  // Le Vorace bondit sur les gros scores, Le Tranchant sur les explosions (carnet §4.4).
  const apres = faireAvancerLaCible(avance, {
    donne: state.donne.numero,
    scoreDeLaDonne: scoreDonne,
    explosee: pose.explosee,
  }, events)

  const resume: ResumeDonne = {
    numero: state.donne.numero,
    recue: state.donne.recue,
    gardee: state.donne.main,
    defaussee: state.donne.defaussee,
    retourne,
    pointsMain: contrib.points,
    multMain: contrib.mult,
    scoreMain: effectif,
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
  const preparee = preparerDonne(numero, tirees, reste, state.config, events)
  return {
    state: { ...state, paquet: preparee.paquet, donne: preparee.donne, phase: 'DEFAUSSE' },
    events,
  }
}

/**
 * Le climax de la Manche : 8 cartes accumulees plus la Retourne de la derniere Donne,
 * comptees d'un seul coup (carnet §3). Boite scellee (Le Sourd) => vide => 0.
 */
function compterLaBoite(state: EtatPartie, retourne: Carte, events: Evenement[]): Resultat {
  // La Boite n'est jamais rehaussee : le multiplicateur ne touche que la main (carnet §7).
  // La Boite ne recoit pas le Mult de la Pose : il appartient a la Donne qui l'a gagne.
  const { effectif } = compterEtEmettre(state, state.boite, retourne, true, 'BOITE', 1, [], 0, events)
  events.push({ type: 'BOITE_COMPTEE', cartes: state.boite, score: effectif })

  const apres = faireAvancerLaCheville(state, effectif, events)
  const gagnee = state.config.manche.victoireSiEgalite
    ? apres.trou >= apres.cible
    : apres.trou > apres.cible
  events.push({
    type: gagnee ? 'MANCHE_GAGNEE' : 'MANCHE_PERDUE',
    trou: apres.trou,
    cible: apres.cible,
  })

  return { state: { ...apres, scoreBoite: effectif, phase: 'MANCHE_TERMINEE', gagnee }, events }
}

/**
 * Un Compte complet : le comptage cribbage brut, les hooks des modificateurs
 * (`surCombinaisons` puis `surScore`), la conversion en score, et l'emission des evenements.
 */
function compterEtEmettre(
  state: EtatPartie,
  cartes: readonly Carte[],
  retourne: Carte,
  estBoite: boolean,
  origine: 'MAIN' | 'BOITE',
  multiplicateur: number,
  effets: readonly Effet[],
  bonusMult: number,
  events: Evenement[],
): { contrib: { points: number; mult: number }; effectif: number } {
  const brutes = compterMain(cartes, retourne, estBoite, state.config.cribbage)
  const combinaisons = plierCombinaisons(state.modificateurs, brutes, { origine, cartes, retourne })
  const score = calculerScore(combinaisons, state.config.niveaux, state.config.voies)
  // Le bonus de la Pose entre avant les hooks, au meme rang qu'une Voie : une relique qui
  // agit sur le Mult le voit donc, et tout se compose au lieu de s'empiler par cas.
  const contrib = plierScore(
    state.modificateurs,
    { points: score.points, mult: score.mult + bonusMult },
    { origine, occurrences: score.occurrences, effets },
  )
  const effectif = Math.round(Math.round(contrib.points * contrib.mult) * multiplicateur)

  for (const occurrence of score.occurrences) {
    events.push({
      type: 'COMBINAISON_TROUVEE',
      combinaison: occurrence.combinaison,
      points: occurrence.points,
      origine,
    })
  }
  events.push({ type: 'MULT_APPLIQUE', mult: contrib.mult, voies: score.voiesDeclenchees, origine })
  events.push({ type: 'SCORE_CALCULE', points: contrib.points, mult: contrib.mult, score: effectif, origine })

  return { contrib, effectif }
}

function faireAvancerLaCible(
  state: EtatPartie,
  ctx: CtxCheville,
  events: Evenement[],
): EtatPartie {
  const cible = plierCheville(state.modificateurs, state.cible, ctx)
  if (cible === state.cible) return state

  const adversaire = state.modificateurs.find((mod) => mod.famille === 'ADVERSAIRE')
  events.push({
    type: 'CIBLE_AVANCE',
    de: state.cible,
    a: cible,
    adversaire: adversaire?.nom ?? 'l’Adversaire',
  })
  return { ...state, cible }
}

function faireAvancerLaCheville(
  state: EtatPartie,
  score: number,
  events: Evenement[],
): EtatPartie {
  // La cible vivante, pas celle du depart : trois Adversaires la deplacent en cours de
  // Manche, et le plafond doit suivre la ligne d'arrivee, pas son souvenir.
  const avancee = avancer(
    { trou: state.trou, reste: state.reste },
    score,
    state.config.manche,
    state.cible,
  )
  events.push({
    type: 'CHEVILLE_AVANCE',
    de: state.trou,
    a: avancee.progression.trou,
    reste: avancee.progression.reste,
  })

  // Le plafond ne se contente pas de bloquer : il jette ce que la banque ne peut plus tenir.
  // Les deux doivent s'entendre, sinon des points disparaissent sans explication.
  const plafond = plafondDeLaManche(state.cible, state.config.manche)
  if (avancee.progression.trou >= plafond || avancee.reportPerdu > 0) {
    events.push({
      type: 'CHEVILLE_PLAFONNEE',
      trou: avancee.progression.trou,
      plafond,
      reste: avancee.progression.reste,
      pointsPerdus: avancee.reportPerdu,
    })
  }

  return { ...state, trou: avancee.progression.trou, reste: avancee.progression.reste }
}

/** Prepare une Donne neuve ; revele la Retourne tout de suite si La Pince est active. */
function preparerDonne(
  numero: number,
  cartes: readonly Carte[],
  paquet: readonly Carte[],
  config: ConfigPartie,
  events: Evenement[],
): { donne: EtatDonne; paquet: readonly Carte[] } {
  const donne = donneNeuve(numero, cartes)
  if (!config.manche.revelerRetourneAvantDefausse) return { donne, paquet }

  const revelation = revelerRetourne(paquet, config, events)
  return {
    donne: { ...donne, retourne: revelation.retourne, talons: revelation.talons },
    paquet: revelation.paquet,
  }
}

function revelerRetourne(
  paquet: readonly Carte[],
  config: ConfigPartie,
  events: Evenement[],
): { retourne: Carte; paquet: readonly Carte[]; talons: number } {
  const { tirees, reste } = tirer(paquet, 1)
  const retourne = tirees[0]
  if (retourne === undefined) throw new Error('Paquet epuise')
  events.push({ type: 'RETOURNE_REVELEE', carte: retourne })

  const talons = estValet(retourne) ? config.cribbage.pointsTalons : 0
  if (talons > 0) events.push({ type: 'TALONS', points: talons })
  return { retourne, paquet: reste, talons }
}

function donneNeuve(numero: number, cartes: readonly Carte[]): EtatDonne {
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
