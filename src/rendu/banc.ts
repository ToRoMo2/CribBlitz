import { formatCartes, parseCarte, parseCartes, type Carte } from '../core/carte.js'
import { compterMain } from '../core/compte.js'
import type { Evenement, Origine } from '../core/evenements.js'
import { calculerScore } from '../core/voies.js'
import { REGLES_SCANSION, type ReglesScansion } from '../presets/scansion.js'
import { Lecteur } from './audio.js'
import { intervalles, planifier, type Coup } from './partition.js'

/**
 * Le banc d'essai de la scansion. Ce n'est pas le jeu : c'est l'outil qui sert a regler les
 * chiffres de `presets/scansion.ts` a l'oreille, sur les cas extremes mesures — d'une main a
 * 3 combinaisons a une Boite a 274. Il n'y a rien a jouer ici.
 */

interface Cas {
  readonly nom: string
  readonly cartes: string
  readonly retourne: string
  readonly origine: Origine
}

const CAS: readonly Cas[] = [
  { nom: 'main ordinaire', cartes: '5♥ 6♠ 7♦ 8♣', retourne: '4♠', origine: 'MAIN' },
  { nom: 'bonne main', cartes: '4♠ 5♥ 5♦ 6♣', retourne: '6♠', origine: 'MAIN' },
  { nom: 'la main parfaite', cartes: '5♠ 5♣ 5♦ V♥', retourne: '5♥', origine: 'MAIN' },
  {
    nom: 'une Boîte',
    cartes: '4♠ 5♥ 5♦ 6♣ 6♠ 7♥ 8♦ 9♣',
    retourne: '5♣',
    origine: 'BOITE',
  },
  {
    nom: 'une Boîte cassée',
    cartes: '4♠ 5♥ 5♦ 6♣ 6♠ 7♥ 7♦ 8♦ 8♣ 9♣ 9♥ 10♠',
    retourne: '5♣',
    origine: 'BOITE',
  },
  // Le pire cas atteignable avec Le Sac : 151 combinaisons, dont 96 suites. C'est ici que la
  // scansion doit devenir un roulement au lieu de durer dix secondes.
  {
    nom: 'le pire cas',
    cartes: '3♠ 3♥ 4♦ 4♣ 5♠ 5♥ 6♦ 6♣ 7♠ 7♥ 8♦ 8♣',
    retourne: '5♦',
    origine: 'BOITE',
  },
]

/** Les chiffres qu'on regle a l'oreille. Le reste des presets ne bouge pas depuis ici. */
const CURSEURS = [
  { cle: 'budgetCompte', min: 600, max: 6000, pas: 100, unite: 'ms' },
  { cle: 'intervalleMin', min: 8, max: 120, pas: 2, unite: 'ms' },
  { cle: 'intervalleMax', min: 80, max: 600, pas: 10, unite: 'ms' },
  { cle: 'fenetreDemiTons', min: 5, max: 48, pas: 1, unite: 'demi-tons' },
  { cle: 'ratioAuMultSature', min: 0.2, max: 1, pas: 0.05, unite: '×' },
  { cle: 'crescendo', min: 0, max: 1, pas: 0.05, unite: '' },
  { cle: 'accentDeVoie', min: 1, max: 2.5, pas: 0.05, unite: '×' },
  { cle: 'respirationAvantMult', min: 0, max: 1200, pas: 50, unite: 'ms' },
] as const satisfies readonly { cle: keyof ReglesScansion; min: number; max: number; pas: number; unite: string }[]

const lecteur = new Lecteur()
let regles: ReglesScansion = { ...REGLES_SCANSION }

function evenementsDuCompte(cas: Cas): Evenement[] {
  const cartes = parseCartes(cas.cartes)
  const retourne = parseCarte(cas.retourne)
  const estBoite = cas.origine === 'BOITE'
  const score = calculerScore(compterMain(cartes, retourne, estBoite))
  return [
    ...score.occurrences.map((occurrence): Evenement => ({
      type: 'COMBINAISON_TROUVEE',
      combinaison: occurrence.combinaison,
      points: occurrence.points,
      origine: cas.origine,
    })),
    { type: 'MULT_APPLIQUE', mult: score.mult, voies: score.voiesDeclenchees, origine: cas.origine },
    {
      type: 'SCORE_CALCULE',
      points: score.points,
      mult: score.mult,
      score: score.score,
      origine: cas.origine,
    },
  ]
}

