# Boîte — Carnet de conception

*Fait autorité sur tout ce qui touche au design. Tous les chiffres sont des points de
départ à calibrer par simulation, sauf ceux marqués **[RÈGLE]** qui viennent du cribbage
classique et ne se négocient pas.*

---

## 0. Glossaire

| Terme | Sens |
|---|---|
| **Donne** | une main jouée : distribution, défausse, retourne, pose, compte |
| **Manche** | 4 Donnes, suivies du Compte de la Boîte. Équivalent d'une blind Balatro. |
| **Rue** | 3 Manches (Petite, Grande, Adversaire). Équivalent d'une ante. |
| **Run** | 4 Rues, soit 12 Manches, soit 48 Donnes |
| **Boîte** | le crib. Accumule les défausses de la Manche entière. |
| **Retourne** | le starter : une carte commune tirée à chaque Donne |
| **Pose** | le pegging : poser ses cartes une par une vers 31 |
| **Compte** | le show : l'énumération des combinaisons |
| **Voie** | l'un des 5 types de score. Améliorable. |
| **Trou / Cheville** | l'unité et le marqueur de progression sur le plateau |
| **Adversaire** | la cheville antagoniste. Ce n'est pas un joueur. |
| **Relique** | l'équivalent du joker. Modificateur permanent de la run. |

---

## 1. Les règles du cribbage — spécification exacte

### 1.1 Valeur des cartes **[RÈGLE]**

Deux systèmes distincts, à ne jamais confondre dans le code.

```
VALEUR ADDITIVE (quinzaines, total de la Pose)
  As = 1   |   2..10 = valeur faciale   |   Valet = Dame = Roi = 10

RANG ORDINAL (suites)
  As = 1   |   2..10 = 2..10   |   Valet = 11   |   Dame = 12   |   Roi = 13
```

L'As est **toujours bas**. `Dame-Roi-As` n'est pas une suite. Pas de bouclage.

### 1.2 Le Compte d'un ensemble de cartes **[RÈGLE]**

Un ensemble = les cartes de la main (ou de la Boîte) **+ la Retourne**.
Une même carte participe à autant de combinaisons qu'elle veut.

**Quinzaines.** Tous les sous-ensembles de taille ≥ 2 dont la somme des valeurs additives
vaut exactement 15. Chacun compte séparément.
→ `2 points` par quinzaine.

**Paires.** Toutes les paires non ordonnées de même rang.
→ `2 points` par paire.
Un brelan produit 3 paires (6 pts), un carré en produit 6 (12 pts). Aucun cas particulier
à coder : l'énumération des paires suffit.

**Suites.** On travaille sur les rangs ordinaux distincts présents.
1. Trouver la **plus longue** séquence consécutive de longueur `L ≥ 3`.
2. Calculer la **multiplicité** = produit du nombre d'exemplaires de chaque rang de cette
   séquence.
3. → `L × multiplicité` points.

Seule la plus longue suite compte : une main de 5 cartes ne peut pas contenir deux suites
disjointes de 3+.
```
3-4-5-6-7          L=5, mult=1        →  5 pts
4-5-5-6-6          L=3, mult=2×2=4    → 12 pts
A-2-3-4-4          L=4, mult=2        →  8 pts
2-3-4-9-10         L=3, mult=1        →  3 pts
```

**Couleur.**
- Dans une **main** : les 4 cartes gardées de la même couleur → `4 points`. Si la Retourne
  suit aussi → `5 points`.
- Dans la **Boîte** : la couleur ne compte que si **toutes** les cartes de la Boîte *et* la
  Retourne suivent. Règle plus sévère, conservée.

**Valet de la Retourne.** Un Valet dans la main (pas la Retourne elle-même) de la même
couleur que la Retourne → `1 point`.

**Talons.** Si la Retourne est un Valet → `2 points` immédiats, avant la Pose. Ne fait
partie d'aucune main.

**Vérification obligatoire par les tests :**

