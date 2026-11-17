// Phase 2 : déplacements et gestes de l'équipage (sections 2.3 à 2.6).
// Gestes disponibles à l'étape 2 : éteindre (simple et fort).

import { ROLES, VALUES } from './config.js';
import { inBounds, neighbors, reachable, samePos, cellName } from './grid.js';
import {
  unitAt, systemAt, isOnFire, findUnit, setFire, addLog, checkDefeat, unitLabel, capitalize,
} from './board.js';

export { unitAt, systemAt, isOnFire, findUnit } from './board.js';

export function moveRange(unit) {
  if (unit.kind === 'intruder') return VALUES.move.intruder;
  return VALUES.move[ROLES[unit.role].type];
}

// Un membre a fini son tour quand il a fait un geste ou qu'on l'a déclaré terminé.
export function isFinished(unit) {
  return unit.acted;
}

function activeCrew(state, unitId) {
  const unit = findUnit(state, unitId);
  if (!unit || unit.kind !== 'crew' || state.phase !== 'player' || unit.acted) return null;
  return unit;
}

// Cases qu'un membre d'équipage peut atteindre par un déplacement volontaire (section 2.3).
// La case de départ n'en fait pas partie ; sortir d'une case en feu est toujours possible.
export function crewMoveTargets(state, unitId) {
  const unit = activeCrew(state, unitId);
  if (!unit || unit.moved) return [];
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

// Déclare un membre terminé sans geste (il est grisé).
export function finishCrew(state, unitId) {
  if (!activeCrew(state, unitId)) throw new Error('Ce membre ne peut plus agir.');
  const next = structuredClone(state);
  findUnit(next, unitId).acted = true;
  return next;
}

// ——— Gestes ———

const GESTURE_RULES = {
  extinguish: { targets: extinguishTargets, apply: applyExtinguish },
};

// Gestes du rôle déjà implantés (frapper : étape 3, réparer : étape 4).
export function crewGestures(state, unitId) {
  const unit = findUnit(state, unitId);
  if (!unit || unit.kind !== 'crew') return [];
  return ROLES[unit.role].gestures.filter((g) => GESTURE_RULES[g]);
}

export function gestureTargets(state, unitId, gesture) {
  const unit = activeCrew(state, unitId);
  if (!unit || !crewGestures(state, unitId).includes(gesture)) return [];
  return GESTURE_RULES[gesture].targets(state, unit);
}

export function doGesture(state, unitId, gesture, target) {
  if (!gestureTargets(state, unitId, gesture).some((p) => samePos(p, target))) {
    throw new Error('Geste impossible sur cette case.');
  }
  const next = structuredClone(state);
  const unit = findUnit(next, unitId);
  GESTURE_RULES[gesture].apply(next, unit, target);
  unit.acted = true;
  return checkDefeat(next);
}

// Éteindre, version simple : une case adjacente en feu.
// Version forte (pompier) : n'importe quelle case adjacente de la grille, système compris ;
// elle et ses 4 voisines s'éteignent.
function extinguishTargets(state, unit) {
  if (ROLES[unit.role].strong) return neighbors(unit.pos);
  return neighbors(unit.pos).filter((p) => isOnFire(state, p));
}

export function extinguishArea(unit, target) {
  if (!ROLES[unit.role].strong) return [target];
  return [target, ...neighbors(target)].filter(inBounds);
}

function applyExtinguish(state, unit, target) {
  const cells = extinguishArea(unit, target).filter((p) => isOnFire(state, p));
  for (const p of cells) setFire(state, p, false);
  addLog(state, cells.length
    ? `${capitalize(unitLabel(unit))} éteint ${cells.map(cellName).join(', ')}.`
    : `${capitalize(unitLabel(unit))} arrose ${cellName(target)}, rien ne brûlait.`);
  // Éteindre la source d'une propagation annoncée l'annule pour de bon.
  for (const spread of state.announcements.spreads) {
    if (!spread.cancelled && cells.some((p) => samePos(p, spread.from))) {
      spread.cancelled = true;
      addLog(state, `Propagation de ${cellName(spread.from)} vers ${cellName(spread.to)} annulée.`);
    }
  }
}