function element<T extends HTMLElement>(id: string): T {
  const trouve = document.getElementById(id)
  if (trouve === null) throw new Error(`Element introuvable : ${id}`)
  return trouve as T
}

const journal = element<HTMLDivElement>('journal')
const totalAffiche = element<HTMLDivElement>('total')
const detail = element<HTMLDivElement>('detail')

function afficherLeCoup(coup: Coup): void {
  if (coup.scande !== null) {
    const ligne = document.createElement('div')
    ligne.className = coup.scande.premierDeSaVoie ? 'coup accent' : 'coup'
    ligne.textContent = `${coup.scande.libelle}   ${formatCartes(coup.scande.cartes)}`
    journal.append(ligne)
    journal.scrollTop = journal.scrollHeight
    totalAffiche.textContent = String(coup.scande.total)
    return
  }
  if (coup.evenement.type === 'MULT_APPLIQUE') {
    totalAffiche.textContent = `${totalAffiche.textContent} × ${coup.evenement.mult}`
    return
  }
  if (coup.evenement.type === 'SCORE_CALCULE') {
    totalAffiche.textContent = String(coup.evenement.score)
    totalAffiche.classList.add('final')
  }
}

async function jouerLeCas(cas: Cas): Promise<void> {
  lecteur.interrompre()
  journal.replaceChildren()
  totalAffiche.textContent = '0'
  totalAffiche.classList.remove('final')

  const evenements = evenementsDuCompte(cas)
  const partition = planifier(evenements, regles)
  const scandes = partition.coups.filter((coup) => coup.scande !== null)
  const mult = evenements.find((evenement) => evenement.type === 'MULT_APPLIQUE')
  const tempo = intervalles(scandes.length, mult?.type === 'MULT_APPLIQUE' ? mult.mult : 1, regles)

  detail.textContent =
    `${scandes.length} combinaisons · Mult ${mult?.type === 'MULT_APPLIQUE' ? mult.mult : '?'}` +
    ` · ${Math.round(partition.duree)} ms au total` +
    ` · tempo ${Math.round(tempo[0] ?? 0)} → ${Math.round(tempo.at(-1) ?? 0)} ms`

  await lecteur.jouer(partition, afficherLeCoup)
}

function construireLesBoutons(): void {
  const barre = element<HTMLDivElement>('cas')
  for (const cas of CAS) {
    const bouton = document.createElement('button')
    const cartes: Carte[] = parseCartes(cas.cartes)
    bouton.textContent = `${cas.nom} (${cartes.length} cartes)`
    bouton.addEventListener('click', () => void jouerLeCas(cas))
    barre.append(bouton)
  }
}

function construireLesCurseurs(): void {
  const panneau = element<HTMLDivElement>('reglages')
  for (const curseur of CURSEURS) {
    const valeurDepart = regles[curseur.cle]
    if (typeof valeurDepart !== 'number') continue

    const ligne = document.createElement('label')
    const nom = document.createElement('span')
    nom.textContent = curseur.cle
    const valeur = document.createElement('output')
    valeur.textContent = `${valeurDepart} ${curseur.unite}`

    const champ = document.createElement('input')
    champ.type = 'range'
    champ.min = String(curseur.min)
    champ.max = String(curseur.max)
    champ.step = String(curseur.pas)
    champ.value = String(valeurDepart)
    champ.addEventListener('input', () => {
      const nombre = Number(champ.value)
      regles = { ...regles, [curseur.cle]: nombre }
      valeur.textContent = `${nombre} ${curseur.unite}`
    })

    ligne.append(nom, champ, valeur)
    panneau.append(ligne)
  }
}

element<HTMLButtonElement>('reinitialiser').addEventListener('click', () => {
  regles = { ...REGLES_SCANSION }
  element<HTMLDivElement>('reglages').replaceChildren()
  construireLesCurseurs()
})

construireLesBoutons()
construireLesCurseurs()
