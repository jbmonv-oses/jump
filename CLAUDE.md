# CLAUDE.md

Prototype « Sept tours avant le saut ». La référence est `README.MD` : règles exactes en section 2, interface en section 3, étapes en section 5. En cas de règle manquante ou contradictoire, poser la question plutôt que deviner.

## Commandes

- `npm start` : sert le dossier sur http://localhost:8080 (variable `PORT` pour changer). Les modules ES ne se chargent pas en ouvrant `index.html` directement.
- `npm test` : lance `node --test` (lanceur intégré). Les fichiers de test s'appellent `tests/*.test.js` ; `tests/helpers.js` fabrique des situations.
- `npm run simulate` : parties automatiques (étape 5, encore vide).

Node 20 ou plus. Aucune dépendance, aucun framework, aucune étape de compilation.

## Règles d'architecture

1. L'état de la partie est un objet simple, sérialisable en JSON, qui contient tout (grille, unités, annonces, tour, phase, état du générateur).
2. Les règles sont des fonctions pures : état en entrée, nouvel état en sortie (`structuredClone`), l'ancien n'est jamais modifié. « Recommencer le tour » = reprendre l'état gardé au début de la phase 2.
3. `src/rules/` n'importe rien de `src/ui/` et n'accède pas au DOM. `src/ui/` affiche l'état et transmet les actions, sans aucune règle de jeu : pour savoir ce qui est permis, il appelle `src/rules/` (ex. `crewMoveTargets`).
4. Aucune valeur chiffrée de réglage hors de `src/rules/config.js` (carte, rôles, valeurs de la section 2.11).
5. Chaque règle de la section 2 a au moins un test, cas limites compris (liste en section 4 du README).
6. Tout le hasard passe par `src/rules/rng.js` (état = entier 32 bits dans `state.rng`). Tirages seulement à la mise en place et en phase 1, dans l'ordre salves, propagations, abordage. Jamais de `Math.random` dans les règles.

## Conventions

- Interface, journal, messages d'erreur et commentaires en **français**.
- Noms de variables, fonctions, fichiers et clés d'état en **anglais** (`firefighter`, `extinguish`, `volleys`…).
- Positions : `{ x, y }`, x = colonne (0 = A), y = ligne (0 = ligne 1). `cellName` / `parseCell` convertissent vers « D3 ».
- Ordre de départage partout : haut, droite, bas, gauche (`DIRECTIONS` dans `config.js`, `neighbors` le respecte).

## Forme de l'état

```js
{
  seed, rng,                 // graine affichée, état du générateur
  turn,                      // 1 à 7
  phase,                     // 'announce' | 'player' | 'resolve' | 'over'
  outcome,                   // null | { result: 'victory' | 'defeat', cause }
  systems: { engine: { pos, hp }, shield, oxygen, piloting },
  units: [                   // ordre du tableau = ordre d'arrivée
    { id: 'c1', kind: 'crew', role, pos, hp, moved, acted },
    { id: 'i1', kind: 'intruder', pos, hp, attackDir },
  ],
  nextUnitId,
  fire,                      // booléens fire[y][x]
  announcements: { volleys: [], spreads: [], boarding: null },
  log: [{ turn, text }],
}
```

## Méthode de travail

- Une étape de la section 5 à la fois. À la fin : tests verts, jeu lancé, court message « quoi essayer ». Attendre l'accord avant l'étape suivante.
- Un commit git à la fin de chaque étape validée par l'utilisateur.
- Hors périmètre : section 6 du README.
