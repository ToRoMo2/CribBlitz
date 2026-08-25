import type { Combinaison } from '../core/compte.js'
import type { Modificateur } from '../core/modificateurs.js'

/**
 * La Loupe — la plus grosse combinaison du Compte est comptee deux fois.
 *
 * Elle ne donne aucun point fixe : elle depend entierement de ce que la main a produit, donc
 * elle vaut peu sur un Compte plat et beaucoup sur un Compte qui a un sommet. Elle pousse a
 * chercher la grande suite ou la couleur pleine plutot qu'a empiler des quinzaines.
 *
 * En cas d'egalite, la premiere dans l'ordre du §2.2 est choisie — le comptage scande doit
 * rester deterministe.
 */
export const LA_LOUPE: Modificateur = {
  id: 'la-loupe',
  nom: 'La Loupe',
  description: 'La plus grosse combinaison du Compte est comptee deux fois.',
  famille: 'COMPTE',
  surCombinaisons: (combinaisons): Combinaison[] => {
    let sommet: Combinaison | null = null
    for (const combinaison of combinaisons) {
      if (sommet === null || combinaison.points > sommet.points) sommet = combinaison
    }
    return sommet === null ? [...combinaisons] : [...combinaisons, sommet]
  },
}
