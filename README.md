# Boîte *(nom de code)*

**Un roguelike de score en solo bâti sur le cribbage, où l'on jette ses meilleures cartes
dans une boîte sans savoir si c'était un investissement ou un suicide.**

Six cartes en main. Vous en gardez quatre, vous en jetez deux dans la **Boîte**. Puis on
retourne une carte commune, et vous comptez : quinzaines, paires, suites, couleur, valet.
Le score fait avancer votre cheville sur un plateau de 121 trous.

Et la Boîte, elle, ne se compte pas tout de suite. Elle accumule vos rebuts pendant toute
la manche, et se retourne d'un seul coup à la fin.

> **Balatro n'a pas touché au poker. On ne touchera pas au cribbage.**

Toute la folie passe par les modificateurs. Une quinzaine vaut 2 points, toujours. C'est
le reste qui devient monstrueux.

---

## Pourquoi le cribbage

Un roguelike de score a besoin de six choses. Le cribbage en fournit six sur six, sans
qu'on ait rien à inventer.

| Besoin | Ce que le cribbage donne déjà |
|---|---|
| Une taxonomie de score dense | **Cinq voies natives**, cumulables sur 5 cartes, toutes améliorables |
| Un moment de comptage | **Le rituel scandé** : « quinze deux, quinze quatre, quinze six… » |
| Un deck à sculpter | **52 cartes**, 13 rangs × 4 couleurs, deux axes indépendants |
| Un choix armer / tirer | **La défausse à la Boîte** : un arbitrage explicite, chaque donne |
| Une barre de progression | **Le plateau de 121 trous**, objet physique, lisible en permanence |
| Un antagoniste sans IA | **La course de chevilles** : une cheville qui avance d'un pas annoncé |

Le point décisif est le premier. Les cinq voies — Quinzaine, Paire, Suite, Couleur,
Valet — sont **cinq archétypes de build immédiatement lisibles**. Un joueur peut dire
« je fais du Suite » à sa cinquième partie. C'est exactement ce que les mains de poker
apportent à Balatro.

Et une main de cribbage n'est pas une catégorie unique : c'est une **somme de petites
combinaisons qui se multiplient entre elles**. Le hasard combinatoire est dans les règles
depuis 1630.

```
Main : 4  5  5  6  6

  Quinzaines   4+5+6, en 4 exemplaires (2 façons pour le 5 × 2 pour le 6)   8 pts
  Suites       4-5-6, en 4 exemplaires, 3 cartes chacune                   12 pts
  Paires       les deux 5, les deux 6                                       4 pts
                                                                          ───────
                                                                           24 pts
```

Cinq cartes, aucune règle spéciale, et le score explose par multiplication pure.

---

## La Boîte

C'est le meilleur objet du jeu classique, et il n'a jamais été exploité.

Au cribbage, ce que vous jetez n'est pas perdu : ça revient. Chez nous, **la Boîte est
toujours à vous, et elle ne se compte qu'à la fin de la manche** — 8 cartes accumulées
sur 4 donnes, plus la retourne, comptées d'un seul coup avec tous les modificateurs.

Chaque défausse devient donc la même question, posée quatre fois par manche :

> **Je marque maintenant, ou je construis la bombe ?**

C'est la distinction armer / tirer, mais comme **choix** et non comme contrainte. Et ça
donne un moment de fin de manche naturel : neuf cartes se retournent, et le comptage part.

---

## Le plateau est la run

121 trous. Mais chaque trou coûte de plus en plus cher.

```
Rue I     trous   1– 30      la cheville avance vite, les chiffres sont petits
Rue II    trous  31– 60      il faut un build
Rue III   trous  61– 90      il faut un build qui fonctionne
Rue IV    trous  91–120      il faut avoir cassé quelque chose
Le Trou   trou      121      le dernier trou coûte plus cher que les 120 autres
```

On obtient les deux à la fois : **la courbe exponentielle** de Balatro, et une **ligne
d'arrivée fixe et lisible** que Balatro n'a pas. Le joueur voit exactement où il en est,
tout le temps, sur un objet vieux de trois cents ans.

---

## L'adversaire n'existe pas

Pas d'IA. Jamais. Il y a une **deuxième cheville** sur la piste, et elle ne joue pas aux
cartes : elle avance d'un nombre de trous **annoncé à l'avance**, affiché en permanence.
C'est de la météo, pas un joueur.

Atteindre le trou 121 avant elle, c'est gagner. Chaque Rue se termine par un **Adversaire**
dont la cheville a un comportement particulier : celle qui accélère, celle qui bondit
quand vous marquez gros, celle qui vous vole des trous quand vous explosez à la pose.

---

## Deux jeux avec les mêmes cartes

Après la défausse, avant le comptage, il y a **la Pose**. Vous posez vos quatre cartes une
par une, le total grimpe, et vous marquez en chemin : 15, paires, suites, 31.

Mais **au-delà de 31, tout ce que la pose vous a rapporté est perdu.** Vous pouvez vous
arrêter et encaisser à tout moment.

De l'ADN blackjack, compris par tout le monde en zéro seconde. Et surtout : une carte peut
être médiocre au comptage et excellente à la pose. **Une deuxième surface entière de
reliques, orthogonale à la première.**

---

## Ce qu'on ne fera pas

Pas d'IA adverse. Pas de modification des règles de base du cribbage — une quinzaine vaut
2, une suite de 3 vaut 3, toujours. Pas de relique qui fait seulement « +X ». Pas de
multijoueur. Pas de thème taverne anglaise ni de casino. Pas de tutoriel textuel : le jeu
compte à votre place et surligne chaque combinaison au moment où il l'annonce.

---

## État du projet

Prototype. Les trois premières étapes de [`PROTOTYPE.md`](PROTOTYPE.md) ont répondu oui ;
la quatrième est en cours.

| Étape | Question | Verdict |
|---|---|---|
| **1** — le moteur et une Manche | la défausse est-elle un choix intéressant ? | oui, c'est une décision |
| **2** — reliques et boutique | un build émerge-t-il ? veut-on relancer ? | oui, on relance |
| **3** — le feel | le comptage se scande-t-il ? | oui |
| **4** — la run entière | le Trou 121 exige-t-il d'avoir cassé quelque chose ? | en cours |

Le cœur (`src/core/`) est pur et testé. Il émet un flux ordonné d'événements que trois
couches rejouent sans jamais le modifier : la CLI en texte, la simulation en chiffres, le
navigateur en son et en image.

```bash
npm run dev              # une Manche jouable, avec le comptage scandé
npm run cli              # une run de 12 Manches au clavier, boutique comprise
npm run sim -- --runs    # N runs entières simulées : la mesure de l'étape 4
npm test                 # les tests du cœur et de la partition
```

L'étape 4 a construit la run entière — plateau persistant de 121 Trous, 4 Rues, les 8
Adversaires — et calibré la courbe des coûts par simulation. Il lui reste son critère
d'arrêt : **3 runs complètes jouées à la main**.

## Documents

- **[`CARNET-DE-CONCEPTION.md`](CARNET-DE-CONCEPTION.md)** — la bible. Règles exactes,
  algorithme de score, structure de run, reliques, tous les chiffres.
- **[`PROTOTYPE.md`](PROTOTYPE.md)** — le périmètre de l'étape 1 et de l'étape 2.
- **[`CLAUDE.md`](CLAUDE.md)** — règles de travail et conventions de code.

Le vocabulaire est provisoire mais fixé : Donne, Manche, Rue, Boîte, Retourne, Pose,
Compte, Voie, Trou, Cheville, Adversaire, Relique.
