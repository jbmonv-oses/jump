// Outils pour fabriquer des situations de test.

import { createGame, emptyFireGrid } from '../src/rules/state.js';
import { parseCell, cellName } from '../src/rules/grid.js';

// Partie sans feu, équipage donné, unités éventuellement replacées.
// `positions` : { c1: 'A1', ... } ; `fires` : ['C1', ...] ; `intruders` : ['E1', ...]
export function makeState({ crew = ['firefighter', 'guard', 'technician'], positions = {}, fires = [], intruders = [], seed = 1 } = {}) {
  const state = createGame({ seed, crew });
  state.fire = emptyFireGrid();
  for (const name of fires) {
    const p = parseCell(name);
    state.fire[p.y][p.x] = true;
  }
  for (const [id, name] of Object.entries(positions)) {
    state.units.find((u) => u.id === id).pos = parseCell(name);
  }
  for (const name of intruders) {
    state.units.push({
      id: `i${state.nextUnitId}`, kind: 'intruder', pos: parseCell(name), hp: 2, attackDir: null,
    });
    state.nextUnitId += 1;
  }
  return state;
}

export function names(list) {
  return list.map(cellName).sort();
}
