// Outils pour fabriquer des situations de test.

import { setupGame, emptyFireGrid, emptyAnnouncements } from '../src/rules/state.js';
import { parseCell, cellName } from '../src/rules/grid.js';

// Situation en phase du joueur, sans feu ni annonce sauf mention contraire.
// Équipage par défaut : c1 pompier (C3), c2 garde (D3), c3 technicien (E3).
// - positions : { c1: 'A1' }       - hp : { c1: 1 }
// - fires : ['C1']                  - systems : { engine: 2 } (points d'état)
// - intruders : ['E1']              - volleys : ['D2', 'A5']
// - spreads : [['C1', 'C2']]        - turn : 1
export function makeState({
  crew = ['firefighter', 'guard', 'technician'], positions = {}, hp = {}, fires = [],
  intruders = [], systems = {}, volleys = [], spreads = [], boarding = null, turn = 1, seed = 1,
} = {}) {
  const state = setupGame({ seed, crew });
  state.phase = 'player';
  state.turn = turn;
  state.fire = emptyFireGrid();
  for (const name of fires) {
    const p = parseCell(name);
    state.fire[p.y][p.x] = true;
  }
  for (const [id, name] of Object.entries(positions)) {
    state.units.find((u) => u.id === id).pos = parseCell(name);
  }
  // Intrus : 'E1' ou { at: 'E1', dir: 'up', hp: 1 }, dans l'ordre d'arrivée.
  for (const entry of intruders) {
    const { at, dir = null, hp: life = 2 } = typeof entry === 'string' ? { at: entry } : entry;
    state.units.push({
      id: `i${state.nextUnitId}`, kind: 'intruder', pos: parseCell(at), hp: life, attackDir: dir, scorched: false,
    });
    state.nextUnitId += 1;
  }
  for (const [id, value] of Object.entries(hp)) state.units.find((u) => u.id === id).hp = value;
  for (const [key, value] of Object.entries(systems)) state.systems[key].hp = value;
  state.announcements = emptyAnnouncements();
  state.announcements.volleys = volleys.map((n) => ({ pos: parseCell(n) }));
  state.announcements.spreads = spreads.map(([a, b]) => ({ from: parseCell(a), to: parseCell(b), cancelled: false }));
  if (boarding) state.announcements.boarding = { pos: parseCell(boarding) };
  return state;
}

export function names(list) {
  return list.map(cellName).sort();
}

export function burning(state) {
  const out = [];
  state.fire.forEach((row, y) => row.forEach((f, x) => { if (f) out.push(cellName({ x, y })); }));
  return out.sort();
}

export function unitHp(state, id) {
  return state.units.find((u) => u.id === id)?.hp ?? 0;
}
