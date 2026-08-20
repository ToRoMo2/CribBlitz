import type { Modificateur } from '../core/modificateurs.js'

/**
 * L'Usurier — +2 ¤ par Manche, mais la cheville adverse part 3 Trous plus loin (§5.2).
 * Economie contre puissance : l'argent est immediat, la cible plus dure est le prix.
 */
export const L_USURIER: Modificateur = {
  id: 'l-usurier',
  nom: "L'Usurier",
  description: '+2 ¤ par Manche, mais la cible adverse part 3 Trous plus loin.',
  famille: 'STRUCTURE',
  configManche: (regles) => ({ ...regles, cibleAdversaire: regles.cibleAdversaire + 3 }),
  surEconomie: (gains) => ({ argent: gains.argent + 2 }),
}
