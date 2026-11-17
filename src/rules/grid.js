// Géométrie de la grille : coordonnées, noms de cases, adjacences, chemins.
// Une position est { x, y } : x = colonne (0 = A), y = ligne (0 = ligne 1).

import { MAP, MAP_SYMBOLS, DIRECTIONS } from './config.js';

export const WIDTH = MAP[0].length;
export const HEIGHT = MAP.length;

const COLUMN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function cellName({ x, y }) {
  return `${COLUMN_LETTERS[x]}${y + 1}`;
}

export function parseCell(name) {
  return { x: COLUMN_LETTERS.indexOf(name[0]), y: Number(name.slice(1)) - 1 };
}

export function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function inBounds({ x, y }) {
  return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;
}

// Voisins orthogonaux dans l'ordre haut, droite, bas, gauche.
export function neighbors(pos) {
  return DIRECTIONS
    .map((d) => ({ x: pos.x + d.dx, y: pos.y + d.dy }))
    .filter(inBounds);
}

export function isAdjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

// Toutes les positions dans l'ordre de lecture (haut en bas, gauche à droite).
export function allPositions() {
  const out = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) out.push({ x, y });
  }
  return out;
}

// Lecture de la carte : systèmes, cases de départ, cases de sol (ordre de lecture).
export function readMap() {
  const systems = {};
  const crewStarts = {};
  const floor = [];
  for (const pos of allPositions()) {
    const ch = MAP[pos.y][pos.x];
    if (MAP_SYMBOLS.systems[ch]) {
      systems[MAP_SYMBOLS.systems[ch]] = pos;
    } else {
      floor.push(pos);
      if (MAP_SYMBOLS.crewStarts.includes(ch)) crewStarts[ch] = pos;
    }
  }
  return {
    systems,
    crewStarts: MAP_SYMBOLS.crewStarts.map((ch) => crewStarts[ch]),
    floor,
  };
}

// Direction (élément de DIRECTIONS) qui mène de `from` à la case adjacente `to`.
export function directionBetween(from, to) {
  return DIRECTIONS.find((d) => from.x + d.dx === to.x && from.y + d.dy === to.y) ?? null;
}

// Parcours en largeur à partir de `start`.
// `canEnter(pos)` : la case peut-elle être traversée ?
// `canStop(pos)`  : la case peut-elle être une destination ?
// Rend la liste des destinations possibles avec leur distance, dans l'ordre de découverte
// (les voisins sont explorés dans l'ordre haut, droite, bas, gauche).
export function reachable(start, maxSteps, canEnter, canStop) {
  const key = (p) => p.y * WIDTH + p.x;
  const seen = new Set([key(start)]);
  const result = [];
  let frontier = [start];
  for (let step = 1; step <= maxSteps && frontier.length > 0; step++) {
    const next = [];
    for (const pos of frontier) {
      for (const n of neighbors(pos)) {
        if (seen.has(key(n)) || !canEnter(n)) continue;
        seen.add(key(n));
        next.push(n);
        if (canStop(n)) result.push({ pos: n, distance: step });
      }
    }
    frontier = next;
  }
  return result;
}
