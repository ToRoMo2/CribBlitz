import { creerManche, reduire } from '../core/manche.js'
import { creerRng } from '../core/rng.js'
import { CONFIG_PAR_DEFAUT, type ConfigPartie } from '../presets/index.js'
import {
  choisirPose,
  evaluerChoix,
  meilleurSelon,
  type ChoixEvalue,
  type OptionsStrategie,
  type Strategie,
} from './strategies.js'

/**
 * Le harnais : il joue des Manches sans rien afficher et rend des nombres. Toutes les
 * strategies rejouent exactement les memes donnes (memes graines), donc la comparaison est
 * appariee et l'ecart mesure le choix de defausse, et rien d'autre.
 */

export interface MesuresManche {
  readonly scoresMain: readonly number[]
  readonly pointsMain: readonly number[]
  readonly pointsPose: readonly number[]
  readonly scoresDonne: readonly number[]
  readonly scoreBoite: number
  readonly totalManche: number
  readonly trou: number
  readonly gagnee: boolean
  readonly explosions: number
}

export function jouerManche(
  graine: number,
  strategie: Strategie,
  options: OptionsStrategie,
  config: ConfigPartie = CONFIG_PAR_DEFAUT,
): MesuresManche {
  let { state } = creerManche(graine, config)
  // Un PRNG distinct de celui du coeur : la strategie ne doit pas perturber la distribution.
  let rng = creerRng(graine * 7919 + 13)

  while (state.phase !== 'MANCHE_TERMINEE') {
    if (state.phase === 'DEFAUSSE') {
      const choix = strategie.choisir(state, rng, options)
      rng = choix.rng
      state = reduire(state, { type: 'DEFAUSSER', indices: choix.indices }).state
      continue
    }
    state = reduire(state, choisirPose(state)).state
  }

  const scoresDonne = state.historique.map((donne) => donne.scoreDonne)
  const scoreBoite = state.scoreBoite?.score ?? 0
  return {
    scoresMain: state.historique.map((donne) => donne.scoreMain),
    pointsMain: state.historique.map((donne) => donne.pointsMain),
    pointsPose: state.historique.map((donne) => donne.pointsPose + donne.talons),
    scoresDonne,
    scoreBoite,
    totalManche: scoresDonne.reduce((somme, score) => somme + score, 0) + scoreBoite,
    trou: state.trou,
    gagnee: state.gagnee === true,
    explosions: state.historique.filter((donne) => donne.explosee).length,
  }
}

export interface Bilan {
  readonly strategie: Strategie
  readonly scoreMainMoyen: number
  readonly pointsMainMoyens: number
  readonly posesMoyennes: number
  readonly donneMoyenne: number
  readonly boiteMoyenne: number
  readonly ratioBoite: number
  readonly totalMoyen: number
  readonly trouMoyen: number
  readonly tauxVictoire: number
  readonly tauxExplosion: number
  readonly donnes: readonly number[]
  readonly boites: readonly number[]
}

export function simuler(
  strategie: Strategie,
  manches: number,
  graineDepart: number,
  options: OptionsStrategie,
  config: ConfigPartie = CONFIG_PAR_DEFAUT,
): Bilan {
  const scoresMain: number[] = []
  const pointsMain: number[] = []
  const poses: number[] = []
  const donnes: number[] = []
  const boites: number[] = []
  const totaux: number[] = []
  const trous: number[] = []
  let victoires = 0
  let explosions = 0
  let donnesJouees = 0

  for (let i = 0; i < manches; i++) {
    const mesures = jouerManche(graineDepart + i, strategie, options, config)
    scoresMain.push(...mesures.scoresMain)
    pointsMain.push(...mesures.pointsMain)
    poses.push(...mesures.pointsPose)
    donnes.push(...mesures.scoresDonne)
    boites.push(mesures.scoreBoite)
    totaux.push(mesures.totalManche)
    trous.push(mesures.trou)
    if (mesures.gagnee) victoires++
    explosions += mesures.explosions
    donnesJouees += mesures.scoresDonne.length
  }

  const sommeDonnes = donnes.reduce((somme, score) => somme + score, 0)
  const sommeBoites = boites.reduce((somme, score) => somme + score, 0)

  return {
    strategie,
    scoreMainMoyen: moyenne(scoresMain),
    pointsMainMoyens: moyenne(pointsMain),
    posesMoyennes: moyenne(poses),
    donneMoyenne: moyenne(donnes),
    boiteMoyenne: moyenne(boites),
    ratioBoite: sommeDonnes === 0 ? Number.POSITIVE_INFINITY : sommeBoites / sommeDonnes,
    totalMoyen: moyenne(totaux),
    trouMoyen: moyenne(trous),
    tauxVictoire: victoires / manches,
    tauxExplosion: donnesJouees === 0 ? 0 : explosions / donnesJouees,
    donnes,
    boites,
  }
}

