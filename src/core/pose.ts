import { rangOrdinal, valeurAdditive, type Carte } from './carte.js'
import type { Evenement } from './evenements.js'
import { REGLES_POSE, type ReglesPose } from '../presets/pose.js'

export interface EtatPose {
  readonly enMain: readonly Carte[]
  readonly posees: readonly Carte[]
  readonly total: number
  readonly points: number
  readonly terminee: boolean
  readonly explosee: boolean
  /** Ce que l'explosion a emporte. Zero tant qu'elle n'a pas eu lieu. */
  readonly pointsPerdus: number
}

export interface ResultatPose {
  readonly etat: EtatPose
  readonly evenements: Evenement[]
}

export function creerPose(cartes: readonly Carte[]): EtatPose {
  return {
    enMain: [...cartes],
    posees: [],
    total: 0,
    points: 0,
    terminee: false,
    explosee: false,
    pointsPerdus: 0,
  }
}

/**
 * Les cartes qui ne feraient pas exploser la Pose, et que l'ordre impose autorise. Le seuil
 * reste consultatif — poser au-dela est permis et fait exploser (carnet §1.3) — mais l'ordre
 * de L'Ordonne, lui, est une interdiction : `poser` la refuse.
 */
export function indicesPosables(etat: EtatPose, regles: ReglesPose = REGLES_POSE): number[] {
  return etat.enMain
    .map((carte, index) => ({ carte, index }))
    .filter(({ carte }) => etat.total + valeurAdditive(carte) <= regles.seuil)
    .filter(({ carte }) => respecteLOrdre(etat, carte, regles))
    .map(({ index }) => index)
}

/** L'Ordonne impose un rang strictement croissant. Sans lui, tout ordre est permis. */
export function respecteLOrdre(etat: EtatPose, carte: Carte, regles: ReglesPose): boolean {
  if (!regles.ordreCroissantImpose) return true
  const derniere = etat.posees[etat.posees.length - 1]
  return derniere === undefined || rangOrdinal(carte) > rangOrdinal(derniere)
}

/**
 * Poser une carte. Depasser le seuil est autorise et coute tous les points de Pose de la
 * Donne : c'est le risque, et l'encaissement volontaire est le garde-fou.
 */
export function poser(
  etat: EtatPose,
  index: number,
  regles: ReglesPose = REGLES_POSE,
): ResultatPose {
  if (etat.terminee) throw new Error('La Pose est terminee')
  const carte = etat.enMain[index]
  if (carte === undefined) throw new Error(`Aucune carte a l'index ${index}`)
  if (!respecteLOrdre(etat, carte, regles)) {
    throw new Error('L’ordre croissant est imposé cette Manche')
  }

  const enMain = etat.enMain.filter((_, i) => i !== index)
  const posees = [...etat.posees, carte]
  const total = etat.total + valeurAdditive(carte)
  const evenements: Evenement[] = [{ type: 'POSE_CARTE', carte, total }]

  if (total > regles.seuil) {
    evenements.push({ type: 'POSE_EXPLOSE', total, pointsPerdus: etat.points })
    return {
      etat: {
        enMain,
        posees,
        total,
        points: 0,
        terminee: true,
        explosee: true,
        pointsPerdus: etat.points,
      },
      evenements,
    }
  }

  let points = etat.points
  for (const marque of marquer(posees, total, enMain.length === 0, regles)) {
    points += marque.points
    evenements.push(marque)
  }

  // 31 est un cul-de-sac : plus aucune carte ne peut etre posee sans exploser.
  const terminee = enMain.length === 0 || total === regles.seuil
  if (terminee) evenements.push({ type: 'POSE_ENCAISSE', points })

  return {
    etat: { enMain, posees, total, points, terminee, explosee: false, pointsPerdus: 0 },
    evenements,
  }
}

export function encaisser(etat: EtatPose): ResultatPose {
  if (etat.terminee) throw new Error('La Pose est deja terminee')
  return {
    etat: { ...etat, terminee: true },
    evenements: [{ type: 'POSE_ENCAISSE', points: etat.points }],
  }
}

type Marque = Extract<Evenement, { type: 'POSE_MARQUE' }>

function marquer(
  posees: readonly Carte[],
  total: number,
  toutesPosees: boolean,
  regles: ReglesPose,
): Marque[] {
  const marques: Marque[] = []

  for (const palier of regles.paliers) {
    if (total === palier.total) {
      marques.push({
        type: 'POSE_MARQUE',
        raison: palier.total === regles.seuil ? 'SEUIL' : 'QUINZAINE',
        points: palier.points,
        cartes: posees,
      })
    }
  }

  const repetition = repetitionFinale(posees)
  const pointsRepetition = regles.pointsParRepetition[repetition] ?? 0
  if (pointsRepetition > 0) {
    marques.push({
      type: 'POSE_MARQUE',
      raison: 'REPETITION',
      points: pointsRepetition,
      cartes: posees.slice(posees.length - repetition),
    })
  }

  const suite = suiteFinale(posees, regles)
  if (suite !== null) {
    marques.push({
      type: 'POSE_MARQUE',
      raison: 'SUITE',
      points: suite.length * regles.pointsSuiteParCarte,
      cartes: suite,
    })
  }

  if (toutesPosees) {
    marques.push({
      type: 'POSE_MARQUE',
      raison: 'DERNIERE_CARTE',
      points: regles.pointsDerniereCarte,
      cartes: posees,
    })
    if (total === regles.seuil && regles.bonusSeuilParfait > 0) {
      marques.push({
        type: 'POSE_MARQUE',
        raison: 'SEUIL_PARFAIT',
        points: regles.bonusSeuilParfait,
        cartes: posees,
      })
    }
  }

  return marques
}

function repetitionFinale(posees: readonly Carte[]): number {
  const derniere = posees[posees.length - 1]
  if (derniere === undefined) return 0
  let compte = 0
  for (let i = posees.length - 1; i >= 0; i--) {
    if ((posees[i] as Carte).rang !== derniere.rang) break
    compte++
  }
  return compte
}

/**
 * Les N dernieres cartes posees, sans tenir compte de l'ordre : `6 puis 4 puis 5` est une
 * suite de 3. On prend la plus longue, et un rang repete casse la sequence.
 */
function suiteFinale(posees: readonly Carte[], regles: ReglesPose): Carte[] | null {
  for (let n = posees.length; n >= regles.longueurSuiteMin; n--) {
    const dernieres = posees.slice(posees.length - n)
    const ordinaux = dernieres.map(rangOrdinal)
    if (new Set(ordinaux).size !== n) continue
    if (Math.max(...ordinaux) - Math.min(...ordinaux) === n - 1) return dernieres
  }
  return null
}