| Ensemble | Attendu |
|---|---|
| `5♥ 6♠ 7♦ 8♣` + `4♠` | 9 (2 quinzaines = 4, suite de 5 = 5) |
| `4♠ 5♥ 5♦ 6♣` + `6♠` | 24 (8 + 12 + 4) |
| `5♠ 5♣ 5♦ V♥` + `5♥` | 29 — le maximum absolu |
| `A♠ 2♥ 3♦ 4♣` + `5♠` | 7 (quinzaine A+2+3+4+5 = 2, suite de 5 = 5) |
| `2♠ 3♠ 4♠ 5♠` + `K♥` | 12 (2 quinzaines = 4, suite de 4 = 4, couleur 4 cartes = 4) |

Ces cinq cas sont l'oracle du moteur. Ils doivent passer avant qu'une seule ligne de
roguelike ne soit écrite.

### 1.3 La Pose **[RÈGLE adaptée]**

Au cribbage classique on alterne avec l'adversaire. **En solo, on retire l'adversaire et on
le remplace par le seuil de 31 comme risque d'explosion.**

Le joueur pose ses 4 cartes gardées, une par une, dans l'ordre qu'il veut. Le total courant
monte. Il peut **s'arrêter et encaisser à tout moment**.

Marquage pendant la Pose :

| Événement | Points |
|---|---|
| Le total atteint exactement **15** | 2 |
| Le total atteint exactement **31** | 2 |
| La carte posée a le même rang que la précédente | 2 |
| Troisième du même rang consécutivement | 6 |
| Quatrième | 12 |
| Les **N dernières cartes posées** (N ≥ 3) forment une suite | N |
| Les 4 cartes posées sans dépasser 31 | +1 (« dernière carte ») |

**Les suites de la Pose ne tiennent pas compte de l'ordre** : seul compte le fait que les
N dernières cartes posées forment un ensemble consécutif. `6 puis 4 puis 5` est une suite
de 3.

**Explosion.** Poser une carte qui ferait dépasser 31 est interdit ; si le joueur n'a plus
de carte posable et choisit de continuer, ou dans les variantes de relique qui forcent la
pose, le total dépasse 31 → **tous les points de Pose de cette Donne sont perdus**.

Atteindre exactement 31 avec les 4 cartes est une prouesse : bonus dédié, à définir.

### 1.4 Ce qu'on ne modifie jamais

Les valeurs de base (quinzaine = 2, paire = 2, suite = 1/carte, couleur = 4/5, valet = 1)
et les conditions de déclenchement **ne sont jamais modifiées par le design**. Elles ne
sont modifiées que par les niveaux de Voie et par les Reliques, qui sont des couches
au-dessus. Le moteur de comptage cribbage doit être une fonction pure, testable, et
indépendante de tout le reste du jeu.

---

## 2. Le moteur de score du roguelike

### 2.1 Les cinq Voies

Chaque combinaison trouvée alimente **deux réservoirs**.

```
SCORE  =  POINTS  ×  MULT

POINTS  =  somme des points de CHAQUE OCCURRENCE de combinaison
MULT    =  1  +  somme des mults de CHAQUE VOIE DÉCLENCHÉE (une seule fois par Voie)
```

C'est la distinction centrale, et elle crée deux philosophies de build opposées :

- **Déclencher une Voie beaucoup de fois** → gros Points, petit Mult.
- **Déclencher toutes les Voies une fois** → petits Points, gros Mult.

| Voie | Points par occurrence | Mult si déclenchée | Par niveau |
|---|---|---|---|
| **Quinzaine** | 2 | +1 | +2 pts, +0,5 mult |
| **Paire** | 2 | +1 | +2 pts, +0,5 mult |
| **Suite** | 1 par carte | +2 | +1 pt/carte, +1 mult |
| **Couleur** | 4 (5 si la Retourne suit) | +3 | +4 pts, +1 mult |
| **Valet** | 1 | +5 | +1 pt, +2 mult |

