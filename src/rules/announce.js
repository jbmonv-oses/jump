// Phase 1 : annonces (section 2.5).
// Ordre : intrus (déplacement puis annonce, étape 3), salves, propagations, abordage (étape 3).
// Seule phase, avec la mise en place, qui tire au sort.

import { VALUES } from './config.js';
import { readMap, neighbors, samePos, cellName } from './grid.js';
import { nextInt, pick } from './rng.js';
import { unitAt, systemAt, isOnFire, isDestroyed, burningCells, systemLabel, addLog } from './board.js';

export function announce(state) {
  const next = structuredClone(state);
  next.announcements = { volleys: [], spreads: [], boarding: null };
  for (const unit of next.units) {
    if (unit.kind === 'crew') {
      unit.moved = false;
      unit.acted = false;
    }
  }
  addLog(next, `— Tour ${next.turn} —`);
  announceVolleys(next);
  announceSpreads(next);
  if (next.announcements.volleys.length === 0 && next.announcements.spreads.length === 0) {
    addLog(next, 'Aucune menace annoncée.');
  }
  next.phase = 'player';
  return next;
}

// Salves (section 2.8). Une salve vise un système non détruit (1 chance sur 3)
// ou une case de sol sans feu et sans unité ; jamais deux fois la même case.
function announceVolleys(state) {
  const count = VALUES.volleysPerTurn[state.turn - 1] ?? 0;
  const { numerator, denominator } = VALUES.volleySystemChance;
  const floor = readMap().floor;
  const targeted = (pos) => state.announcements.volleys.some((v) => samePos(v.pos, pos));

  for (let i = 0; i < count; i++) {
    const systems = Object.keys(state.systems)
      .filter((k) => !isDestroyed(state.systems[k]) && !targeted(state.systems[k].pos));
    const cells = floor.filter((p) => !isOnFire(state, p) && !unitAt(state, p) && !targeted(p));

    const roll = nextInt(state.rng, denominator);
    state.rng = roll.rng;
    let aimSystem = roll.value < numerator;
    if (systems.length === 0) aimSystem = false;
    if (cells.length === 0) aimSystem = true;
    if (aimSystem && systems.length === 0) break; // plus aucune cible possible

    if (aimSystem) {
      const r = pick(state.rng, systems);
      state.rng = r.rng;
      const pos = state.systems[r.value].pos;
      state.announcements.volleys.push({ pos });
      addLog(state, `Salve sur ${cellName(pos)}, ${systemLabel(r.value)}.`);
    } else {
      const r = pick(state.rng, cells);
      state.rng = r.rng;
      state.announcements.volleys.push({ pos: r.value });
      addLog(state, `Salve sur ${cellName(r.value)}.`);
    }
  }
}

// Propagations du feu (section 2.7) : ⌈F / 3⌉ paires source → cible,
// tirées une à une parmi les paires encore compatibles (ni même source, ni même cible).
function announceSpreads(state) {
  const sources = burningCells(state);
  const wanted = Math.ceil(sources.length / VALUES.fireSpreadDivisor);
  let pairs = [];
  for (const from of sources) {
    for (const to of neighbors(from)) {
      if (!systemAt(state, to) && !isOnFire(state, to)) pairs.push({ from, to });
    }
  }
  for (let i = 0; i < wanted && pairs.length > 0; i++) {
    const r = pick(state.rng, pairs);
    state.rng = r.rng;
    const { from, to } = r.value;
    state.announcements.spreads.push({ from, to, cancelled: false });
    addLog(state, `Le feu passe de ${cellName(from)} à ${cellName(to)}.`);
    pairs = pairs.filter((p) => !samePos(p.from, from) && !samePos(p.to, to));
  }
}
