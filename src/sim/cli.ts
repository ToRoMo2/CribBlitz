import { createInterface, type Interface } from 'node:readline'
import process from 'node:process'
import {
  acheterRelique,
  ameliorerVoie,
  genererOffre,
  nomVoie,
  relancer,
  type Offre,
} from '../core/boutique.js'
import { formatCarte, valeurAdditive } from '../core/carte.js'
import type { Action, EtatPartie } from '../core/etat.js'
import { indicesPosables } from '../core/pose.js'
import {
  commencerMancheSuivante,
  creerRun,
  reduireRun,
  type EtatRun,
} from '../core/run.js'
import {
  formatBilan,
  formatBoite,
  formatEnTeteRun,
  formatGains,
  formatMainIndexee,
  formatOffre,
  formatPlateau,
  rendreEvenements,
} from './format.js'

/**
 * Une run de 3 Manches jouable au clavier : defausse, Pose, Compte, boutique entre les
 * Manches, Adversaire sur la derniere, defaite possible. Aucun rendu graphique : la CLI
 * rejoue le flux d'evenements du coeur. C'est le test permanent de l'architecture — s'il
 * fallait du graphique pour jouer un tour, le coeur serait contamine.
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
    // La Pince revele la Retourne avant la defausse : c'est tout ce qu'elle achete, donc
    // elle doit etre lisible ici, au moment ou la decision se prend.
    if (state.donne.retourne !== null) {
      console.log(`  RETOURNE ${formatCarte(state.donne.retourne)}`)
    }
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

/** Joue la Manche courante de la run jusqu'a son terme. */
async function jouerLaManche(clavier: Clavier, run: EtatRun): Promise<EtatRun> {
  console.log(formatEnTeteRun(run))
  let courant = run
  while (courant.statut === 'MANCHE') {
    const state = courant.manche
    const action =
      state.phase === 'DEFAUSSE'
        ? await demanderDefausse(clavier, state)
        : await demanderPose(clavier, state)
    const resultat = reduireRun(courant, action)
    courant = resultat.run
    afficher(rendreEvenements(resultat.events))
  }
  console.log(formatBilan(courant.manche))
  return courant
}

/** La boutique entre deux Manches : acheter des reliques, un niveau de Voie, relancer. */
async function tenirBoutique(clavier: Clavier, run: EtatRun): Promise<EtatRun> {
  if (run.dernierGain !== null) console.log(formatGains(run.dernierGain))

  let courant = run
  const genere = genererOffre(courant)
  courant = { ...courant, rng: genere.rng }
  let offre: Offre = genere.offre
  const achetees = new Set<string>()
  let voieAchetee = false

  for (;;) {
    console.log(formatOffre(offreRestante(offre, achetees), courant.argent, voieAchetee))
    const reponse = (await clavier.demander('  > ')).trim().toLowerCase()
    if (reponse.length === 0) return courant

    if (reponse === 'x') {
      try {
        const relance = relancer(courant)
        courant = relance.run
        offre = relance.offre
        achetees.clear()
        voieAchetee = false
      } catch {
        console.log('  ✖ pas assez d’argent pour relancer.')
      }
      continue
    }
    if (reponse === 'v') {
      if (voieAchetee) {
        console.log('  ✖ un seul niveau de Voie par visite. Relance (x) pour une autre Voie.')
        continue
      }
      try {
        courant = ameliorerVoie(courant, offre.voie)
        voieAchetee = true
        console.log(`  ✔ Voie ${nomVoie(offre.voie.voie)} améliorée au niveau ${offre.voie.niveauActuel + 1}.`)
      } catch {
        console.log('  ✖ achat impossible.')
      }
      continue
    }
    if (reponse.startsWith('r')) {
      const index = Number.parseInt(reponse.slice(1), 10)
      const cible = offre.reliques[index]
      if (cible === undefined || achetees.has(cible.relique.id)) {
        console.log('  ✖ pas de relique à cet index.')
        continue
      }
      try {
        courant = acheterRelique(courant, cible)
        achetees.add(cible.relique.id)
        console.log(`  ✔ ${cible.relique.nom} équipée.`)
      } catch {
        console.log('  ✖ achat impossible (argent ou emplacement).')
      }
      continue
    }
    console.log('  ✖ commande inconnue.')
  }
}

function offreRestante(offre: Offre, achetees: ReadonlySet<string>): Offre {
  return { ...offre, reliques: offre.reliques.filter((o) => !achetees.has(o.relique.id)) }
}

async function jouerUneRun(clavier: Clavier, graine: number): Promise<boolean> {
  console.log('')
  console.log(`════════ RUN (graine ${graine}) ════════`)
  const depart = creerRun(graine)
  let run = depart.run
  afficher(rendreEvenements(depart.events))

  while (run.statut !== 'GAGNEE' && run.statut !== 'PERDUE') {
    run = await jouerLaManche(clavier, run)
    if (run.statut === 'BOUTIQUE') {
      run = await tenirBoutique(clavier, run)
      // Les evenements d'ouverture de Manche comptent : la premiere Donne y est distribuee,
      // et c'est la que RETOURNE_REVELEE et TALONS tombent quand La Pince est equipee.
      const suivante = commencerMancheSuivante(run)
      run = suivante.run
      afficher(rendreEvenements(suivante.events))
    }
  }

  console.log('')
  console.log(run.statut === 'GAGNEE' ? '★★★ RUN GAGNÉE ★★★' : '✖ RUN PERDUE')
  return run.statut === 'GAGNEE'
}

async function main(): Promise<void> {
  const clavier = new Clavier(createInterface({ input: process.stdin, output: process.stdout }))
  let graine = graineDesArguments()
  let jouees = 0
  try {
    for (;;) {
      await jouerUneRun(clavier, graine)
      jouees += 1
      const encore = await clavier.demander(`\nUne autre run ? (o/n) `)
      if (!encore.trim().toLowerCase().startsWith('o')) break
      graine += 1
    }
  } catch (erreur) {
    if (!(erreur instanceof EntreeFermee)) throw erreur
    console.log('\ninterrompu.')
  } finally {
    console.log(`\n${jouees} run(s) jouée(s). Le critère d'arrêt en demande 5.`)
    clavier.fermer()
  }
}

await main()
