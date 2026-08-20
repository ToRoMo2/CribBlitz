import process from 'node:process'
import { CONFIG_PAR_DEFAUT, type ConfigPartie } from '../presets/index.js'
import { RELIQUES } from '../reliques/catalogue.js'
import {
  mesurerDesaccords,
  mesurerSynergie,
  percentile,
  simuler,
  type Bilan,
  type Desaccords,
  type RapportSynergie,
} from './harnais.js'
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

function nomCourt(id: string): string {
  return (RELIQUES.find((r) => r.id === id)?.nom ?? id).replace(/^L[e']?\s?|^La\s/, '')
}

/**
 * Le verdict de l'etape 2 : pour chaque relique son apport, et pour chaque paire si le duo
 * vaut plus que la somme (super-additif = un build). Si le meilleur achat depend du reste de
 * l'equipement, un build emerge.
 */
function afficherSynergie(rapport: RapportSynergie): void {
  console.log('')
  console.log(`  score moyen d'une Manche sans relique : ${rapport.base.toFixed(0)}`)
  console.log('')
  console.log('  APPORT DE CHAQUE RELIQUE (seule)')
  console.log('  ' + '─'.repeat(40))
  const seules = [...rapport.uplifts.entries()].sort((a, b) => b[1] - a[1])
  for (const [id, uplift] of seules) {
    console.log(`  ${nomCourt(id).padEnd(16)} +${uplift.toFixed(0)}`)
  }

  console.log('')
  console.log('  LES PAIRES LES PLUS SYNERGIQUES (duo − somme des deux seules)')
  console.log('  ' + '─'.repeat(56))
  const paires = [...rapport.paires].sort((a, b) => b.synergie - a.synergie)
  for (const paire of paires.slice(0, 8)) {
    const signe = paire.synergie >= 0 ? '+' : ''
    console.log(
      `  ${(nomCourt(paire.a) + ' + ' + nomCourt(paire.b)).padEnd(30)}` +
        `duo +${paire.upliftDuo.toFixed(0).padStart(4)}   synergie ${signe}${paire.synergie.toFixed(0)}`,
    )
  }

  console.log('')
  console.log('  LES PAIRES LES PLUS ANTI-SYNERGIQUES')
  console.log('  ' + '─'.repeat(56))
  for (const paire of paires.slice(-3).reverse()) {
    console.log(
      `  ${(nomCourt(paire.a) + ' + ' + nomCourt(paire.b)).padEnd(30)}` +
        `duo +${paire.upliftDuo.toFixed(0).padStart(4)}   synergie ${paire.synergie.toFixed(0)}`,
    )
  }

  const positives = rapport.paires.filter((p) => p.synergie > rapport.base * 0.03).length
  console.log('')
  console.log('  ═══ LE VERDICT DE L’ÉTAPE 2 ═══')
  console.log(`  ${positives} paire(s) sur ${rapport.paires.length} sont nettement super-additives.`)
  console.log('  Si le meilleur achat dépend de l’équipement, un build émerge → réponse « oui ».')
  console.log('  (La Pince : sa valeur est surtout informationnelle ; la mesure la sous-estime.)')
}

function main(): void {
  const manches = entierArgument('manches', 1000)
  const graine = entierArgument('graine', 1)
  const retournesBoite = entierArgument('retournes', OPTIONS_PAR_DEFAUT.retournesBoite)
  const noms = argument('strategies')?.split(',').map((nom) => nom.trim())
  const choisies = noms === undefined ? STRATEGIES : noms.map(strategieParNom)
  const options: OptionsStrategie = { retournesBoite }
  const brutMult = argument('mult')
  const multiplicateurMain = brutMult === undefined ? CONFIG_PAR_DEFAUT.multiplicateurMain : Number(brutMult)
  const config: ConfigPartie = { ...CONFIG_PAR_DEFAUT, multiplicateurMain }

  if (process.argv.includes('--synergie')) {
    const mSyn = entierArgument('manches', 300)
    const debutSyn = Date.now()
    console.log('')
    console.log('BOÎTE — synergie des reliques (étape 2)')
    console.log(`${mSyn} Manches par configuration, stratégie de défausse fixe « totale ».`)
    afficherSynergie(mesurerSynergie(RELIQUES, mSyn, graine, options, config))
    console.log(`\n  (${((Date.now() - debutSyn) / 1000).toFixed(1)} s)\n`)
    return
  }

  const debut = Date.now()
  const bilans = choisies.map((strategie) => simuler(strategie, manches, graine, options, config))
  const duree = ((Date.now() - debut) / 1000).toFixed(1)

  console.log('')
  console.log('BOÎTE — harnais de simulation')
  console.log(
    `${manches} Manches par stratégie, graines ${graine}..${graine + manches - 1}, ` +
      `mêmes donnes pour toutes. ${retournesBoite} Retournes échantillonnées pour la Boîte.`,
  )
  console.log(
    `cible Trou ${CONFIG_PAR_DEFAUT.manche.cibleAdversaire}   ` +
      `multiplicateurMain ×${multiplicateurMain}   (${duree} s)`,
  )

  afficherTableau(bilans)
  afficherDistributions(bilans)
  afficherVerdict(bilans)
  afficherDesaccords(mesurerDesaccords(manches, graine, options, config))

  console.log('')
  for (const strategie of choisies) {
    console.log(`  ${strategie.nom.padEnd(12)} ${strategie.description}`)
  }
  console.log('')
}

main()