Logique de calibrage : **les Voies fréquentes donnent des Points, les Voies rares donnent
du Mult.** Le Valet se déclenche une fois sur trente mains ; quand il tombe, il doit faire
mal. C'est ce qui rend un build Valet viable une fois surinvesti.

**Vérification :**

```
4♠ 5♥ 5♦ 6♣ + 6♠   (niveau 1 partout)
  Points  = 8 (quinzaines) + 12 (suites) + 4 (paires)  = 24
  Mult    = 1 + 1 (Quinzaine) + 2 (Suite) + 1 (Paire)  =  5
  SCORE   = 120

5♠ 5♣ 5♦ V♥ + 5♥   (la main parfaite)
  Points  = 16 + 12 + 1                                = 29
  Mult    = 1 + 1 + 1 + 5                              =  8
  SCORE   = 232
```

Les niveaux de Voie s'achètent en boutique. Ils sont l'équivalent des Planètes et
constituent l'axe de progression permanent de la run.

### 2.2 L'ordre de résolution

Non négociable, parce que c'est le moment de spectacle et parce que les Reliques doivent
pouvoir s'insérer à un point précis.

```
1. Retourne dévoilée            → événement RETOURNE
2. Talons si c'est un Valet     → événement TALONS
3. La Pose, carte par carte     → POSE_CARTE, POSE_MARQUE, POSE_ENCAISSE / POSE_EXPLOSE
4. Le Compte de la main :
     a. les Quinzaines, une par une, dans l'ordre croissant de taille
     b. les Paires
     c. les Suites
     d. la Couleur
     e. le Valet
     f. application des Reliques
     g. POINTS × MULT
5. (fin de Manche uniquement) le Compte de la Boîte, même séquence
6. Conversion du score en Trous, cheville par cheville
```

Chaque étape émet un événement horodaté. La couche de présentation rejoue le flux pour
animer et sonoriser. **Le cœur ignore qu'une animation existe.**

### 2.3 Le comptage doit se scander

Le rituel du cribbage est déjà écrit :

> « Quinze deux, quinze quatre, quinze six, quinze huit, et la paire fait dix,
> et la suite fait treize. »

C'est l'identité sonore du jeu. Un son percussif par combinaison, un demi-ton de plus à
chaque, tempo qui s'accélère avec le Mult. Ce n'est pas à inventer, c'est à mettre en
scène.

---

## 3. La Boîte

**La Boîte appartient toujours au joueur.**

À chaque Donne, le joueur y jette 2 cartes. Elle **ne se compte pas**. Sur 4 Donnes, elle
accumule **8 cartes**, et se compte à la fin de la Manche, avec la Retourne de la dernière
Donne, d'un seul coup.

Conséquences voulues :

- Chaque défausse est un arbitrage : **marquer maintenant, ou nourrir la bombe ?**
- La fin de Manche a un climax naturel : neuf cartes se retournent.
- Une Boîte à 9 cartes produit des scores de comptage combinatoirement énormes. **C'est
  voulu.** C'est le moment « j'ai cassé le jeu ». À surveiller en simulation : si la Boîte
  écrase systématiquement les mains, il faudra soit un diviseur, soit ne compter que les
  meilleures 5 cartes, soit — préférable — augmenter la récompense des mains.
- Surface d'attaque pour les Adversaires : Boîte scellée, Boîte qui ne garde qu'une carte
  sur deux, Boîte comptée en premier, Boîte qui perd une carte par Donne.

**Question ouverte n°1 :** la Boîte est-elle visible pendant la Manche ? Recommandation :
**oui, face visible.** L'information cachée n'apporte rien ici, alors que voir la bombe se
construire alimente l'anticipation à chaque défausse.

---

## 4. Structure d'une run

### 4.1 La carte de la run

