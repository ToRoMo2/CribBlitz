import type { Carte } from '../core/carte.js'
import { compterMain } from '../core/compte.js'
import type { Action, EtatPartie } from '../core/etat.js'
import { indicesPosables, poser } from '../core/pose.js'
import { entier, melanger, type Rng } from '../core/rng.js'
import { calculerScore } from '../core/voies.js'
import type { ConfigPartie } from '../presets/index.js'

/**
 * Les strategies automatiques du harnais. Elles n'ont acces qu'a ce qu'un joueur voit :
 * sa main, la Boite, et l'ensemble des cartes non encore distribuees — jamais leur ordre,
 * donc jamais l'identite de la Retourne a venir.
 */

export interface OptionsStrategie {
  /**
   * Nombre de Retournes echantillonnees pour estimer la Boite. Le Compte d'une Boite a
   * 9 cartes coute 20 fois celui d'une main, et il est evalue 15 fois par Donne : c'est le
   * seul endroit du projet ou la force brute integrale ne passe pas.
   */
  readonly retournesBoite: number
}

export const OPTIONS_PAR_DEFAUT: OptionsStrategie = { retournesBoite: 6 }

export interface Strategie {
  readonly nom: string
  readonly description: string
  readonly choisir: (
    state: EtatPartie,
    rng: Rng,
    options: OptionsStrategie,
  ) => { indices: readonly number[]; rng: Rng }
}

export const STRATEGIES: readonly Strategie[] = [
  {
    nom: 'aleatoire',
    description: 'defausse au hasard — le plancher',
    choisir: (state, rng) => {
      const choix = combinaisonsDeK(state.donne.main.length, state.config.manche.defaussesParDonne)
      const tirage = entier(rng, choix.length)
      return { indices: choix[tirage.valeur] as readonly number[], rng: tirage.rng }
    },
  },
  {
    nom: 'main',
    description: 'maximise l’esperance du Compte de la main — marquer maintenant',
    choisir: (state, rng, options) =>
      meilleurChoix(state, rng, options, (main) => main),
  },
  {
    nom: 'boite',
    description: 'maximise l’esperance du Compte de la Boite — nourrir la bombe',
    choisir: (state, rng, options) =>
      meilleurChoix(state, rng, options, (_main, boite) => boite),
  },
  {
    nom: 'totale',
    description: 'maximise la somme des deux — la reference « optimale »',
    choisir: (state, rng, options) =>
      meilleurChoix(state, rng, options, (main, boite) => main + boite),
  },
]

export function strategieParNom(nom: string): Strategie {
  const trouvee = STRATEGIES.find((strategie) => strategie.nom === nom)
  if (trouvee === undefined) {
    throw new Error(`Strategie inconnue : ${nom} (connues : ${STRATEGIES.map((s) => s.nom).join(', ')})`)
  }
  return trouvee
}

export interface ChoixEvalue {
  readonly indices: readonly number[]
  readonly esperanceMain: number
  readonly esperanceBoite: number
}

/**
 * Les 15 defausses possibles, chacune avec ce qu'elle promet a la main et a la Boite.
 * C'est la matiere premiere de la question de l'etape 1 : si les 15 se valent, le choix
 * n'existe pas.
 */
export function evaluerChoix(
  state: EtatPartie,
  rng: Rng,
  options: OptionsStrategie,
): { choix: readonly ChoixEvalue[]; rng: Rng } {
  const main = state.donne.main
  const inconnues = state.paquet
  const { rng: apres, melange } = melanger(rng, inconnues)
  const echantillon = melange.slice(0, Math.min(options.retournesBoite, melange.length))
  const k = state.config.manche.defaussesParDonne

  // La Pince revele la Retourne avant la defausse : la strategie evalue alors la main avec
  // la vraie Retourne au lieu d'une esperance. La Boite, comptee a la fin avec une autre
  // Retourne, reste estimee par echantillon.
  const retournesMain = state.donne.retourne !== null ? [state.donne.retourne] : inconnues

  const choix = combinaisonsDeK(main.length, k).map((indices) => {
    const gardee = main.filter((_, index) => !indices.includes(index))
    const jetee = indices.map((index) => main[index] as Carte)
    return {
      indices,
      esperanceMain: esperance(gardee, retournesMain, false, state.config),
      esperanceBoite: esperance([...state.boite, ...jetee], echantillon, true, state.config),
    }
  })

  return { choix, rng: apres }
}

export function meilleurSelon(
  choix: readonly ChoixEvalue[],
  peser: (evalue: ChoixEvalue) => number,
): ChoixEvalue {
  let meilleur = choix[0]
  if (meilleur === undefined) throw new Error('Aucun choix a evaluer')
  for (const candidat of choix) {
    if (peser(candidat) > peser(meilleur)) meilleur = candidat
  }
  return meilleur
}

function meilleurChoix(
  state: EtatPartie,
  rng: Rng,
  options: OptionsStrategie,
  peser: (main: number, boite: number) => number,
): { indices: readonly number[]; rng: Rng } {
  const { choix, rng: apres } = evaluerChoix(state, rng, options)
  const meilleur = meilleurSelon(choix, (evalue) =>
    peser(evalue.esperanceMain, evalue.esperanceBoite),
  )
  return { indices: meilleur.indices, rng: apres }
}

function esperance(
  cartes: readonly Carte[],
  retournes: readonly Carte[],
  estBoite: boolean,
  config: ConfigPartie,
): number {
  if (retournes.length === 0) return 0
  // La strategie doit peser la main avec le meme multiplicateur que le moteur, sinon elle
  // sous-evalue la main et choisit mal la defausse.
  const multiplicateur = estBoite ? 1 : config.multiplicateurMain
  let somme = 0
  for (const retourne of retournes) {
    const combinaisons = compterMain(cartes, retourne, estBoite, config.cribbage)
    somme += calculerScore(combinaisons, config.niveaux, config.voies).score * multiplicateur
  }
  return somme / retournes.length
}

/**
 * La Pose est la meme pour toutes les strategies : on prend le meilleur coup immediat sans
 * jamais exploser. Elle ne doit pas polluer la mesure du choix de defausse.
 */
export function choisirPose(state: EtatPartie): Action {
  const pose = state.donne.pose
  if (pose === null) throw new Error('Aucune Pose en cours')
  const posables = indicesPosables(pose, state.config.pose)

  let meilleur: number | null = null
  let meilleurGain = -1
  for (const index of posables) {
    const gain = poser(pose, index, state.config.pose).etat.points - pose.points
    if (gain > meilleurGain) {
      meilleurGain = gain
      meilleur = index
    }
  }

  return meilleur === null ? { type: 'ENCAISSER' } : { type: 'POSER', index: meilleur }
}

/** Tous les sous-ensembles de `k` indices parmi `taille` (les defausses possibles). */
function combinaisonsDeK(taille: number, k: number): readonly (readonly number[])[] {
  const resultat: number[][] = []
  const courant: number[] = []
  const explorer = (debut: number): void => {
    if (courant.length === k) {
      resultat.push([...courant])
      return
    }
    for (let i = debut; i < taille; i++) {
      courant.push(i)
      explorer(i + 1)
      courant.pop()
    }
  }
  explorer(0)
  return resultat
}
