import type { Offre } from '../core/boutique.js'
import { formatCarte, formatCartes, type Carte } from '../core/carte.js'
import type { DetailGains } from '../core/economie.js'
import type { Evenement, Origine } from '../core/evenements.js'
import type { EtatPartie } from '../core/etat.js'
import { adversaireDeLaManche, type EtatRun } from '../core/run.js'
import { coutDuTrou } from '../core/trous.js'
import { rueDeLaManche } from '../presets/run.js'
import { VOIES } from '../presets/voies.js'
import type { NiveauxVoies } from '../presets/voies.js'

/**
 * La seule couche du projet qui met en forme du texte. Elle rejoue le flux d'evenements
 * produit par le coeur — exactement ce que fera un jour la couche d'animation.
 */

const LARGEUR_PISTE = 56

export function formatPlateau(state: EtatPartie): string {
  const piste = Array.from({ length: LARGEUR_PISTE }, () => '·')
  const position = (trou: number): number =>
    Math.min(LARGEUR_PISTE - 1, Math.round((trou / state.config.manche.trouFinal) * (LARGEUR_PISTE - 1)))

  piste[position(state.cible)] = 'A'
  piste[position(state.trou)] = state.trou === state.cible ? 'X' : 'V'

  const prochain = coutDuTrou(state.trou + 1, state.config.manche)
  return [
    `  vous ▸ Trou ${state.trou}     adversaire ▸ Trou ${state.cible}` +
      `     report ${state.reste} / ${prochain} pts`,
    `  [${piste.join('')}]`,
  ].join('\n')
}

export function formatMainIndexee(cartes: readonly Carte[]): string {
  return cartes.map((carte, index) => `[${index}] ${formatCarte(carte)}`).join('   ')
}

export function formatBoite(boite: readonly Carte[], attendu: number): string {
  const contenu = boite.length === 0 ? '(vide)' : formatCartes(boite)
  return `  BOÎTE (${boite.length}/${attendu})  ${contenu}`
}

/** Rejoue les evenements en texte. L'etat de rendu — le total qui se scande — vit ici. */
export function rendreEvenements(evenements: readonly Evenement[]): string[] {
  const lignes: string[] = []
  let courant = 0
  let origine: Origine | null = null

  for (const evenement of evenements) {
    if (evenement.type === 'COMBINAISON_TROUVEE' && evenement.origine !== origine) {
      origine = evenement.origine
      courant = 0
      lignes.push('', origine === 'BOITE' ? '  ═══ LA BOÎTE ═══' : '  ─── le Compte ───')
    }
    lignes.push(...rendreUn(evenement, () => (courant += pointsDe(evenement))))
  }
  return lignes
}

function pointsDe(evenement: Evenement): number {
  return evenement.type === 'COMBINAISON_TROUVEE' ? evenement.points : 0
}

