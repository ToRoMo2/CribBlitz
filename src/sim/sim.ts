import process from 'node:process'
import { CONFIG_PAR_DEFAUT } from '../presets/index.js'
import { mesurerDesaccords, percentile, simuler, type Bilan, type Desaccords } from './harnais.js'
import {
  OPTIONS_PAR_DEFAUT,
  STRATEGIES,
  strategieParNom,
  type OptionsStrategie,
} from './strategies.js'

/**
 * N Manches simulees, statistiques en sortie. Les quatre mesures de PROTOTYPE.md, dont la
 * derniere — l'ecart entre une defausse optimale et une defausse aleatoire — est le verdict
 * de l'etape 1.
 */

function colonne(valeur: number, largeur: number, decimales = 1): string {
  return valeur.toFixed(decimales).padStart(largeur)
}

function argument(nom: string): string | undefined {
  const index = process.argv.indexOf(`--${nom}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function entierArgument(nom: string, defaut: number): number {
  const brut = argument(nom)
  const valeur = brut === undefined ? Number.NaN : Number.parseInt(brut, 10)
  return Number.isNaN(valeur) ? defaut : valeur
}

function afficherTableau(bilans: readonly Bilan[]): void {
  console.log('')
  console.log(
    '  stratégie     main    pose   donne    BOÎTE   ratio   Manche    trou  %gagné  %explo',
  )
  console.log(`  ${'─'.repeat(84)}`)
  for (const bilan of bilans) {
    console.log(
      `  ${bilan.strategie.nom.padEnd(12)}` +
        colonne(bilan.scoreMainMoyen, 6) +
        colonne(bilan.posesMoyennes, 8) +
        colonne(bilan.donneMoyenne, 8) +
        colonne(bilan.boiteMoyenne, 9) +
        colonne(bilan.ratioBoite, 8, 2) +
        colonne(bilan.totalMoyen, 9) +
        colonne(bilan.trouMoyen, 8) +
        colonne(bilan.tauxVictoire * 100, 8) +
        colonne(bilan.tauxExplosion * 100, 8),
    )
  }
}

function afficherDistributions(bilans: readonly Bilan[]): void {
  console.log('')
  console.log('  DISTRIBUTIONS            p10     p50     p90     max')
  console.log(`  ${'─'.repeat(52)}`)
  for (const bilan of bilans) {
    for (const [etiquette, valeurs] of [
      ['donne', bilan.donnes],
      ['BOÎTE', bilan.boites],
    ] as const) {
      console.log(
        `  ${`${bilan.strategie.nom} · ${etiquette}`.padEnd(22)}` +
          colonne(percentile(valeurs, 0.1), 6, 0) +
          colonne(percentile(valeurs, 0.5), 8, 0) +
          colonne(percentile(valeurs, 0.9), 8, 0) +
          colonne(Math.max(...valeurs), 8, 0),
      )
    }
  }
}

function afficherVerdict(bilans: readonly Bilan[]): void {
  const plancher = bilans.find((bilan) => bilan.strategie.nom === 'aleatoire')
  const plafond = bilans.find((bilan) => bilan.strategie.nom === 'totale')
  if (plancher === undefined || plafond === undefined) return

  const ecart = plafond.totalMoyen - plancher.totalMoyen
  const pourcent = (ecart / plancher.totalMoyen) * 100
  console.log('')
  console.log('  ═══ LE VERDICT DE L’ÉTAPE 1 ═══')
  console.log(`  défausse aléatoire : ${plancher.totalMoyen.toFixed(1)} par Manche`)
  console.log(`  défausse optimale  : ${plafond.totalMoyen.toFixed(1)} par Manche`)
  console.log(`  écart              : +${ecart.toFixed(1)}  (+${pourcent.toFixed(1)} %)`)

  const main = bilans.find((bilan) => bilan.strategie.nom === 'main')
  const boite = bilans.find((bilan) => bilan.strategie.nom === 'boite')
  if (main === undefined || boite === undefined) return
  console.log('')
  console.log('  ═══ LA TENSION MARQUER / ARMER ═══')
  console.log(
    `  tout pour la main  : ${main.totalMoyen.toFixed(1)}   ` +
      `(donnes ${main.donneMoyenne.toFixed(1)}, Boîte ${main.boiteMoyenne.toFixed(1)})`,
  )
  console.log(
    `  tout pour la Boîte : ${boite.totalMoyen.toFixed(1)}   ` +
      `(donnes ${boite.donneMoyenne.toFixed(1)}, Boîte ${boite.boiteMoyenne.toFixed(1)})`,
  )
  const domination = Math.abs(main.totalMoyen - boite.totalMoyen) / plafond.totalMoyen
  console.log(`  écart entre les deux extrêmes : ${(domination * 100).toFixed(1)} % de l’optimale`)
}

function afficherDesaccords(desaccords: Desaccords): void {
  console.log('')
  console.log('  ═══ DÉCISION OU RÉFLEXE ? ═══')
  console.log(`  ${desaccords.decisions} défausses observées`)
  console.log(
    `  les deux philosophies désignent des cartes différentes : ` +
      `${(desaccords.partDesaccord * 100).toFixed(1)} % des Donnes`,
  )
  console.log(
    `  marge du meilleur choix sur le deuxième : ${desaccords.margeMoyenne.toFixed(1)} pts`,
  )
  console.log(
    `  écart entre le meilleur et le pire des 15 : ${desaccords.etendueMoyenne.toFixed(1)} pts`,
  )
  console.log(
    `  coût de suivre aveuglément « tout Boîte » : ${desaccords.coutToutBoite.toFixed(1)} pts/Donne`,
  )
  console.log(
    `  coût de suivre aveuglément « tout main »  : ${desaccords.coutToutMain.toFixed(1)} pts/Donne`,
  )
}

function main(): void {
  const manches = entierArgument('manches', 1000)
  const graine = entierArgument('graine', 1)
  const retournesBoite = entierArgument('retournes', OPTIONS_PAR_DEFAUT.retournesBoite)
  const noms = argument('strategies')?.split(',').map((nom) => nom.trim())
  const choisies = noms === undefined ? STRATEGIES : noms.map(strategieParNom)
  const options: OptionsStrategie = { retournesBoite }

  const debut = Date.now()
  const bilans = choisies.map((strategie) => simuler(strategie, manches, graine, options))
  const duree = ((Date.now() - debut) / 1000).toFixed(1)

  console.log('')
  console.log('BOÎTE — harnais de simulation')
  console.log(
    `${manches} Manches par stratégie, graines ${graine}..${graine + manches - 1}, ` +
      `mêmes donnes pour toutes. ${retournesBoite} Retournes échantillonnées pour la Boîte.`,
  )
  console.log(
    `cible de la Manche : Trou ${CONFIG_PAR_DEFAUT.manche.cibleAdversaire}   (${duree} s)`,
  )

  afficherTableau(bilans)
  afficherDistributions(bilans)
  afficherVerdict(bilans)
  afficherDesaccords(mesurerDesaccords(manches, graine, options))

  console.log('')
  for (const strategie of choisies) {
    console.log(`  ${strategie.nom.padEnd(12)} ${strategie.description}`)
  }
  console.log('')
}

main()
