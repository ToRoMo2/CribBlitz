import { estValet, rangOrdinal, valeurAdditive, type Carte } from './carte.js'
import { REGLES_CRIBBAGE, type ReglesCribbage } from '../presets/cribbage.js'

export type TypeCombinaison = 'QUINZAINE' | 'PAIRE' | 'SUITE' | 'COULEUR' | 'VALET'

export interface Combinaison {
  readonly type: TypeCombinaison
  readonly cartes: readonly Carte[]
  /** Points cribbage bruts. Les niveaux de Voie s'appliquent plus tard, ailleurs. */
  readonly points: number
}

/**
 * Le Compte d'un ensemble de cartes (carnet §1.2).
 *
 * Renvoie une liste ordonnee, pas un total : c'est elle qui pilotera l'animation du
 * comptage scande. L'ordre suit le carnet §2.2 — quinzaines par taille croissante, paires,
 * suites, couleur, valet.
 *
 * Cette fonction ignore tout du roguelike : ni Voie, ni Mult, ni Manche.
 */
export function compterMain(
  cartes: readonly Carte[],
  retourne: Carte,
  estBoite: boolean,
  regles: ReglesCribbage = REGLES_CRIBBAGE,
): Combinaison[] {
  const ensemble = [...cartes, retourne]
  return [
    ...quinzaines(ensemble, regles),
    ...paires(ensemble, regles),
    ...suites(ensemble, regles),
    ...couleur(cartes, retourne, estBoite, regles),
    ...valetDeLaRetourne(cartes, retourne, regles),
  ]
}

export function totalPoints(combinaisons: readonly Combinaison[]): number {
  return combinaisons.reduce((somme, combinaison) => somme + combinaison.points, 0)
}

function quinzaines(ensemble: readonly Carte[], regles: ReglesCribbage): Combinaison[] {
  const trouvees: Combinaison[] = []
  for (let taille = regles.tailleMinQuinzaine; taille <= ensemble.length; taille++) {
    for (const indices of combinaisonsIndices(ensemble.length, taille)) {
      const choisies = indices.map((i) => ensemble[i] as Carte)
      const somme = choisies.reduce((total, carte) => total + valeurAdditive(carte), 0)
      if (somme === regles.sommeQuinzaine) {
        trouvees.push({ type: 'QUINZAINE', cartes: choisies, points: regles.pointsQuinzaine })
      }
    }
  }
  return trouvees
}

/**
 * Aucun cas particulier pour le brelan ou le carre : l'enumeration des paires non ordonnees
 * donne d'elle-meme 6 et 12 points (carnet §1.2).
 */
function paires(ensemble: readonly Carte[], regles: ReglesCribbage): Combinaison[] {
  const trouvees: Combinaison[] = []
  for (let i = 0; i < ensemble.length; i++) {
    for (let j = i + 1; j < ensemble.length; j++) {
      const a = ensemble[i] as Carte
      const b = ensemble[j] as Carte
      if (a.rang === b.rang) {
        trouvees.push({ type: 'PAIRE', cartes: [a, b], points: regles.pointsPaire })
      }
    }
  }
  return trouvees
}

/**
 * Chaque exemplaire d'une suite est une occurrence distincte : `4-5-5-6-6` produit quatre
 * combinaisons de 3 points, et non une seule de 12. C'est ce que demande le calcul des
 * Points du carnet §2.1 (« somme de chaque occurrence »), et c'est ce qu'il faut pour
 * surligner chaque suite separement.
 *
 * On compte toutes les sequences maximales, pas seulement la plus longue : une Boite de
 * 9 cartes peut contenir deux suites disjointes, ce qu'une main de 5 ne peut pas.
 */
function suites(ensemble: readonly Carte[], regles: ReglesCribbage): Combinaison[] {
  const parRang = new Map<number, Carte[]>()
  for (const carte of ensemble) {
    const ordinal = rangOrdinal(carte)
    const groupe = parRang.get(ordinal)
    if (groupe === undefined) parRang.set(ordinal, [carte])
    else groupe.push(carte)
  }

  const ordinaux = [...parRang.keys()].sort((a, b) => a - b)
  const trouvees: Combinaison[] = []
  let debut = 0
  while (debut < ordinaux.length) {
    let fin = debut + 1
    while (fin < ordinaux.length && (ordinaux[fin] as number) === (ordinaux[fin - 1] as number) + 1) {
      fin++
    }
    const longueur = fin - debut
    if (longueur >= regles.longueurSuiteMin) {
      const groupes = ordinaux.slice(debut, fin).map((ordinal) => parRang.get(ordinal) as Carte[])
      for (const exemplaire of produitCartesien(groupes)) {
        trouvees.push({
          type: 'SUITE',
          cartes: exemplaire,
          points: longueur * regles.pointsSuiteParCarte,
        })
      }
    }
    debut = fin
  }
  return trouvees
}

/**
 * En main, les cartes gardees suffisent, et la Retourne ajoute un point si elle suit.
 * Dans la Boite, la regle est plus severe : la Retourne doit suivre, sinon rien.
 */
function couleur(
  cartes: readonly Carte[],
  retourne: Carte,
  estBoite: boolean,
  regles: ReglesCribbage,
): Combinaison[] {
  const premiere = cartes[0]
  if (premiere === undefined) return []
  if (!cartes.every((carte) => carte.couleur === premiere.couleur)) return []

  const retourneSuit = retourne.couleur === premiere.couleur
  if (estBoite && !retourneSuit) return []

  const cartesCouleur = retourneSuit ? [...cartes, retourne] : [...cartes]
  return [{
    type: 'COULEUR',
    cartes: cartesCouleur,
    points: cartesCouleur.length * regles.pointsCouleurParCarte,
  }]
}

/** La Retourne elle-meme ne compte jamais : seul un Valet de la main ou de la Boite. */
function valetDeLaRetourne(
  cartes: readonly Carte[],
  retourne: Carte,
  regles: ReglesCribbage,
): Combinaison[] {
  return cartes
    .filter((carte) => estValet(carte) && carte.couleur === retourne.couleur)
    .map((carte) => ({
      type: 'VALET' as const,
      cartes: [carte, retourne],
      points: regles.pointsValetRetourne,
    }))
}

function combinaisonsIndices(taillePool: number, taille: number): number[][] {
  const resultat: number[][] = []
  const courant: number[] = []
  const explorer = (debut: number): void => {
    if (courant.length === taille) {
      resultat.push([...courant])
      return
    }
    for (let i = debut; i < taillePool; i++) {
      courant.push(i)
      explorer(i + 1)
      courant.pop()
    }
  }
  explorer(0)
  return resultat
}

function produitCartesien(groupes: readonly (readonly Carte[])[]): Carte[][] {
  let resultat: Carte[][] = [[]]
  for (const groupe of groupes) {
    const etendu: Carte[][] = []
    for (const partiel of resultat) {
      for (const carte of groupe) etendu.push([...partiel, carte])
    }
    resultat = etendu
  }
  return resultat
}
