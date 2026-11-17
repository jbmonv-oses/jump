# Sept tours avant le saut — brief du prototype

Titre de travail. Version 1, 17 novembre 2026.

Ce document est la référence du projet : il décrit le jeu, les règles exactes du prototype, l'interface, les contraintes techniques et l'ordre de construction. Le premier prompt à donner à Claude Code se trouve à la fin (section 8).

## 1. Le jeu en bref

Jeu de tactique solo au tour par tour, jouable dans un navigateur. Le joueur commande trois membres d'équipage dans un vaisseau attaqué. Le moteur de saut met sept tours à charger : il faut tenir jusque-là.

Deux inspirations. Into the Breach pour la lisibilité : tout ce qui va arriver est annoncé avant que le joueur agisse, et la résolution est déterministe. FTL pour le thème et la gestion de crise : le feu, les intrus, les systèmes à garder en état.

Trois principes à respecter partout :

- **Tout est annoncé.** Au début de chaque tour, le jeu montre ce qui se passera à la fin du tour.
- **Le hasard reste en amont.** Il choisit les menaces, jamais le résultat d'une action. Un geste a toujours l'effet prévu.
- **Trois menaces, trois gestes.** Frapper répond aux intrus, éteindre au feu, réparer aux dégâts des salves.

Le prototype doit permettre de répondre à trois questions :

1. Trier des menaces annoncées avec trois personnages reste-t-il intéressant tour après tour ?
2. Le choix entre spécialistes rapides et polyvalents lents est-il un vrai dilemme ?
3. Envoyer un intrus dans un danger (mur, feu, salve) arrive-t-il naturellement, et est-ce satisfaisant ?

## 2. Règles du prototype

### 2.1 Plateau

Grille de 7 colonnes (A à G, de gauche à droite) sur 5 lignes (1 à 5, de haut en bas). Une case se note par sa colonne puis sa ligne : D3 est la case centrale. Tout est orthogonal : déplacements, adjacences et directions ignorent les diagonales.

```
.......
...B...
.M123P.
...O...
.......
```

`.` sol · `M` moteur · `B` bouclier · `O` oxygène · `P` pilotage · `1` `2` `3` cases de départ de l'équipage (ce sont des cases de sol).

Il y a trois sortes d'obstacles : le bord de la grille (la coque), les systèmes (même détruits) et les unités. Une case de sol peut être en feu ; un système ne brûle pas.

### 2.2 Systèmes, victoire et défaite

Quatre systèmes, chacun avec 4 points d'état. Un système à 0 est détruit pour de bon. Dans le prototype, les systèmes n'ont pas d'effet propre : ils sont l'enjeu à protéger.

- **Victoire** : la résolution du tour 7 se termine sans défaite.
- **Défaite**, dès que l'une de ces conditions est vraie : le moteur est détruit ; deux systèmes sont détruits ; plus aucun membre d'équipage n'est debout.

On peut donc sacrifier un système, mais jamais le moteur.

### 2.3 Unités et déplacement

Deux sortes d'unités : les membres d'équipage (3 points de vie) et les intrus (2 points de vie). Une unité à 0 point de vie est retirée de la grille aussitôt. Une case contient au plus une unité.

Une unité se déplace de case en case. Elle ne peut entrer ni sur un système, ni sur une case en feu, ni sur la case d'une autre unité. Deux exceptions :

- un membre d'équipage peut traverser la case d'un équipier, sans s'y arrêter ;
- le pompier traverse et occupe les cases en feu.

Sortir d'une case en feu est toujours possible. Ces règles valent pour les déplacements volontaires ; le recul causé par un coup suit ses propres règles (voir 2.6).

### 2.4 Équipage et rôles

Avant la partie, le joueur compose son équipage : 3 rôles différents parmi 6. Il existe trois gestes : frapper, éteindre, réparer. Un spécialiste n'en a qu'un, en version forte, et se déplace vite. Un polyvalent en a deux, en version simple, et se déplace lentement.