/**
 * La mesure qui tranche vraiment la question de l'etape 1 : est-ce que la defausse est une
 * decision, ou un reflexe ? On regarde, defausse par defausse, l'ecart entre les 15 choix
 * possibles et si les deux philosophies opposees designent la meme carte.
 */
export interface Desaccords {
  readonly decisions: number
  /** Part des Donnes ou « marquer maintenant » et « armer la bombe » ne disent pas pareil. */
  readonly partDesaccord: number
  /** Ecart moyen entre le meilleur choix et le deuxieme : la marge de la decision. */
  readonly margeMoyenne: number
  /** Ecart moyen entre le meilleur et le pire des 15 : ce que coute une defausse distraite. */
  readonly etendueMoyenne: number
  /** Ce que coute, en moyenne, de suivre aveuglement chaque philosophie. */
  readonly coutToutBoite: number
  readonly coutToutMain: number
}

export function mesurerDesaccords(
  manches: number,
  graineDepart: number,
  options: OptionsStrategie,
  config: ConfigPartie = CONFIG_PAR_DEFAUT,
): Desaccords {
  const totale = (choix: ChoixEvalue): number => choix.esperanceMain + choix.esperanceBoite

  let decisions = 0
  let desaccords = 0
  let marges = 0
  let etendues = 0
  let coutBoite = 0
  let coutMain = 0

  for (let i = 0; i < manches; i++) {
    const graine = graineDepart + i
    let { state } = creerManche(graine, config)
    let rng = creerRng(graine * 7919 + 13)

    while (state.phase !== 'MANCHE_TERMINEE') {
      if (state.phase !== 'DEFAUSSE') {
        state = reduire(state, choisirPose(state)).state
        continue
      }

      const evaluation = evaluerChoix(state, rng, options)
      rng = evaluation.rng
      const choix = evaluation.choix
      const meilleur = meilleurSelon(choix, totale)
      const selonBoite = meilleurSelon(choix, (evalue) => evalue.esperanceBoite)
      const selonMain = meilleurSelon(choix, (evalue) => evalue.esperanceMain)

      const valeurs = choix.map(totale).sort((a, b) => b - a)
      const premier = valeurs[0] ?? 0
      const second = valeurs[1] ?? premier
      const dernier = valeurs.at(-1) ?? premier

      decisions++
      if (selonBoite.indices.join() !== selonMain.indices.join()) desaccords++
      marges += premier - second
      etendues += premier - dernier
      coutBoite += totale(meilleur) - totale(selonBoite)
      coutMain += totale(meilleur) - totale(selonMain)

      state = reduire(state, { type: 'DEFAUSSER', indices: meilleur.indices }).state
    }
  }

  return {
    decisions,
    partDesaccord: decisions === 0 ? 0 : desaccords / decisions,
    margeMoyenne: decisions === 0 ? 0 : marges / decisions,
    etendueMoyenne: decisions === 0 ? 0 : etendues / decisions,
    coutToutBoite: decisions === 0 ? 0 : coutBoite / decisions,
    coutToutMain: decisions === 0 ? 0 : coutMain / decisions,
  }
}

export function moyenne(valeurs: readonly number[]): number {
  return valeurs.length === 0
    ? 0
    : valeurs.reduce((somme, valeur) => somme + valeur, 0) / valeurs.length
}

export function percentile(valeurs: readonly number[], part: number): number {
  if (valeurs.length === 0) return 0
  const triees = [...valeurs].sort((a, b) => a - b)
  const index = Math.min(triees.length - 1, Math.floor(part * (triees.length - 1)))
  return triees[index] as number
}
