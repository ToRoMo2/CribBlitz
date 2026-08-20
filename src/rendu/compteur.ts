import { formatCartes } from '../core/carte.js'
import { VOIES } from '../presets/voies.js'
import type { Coup } from './partition.js'

/**
 * Le comptage scande a l'ecran — l'objet meme de l'etape 3.
 *
 * Il ne connait ni le cribbage, ni la Manche : il rejoue des coups deja horodates par la
 * partition et cales par l'horloge audio. Sa seule idee propre est la derniere : un nombre
 * final trop gros pour sa boite.
 */

/**
 * En dessous, le nombre tient dans sa boite : une Donne ordinaire mesuree tourne autour de
 * 100 (une dizaine de points de Compte pour un Mult de 4). C'est le point ou le score cesse
 * d'etre ordinaire, donc le point ou le cadre doit commencer a ceder.
 */
const SCORE_CONFORTABLE = 100
/** Au-dela, le nombre ne grossit plus — il deborde deja de partout. */
const SCORE_SATURATION = 4000
const DEBORDEMENT_MAX = 1.9

export class Compteur {
  private readonly titre: HTMLElement
  private readonly lignes: HTMLElement
  private readonly total: HTMLElement
  private readonly mult: HTMLElement
  private readonly bonus: HTMLElement
  private readonly score: HTMLElement

  constructor() {
    this.titre = exiger('compte-titre')
    this.lignes = exiger('compte-lignes')
    this.total = exiger('compte-total')
    this.mult = exiger('compte-mult')
    this.bonus = exiger('compte-bonus')
    this.score = exiger('compte-score')
  }

  vider(): void {
    this.lignes.replaceChildren()
    this.total.textContent = ''
    this.mult.textContent = ''
    this.bonus.textContent = ''
    this.score.textContent = ''
    this.score.classList.remove('tombe')
    this.titre.textContent = ''
  }

  appliquer(coup: Coup): void {
    const scande = coup.scande
    if (scande !== null) {
      // Le premier coup d'un Compte ouvre l'ardoise : la partition a deja remis le total a zero.
      if (scande.rangDansLeCompte === 0) {
        this.vider()
        this.titre.textContent =
          coup.evenement.type === 'COMBINAISON_TROUVEE' && coup.evenement.origine === 'BOITE'
            ? 'LA BOÎTE'
            : 'le Compte'
      }

      const ligne = document.createElement('div')
      ligne.className = scande.premierDeSaVoie ? 'ligne accent' : 'ligne'
      const nom = document.createElement('span')
      nom.className = 'libelle'
      nom.textContent = scande.libelle
      const cartes = document.createElement('span')
      cartes.className = 'cartes-comptees'
      cartes.textContent = formatCartes(scande.cartes)
      ligne.append(nom, cartes)

      this.lignes.append(ligne)
      this.lignes.scrollTop = this.lignes.scrollHeight
      this.total.textContent = String(scande.total)
      return
    }

    const evenement = coup.evenement
    if (evenement.type === 'MULT_APPLIQUE') {
      const noms = evenement.voies.map((voie) => VOIES[voie].nom).join(' · ')
      this.mult.textContent = `× ${evenement.mult}`
      this.mult.title = noms
      if (this.total.textContent === '') this.total.textContent = '0'
      return
    }
    if (evenement.type === 'SCORE_CALCULE') {
      this.montrerLeFacteurRestant(evenement.points, evenement.mult, evenement.score)
      this.abattre(evenement.score)
    }
  }

  /**
   * Le coeur applique un facteur de plus que POINTS x MULT — le multiplicateur de main, que
   * la scene annonce en permanence comme un bonus. On le deduit de l'evenement lui-meme
   * plutot que de la config : ainsi le Compte montre toujours ce que le coeur a reellement
   * applique, meme le jour ou une relique touchera ce facteur.
   */
  private montrerLeFacteurRestant(points: number, mult: number, score: number): void {
    const attendu = Math.round(points * mult)
    const facteur = attendu === 0 ? 1 : score / attendu
    const inactif = Math.abs(facteur - 1) < 0.01
    this.bonus.textContent = inactif ? '' : `× ${Number(facteur.toFixed(2))}`
    this.bonus.title = inactif ? '' : 'bonus permanent : les mains comptent double'
  }

  /**
   * Le nombre final, trop gros pour sa boite (PROTOTYPE §Etape 3). Il deborde d'autant plus
   * que le score est grand : c'est le seul endroit du jeu ou la mise en page cede.
   */
  private abattre(score: number): void {
    const echelle = Math.log10(Math.max(1, score) / SCORE_CONFORTABLE)
    const ampleur = Math.min(1, Math.max(0, echelle / Math.log10(SCORE_SATURATION / SCORE_CONFORTABLE)))
    this.score.style.setProperty('--debordement', String(1 + ampleur * DEBORDEMENT_MAX))
    this.score.textContent = String(score)
    this.score.classList.remove('tombe')
    void this.score.offsetWidth
    this.score.classList.add('tombe')
  }
}

function exiger(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (element === null) throw new Error(`Element introuvable : ${id}`)
  return element
}
