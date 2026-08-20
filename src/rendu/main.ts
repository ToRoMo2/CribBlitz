import type { Action, EtatPartie } from '../core/etat.js'
import { creerManche, reduire } from '../core/manche.js'
import { Lecteur } from './audio.js'
import { Compteur } from './compteur.js'
import { planifier } from './partition.js'
import { Scene } from './scene.js'

/**
 * Le pilote. Il fait tourner exactement le meme coeur que `npm run cli` : `creerManche`
 * puis `reduire`, et il rejoue le flux d'evenements rendu par chaque action.
 *
 * Tout ce que cette couche sait faire, c'est demander une action et regarder le resultat
 * passer. Elle ne calcule aucun point, ne connait aucune regle du cribbage, et n'a aucun
 * moyen d'en inventer une.
 */

const lecteur = new Lecteur()
const compteur = new Compteur()

let state: EtatPartie
let occupe = false
/** Une carte explosive demande deux clics, comme la CLI demande une confirmation. */
let armee: number | null = null

const scene = new Scene({
  surCarte: (index) => void surCarte(index),
  surEncaisser: () => void agir({ type: 'ENCAISSER' }),
})

async function surCarte(index: number): Promise<void> {
  if (occupe) return

  if (state.phase === 'POSE') {
    if (!scene.exploserait(state, index) || armee === index) {
      armee = null
      return agir({ type: 'POSER', index })
    }
    armee = index
    scene.armer(index)
    return
  }
  if (state.phase !== 'DEFAUSSE') return

  const attendu = state.config.manche.defaussesParDonne
  const selection = scene.basculerSelection(index, attendu)
  if (selection.length === attendu) await agir({ type: 'DEFAUSSER', indices: selection })
}

/** Une action, son flux d'evenements joue jusqu'au bout, puis la scene resynchronisee. */
async function agir(action: Action): Promise<void> {
  if (occupe) return
  occupe = true
  armee = null
  scene.viderSelection()
  verrouiller(true)

  try {
    const resultat = reduire(state, action)
    state = resultat.state
    await rejouer(resultat.events)
  } finally {
    occupe = false
    verrouiller(false)
    scene.rendre(state)
  }
}

/** La saisie est fermee tant que le flux se joue : le comptage ne s'interrompt pas. */
function verrouiller(ferme: boolean): void {
  document.body.classList.toggle('occupe', ferme)
}

async function rejouer(evenements: Parameters<typeof planifier>[0]): Promise<void> {
  await lecteur.jouer(planifier(evenements), (coup) => {
    scene.appliquer(coup)
    compteur.appliquer(coup)
  })
}

function graine(): number {
  const demandee = new URLSearchParams(window.location.search).get('graine')
  const valeur = demandee === null ? Number.NaN : Number.parseInt(demandee, 10)
  return Number.isNaN(valeur) ? Date.now() % 1_000_000 : valeur
}

/**
 * Le premier geste utilisateur est obligatoire : les navigateurs refusent de demarrer
 * l'audio sans lui, et sans audio il n'y a pas d'horloge.
 */
function commencer(): void {
  const depart = creerManche(graine())
  state = depart.state
  compteur.vider()
  scene.viderSelection()
  armee = null
  scene.rendre(state)
  occupe = true
  verrouiller(true)
  void rejouer(depart.events).finally(() => {
    occupe = false
    verrouiller(false)
    scene.rendre(state)
  })
}

const bouton = document.getElementById('commencer')
if (bouton === null) throw new Error('Bouton de départ introuvable')
bouton.addEventListener('click', () => {
  lecteur.reveiller()
  document.body.classList.add('en-jeu')
  bouton.textContent =
    state !== undefined && state.phase === 'MANCHE_TERMINEE' ? 'une autre Manche' : 'recommencer'
  commencer()
})
