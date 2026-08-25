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

#### Ce que la Pose rapporte **[RÈGLE]**

**Les points de Pose ne s'ajoutent pas au score : ils deviennent du Mult sur le Compte de la
main de la même Donne.** Un point de Pose vaut **+1 Mult**.

Ajoutés bruts, ils ne servaient à rien, et c'est mesuré : 2,5 à 2,8 points par Donne, un
chiffre plat sur toute la run, pendant que le Compte de la main passe de 63 à 183. La part
de la Pose dans une Donne tombait de **4,2 %** en Rue I à **1,3 %** en Rue IV. La cause était
structurelle — la Pose vivait hors de la couche roguelike, en points de cribbage de 1630,
dans un jeu dont les scores croissent d'un facteur 17.

Le Mult, lui, est une échelle **bornée** : les niveaux de Voie donnent +0,5 chacun et il n'y
en a pas tant à acheter, si bien que le Mult total sature autour de 7 à 9. C'est ce qui fait
tenir la correction — la part de la Pose baisse de la Rue I à la Rue II, puis se stabilise,
au lieu de s'effondrer sans fin.

| Rue | part de la Pose dans le Mult (taux 1) |
|---|---|
| I | 39,7 % |
| II | 30,8 % |
| III | 28,6 % |
| IV | **28,9 %** |

Le taux de 1 est calibré : c'est la seule valeur du balayage qui ramène le taux de victoire
à son repère (40 % en « achète tout » contre 37 % visés ; 0,25 à 0,75 donnent tous 33 %, 1,5
et 2 montent à 43 % et 45 %). C'est aussi la règle la plus lisible possible — « chaque point
de Pose vaut un Mult » se retient sans tableau.

Trois conséquences voulues :

- **L'explosion coûte tout le Mult**, plus deux points. Le risque de la Pose devient enfin
  proportionnel à ce qu'elle rapporte.
- **Encaisser tôt est un vrai choix**, avec une contrepartie réelle. Avant, y renoncer coûtait
  deux points, c'est-à-dire rien.
- **La Boîte ne reçoit pas ce Mult** : il appartient à la Donne qui l'a gagné.

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
              +  les points de la Pose de cette Donne  (§1.3)
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
3bis. Ses points deviennent du Mult → POSE_MULT (émis même à zéro : voir le Mult
      qu'on vient de perdre est le retour d'information du risque)
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
Trous, le reste est reporté sur la Donne suivante — dans la limite du plafond d'avance et de
la borne du report, tous deux définis au §4.3.

| Trous | Coût par Trou | Rue |
|---|---|---|
| 1 – 30 | **30** | I |
| 31 – 60 | **135** | II |
| 61 – 90 | **320** | III |
| 91 – 120 | **720** | IV |
| 121 | **2 000** | — |

**CALIBRÉ à l'étape 4** (`npm run sim -- --runs`). La première colonne disait 8 / 45 / 300 /
2 200 / 18 000 : c'était un point de départ, et la mesure l'a démenti. Les scores
atteignables croissent d'un facteur **17** sur une run ; cette courbe-là croissait d'un
facteur **275**. La Rue I se traversait en une Manche et demie, les Rues III et IV étaient
infranchissables, et **personne n'atteignait le Trou 121**.

La courbe retenue monte de ~2,3× par Rue. C'est moins raide que l'ambition initiale, et
c'est le prix à payer pour que la piste soit franchissable avec le contenu qui existe. Si
un jour les reliques font croître les scores bien plus vite, cette courbe devra remonter.

Méthode : itérer le coût de chaque Rue jusqu'à ce qu'elle rende ~10 Trous par Manche — le
rythme de la cheville adverse — puis chercher l'échelle d'ensemble sur le taux de victoire.

Mesure à 60 runs, par politique d'achat automatique, avec le plafond d'avance du §4.3 :

| Politique | % gagné | Trou médian | meurt surtout |
|---|---|---|---|
| n'achète rien | 0 % | 42 | Manches 4–5 |
| Voies seules | 0 % | 66 | Manches 6–9 |
| reliques seules | 3 % | 78 | Manches 6–9 |
| achète tout | **43 %** | 119 | Manches 6–12 |

Ne pas acheter, c'est mourir : la boutique n'est pas un supplément.

Et la marge se resserre enfin Rue après Rue, ce que PROTOTYPE demandait sans qu'on sache
l'obtenir. En « achète tout », l'avance médiane sur la cheville adverse tombe de **+5,6** en
Rue I à **+5,0**, **+4,2**, puis **+1,5** en Rue IV, pendant que la survie descend de 100 % à
**63 %**. La Rue IV est redevenue un mur qu'on aborde de justesse, au lieu d'une formalité
qu'on n'atteignait jamais ou qu'on abordait la banque pleine.

