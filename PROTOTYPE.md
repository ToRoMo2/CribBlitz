# Prototype — périmètre et critères d'arrêt

*Ce document existe pour empêcher le projet de devenir un vrai jeu avant qu'on sache s'il
en vaut la peine. Chaque étape a un périmètre fermé et **une seule question** à laquelle
elle doit répondre.*

---

## Règle générale

**Zéro rendu graphique avant l'étape 3.** Tout se joue en ligne de commande, en texte. Si
un doute de design ne peut pas être tranché en CLI, c'est qu'il ne s'agit pas d'un doute de
design mais d'un doute de présentation, et il attend.

---

# ÉTAPE 1 — Le moteur et une Manche

**Durée visée : 2 à 3 jours.**

### La question

> **Est-ce que le choix des 2 cartes à jeter dans la Boîte est intéressant ?**

Rien d'autre. Pas « est-ce que c'est fun », pas « est-ce que c'est joli ». Uniquement : est-ce
qu'il y a une vraie tension, 4 fois par Manche, entre marquer maintenant et nourrir la
Boîte.

### Ce qui est dans le périmètre

**1. Le moteur de comptage cribbage.** Fonction pure, testée, indépendante du reste.
```
compterMain(cartes: Carte[], retourne: Carte, estBoite: boolean) -> Combinaison[]
```
Renvoie la liste ordonnée des combinaisons trouvées, chacune avec son type, les cartes
impliquées et ses points. Pas un total : **une liste**, parce que c'est elle qui pilotera
l'animation plus tard.

Les cinq cas d'oracle du carnet (§1.2) doivent passer. Ajouter au moins vingt cas de plus,
dont : suites multiples, carré, couleur en main contre couleur en Boîte, valet de la
retourne, main à zéro point.

**2. La Pose**, avec le seuil de 31, l'encaissement volontaire et l'explosion.

**3. Le moteur de score du roguelike** : Points × Mult, les cinq Voies avec leurs niveaux.

**4. Une Manche complète** : 4 Donnes, la Boîte qui accumule, le Compte de la Boîte à la
fin, la conversion en Trous, une cheville adverse à une cible fixe.

**5. Une CLI jouable.** Affichage texte du plateau, de la main, de la Boîte, de la cheville
adverse. Saisie au clavier.

**6. Un harnais de simulation.** Un mode qui joue N Manches avec une stratégie automatique
naïve, sans affichage, et sort les statistiques : score moyen par Donne, score moyen de la
Boîte, distribution, ratio Boîte / mains.

### Ce qui est HORS périmètre

Aucune relique. Aucune boutique. Aucune économie. Aucun Adversaire spécial. Aucune Rue.
Aucun deckbuilding. Aucun son, aucun graphisme, aucune animation. Pas de sauvegarde.

### Ce qu'il faut mesurer

| Mesure | Pourquoi |
|---|---|
| Score moyen d'une main comptée | calibrer les coûts de Trou |
| Score moyen de la Boîte à 8 cartes + retourne | **le risque n°1 du design** |
| Ratio Boîte / somme des 4 mains | si > 3, la Boîte écrase tout et le choix disparaît |
| Écart entre une défausse optimale et une défausse aléatoire | **si l'écart est faible, le choix n'est pas intéressant et le design est mort** |

Cette dernière ligne est le vrai verdict de l'étape 1. Elle se mesure : faire jouer la
simulation avec défausse aléatoire, puis avec défausse gloutonne, et comparer.

### Critère d'arrêt

Jouer **20 Manches à la main en CLI**. Si à la vingtième la défausse est encore une
décision qu'on prend au lieu d'un réflexe, on passe à l'étape 2. Sinon on arrête ici et on
retourne sur Awoo, en ayant perdu trois jours.

---

# ÉTAPE 2 — Les reliques et la boutique

**Durée visée : 2 à 3 jours. À ne commencer que si l'étape 1 a répondu oui.**

### La question

> **Est-ce qu'un build émerge, et est-ce qu'on a envie de relancer une run pour en
> essayer un autre ?**

### Ce qui entre dans le périmètre

1. Les **8 reliques** du carnet (§5.2), 5 emplacements.
2. Une **boutique** entre les Manches : 2 reliques proposées, 1 niveau de Voie, 1 relance
   payante. Économie et intérêts du carnet (§4.5).
3. **Trois Manches enchaînées** avec cibles croissantes et une défaite possible.
4. **Deux Adversaires** parmi ceux du carnet (§4.4). Le Sourd et Le Mesquin sont les plus
   informatifs, parce qu'ils attaquent directement la Boîte et les Voies.
5. Toujours en CLI. Toujours zéro rendu.

### Hors périmètre

Le deckbuilding. Les 12 Manches. Les 150 reliques. Tout le reste.

### Critère d'arrêt

Jouer **5 runs de 3 Manches**. Deux signaux à guetter :

- **Bon signal :** on se surprend à choisir une relique *parce qu'elle va avec* une autre,
  et on relance pour tenter une autre combinaison.