| Rôle | Type | Gestes | Déplacement |
|---|---|---|---|
| Garde | spécialiste | frapper (fort) | 4 |
| Mécano | spécialiste | réparer (fort) | 4 |
| Pompier | spécialiste | éteindre (fort), insensible au feu | 4 |
| Sapeur | polyvalent | frapper, réparer | 2 |
| Agent de sécurité | polyvalent | frapper, éteindre | 2 |
| Technicien | polyvalent | réparer, éteindre | 2 |

Personne n'a d'autre geste que ceux de son rôle.

### 2.5 Déroulement d'un tour

**Phase 1, annonces (automatique).** Dans cet ordre :

1. Chaque intrus présent se déplace, puis annonce son attaque (voir 2.9).
2. Le jeu tire les salves du tour et affiche leurs cibles (voir 2.8).
3. Le jeu tire les propagations du feu et les affiche (voir 2.7).
4. Si un abordage est prévu ce tour, le jeu tire la case d'arrivée et l'affiche (voir 2.9).

**Phase 2, joueur.** Chaque membre d'équipage peut, une fois par tour, se déplacer puis faire un geste. Les deux sont facultatifs. Le geste termine son activation : plus de déplacement ensuite. Le joueur active ses membres dans l'ordre qu'il veut et peut passer de l'un à l'autre (déplacer A, déplacer B, puis faire le geste de A). L'effet d'un geste est immédiat. Un bouton « Recommencer le tour » ramène à l'état du début de la phase 2 ; un bouton « Fin du tour » lance la résolution.

**Phase 3, résolution (automatique).** Dans cet ordre fixe :

1. Attaques des intrus.
2. Dégâts du feu.
3. Salves.
4. Propagation du feu.
5. Arrivée de l'intrus annoncé.

Le feu allumé pendant la résolution (étapes 3 et 4) ne blesse donc qu'au tour suivant : le joueur a toujours un tour pour réagir. Les conditions de défaite sont vérifiées après chaque geste et après chaque étape de la résolution.

### 2.6 Gestes

Un geste vise toujours une case adjacente au membre d'équipage qui le fait.

**Frapper.** Cible : une unité adjacente, intrus ou équipier.

1. Un intrus perd 1 point de vie. Un équipier n'en perd pas : il est seulement bousculé.
2. Si la cible est encore debout, elle recule dans la direction du coup : 1 case en version simple, 2 cases en version forte (une case à la fois).
3. Si la case suivante est un obstacle, la cible ne bouge plus et perd 1 point de vie : c'est un heurt. Si l'obstacle est une unité, celle-ci perd aussi 1 point de vie.
4. Si la case où la cible finit son recul est en feu, elle perd 1 point de vie (sauf le pompier).

Un intrus déplacé garde l'attaque qu'il a annoncée : elle partira de sa nouvelle case, dans la même direction.

Exemples avec un intrus à 2 points de vie, frappé en version simple. Vers une case libre : il lui reste 1 point. Contre la coque, un système ou une unité : il est éliminé. Vers une case en feu : il est éliminé. Vers une case visée par une salve : il lui reste 1 point, et la salve l'achève à la résolution.

**Éteindre.** Version simple : la case adjacente visée, qui doit être en feu, s'éteint. Version forte : le pompier vise une case adjacente, qu'elle brûle ou non ; cette case et les 4 qui la touchent s'éteignent (une croix de 5 cases, qui comprend celle du pompier). Éteindre la source d'une propagation annoncée annule cette propagation.

**Réparer.** Cible : un système adjacent endommagé mais non détruit. Version simple : il regagne 1 point d'état. Version forte : il revient à 4 points.

### 2.7 Feu

- **Annonce.** Soit F le nombre de cases en feu. Le jeu annonce ⌈F / 3⌉ propagations (arrondi au supérieur : 1 pour 1 à 3 cases en feu, 2 pour 4 à 6, etc.). Une propagation relie une case en feu, la source, à une case de sol adjacente qui ne brûle pas, la cible ; les deux sont tirées au sort. Dans un même tour, deux propagations n'ont ni la même source ni la même cible. S'il existe moins de possibilités que prévu, le jeu annonce toutes celles qui existent.
- **Dégâts (résolution, étape 2).** Chaque unité sur une case en feu perd 1 point de vie, sauf le pompier. Chaque système non détruit adjacent à au moins une case en feu perd 1 point d'état, quel que soit le nombre de cases en feu qui le touchent.
- **Propagation (résolution, étape 4).** Pour chaque propagation annoncée dont la source brûle encore, la cible s'enflamme, même si une unité s'y trouve.