Ces chiffres sont ceux d'après le passage de la Pose au Mult (§1.3). Elle a coûté 6 points de
taux de victoire — 37 % avant, 43 % après — parce qu'elle a rendu du pouvoir à une surface
qui n'en avait plus. La courbe des coûts n'a pas été retouchée pour compenser : l'écart part
au débit de la question ouverte n° 9, qui porte déjà sur ce taux.

### 4.3 Les cibles

Pour valider une Manche, la cheville du joueur doit dépasser la cheville de l'Adversaire.

| Manche | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Trou** | 6 | 14 | 24 | 34 | 45 | 57 | 68 | 78 | 88 | 98 | 109 | **121** |
| | | | ★ | | | ★ | | | ★ | | | ★ |

★ = Manche d'Adversaire, la dernière de chaque Rue.

Le principe : la cheville adverse **est** le quota, et elle est visible sur le plateau en
permanence. Aucune interface de quota à inventer.

Ce sont des **positions absolues** sur une piste unique, pas des quotas par Manche : la
cheville du joueur ne repart jamais de zéro. Valider une Manche, c'est avoir dépassé la
cheville adverse là où elle est postée. Elle avance d'une dizaine de Trous par Manche ;
une Rue dont on ne tire pas au moins autant est un mur, pas une courbe.

#### Le plafond d'avance **[RÈGLE]**

La cheville du joueur ne peut pas dépasser **cible + 6** pendant une Manche. Le surplus n'est
pas converti : il part au report, lui-même borné à **3 Trous d'avance**. Au-delà, les points
sont perdus.

Ces deux nombres tranchent la question §8.7, et ils ont été trouvés par la mesure, pas
choisis. Le problème : avec la courbe calibrée seule, ~60 % des runs gagnantes franchissaient
le Trou 121 **avant la Manche 10**, par la règle du §8.5. Les vainqueurs ne rencontraient
jamais l'Adversaire de la Rue IV, et la structure en 12 Manches était à moitié décorative.

Trois choses ont été mesurées, dans cet ordre.

**1. Durcir la courbe des coûts ne marche pas.** Trois courbes plus raides ont été essayées,
jusqu'à 55/180/380/800/2200. Aucune ne repousse la victoire : la Manche de victoire médiane
reste 9, et la part de victoires avant la Manche 10 *monte* jusqu'à 68 %. La raison est un
effet de sélection — durcir tue les runs faibles, celles qui auraient traîné jusqu'à la
Manche 12, et laisse les runs fortes, qui sont précisément celles qui franchissent la ligne
en avance. C'est structurel : pour que 12 Manches remplissent 121 Trous, il faut un rythme de
~10 Trous par Manche, et le jeu en produit 15 à 23. Aucun réglage de coût ne peut y changer
quoi que ce soit, puisque c'est l'arithmétique de la piste.

**2. Le plafond seul règle le calendrier, mais vide la Rue IV.** À 6, plus une seule victoire
avant la Manche 10, et les 4 Adversaires affrontés. Mais le report montait alors à **30 866
points médians en Rue IV**, où un Trou coûte 720 : 42 Trous payés d'avance sur les 30 que
compte la Rue. Le joueur arrivait devant l'Adversaire de la Rue IV avec la Rue déjà achetée.
Le taux de victoire ne bougeait pas d'un point — plus rien ne se décidait.

**3. Borner le report rend son coût au sur-score.** Le couple 6 / 3 Trous ramène la politique
d'achat naïve de 62 % à **37 %**, et étale les morts de la Manche 3 à la Manche 12 au lieu de
les concentrer sur les Manches 6 à 11.

| | sans plafond | plafond 6 | plafond 6 + report 3 |
|---|---|---|---|
| victoires avant la Manche 10 | 59 % | 0 % | 0 % |
| Adversaires affrontés | 3/4 | 4/4 | 4/4 |
| report médian en Rue IV | 554 | 30 866 | 2 160 |
| « achète tout » | 62 % | 62 % | **37 %** |
| « reliques seules » | 20 % | 20 % | 2 % |

Le 6 n'est pas arbitraire : `primeMax = 5` (§4.5) dit déjà qu'au-delà de +5 Trous le
dépassement ne rapporte plus rien. Le plafond fait seulement dire au plateau ce que le
porte-monnaie disait depuis l'étape 2.

Ce que ça coûte, et qu'il faut assumer : la marge cesse de se resserrer Rue après Rue, elle
se fige au plafond ; le §8.5 reste vrai comme règle mais devient inatteignable avant la
dernière Manche ; et le report du §8 q4 n'est plus intégral. Une cheville qui se bloque et des
points qui s'évaporent ne peuvent pas le faire en silence : l'événement `CHEVILLE_PLAFONNEE`
les annonce, comme `CIBLE_AVANCE` annonce la cheville adverse.

