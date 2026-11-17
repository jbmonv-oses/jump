// Phase 1 : annonces (section 2.5).
// Ordre : intrus (déplacement puis annonce d'attaque), salves, propagations, abordage.
// Seule phase, avec la mise en place, qui tire au sort (salves, propagations, abordage).

import { VALUES } from './config.js';
import { readMap, neighbors, samePos, cellName, findPath } from './grid.js';
import { nextInt, pick } from './rng.js';
import {
  unitAt, systemAt, isOnFire, isDestroyed, burningCells, systemLabel, addLog,
  adjacentSystems, adjacentCrew, intruders, directionName,
} from './board.js';

export function announce(state) {
  const next = structuredClone(state);
  next.announcements = { volleys: [], spreads: [], boarding: null };
  for (const unit of next.units) {
    unit.scorched = false;
    if (unit.kind === 'crew') {
      unit.moved = false;
      unit.acted = false;
    }
  }
  addLog(next, `— Tour ${next.turn} —`);
  moveIntruders(next);
  announceVolleys(next);
  announceSpreads(next);
  announceBoarding(next);
  const a = next.announcements;
  if (!a.volleys.length && !a.spreads.length && !a.boarding && !intruders(next).some((i) => i.attackDir)) {
    addLog(next, 'Aucune menace annoncée.');
  }
  next.phase = 'player';
  return next;
}

// Intrus (section 2.9), dans l'ordre d'arrivée : déplacement puis annonce d'attaque.
function moveIntruders(state) {
  for (const intruder of intruders(state)) {
    const path = intruderPath(state, intruder);
    if (path && path.length > 0) {
      const steps = path.slice(0, VALUES.move.intruder);
      intruder.pos = steps[steps.length - 1];
    }
    const target = adjacentSystems(state, intruder.pos)[0] ?? adjacentCrew(state, intruder.pos)[0] ?? null;
    intruder.attackDir = target ? target.dir.key : null;
    if (target) {
      addLog(state, `L'intrus en ${cellName(intruder.pos)} frappe vers ${directionName(intruder.attackDir)}.`);
    }
  }
}

// Chemin vers la case libre et sans feu la plus proche adjacente à un système non détruit,
// sinon adjacente à un membre d'équipage. [] : il est déjà en place ; null : rien d'accessible.
export function intruderPath(state, intruder) {
  const canEnter = (p) => !systemAt(state, p) && !isOnFire(state, p) && !unitAt(state, p);
  const free = (p) => samePos(p, intruder.pos) || canEnter(p);
  const nearSystem = (p) => free(p) && adjacentSystems(state, p).length > 0;
  const nearCrew = (p) => free(p) && adjacentCrew(state, p).length > 0;
  // Déjà adjacent à un système : il ne bouge pas, même sur une case en feu.
  if (adjacentSystems(state, intruder.pos).length > 0) return [];
  return findPath(intruder.pos, canEnter, nearSystem)
    ?? (adjacentCrew(state, intruder.pos).length > 0 ? [] : findPath(intruder.pos, canEnter, nearCrew));
}

// Abordage (section 2.9) : case de sol sans unité, sans feu, ni visée par une salve
// ni cible d'une propagation ce tour-ci.
function announceBoarding(state) {
  if (!VALUES.boardingTurns.includes(state.turn)) return;
  const { volleys, spreads } = state.announcements;
  const cells = readMap().floor.filter((p) => !unitAt(state, p) && !isOnFire(state, p)
    && !volleys.some((v) => samePos(v.pos, p)) && !spreads.some((s) => samePos(s.to, p)));
  if (cells.length === 0) {
    addLog(state, 'Aucune case libre : l\'abordage n\'a pas lieu.');
    return;
  }
  const r = pick(state.rng, cells);
  state.rng = r.rng;
  state.announcements.boarding = { pos: r.value };
  addLog(state, `Abordage annoncé en ${cellName(r.value)}.`);
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