```
Rue I    →  Manche 1 (Petite)  Manche 2 (Grande)  Manche 3 (ADVERSAIRE)
Rue II   →  Manche 4           Manche 5           Manche 6 (ADVERSAIRE)
Rue III  →  Manche 7           Manche 8           Manche 9 (ADVERSAIRE)
Rue IV   →  Manche 10          Manche 11          Manche 12 (ADVERSAIRE)
                                                       ↓
                                                   Trou 121
```

12 Manches × 4 Donnes = **48 Donnes par run**. Boutique entre chaque Manche.

### 4.2 Le plateau et la conversion en Trous

Chaque Trou coûte un nombre de points croissant. Le score d'une Donne est converti en
Trous, le reste est reporté sur la Donne suivante.

| Trous | Coût par Trou | Rue |
|---|---|---|
| 1 – 30 | 8 | I |
| 31 – 60 | 45 | II |
| 61 – 90 | 300 | III |
| 91 – 120 | 2 200 | IV |
| 121 | 18 000 | — |

**[À CALIBRER PAR SIMULATION.]** Repère de départ : une Donne non améliorée rapporte
environ 10 points de Compte + 4 de Pose ; une Manche entière, environ 60 points avec la
Boîte. Soit ~7 Trous en Rue I. Les cibles ci-dessous doivent en découler.

### 4.3 Les cibles

Pour valider une Manche, la cheville du joueur doit dépasser la cheville de l'Adversaire.

| Manche | Cheville Adversaire au Trou | Type |
|---|---|---|
| 1 | 6 | Petite |
| 2 | 14 | Grande |
| 3 | 24 | Adversaire |
| 4 | 34 | Petite |
| … | … | … |
| 12 | 121 | Adversaire final |

**[À CALIBRER.]** Le principe : la cheville adverse **est** le quota, et elle est visible
sur le plateau en permanence. Aucune interface de quota à inventer.

### 4.4 Les Adversaires

Ce ne sont pas des joueurs. Ce sont des chevilles au comportement annoncé, affiché avant
la boutique précédente pour qu'on puisse acheter contre.

| Nom provisoire | Comportement |
|---|---|
| **Le Régulier** | avance de 2 Trous après chaque Donne, quoi qu'il arrive |
| **Le Sourd** | la Boîte est scellée : les défausses sont perdues |
| **Le Mesquin** | une seule Voie compte cette Manche, tirée au sort et annoncée |
| **L'Avare** | vous ne recevez que 5 cartes par Donne au lieu de 6 |
| **Le Vorace** | il bondit de 5 Trous chaque fois que vous marquez plus de 100 |
| **Le Tranchant** | explosion à la Pose = il avance de 8 Trous |
| **Le Bavard** | la Retourne est révélée après la défausse, pas avant |
| **L'Ordonné** | la Pose doit être en ordre croissant strict |

Chacun **casse une règle** au lieu de gonfler un chiffre. Même philosophie que les Épreuves
d'Awoo, et elle est bonne.

### 4.5 Économie

À la fin d'une Manche validée :
- base : **4 ¤**
- **+1 ¤** par Trou dépassé au-delà de la cheville adverse (plafond 5)
- **intérêts : +1 ¤ par tranche de 5 ¤ épargnés**, plafond 5 ¤

L'intérêt est ce qui rend **le fait de ne pas acheter** excitant. Il n'est pas optionnel.

---

## 5. Les Reliques

### 5.1 Doctrine

- **5 emplacements.** Pas 12. La rareté d'emplacement est ce qui rend un achat douloureux.
- **Aucune relique ne fait seulement « +X ».** Chacune doit casser une règle, dépendre du
  contexte, ou interagir avec une autre.
- **Une relique est une donnée** : un objet déclaratif + une fonction de déclenchement,
  dans son propre fichier. Ajouter une relique ne modifie jamais le cœur. Aucun `switch`
  sur un identifiant dans le moteur.
- Objectif à terme : **150+ reliques**, réparties entre les deux surfaces (Compte / Pose)
  et les trois objets (main, Boîte, Retourne).

### 5.2 Les huit reliques de l'étape 2

