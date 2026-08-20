import { rangOrdinal, type Carte } from '../core/carte.js'
import type { Combinaison } from '../core/compte.js'
import type { Modificateur } from '../core/modificateurs.js'

/**
 * La Fourche — les suites tolerent un rang manquant : `4-5-7` vaut une suite de 3 (§5.2).
 *
 * On remplace entierement la detection des suites du cœur par une version qui autorise **un
 * seul trou** dans la sequence. La regle exacte (choisie et fixee ici, dans le fichier de la
 * relique, jamais dans le moteur) : un groupe est une suite si, en le parcourant par rang
 * croissant, chaque rang suivant est a distance 1 ou 2 du precedent, et le groupe entier ne
 * saute qu'un rang au total — soit `(max - min + 1) - nb rangs distincts <= 1`. La longueur
 * comptee est le nombre de cartes reellement presentes. Le cas « zero trou » redonne
 * exactement la suite classique, donc La Fourche etend le cœur sans le contredire.
 */
export const LA_FOURCHE: Modificateur = {
  id: 'la-fourche',
  nom: 'La Fourche',
  description: 'Les suites comptent un rang manquant : 4-5-7 vaut une suite de 3.',
  famille: 'COMPTE',
  surCombinaisons: (combinaisons, ctx) => {
    const sansSuites = combinaisons.filter((c) => c.type !== 'SUITE')
    return [...sansSuites, ...suitesAvecTrou([...ctx.cartes, ctx.retourne])]
  },
}

function suitesAvecTrou(ensemble: readonly Carte[]): Combinaison[] {
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
    let trous = 0
    while (fin < ordinaux.length) {
      const ecart = (ordinaux[fin] as number) - (ordinaux[fin - 1] as number)
      if (ecart > 2) break
      if (trous + (ecart - 1) > 1) break // au plus un rang manquant sur tout le groupe
      trous += ecart - 1
      fin++
    }
    const longueur = fin - debut
    if (longueur >= 3) {
      const groupes = ordinaux.slice(debut, fin).map((ordinal) => parRang.get(ordinal) as Carte[])
      for (const exemplaire of produitCartesien(groupes)) {
        trouvees.push({ type: 'SUITE', cartes: exemplaire, points: longueur })
      }
    }
    debut = fin
  }
  return trouvees
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
