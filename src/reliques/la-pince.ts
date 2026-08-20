import type { Modificateur } from '../core/modificateurs.js'

/**
 * La Pince — vous voyez la Retourne avant de defausser (§5.2). Retire l'incertitude
 * centrale de la defausse : la relique « information » par excellence. Le drapeau est lu par
 * le cœur au moment de preparer chaque Donne.
 */
export const LA_PINCE: Modificateur = {
  id: 'la-pince',
  nom: 'La Pince',
  description: 'Vous voyez la Retourne avant de defausser.',
  famille: 'RETOURNE',
  configManche: (regles) => ({ ...regles, revelerRetourneAvantDefausse: true }),
}