function rendreUn(evenement: Evenement, cumuler: () => number): string[] {
  switch (evenement.type) {
    case 'DONNE_DISTRIBUEE':
      return ['', `━━━ DONNE ${evenement.donne} ━━━`]
    case 'CARTES_DEFAUSSEES':
      return [
        `  Boîte ← ${formatCartes(evenement.cartes)}   (${evenement.tailleBoite} cartes dedans)`,
      ]
    case 'RETOURNE_REVELEE':
      return [`  Retourne : ${formatCarte(evenement.carte)}`]
    case 'TALONS':
      return [`  Talons ! +${evenement.points}`]
    case 'POSE_CARTE':
      return [`  pose ${formatCarte(evenement.carte).padEnd(4)}  total ${evenement.total}`]
    case 'POSE_MARQUE':
      return [`        ↑ ${libelleMarque(evenement.raison)} +${evenement.points}`]
    case 'POSE_ENCAISSE':
      return [`  Pose encaissée : ${evenement.points} pts`]
    case 'POSE_EXPLOSE':
      return [
        `  ✖ EXPLOSION à ${evenement.total} — ${evenement.pointsPerdus} pts de Pose perdus`,
      ]
    case 'COMBINAISON_TROUVEE': {
      const total = cumuler()
      const nom = evenement.combinaison.type === 'QUINZAINE'
        ? `quinze ${total}`
        : `${VOIES[evenement.combinaison.type].nom.toLowerCase()} ${total}`
      return [
        `   ${nom.padEnd(14)} ${formatCartes(evenement.combinaison.cartes).padEnd(20)}` +
          ` +${evenement.points}`,
      ]
    }
    case 'MULT_APPLIQUE': {
      const noms = evenement.voies.map((voie) => VOIES[voie].nom).join(', ')
      return [`   ×${evenement.mult}   (${noms || 'aucune Voie'})`]
    }
    case 'SCORE_CALCULE':
      return [`   ${evenement.points} × ${evenement.mult} = ${evenement.score}`]
    case 'BOITE_COMPTEE':
      return [`   la Boîte (${evenement.cartes.length} cartes) rapporte ${evenement.score}`]
    case 'POSE_MULT':
      return evenement.mult > 0
        ? [`  la Pose donne +${evenement.mult} Mult (${evenement.pointsDePose} pts posés)`]
        : ['  la Pose ne donne aucun Mult']
    case 'CIBLE_AVANCE':
      return [`  ⚠ ${evenement.adversaire} avance : Trou ${evenement.de} → ${evenement.a}`]
    case 'CHEVILLE_AVANCE':
      return evenement.a === evenement.de
        ? [`  cheville : Trou ${evenement.a} (report ${evenement.reste})`]
        : [`  cheville : Trou ${evenement.de} → ${evenement.a} (report ${evenement.reste})`]
    case 'CHEVILLE_PLAFONNEE':
      return evenement.pointsPerdus > 0
        ? [
            `  ⊘ plafond de la Manche au Trou ${evenement.plafond} —` +
              ` ${evenement.pointsPerdus} pts perdus, ${evenement.reste} en banque`,
          ]
        : [`  ⊘ plafond de la Manche au Trou ${evenement.plafond} — ${evenement.reste} en banque`]
    case 'MANCHE_GAGNEE':
      return ['', `★ MANCHE GAGNÉE — Trou ${evenement.trou} contre ${evenement.cible}`]
    case 'MANCHE_PERDUE':
      return ['', `✖ MANCHE PERDUE — Trou ${evenement.trou} contre ${evenement.cible}`]
  }
}

function libelleMarque(raison: Extract<Evenement, { type: 'POSE_MARQUE' }>['raison']): string {
  switch (raison) {
    case 'QUINZAINE':
      return 'quinze'
    case 'SEUIL':
      return 'trente et un'
    case 'REPETITION':
      return 'répétition'
    case 'SUITE':
      return 'suite'
    case 'DERNIERE_CARTE':
      return 'dernière carte'
    case 'SEUIL_PARFAIT':
      return '31 pile'
  }
}

/** Le tableau de fin de Manche : c'est lui qui rend le choix de defausse discutable. */
export function formatBilan(state: EtatPartie): string {
  const lignes = [
    '',
    '  Donne   gardée              défaussée   retourne   main    pose   donne',
    '  ' + '─'.repeat(68),
  ]
  for (const donne of state.historique) {
    lignes.push(
      `   ${donne.numero}      ${formatCartes(donne.gardee).padEnd(20)}` +
        `${formatCartes(donne.defaussee).padEnd(12)}` +
        `${formatCarte(donne.retourne).padEnd(11)}` +
        `${String(donne.scoreMain).padStart(5)}` +
        `${String(donne.pointsPose + donne.talons).padStart(7)}` +
        `${String(donne.scoreDonne).padStart(8)}`,
    )
  }

  const sommeMains = state.historique.reduce((total, donne) => total + donne.scoreDonne, 0)
  const scoreBoite = state.scoreBoite ?? 0
  const ratio = sommeMains === 0 ? '∞' : (scoreBoite / sommeMains).toFixed(2)
  lignes.push('  ' + '─'.repeat(68))
  lignes.push(`   les 4 Donnes : ${sommeMains}`)
  lignes.push(`   la Boîte     : ${scoreBoite}   (ratio Boîte / Donnes : ${ratio})`)
  return lignes.join('\n')
}

