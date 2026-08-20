import type { Evenement } from '../core/evenements.js'

/**
 * Tous les chiffres du comptage scande (carnet §2.3). Aucun n'est en dur dans la couche de
 * rendu : le feel se regle ici, a l'oreille, sans toucher a une ligne de logique.
 *
 * Toutes les durees sont en millisecondes. La couche audio les convertit en secondes ;
 * ce fichier ne connait ni Web Audio, ni DOM, et reste testable sous Node.
 */

/** Les formes d'onde de l'OscillatorNode, redeclarees pour ne pas dependre des types du DOM. */
export type FormeOnde = 'sine' | 'triangle' | 'square' | 'sawtooth'

export type NomVoix =
  | 'carte'
  | 'boite'
  | 'retourne'
  | 'marque'
  | 'encaisse'
  | 'explose'
  | 'compte'
  | 'mult'
  | 'score'
  | 'cheville'
  | 'victoire'
  | 'defaite'

/**
 * Un timbre percussif : une hauteur, une enveloppe raide, et une part de bruit pour le
 * transitoire. Synthetise a la volee — aucun echantillon, donc aucune direction artistique
 * a choisir, ce que l'etape 3 interdit.
 */
export interface Voix {
  readonly frequence: number
  readonly forme: FormeOnde
  readonly attaque: number
  readonly extinction: number
  /** Part de bruit dans l'attaque, 0 a 1. C'est elle qui rend le coup percussif. */
  readonly bruit: number
  readonly gain: number
}

export const VOIX: Readonly<Record<NomVoix, Voix>> = {
  carte: { frequence: 220, forme: 'triangle', attaque: 2, extinction: 70, bruit: 0.6, gain: 0.25 },
  boite: { frequence: 110, forme: 'sine', attaque: 3, extinction: 140, bruit: 0.4, gain: 0.35 },
  retourne: { frequence: 587, forme: 'triangle', attaque: 4, extinction: 320, bruit: 0.15, gain: 0.3 },
  marque: { frequence: 880, forme: 'square', attaque: 2, extinction: 90, bruit: 0.1, gain: 0.18 },
  encaisse: { frequence: 440, forme: 'sine', attaque: 6, extinction: 260, bruit: 0.05, gain: 0.28 },
  explose: { frequence: 65, forme: 'sawtooth', attaque: 2, extinction: 420, bruit: 0.8, gain: 0.4 },
  // La voix du rituel. Tout le reste du jeu se tait pour elle.
  compte: { frequence: 294, forme: 'triangle', attaque: 2, extinction: 150, bruit: 0.25, gain: 0.3 },
  mult: { frequence: 147, forme: 'sawtooth', attaque: 4, extinction: 380, bruit: 0.2, gain: 0.35 },
  score: { frequence: 73, forme: 'sine', attaque: 8, extinction: 900, bruit: 0.3, gain: 0.5 },
  cheville: { frequence: 330, forme: 'square', attaque: 2, extinction: 110, bruit: 0.35, gain: 0.2 },
  victoire: { frequence: 523, forme: 'triangle', attaque: 10, extinction: 700, bruit: 0.05, gain: 0.4 },
  defaite: { frequence: 98, forme: 'sawtooth', attaque: 10, extinction: 800, bruit: 0.2, gain: 0.35 },
}

export interface ReglesScansion {
  /**
   * Duree visee d'un Compte entier. L'intervalle entre deux combinaisons en decoule :
   * `budget / N`, borne. Une main ordinaire (3 combinaisons) tient le plafond et claque ;
   * une Boite mesuree a 274 combinaisons tombe au plancher et devient un roulement.
   */
  readonly budgetCompte: number
  /** Plancher : en dessous, l'oreille n'entend plus des coups mais un roulement. Voulu. */
  readonly intervalleMin: number
  readonly intervalleMax: number

  readonly demiTonParCombinaison: number
  /**
   * La montee se replie dans cette fenetre. Sans repli, la Boite mesuree monterait de
   * 274 demi-tons, soit 22 octaves : le rituel du cribbage monte par phrase, pas a l'infini.
   */
  readonly fenetreDemiTons: number
  /** Intensite du premier coup d'une nouvelle Voie — la respiration du rituel scande. */
  readonly accentDeVoie: number
  /** Gain gagne entre le premier et le dernier coup d'un Compte. */
  readonly crescendo: number

  /**
   * Le tempo accelere pendant le Compte, et sa pente est reglee par le Mult final
   * (carnet §2.3). `ratio` = dernier intervalle / premier. Le Mult mesure va de 1 a 12,
   * mediane 4 : l'ecart doit rester resserre, sinon l'effet est inaudible sur une main
   * ordinaire.
   */
  readonly multDeBase: number
  readonly multSature: number
  readonly ratioAuMultDeBase: number
  readonly ratioAuMultSature: number

  /** Le silence avant la multiplication. C'est lui qui fait exister le « fois ». */
  readonly respirationAvantMult: number

  /** Le temps laisse a chaque evenement avant le suivant. Les combinaisons l'ignorent. */
  readonly delais: Readonly<Record<Evenement['type'], number>>
  readonly voix: Readonly<Record<Evenement['type'], NomVoix | null>>
}

export const REGLES_SCANSION: ReglesScansion = {
  budgetCompte: 2600,
  intervalleMin: 26,
  intervalleMax: 260,

  demiTonParCombinaison: 1,
  fenetreDemiTons: 24,
  accentDeVoie: 1.35,
  crescendo: 0.35,

  multDeBase: 1,
  multSature: 12,
  ratioAuMultDeBase: 1,
  ratioAuMultSature: 0.45,

  respirationAvantMult: 300,

  delais: {
    DONNE_DISTRIBUEE: 260,
    CARTES_DEFAUSSEES: 300,
    RETOURNE_REVELEE: 420,
    TALONS: 320,
    POSE_CARTE: 160,
    POSE_MARQUE: 220,
    POSE_ENCAISSE: 340,
    POSE_EXPLOSE: 600,
    COMBINAISON_TROUVEE: 0,
    MULT_APPLIQUE: 520,
    SCORE_CALCULE: 700,
    BOITE_COMPTEE: 500,
    CHEVILLE_AVANCE: 450,
    MANCHE_GAGNEE: 0,
    MANCHE_PERDUE: 0,
  },

  voix: {
    DONNE_DISTRIBUEE: 'carte',
    CARTES_DEFAUSSEES: 'boite',
    RETOURNE_REVELEE: 'retourne',
    TALONS: 'marque',
    POSE_CARTE: 'carte',
    POSE_MARQUE: 'marque',
    POSE_ENCAISSE: 'encaisse',
    POSE_EXPLOSE: 'explose',
    COMBINAISON_TROUVEE: 'compte',
    MULT_APPLIQUE: 'mult',
    SCORE_CALCULE: 'score',
    BOITE_COMPTEE: null,
    CHEVILLE_AVANCE: 'cheville',
    MANCHE_GAGNEE: 'victoire',
    MANCHE_PERDUE: 'defaite',
  },
}
