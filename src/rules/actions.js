// Phase 2 : déplacements et gestes de l'équipage (sections 2.3 à 2.6).
// Étape 1 du prototype : déplacements seulement.

import { ROLES, VALUES } from './config.js';
import { inBounds, reachable, samePos } from './grid.js';

export function unitAt(state, pos) {
  return state.units.find((u) => samePos(u.pos, pos)) ?? null;
}

export function systemAt(state, pos) {
  return Object.keys(state.systems).find((k) => samePos(state.systems[k].pos, pos)) ?? null;
}

export function isOnFire(state, pos) {
  return inBounds(pos) && state.fire[pos.y][pos.x];
}

export function findUnit(state, unitId) {
  return state.units.find((u) => u.id === unitId) ?? null;
}

export function moveRange(unit) {
  if (unit.kind === 'intruder') return VALUES.move.intruder;
  return VALUES.move[ROLES[unit.role].type];
}

// Un membre a fini son tour quand il a fait un geste ou, tant que les gestes
// n'existent pas (étape 1), dès qu'il s'est déplacé.
export function isFinished(unit) {
  return unit.acted || unit.moved;
}

// Cases qu'un membre d'équipage peut atteindre par un déplacement volontaire (section 2.3).
// La case de départ n'en fait pas partie ; sortir d'une case en feu est toujours possible.
export function crewMoveTargets(state, unitId) {
  const unit = findUnit(state, unitId);
  if (!unit || unit.kind !== 'crew' || state.phase !== 'player' || unit.moved || unit.acted) {
    return [];
  }
  const fireImmune = ROLES[unit.role].fireImmune;
  const canEnter = (pos) => {
    if (systemAt(state, pos)) return false;
    if (isOnFire(state, pos) && !fireImmune) return false;
    const other = unitAt(state, pos);
    // Un équipier se traverse ; un intrus bloque.
    return !other || other.kind === 'crew';
  };
  const canStop = (pos) => !unitAt(state, pos);
  return reachable(unit.pos, moveRange(unit), canEnter, canStop).map((r) => r.pos);
}

export function moveCrew(state, unitId, target) {
  const allowed = crewMoveTargets(state, unitId);
  if (!allowed.some((p) => samePos(p, target))) {
    throw new Error('Déplacement interdit.');
  }
  const next = structuredClone(state);
  const unit = findUnit(next, unitId);
  unit.pos = { x: target.x, y: target.y };
  unit.moved = true;
  return next;
}