- **Mauvais signal :** on achète la relique la plus chère à chaque fois sans réfléchir. Ça
  veut dire que les reliques sont des multiplicateurs déguisés et qu'il faut revoir la
  doctrine du §5.1 avant d'en écrire une seule de plus.

---

# ÉTAPE 3 — Le feel

**À ne commencer que si les étapes 1 et 2 ont répondu oui aux deux questions.**

C'est là seulement qu'on met un rendu, et le seul objectif est le **comptage scandé** :
un son percussif par combinaison, un demi-ton de plus à chaque, le tempo qui accélère avec
le Mult, et un nombre final trop gros pour sa boîte.

Rien d'autre. Pas de menu, pas de sauvegarde, pas de direction artistique.

---

# ÉTAPE 4 — La run entière

**Durée visée : 3 à 4 jours, dont l'essentiel en simulation et non en code.**

### La question

> **Est-ce qu'atteindre le Trou 121 exige d'avoir cassé quelque chose — sans jamais être
> hors d'atteinte ?**

Les trois premières étapes ont mesuré une Donne, une Manche, puis trois Manches. La courbe
de progression, elle, n'a jamais été observée : on n'a jamais dépassé le Trou 34, sur une
piste qui en compte 121, et les paliers à 300 et 2 200 points par Trou n'ont jamais été
franchis par personne.

C'est la dernière question structurelle. Après elle, il ne reste que du contenu.

### Ce qui est dans le périmètre

**1. Les 4 Rues, 12 Manches** — la carte de run du carnet §4.1, telle quelle.

**2. Les 8 Adversaires du carnet §4.4.** Six restent à écrire. Chacun **casse une règle**, aucun
ne gonfle un chiffre. Ce sont des données, comme les reliques : un fichier par Adversaire,
aucun `switch` sur un identifiant.

**3. La calibration par simulation des coûts de Trou (§4.2) et des cibles (§4.3).** C'est le
vrai travail de l'étape, et il se fait en chiffres, pas en code. Les deux tableaux sont
marqués **[À CALIBRER]** dans le carnet depuis le premier jour.

**4. Trancher la question ouverte §8.5** : que se passe-t-il si la cheville dépasse 121 en
cours de Rue.

**5. Le harnais étendu aux runs complètes.** Il joue N runs de 12 Manches et sort : taux de
victoire, Manche de mort, marge par rapport à la cible, ratio score / coût du Trou par Rue.

**6. Toujours la CLI pour jouer une run.** Le navigateur reste sur une Manche : il sert à
écouter le comptage, pas à jouer la run.

### Ce qui est HORS périmètre

Aucune relique au-delà des 8 — on ne calibre pas une courbe contre un catalogue qui bouge.
Pas de deckbuilding. Pas de direction artistique, pas de nom. Aucun rendu au-delà de ce qui
existe. Pas de sauvegarde.

### Ce qu'il faut mesurer

| Mesure | Pourquoi |
|---|---|
| Taux de victoire d'une run complète | doit être bas, et non nul |
| La Manche où les runs meurent | si elles meurent toutes à la même, c'est un mur, pas une courbe |
| Marge médiane entre la cheville du joueur et la cible | elle doit se resserrer Rue après Rue |
| Ratio score de Manche / coût du Trou, par Rue | **le risque n°1** : la courbe exponentielle doit rester rattrapable |
| Écart entre une run jouée au mieux et une run jouée au hasard | la mesure de l'étape 1, à l'échelle de la run |

La quatrième ligne est le vrai verdict. Un Trou de Rue IV coûte 2 200 points quand une
Manche non améliorée en rapporte 60. Le facteur est de 36 : soit les reliques et les Voies
le comblent, soit la Rue IV est décorative.

### Critère d'arrêt

Jouer **3 runs complètes de 12 Manches**. Deux signaux :

- **Bon signal :** on perd, on sait exactement à quelle Manche et pourquoi, et on relance
  en visant un autre build.
- **Mauvais signal :** on gagne sans réfléchir, ou on meurt toujours à la même Manche quoi
  qu'on achète. Dans les deux cas c'est la courbe qu'il faut refaire, pas le contenu.

---

# ÉTAPE 5 — Le catalogue

**Durée visée : 4 à 5 jours, dont la moitié en mesure.**

**Verdict de l'étape 4 : oui.** La boucle tient sur 12 Manches, on perd en sachant à quelle
Manche et pourquoi. C'est la condition qui autorise à poser du contenu dessus.

### La question

> **Est-ce que la variété tient — c'est-à-dire est-ce qu'on choisit encore, une fois que
> l'offre est large ?**

Les quatre premières étapes ont validé une boucle avec **huit** reliques. Huit, c'est assez
peu pour qu'aucun choix ne soit vraiment un choix : la boutique en propose deux, on prend
celle qu'on peut payer. La question de l'étape 2 — « est-ce qu'un build émerge ? » — a été
répondue oui sur un catalogue si petit que le build était presque imposé.