**Reste ouvert :** « reliques seules » tombe à 2 %, ce qui est peut-être trop punitif pour une
politique qui n'est pas absurde. Et le taux de la politique naïve, même à 37 %, n'est pas
« bas » au sens de PROTOTYPE.

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
| **Le Bavard** | la Retourne ne compte dans aucune combinaison |
| **L'Ordonné** | la Pose doit être en ordre croissant strict |

Chacun **casse une règle** au lieu de gonfler un chiffre. Même philosophie que les Épreuves
d'Awoo, et elle est bonne.

Les huit sont écrits (étape 4), un fichier chacun sous `src/adversaires/`. Trois d'entre eux
— Le Régulier, Le Vorace, Le Tranchant — déplacent la cheville adverse en cours de Manche
via le hook `surCheville` ; l'événement `CIBLE_AVANCE` l'annonce, parce qu'une ligne
d'arrivée qui recule en silence trahirait le §4.4.

**Le Bavard a changé d'effet.** Il était décrit comme « la Retourne est révélée après la
défausse, pas avant » — mais c'est **déjà le comportement par défaut** depuis l'étape 1 : le
carnet supposait l'inverse. Tel qu'écrit, il ne faisait rien, et inverser la règle ne donne
rien non plus, la Pose n'utilisant pas la Retourne. Effet retenu, dans le même esprit : il
parle par-dessus la carte commune, et **la Retourne ne participe à aucune combinaison**.
C'est la règle la plus profonde du §1.2 qui saute. La Couleur est rétrogradée d'une carte au
lieu d'être supprimée, sinon une Retourne assortie ferait *baisser* la valeur d'une couleur.

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

*L'étape 5 porte le catalogue à 24, réparties selon les familles du §5.3. Ces huit-là restent
le socle : ce sont les seules contre lesquelles la courbe des coûts du §4.2 a été calibrée.*

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

### Tranchées

1. **La Boîte est-elle visible pendant la Manche ?** → **Oui, face visible.** Voir la bombe
   se construire alimente l'anticipation à chaque défausse.
2. **La Retourne est-elle unique par Donne ou par Manche ?** → **Par Donne.** C'est
   l'injecteur de variance principal. Un paquet de 52 est mélangé par Manche et tiré sans
   remise, donc les Retournes d'une même Manche sont toutes différentes.
4. **Le report des points non convertis entre Donnes ?** → **Oui, reporté** (`reporterLeReste`),
   mais **borné à 3 Trous d'avance** depuis §4.3. C'est ce qui rend une petite Donne utile ;
   la borne est ce qui empêche une grosse Donne de payer une Rue entière d'avance. Le report
   franchit les Manches, puisque la piste est continue.
5. **Que se passe-t-il si la cheville dépasse 121 en cours de Rue ?** → **On gagne, la run
   s'arrête.** La règle tient toujours, mais depuis le plafond d'avance (§4.3) elle n'est plus
   atteignable avant la dernière Manche : le plafond de la Manche 12 est le seul qui vaille
   121. En pratique, « la piste est l'arbitre, pas le calendrier » est devenu « la piste est
   l'arbitre, dans les limites que le calendrier lui pose ».
7. **L'Adversaire de la Rue IV est-il jouable ?** → **Oui, depuis le plafond d'avance.** Sans
   lui, 59 % des vainqueurs ne le rencontraient jamais ; avec lui, 100 % des runs gagnantes
   affrontent les 4 Adversaires. Le détail de la mesure et de ce qu'elle a écarté est au §4.3.

### Encore ouvertes

3. **La Pose est-elle obligatoire ou optionnelle chaque Donne ?** Aujourd'hui elle est
   obligatoire : on peut encaisser à tout moment, mais pas la sauter. La question a changé de
   nature depuis que la Pose achète du Mult (§1.3) : la sauter coûterait désormais ~29 % du
   Mult de la Donne, donc « optionnelle » redeviendrait un vrai choix au lieu d'un raccourci.
6. **Nom du jeu.** « Boîte » reste un nom de code.
8. **Le `multiplicateurMain`** (×2 sur le seul Compte de la main, calibré à l'étape 1) ne
   figure pas dans la formule du §2.1. Décision provisoire : il est affiché comme un **bonus
   permanent**, annoncé avant le comptage. Reste à décider s'il doit être fondu dans les
   niveaux de Voie, devenir un bonus de Mult, ou rester un troisième facteur.
9. **Le taux de victoire reste haut pour une politique d'achat naïve** : 43 % en « achète
   tout », quand PROTOTYPE le veut « bas et non nul ». Ni le plafond ni la courbe des coûts
   n'y touchent — les deux ont été mesurés — et le passage de la Pose au Mult (§1.3) l'a
   remonté de 6 points. À reprendre séparément, sans doute par la courbe des coûts, qui est
   le seul levier qui n'ait pas encore été bougé depuis.
