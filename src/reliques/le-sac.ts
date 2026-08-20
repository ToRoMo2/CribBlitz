import type { Modificateur } from '../core/modificateurs.js'

/**
 * Le Sac — la Boite prend 3 cartes par Donne au lieu de 2 (§5.2). Vous ne gardez donc que
 * 3 cartes en main : la Pose et le Compte sont deja generiques en nombre de cartes, rien
 * d'autre a toucher. Nourrit la bombe plus vite, au prix d'une main appauvrie.
 */
export const LE_SAC: Modificateur = {
  id: 'le-sac',
  nom: 'Le Sac',
  description: 'La Boite prend 3 cartes par Donne (vous n’en gardez que 3).',
  famille: 'BOITE',
  configManche: (regles) => ({ ...regles, defaussesParDonne: 3 }),
}
