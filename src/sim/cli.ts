import { createInterface, type Interface } from 'node:readline'
import process from 'node:process'
import { formatCarte, valeurAdditive } from '../core/carte.js'
import type { Action, EtatPartie } from '../core/etat.js'
import { creerManche, reduire } from '../core/manche.js'
import { indicesPosables } from '../core/pose.js'
import {
  formatBilan,
  formatBoite,
  formatMainIndexee,
  formatPlateau,
  rendreEvenements,
} from './format.js'

/**
 * Une Manche jouable au clavier. Aucun rendu graphique, aucune animation : la CLI se
 * contente de rejouer le flux d'evenements du coeur. C'est le test permanent de
 * l'architecture — si un jour il faut du graphique pour jouer un tour, le coeur est
 * contamine.
 */

class EntreeFermee extends Error {}

/**
 * readline perd les lignes arrivees avant la question suivante, ce qui casse
 * `npm run cli < partie.txt`. On met les lignes en file d'attente pour pouvoir rejouer
 * une partie a l'identique depuis un fichier.
 */
class Clavier {
  private readonly enAttente: string[] = []
  private readonly demandes: {
    readonly resoudre: (ligne: string) => void
    readonly rejeter: (raison: Error) => void
  }[] = []
  private ferme = false

  constructor(private readonly rl: Interface) {
    rl.on('line', (ligne: string) => {
      const demande = this.demandes.shift()
      if (demande === undefined) this.enAttente.push(ligne)
      else demande.resoudre(ligne)
    })
    rl.on('close', () => {
      this.ferme = true
      let demande = this.demandes.shift()
      while (demande !== undefined) {
        demande.rejeter(new EntreeFermee())
        demande = this.demandes.shift()
      }
    })
  }

  async demander(invite: string): Promise<string> {
    process.stdout.write(invite)
    const prete = this.enAttente.shift()
    if (prete !== undefined) {
      process.stdout.write(`${prete}\n`)
      return prete
    }
    if (this.ferme) throw new EntreeFermee()
    return new Promise<string>((resoudre, rejeter) => {
      this.demandes.push({ resoudre, rejeter })
    })
  }

  fermer(): void {
    this.rl.close()
  }
}

function afficher(lignes: readonly string[]): void {
  for (const ligne of lignes) console.log(ligne)
}

function graineDesArguments(): number {
  const index = process.argv.indexOf('--graine')
  const brut = index >= 0 ? process.argv[index + 1] : undefined
  const valeur = brut === undefined ? Number.NaN : Number.parseInt(brut, 10)
  return Number.isNaN(valeur) ? Date.now() % 1_000_000 : valeur
}

async function demanderDefausse(clavier: Clavier, state: EtatPartie): Promise<Action> {
  const attendu = state.config.manche.defaussesParDonne
  for (;;) {
    console.log('')
    console.log(formatPlateau(state))
    console.log('')
    console.log(`  MAIN     ${formatMainIndexee(state.donne.main)}`)
    console.log(formatBoite(state.boite, state.config.manche.nombreDeDonnes * attendu))
    const reponse = await clavier.demander(
      `\n  ${attendu} cartes pour la Boîte (ex. « 0 4 ») > `,
    )
    const indices = reponse
      .split(/[\s,]+/)
      .filter((mot) => mot.length > 0)
      .map((mot) => Number.parseInt(mot, 10))

    if (indices.length !== attendu || indices.some((index) => Number.isNaN(index))) {
      console.log(`  ✖ il en faut exactement ${attendu}.`)
      continue
    }
    if (new Set(indices).size !== indices.length) {
      console.log('  ✖ deux fois la même carte.')
      continue
    }
    if (indices.some((index) => index < 0 || index >= state.donne.main.length)) {
      console.log(`  ✖ index hors de la main (0 à ${state.donne.main.length - 1}).`)
      continue
    }
    return { type: 'DEFAUSSER', indices }
  }
}

async function demanderPose(clavier: Clavier, state: EtatPartie): Promise<Action> {
  const pose = state.donne.pose
  if (pose === null) throw new Error('Aucune Pose en cours')
  const posables = new Set(indicesPosables(pose, state.config.pose))

  for (;;) {
    const restantes = pose.enMain
      .map((carte, index) => {
        const total = pose.total + valeurAdditive(carte)
        return `[${index}] ${formatCarte(carte)}${posables.has(index) ? ' ' : '✖'} →${total}`
      })
      .join('   ')

    console.log('')
    console.log(
      `  POSE   total ${pose.total}/${state.config.pose.seuil}   acquis ${pose.points} pts`,
    )
    console.log(`         ${restantes}`)
    const reponse = (await clavier.demander('  poser <index>, ou (e)ncaisser > '))
      .trim()
      .toLowerCase()

    if (reponse.startsWith('e')) return { type: 'ENCAISSER' }
    const index = Number.parseInt(reponse, 10)
    if (Number.isNaN(index) || index < 0 || index >= pose.enMain.length) {
      console.log('  ✖ index inconnu.')
      continue
    }
    if (!posables.has(index)) {
      const confirmation = await clavier.demander('  ⚠ cette carte fait exploser. Sûr ? (o/n) ')
      if (!confirmation.trim().toLowerCase().startsWith('o')) continue
    }
    return { type: 'POSER', index }
  }
}

async function jouerUneManche(clavier: Clavier, graine: number): Promise<void> {
  console.log('')
  console.log(`════════ MANCHE (graine ${graine}) ════════`)
  let { state, events } = creerManche(graine)
  afficher(rendreEvenements(events))

  while (state.phase !== 'MANCHE_TERMINEE') {
    const action =
      state.phase === 'DEFAUSSE'
        ? await demanderDefausse(clavier, state)
        : await demanderPose(clavier, state)
    const resultat = reduire(state, action)
    state = resultat.state
    afficher(rendreEvenements(resultat.events))
  }

  console.log(formatBilan(state))
  console.log('')
  console.log(formatPlateau(state))
}

async function main(): Promise<void> {
  const clavier = new Clavier(createInterface({ input: process.stdin, output: process.stdout }))
  let graine = graineDesArguments()
  let jouees = 0
  try {
    for (;;) {
      await jouerUneManche(clavier, graine)
      jouees += 1
      const encore = await clavier.demander(`\nUne autre Manche ? (o/n) `)
      if (!encore.trim().toLowerCase().startsWith('o')) break
      graine += 1
    }
  } catch (erreur) {
    if (!(erreur instanceof EntreeFermee)) throw erreur
    console.log('\ninterrompu.')
  } finally {
    console.log(`\n${jouees} Manche(s) jouée(s). Le critère d'arrêt en demande 20.`)
    clavier.fermer()
  }
}

await main()