Choisies pour couvrir toutes les familles et pour qu'un build émerge en trois Manches.

| Nom | Effet | Famille |
|---|---|---|
| **Le Compteur** | chaque quinzaine donne +1 Mult au lieu d'alimenter seulement les Points | amplifie une Voie |
| **La Fourche** | les suites comptent aussi le rang manquant : `4-5-7` vaut une suite de 3 | casse une règle |
| **Le Sac** | la Boîte prend 3 cartes par Donne au lieu de 2 | modifie la Boîte |
| **Le Double Fond** | la Boîte est comptée deux fois | modifie la Boîte |
| **La Pince** | vous voyez la Retourne **avant** de défausser | information |
| **Le Cran d'Arrêt** | encaisser à la Pose sans avoir explosé donne +1 Mult à la main qui suit | lie Pose et Compte |
| **Le Pendu** | chaque Valet dans la Boîte vaut 5 points, quelle que soit la couleur | rend une Voie rare viable |
| **L'Usurier** | +2 ¤ par Manche, mais la cheville adverse part 3 Trous plus loin | économie contre puissance |

### 5.3 Familles visées à terme

| Famille | Se déclenche | Part visée |
|---|---|---|
| **Compte** | pendant l'énumération d'une main | 30 % |
| **Pose** | pendant la pose des cartes | 20 % |
| **Boîte** | sur le contenu ou le comptage de la Boîte | 15 % |
| **Défausse** | au moment du choix des 2 cartes | 10 % |
| **Retourne** | manipule la carte commune | 10 % |
| **Structure** | interagit avec les autres reliques | 15 % |

---

## 6. Le deck

52 cartes au départ. Le deck est un objet persistant que le joueur sculpte, et il est
visible à tout moment.

Achats en boutique :
- **ajouter** une carte (dont des cartes améliorées)
- **retirer** une carte — le deck-thinning est une stratégie centrale
- **modifier** une carte : changer sa couleur, changer son rang de ±1, la marquer

**Ce que le cribbage offre gratuitement :** la Voie Couleur est intrinsèquement un build de
purification extrême. Pour faire une couleur à 5 cartes, il faut avoir vidé le paquet des
trois autres couleurs. La mécanique de deckbuilding est déjà écrite dans les règles du jeu.

---

## 7. Risques identifiés

| Risque | Gravité | Atténuation |
|---|---|---|
| **Cribbish existe** (Steam, ~65 évaluations) | moyenne | Y jouer avant l'étape 2. Notre angle : ne pas diluer le cribbage, et exploiter la Boîte accumulée, qu'ils n'utilisent pas. |
| Le comptage est plus dur à apprendre que le poker | moyenne | Le jeu compte à la place du joueur et surligne chaque combinaison. Personne ne calcule ses multiplicateurs dans Balatro non plus. |
| La Boîte à 9 cartes écrase les mains | forte | À mesurer dès l'étape 1. Ne pas nerfer la Boîte : rehausser les mains. |
| Le cribbage est peu connu en France | faible | Très implanté au Royaume-Uni, aux États-Unis et au Canada, qui sont le marché. |
| Le build se voit trop vite | forte | C'est la question centrale de l'étape 2. Voir `PROTOTYPE.md`. |
| Le score explose trop tôt ou jamais | forte | Simulation dès l'étape 1, avant toute décoration. |

---

## 8. Questions ouvertes

1. La Boîte est-elle visible pendant la Manche ? *(recommandation : oui)*
2. La Retourne est-elle unique par Donne ou unique par Manche ? *(recommandation : par
   Donne — c'est l'injecteur de variance principal)*
3. La Pose est-elle obligatoire ou optionnelle chaque Donne ?
4. Le report de points non convertis entre Donnes : oui ou perte sèche ?
5. Que se passe-t-il si la cheville dépasse 121 en cours de Rue ? *(recommandation : on
   gagne, la run s'arrête, mode infini au-delà)*
6. Nom du jeu. « Boîte » est un nom de code.
