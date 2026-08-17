/**
 * PRNG seede et purement fonctionnel : l'etat est une valeur, jamais une variable cachee.
 * C'est ce qui permet au coeur de rester pur et a une Manche d'etre rejouable a l'identique
 * a partir de sa seule graine.
 */

export interface Rng {
  readonly etat: number
}

export function creerRng(graine: number): Rng {
  return { etat: graine | 0 }
}

/** mulberry32 : suffisant ici, et tient en dix lignes sans dependance. */
function etape(rng: Rng): { rng: Rng; brut: number } {
  const etat = (rng.etat + 0x6d2b79f5) | 0
  let x = etat
  x = Math.imul(x ^ (x >>> 15), x | 1)
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
  return { rng: { etat }, brut: (x ^ (x >>> 14)) >>> 0 }
}

/** Un flottant dans [0, 1). */
export function suivant(rng: Rng): { rng: Rng; valeur: number } {
  const { rng: apres, brut } = etape(rng)
  return { rng: apres, valeur: brut / 4294967296 }
}

/** Un entier dans [0, borne). */
export function entier(rng: Rng, borne: number): { rng: Rng; valeur: number } {
  const { rng: apres, valeur } = suivant(rng)
  return { rng: apres, valeur: Math.floor(valeur * borne) }
}

/** Fisher-Yates. Ne modifie pas le tableau recu. */
export function melanger<T>(rng: Rng, elements: readonly T[]): { rng: Rng; melange: T[] } {
  const melange = [...elements]
  let courant = rng
  for (let i = melange.length - 1; i > 0; i--) {
    const tirage = entier(courant, i + 1)
    courant = tirage.rng
    const j = tirage.valeur
    const a = melange[i] as T
    const b = melange[j] as T
    melange[i] = b
    melange[j] = a
  }
  return { rng: courant, melange }
}