### 2.8 Salves

- **Annonce.** Le nombre de salves dépend du tour (voir 2.11). Chaque salve vise, par tirage au sort, soit un système non détruit (1 chance sur 3), soit une case de sol (2 chances sur 3). Deux salves du même tour ne visent jamais la même case. S'il ne reste aucun système à viser, la salve vise une case de sol.
- **Résolution (étape 3).** Sur un système : il perd 2 points d'état. Sur une case de sol : l'unité qui s'y trouve perd 2 points de vie (pompier compris), et la case s'enflamme.

### 2.9 Intrus

- **Abordage.** Aux tours prévus (voir 2.11), le jeu annonce une case d'arrivée, tirée au sort parmi les cases de sol sans unité, sans feu, et qui ne sont la cible ni d'une salve ni d'une propagation ce tour-là. À l'étape 5 de la résolution, un intrus apparaît sur cette case. Si elle est alors occupée ou en feu, il apparaît sur la case de sol libre et sans feu la plus proche (distance en cases ; à égalité, la première dans l'ordre de lecture, de haut en bas puis de gauche à droite).
- **Déplacement (phase 1).** Un intrus déjà adjacent à un système non détruit ne bouge pas. Sinon, il cherche la case libre et sans feu la plus proche, en nombre de pas, qui soit adjacente à un système non détruit, et avance de 2 cases au plus sur le chemin le plus court. Si aucune n'est accessible, il se dirige de la même façon vers une case adjacente à un membre d'équipage. Si rien n'est accessible, il reste sur place.
- **Annonce d'attaque (phase 1, après son déplacement).** S'il est adjacent à un système non détruit, il annonce une attaque dans cette direction. Sinon, s'il est adjacent à un membre d'équipage, il annonce une attaque dans cette direction. Sinon, il n'annonce rien. L'annonce retient une direction, pas une cible.
- **Attaque (résolution, étape 1).** Chaque intrus encore debout qui a annoncé une attaque frappe la case située dans la direction annoncée, à partir de la case où il se trouve à ce moment-là. Un système non détruit y perd 1 point d'état ; une unité, équipier ou autre intrus, y perd 1 point de vie ; sinon il ne se passe rien.
- **Ordre et égalités.** Les intrus agissent dans leur ordre d'arrivée. Entre options équivalentes (chemins, cases, cibles), le choix suit toujours l'ordre haut, droite, bas, gauche, sans tirage au sort.

### 2.10 Mise en place et hasard

L'équipage occupe les cases 1, 2 et 3 dans l'ordre où les rôles ont été choisis. Les systèmes sont à 4 points. Une case de sol tirée au sort, hors cases de départ, est en feu. La partie commence au tour 1.

Tout le hasard vient d'un générateur pseudo-aléatoire à graine. La graine est affichée et peut être saisie : même graine, même équipage et mêmes actions donnent exactement la même partie. Les tirages n'ont lieu qu'à la mise en place et pendant la phase 1, toujours dans le même ordre (salves, propagations, abordage). La résolution et les gestes ne tirent jamais rien au sort.

### 2.11 Valeurs de départ

Toutes ces valeurs vivent dans un seul fichier de configuration et sont faites pour être ajustées.

| Paramètre | Valeur |
|---|---|
| Nombre de tours | 7 |
| Points d'état d'un système | 4 |
| Points de vie d'un membre d'équipage | 3 |
| Points de vie d'un intrus | 2 |
| Déplacement : spécialiste / polyvalent / intrus | 4 / 2 / 2 |
| Dégâts : coup, heurt, feu, attaque d'intrus | 1 |
| Dégâts d'une salve | 2 |
| Salves par tour, du tour 1 au tour 7 | 1, 1, 1, 2, 2, 2, 3 |
| Chance qu'une salve vise un système | 1 sur 3 |
| Abordages annoncés aux tours | 1, 2, 4, 6 |
| Propagations du feu par tour | ⌈F / 3⌉ |
| Feu initial | 1 case |

Ces valeurs ont été dégrossies avec une simulation simplifiée (4 000 parties par cas). Elle ignore l'équipage sur la grille et ses déplacements : un joueur fictif fait un nombre fixe de gestes simples par tour, par ordre d'urgence, où il veut. Résultats :

- sans aucun geste, la partie est toujours perdue, le plus souvent au tour 4 ;
- avec un geste par tour, elle est presque toujours perdue ; avec deux, on gagne environ 4 fois sur 10 ; avec trois, presque toujours ;
- avec trois gestes par tour mais privé d'un des trois types de geste, on ne gagne plus qu'environ une fois sur deux, quel que soit le geste retiré.

La menace est donc réelle et les trois gestes pèsent à peu près autant. La difficulté réelle dépendra des déplacements, que cette simulation ne voit pas : c'est l'objet de l'étape 5.

## 3. Interface

Rendu minimaliste : une page, une grille CSS, des emojis, aucune image. Souris sur ordinateur ; pas d'adaptation mobile.

**Écran de composition.** Les six rôles avec leurs gestes et leur déplacement ; le joueur en choisit trois. Un champ graine, prérempli au hasard. Un bouton pour lancer.

**Écran de jeu.**

- La grille, avec les systèmes, le feu, les unités et leurs points de vie.
- Les annonces dessinées sur la grille : cible de chaque salve, source et cible de chaque propagation, direction d'attaque de chaque intrus, case d'arrivée de l'abordage. Elles doivent se lire d'un coup d'œil et rester visibles pendant toute la phase du joueur.
- Un bandeau : tour en cours sur 7, points d'état des quatre systèmes, graine.
- Un journal qui redit les annonces en clair (« Salve sur D2, le bouclier », « Le feu passe de C1 à C2 », « L'intrus en E4 frappe vers le haut »), puis ce qui s'est passé à la résolution.
- Les boutons « Fin du tour », « Recommencer le tour » et « Nouvelle partie ».

**Jouer un membre d'équipage.** Un clic le sélectionne et montre les cases qu'il peut atteindre. Un clic sur l'une d'elles le déplace. Les boutons de ses gestes apparaissent ; en choisir un montre les cibles valides ; un clic sur une cible fait le geste. Un membre qui a fini est grisé.

**Écran de fin.** Victoire ou défaite, la cause de la défaite, et deux boutons : rejouer la même graine, ou partir sur une nouvelle.

Emojis proposés, à changer librement : 💂 garde, 🔧 mécano, 🧯 pompier, ⛏️ sapeur, 🦺 agent de sécurité, 🧰 technicien, 👾 intrus, 🔥 feu, ⚙️ moteur, 🛡️ bouclier, 🫧 oxygène, 🧭 pilotage, 🎯 salve, 🌀 abordage.

## 4. Contraintes techniques

- HTML, CSS et JavaScript en modules ES. Aucun framework, aucune dépendance, aucune étape de compilation.
- Node.js (version 20 ou plus) sert seulement aux tests et à un petit serveur local, car les modules ES ne se chargent pas quand on ouvre le fichier directement.
- Trois commandes : `npm start` sert le dossier en local, `npm test` lance les tests avec le lanceur intégré de Node, `npm run simulate` lance les parties automatiques.
- Interface et commentaires en français, noms de variables et de fonctions en anglais.
- Dépôt git dès le départ, un commit à la fin de chaque étape validée.

Arborescence indicative :

```
index.html
style.css
package.json
src/rules/    logique pure, aucun accès au DOM
  config.js     carte, rôles, toutes les valeurs de la section 2.11
  rng.js        générateur à graine
  grid.js       adjacences, chemins
  state.js      état initial
  announce.js   phase 1
  actions.js    déplacements et gestes
  resolve.js    phase 3
src/ui/       affichage et saisie, aucune règle de jeu
tests/        tests des règles
tools/        serveur local, parties automatiques
```

Règles d'architecture :

1. L'état de la partie est un objet simple, convertible en JSON, qui contient tout : grille, unités, annonces, tour, phase, état du générateur aléatoire.
2. Les règles sont des fonctions pures : elles reçoivent un état et rendent un nouvel état, sans modifier l'ancien. « Recommencer le tour » consiste à reprendre l'état gardé au début de la phase 2.
3. `src/rules/` n'importe rien de `src/ui/`. L'interface affiche l'état et transmet les actions ; elle ne contient aucune règle.
4. Aucune valeur chiffrée en dehors de `config.js`.
5. Chaque règle de la section 2 a au moins un test, cas limites compris : heurt, recul dans le feu, recul de 2 cases interrompu, propagation annulée, attaque d'un intrus déplacé, salve sur une unité, arrivée sur une case occupée, chaque condition de défaite.

## 5. Étapes de construction

Une étape à la fois. À la fin de chacune : les tests passent, le jeu se lance, et un court message dit quoi essayer. On attend l'accord avant de passer à la suivante. Si une règle manque ou se contredit, poser la question plutôt que deviner.

1. **Socle.** Structure du projet, configuration, état initial, affichage de la grille, sélection et déplacement de l'équipage, compteur de tours, fin de tour sans menace.
2. **Feu et salves.** Annonces, résolution, geste éteindre dans ses deux versions, points d'état des systèmes, victoire et défaite. À ce stade le jeu est déjà jouable, avec un équipage imposé qui sait éteindre.
3. **Intrus et frapper.** Abordage, déplacement et attaque des intrus, geste frapper dans ses deux versions, heurts.
4. **Jeu complet.** Geste réparer, les six rôles, écran de composition, écran de fin, graine, « Recommencer le tour », journal.
5. **Parties automatiques et réglages.** Un joueur automatique qui choisit au hasard parmi les actions permises, lancé sur un grand nombre de graines. Il vérifie des invariants à chaque pas (jamais deux unités sur une case, points entre 0 et le maximum, partie terminée au tour 7 au plus tard, même graine même partie) et affiche, par composition d'équipage, le taux de victoire, les causes de défaite et le tour moyen de défaite. Ce joueur aléatoire doit perdre presque toujours ; s'il gagne souvent, le jeu est trop facile.

## 6. Hors périmètre

À ne pas construire dans le prototype : carte de nœuds, événements, améliorations, progression entre les parties, effets propres à chaque système, cloisons et portes, sas, plusieurs types d'intrus, plusieurs vaisseaux, animations élaborées, sons, sauvegarde, version mobile.

Si la boucle se révèle amusante, les suites naturelles sont, dans cet ordre : un effet par système (l'oxygène, le bouclier et le pilotage changent les règles quand ils tombent), des cloisons et un sas pour éjecter les intrus, puis une suite de rencontres reliées par une carte et des événements, à la manière de FTL.

## 7. Choix par défaut à confirmer en jouant

Ces points n'ont pas été discutés ; ils ont été tranchés pour que les règles soient complètes. Chacun peut être changé sans toucher au reste.

- Les systèmes sont des obstacles et n'ont pas d'effet propre.
- La défaite : moteur détruit, ou deux systèmes détruits, ou équipage entièrement hors de combat.
- Les salves visent un système une fois sur trois. Dans la simulation, sans cette règle, trois gestes par tour suffisaient à gagner à tous les coups sans jamais réparer.
- Le feu se propage d'autant plus vite qu'il est étendu.
- Seule l'attaque d'un intrus est annoncée ; son déplacement a lieu juste avant, comme dans Into the Breach.
- Frapper un équipier le déplace sans le blesser, sauf heurt ou feu.
- La zone du pompier est une croix de 5 cases.
- Toutes les valeurs de la section 2.11, en particulier les déplacements de 4 et 2 cases.

## 8. Premier prompt

À coller dans Claude Code, lancé dans un dossier vide qui contient ce fichier.

```
Lis README.md en entier : c'est la référence du projet.

Avant d'écrire du code :
1. Signale-moi toute ambiguïté ou contradiction dans les règles de la section 2 et pose-moi tes questions.
2. Propose l'arborescence et la forme de l'objet d'état.
3. Crée un fichier CLAUDE.md qui résume les règles d'architecture, les commandes et les conventions de langue.

Ensuite, réalise uniquement l'étape 1 de la section 5. Lance les tests, puis dis-moi comment démarrer le jeu et quoi essayer. N'entame pas l'étape suivante sans mon accord.
```