C'est le risque le plus lourd du carnet §7, celui noté **forte** depuis le premier jour :
*le build se voit trop vite*. Il ne peut se mesurer que sur un catalogue large.

### Ce qui est dans le périmètre

**1. Vingt-quatre reliques**, réparties selon les six familles du carnet §5.3 et dans les
proportions qu'il vise :

| Famille | Part visée | Nombre | Aujourd'hui |
|---|---|---|---|
| **Compte** | 30 % | 7 | 3 |
| **Pose** | 20 % | 5 | 1 |
| **Boîte** | 15 % | 4 | 1 |
| **Défausse** | 10 % | 2 | 1 |
| **Retourne** | 10 % | 2 | 1 |
| **Structure** | 15 % | 4 | 1 |

Vingt-quatre et pas trente : une run offre 2 reliques par boutique sur 11 boutiques, soit
22 tirages. En dessous de ce chiffre, le catalogue se voit en entier et la variété est une
illusion ; très au-dessus, on ne peut plus mesurer chaque relique.

La famille **Pose** est celle qui manque le plus — une seule relique aujourd'hui pour 20 %
visés. C'est aussi celle qui vient de changer de nature : depuis que la Pose achète du Mult
(carnet §1.3), une relique de Pose agit sur un multiplicateur et non sur un appoint.

**2. La doctrine du §5.1 tenue sans exception.** Aucune relique qui fait « +X ». Chacune
change une règle, déplace un seuil, ou lie deux surfaces. Une relique est une donnée dans son
propre fichier, et le moteur ne gagne **aucun `switch`**.

**3. Le harnais étendu à la mesure de dominance.** C'est le vrai travail de l'étape :

- **taux de présence** de chaque relique dans les runs gagnantes ;
- **taux de refus** : combien de fois elle est proposée, abordable, et non prise ;
- la **matrice de synergie** du `--synergie` de l'étape 2, portée à 24 × 24 ;
- l'**écart de taux de victoire** entre une politique qui choisit et une politique qui prend
  au hasard dans l'offre.

**4. Une politique d'achat qui choisit.** Les quatre politiques actuelles achètent par
catégorie, jamais par pertinence. Tant qu'aucune ne sait préférer une relique à une autre, on
ne peut pas mesurer si le choix compte.

### Ce qui est HORS périmètre

Le deckbuilding. Les Voies au-delà des cinq. Les Adversaires au-delà des huit. Le rendu au-delà
de ce qui existe. La direction artistique et le nom. Et **la calibration** : voir ci-dessous.

### Le risque assumé de cette étape

Poser du contenu **fige la courbe**. Les coûts de Trou du carnet §4.2 ont été calibrés contre
huit reliques ; avec vingt-quatre, tout déplacement de la courbe demandera de tout remesurer.
On accepte donc de laisser la question ouverte n° 9 — le taux de victoire de 43 %, que
PROTOTYPE veut bas — **non résolue pendant toute l'étape**, et de ne la reprendre qu'après,
sur le catalogue complet. La traiter maintenant serait calibrer contre une cible mouvante.

Corollaire : si l'étape 5 fait monter le taux de victoire au-delà de ~60 %, on s'arrête et on
recalibre avant d'écrire la vingt-cinquième relique.

### Ce qu'il faut mesurer

| Mesure | Pourquoi |
|---|---|
| Taux de présence par relique dans les runs gagnantes | **le risque n° 1** : au-delà de 80 %, la relique est obligatoire et le choix est faux |
| Taux de refus par relique | une relique jamais prise est du contenu mort |
| Écart entre « choisit » et « prend au hasard » | si l'écart est faible, la variété est décorative |
| Nombre de reliques distinctes vues sur 5 runs | mesure directe de la variété perçue |
| Taux de victoire | il ne doit pas dériver au-delà de ~60 % |

La première ligne est le verdict. Une relique présente dans 80 % des victoires n'est pas une
option, c'est une condition — et le catalogue autour d'elle n'est qu'un décor.

### Critère d'arrêt

Jouer **5 runs**. Deux signaux :

- **Bon signal :** on renonce à la relique la plus chère parce qu'une moins chère va avec ce
  qu'on a déjà, et deux runs gagnantes n'ont pas le même équipement.
- **Mauvais signal :** les mêmes cinq reliques gagnent à chaque fois. Dans ce cas ce n'est pas
  le catalogue qu'il faut agrandir, c'est la doctrine du §5.1 qu'il faut revoir — et ça
  invalide la réponse de l'étape 2 autant que celle-ci.

---

## Ce qu'on ne fait sous aucun prétexte avant l'étape 6

- Choisir une direction artistique ou un nom
- Toucher à un moteur graphique
- Équilibrer finement quoi que ce soit — voir le risque assumé de l'étape 5
- Ajouter le deckbuilding

Le contenu posé sur une boucle qui ne tient pas, c'est du contenu que personne ne verra.