function niveauxAffiches(niveaux: NiveauxVoies): string {
  const ameliorees = Object.entries(niveaux)
    .filter(([, niveau]) => niveau > 1)
    .map(([voie, niveau]) => `${VOIES[voie as keyof typeof VOIES].nom} n${niveau}`)
  return ameliorees.length === 0 ? 'aucune' : ameliorees.join(', ')
}

/** L'en-tete d'une Manche de run : progression, argent, reliques, Voies, Adversaire. */
export function formatEnTeteRun(run: EtatRun): string {
  const total = run.reglesRun.nombreDeManches
  const numero = run.indexManche + 1
  const rue = rueDeLaManche(run.indexManche, run.reglesRun)
  const boss = adversaireDeLaManche(run.adversaires, run.reglesRun, run.indexManche)
  const reliques = run.reliquesEquipees.length === 0
    ? '(aucune)'
    : run.reliquesEquipees.map((relique) => relique.nom).join(', ')

  const lignes = [
    '',
    `╔═ RUE ${'I'.repeat(rue).replace('IIII', 'IV')} · MANCHE ${numero}/${total}${boss !== null ? '  ★ ADVERSAIRE' : ''}` +
      `   cible Trou ${run.reglesRun.cibles[run.indexManche]}   argent ${run.argent} ¤`,
    `║ reliques (${run.reliquesEquipees.length}/${run.reglesRun.emplacementsReliques}) : ${reliques}`,
    `║ Voies améliorées : ${niveauxAffiches(run.niveaux)}`,
  ]
  if (boss !== null) {
    lignes.push(`║ ⚠ ${boss.annonce}`)
    return lignes.join('\n')
  }

  // L'Adversaire de la Rue est annonce avant la boutique qui le precede : c'est ce qui
  // permet d'acheter contre lui (carnet §4.4).
  const prochain = run.reglesRun.indicesAdversaires.find((index) => index > run.indexManche)
  const aVenir =
    prochain === undefined ? null : adversaireDeLaManche(run.adversaires, run.reglesRun, prochain)
  if (aVenir !== null && prochain !== undefined) {
    lignes.push(`║ Adversaire de la Rue (Manche ${prochain + 1}) : ${aVenir.annonce}`)
  }
  return lignes.join('\n')
}

export function formatGains(gain: DetailGains): string {
  const morceaux = [`base ${gain.base}`]
  if (gain.prime > 0) morceaux.push(`dépassement +${gain.prime}`)
  if (gain.interet > 0) morceaux.push(`intérêts +${gain.interet}`)
  if (gain.bonusModificateurs !== 0) morceaux.push(`reliques +${gain.bonusModificateurs}`)
  return `  Gains : ${gain.total} ¤   (${morceaux.join(', ')})`
}

export function formatOffre(offre: Offre, argent: number, voieAchetee = false): string {
  const lignes = ['', `  ══ BOUTIQUE ══   argent : ${argent} ¤`, '']
  offre.reliques.forEach((offreRelique, index) => {
    const marque = !offreRelique.placeDisponible
      ? '(plus de place)'
      : offreRelique.abordable ? '' : '(trop cher)'
    lignes.push(`  [r${index}] ${offreRelique.relique.nom.padEnd(16)} ${offreRelique.cout} ¤ ${marque}`)
    lignes.push(`        ${offreRelique.relique.description}`)
  })
  // Un seul niveau de Voie par passage en boutique (PROTOTYPE §Etape 2) : une fois acheté,
  // l'option est consommée jusqu'à la prochaine relance.
  if (voieAchetee) {
    lignes.push(`  [v]  Voie ${VOIES[offre.voie.voie].nom} : déjà amélioré cette visite`)
  } else {
    lignes.push(
      `  [v]  Voie ${VOIES[offre.voie.voie].nom} : niveau ${offre.voie.niveauActuel} → ` +
        `${offre.voie.niveauActuel + 1}   ${offre.voie.cout} ¤ ${offre.voie.abordable ? '' : '(trop cher)'}`,
    )
  }
  lignes.push(`  [x]  Relancer l'offre : ${offre.coutRelance} ¤`)
  lignes.push('  [Entrée] Quitter la boutique et lancer la Manche suivante')
  return lignes.join('\n')
}
