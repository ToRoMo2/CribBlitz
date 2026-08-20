# CLAUDE.md — règles de travail

## Contexte

Prototype d'un roguelike de score en solo bâti sur le cribbage. On cherche à savoir si le
design tient **avant** d'écrire un vrai jeu. Lire `README.md` pour la vision,
`CARNET-DE-CONCEPTION.md` pour les règles exactes et les chiffres, `PROTOTYPE.md` pour le
périmètre de l'étape en cours.

**Le carnet fait autorité.** En cas de contradiction entre ce fichier et le carnet sur une
question de design, le carnet gagne. En cas de doute sur une règle du cribbage, se référer
au §1 du carnet, qui est normatif.

---

## Les deux règles d'architecture

### 1. Le cœur est pur

`src/core/` ne connaît ni rendu, ni son, ni entrée, ni DOM, ni horloge, ni `Math.random`.
L'aléatoire passe par un PRNG seedé injecté dans l'état.

Signature unique :
```ts
(state: EtatPartie, action: Action) => { state: EtatPartie, events: Evenement[] }
```

Les `events` sont une liste **ordonnée** que la couche de présentation rejouera plus tard
pour animer et sonoriser. Le cœur ignore qu'une animation existe.

Événements attendus dès l'étape 1 :
`DONNE_DISTRIBUEE`, `CARTES_DEFAUSSEES`, `RETOURNE_REVELEE`, `TALONS`, `POSE_CARTE`,
`POSE_MARQUE`, `POSE_ENCAISSE`, `POSE_EXPLOSE`, `COMBINAISON_TROUVEE`, `MULT_APPLIQUE`,
`SCORE_CALCULE`, `BOITE_COMPTEE`, `CHEVILLE_AVANCE`, `MANCHE_GAGNEE`, `MANCHE_PERDUE`.

**Le test permanent** : `npm run cli` doit toujours permettre de jouer une Manche entière
sans une ligne de rendu. Si un jour il faut du graphique pour jouer un tour, c'est que le
cœur a été contaminé.

### 2. Tout est donnée, rien n'est constante

Nombre de Donnes par Manche, coûts des Trous, cibles, valeurs des Voies, seuil de la
Pose : des paramètres de configuration, rassemblés dans `src/presets/`. **Aucune valeur en
dur dans le moteur.**

Corollaire : une **Relique est une donnée** — un objet déclaratif plus une fonction de
déclenchement, dans son propre fichier sous `src/reliques/`. Ajouter une relique ne modifie
jamais le cœur, et le moteur ne fait **aucun `switch` sur un identifiant**.

---

## Arborescence

```
src/core/         le moteur : cribbage, score, manche, pose, run. Pur et testé.
src/reliques/     le catalogue des reliques (données)
src/adversaires/  le catalogue des Adversaires (mêmes hooks que les reliques)
src/presets/      tous les chiffres du jeu, scansion comprise
src/sim/          la CLI jouable et les harnais de simulation
src/rendu/        la couche navigateur : partition, audio, scène, comptage
tests/            les tests du cœur — dont l'oracle de comptage
```

**`src/rendu/` a son propre `tsconfig.json`**, seul à exposer la lib `DOM` ; la racine
l'exclut. Écrire `document` dans `src/core/` ne compile donc pas : la règle 1 est tenue par
le compilateur, pas seulement par la discipline. `npm run typecheck` vérifie les deux.

## Stack

TypeScript + Vite, Vitest. Zéro dépendance de jeu. Pas de framework tant qu'il n'y a pas
de rendu.

## Commandes

```bash
npm run dev        # le navigateur : une Manche jouable, avec le comptage scandé
npm run cli        # une run de 12 Manches au clavier, boutique comprise
npm run sim        # N Manches simulées, statistiques en sortie
npm run sim -- --runs       # N runs entières : la mesure de l'étape 4
npm run sim -- --synergie   # la matrice de synergie des reliques (étape 2)
npm test           # les tests du cœur et de la partition
npm run typecheck
```

Le serveur de dev est **obligatoire** pour les pages : ouvrir `index.html` ou `banc.html`
en `file://` donne une page vide, le TypeScript n'étant compilé que par Vite.
`banc.html` est le banc d'essai à curseurs de la scansion.

---

## Conventions

- **Français dans le domaine, anglais dans la technique.** Les types et fonctions qui
  décrivent le jeu portent les noms du glossaire : `Donne`, `Manche`, `Boite`, `Retourne`,
  `Voie`, `Cheville`. Le reste (`parse`, `format`, `seed`, `reduce`) reste en anglais.
- Pas de commentaire qui répète le code. Un commentaire explique **pourquoi**, jamais
  **quoi**.
- Une fonction, une responsabilité. Le comptage d'une main ne connaît pas le score du
  roguelike ; le score du roguelike ne connaît pas la Manche.
- Types stricts. Pas de `any`. Les cartes sont un type fermé, pas une chaîne.

## Tests

- **Le comptage cribbage est testé en premier et exhaustivement.** C'est la seule partie du
  projet où une erreur est invisible et empoisonne tout le reste. Les cinq cas d'oracle du
  carnet §1.2 sont obligatoires avant toute autre ligne.
- Toute règle du carnet marquée **[RÈGLE]** a au moins un test dédié.
- Les tests du cœur ne font aucune entrée/sortie.

## Ce qu'il ne faut pas faire

- Ne pas ajouter de contenu (reliques, adversaires, Voies) au-delà du périmètre de l'étape
  en cours défini dans `PROTOTYPE.md`.
- Ne pas modifier les valeurs de base du cribbage. Une quinzaine vaut 2. Toujours.
- Ne pas toucher aux réglages de `src/presets/scansion.ts` : ils ont été validés à
  l'oreille. Les changer demande une raison mesurée.
- Ne pas « améliorer » le design sans le dire. Si une règle du carnet semble mauvaise à
  l'implémentation, **le signaler et proposer**, ne pas dévier en silence.
- Ne pas optimiser. Le prototype tourne sur des mains de 9 cartes ; la force brute suffit
  partout.
