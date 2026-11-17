// Phase 2 : déplacements et gestes de l'équipage (sections 2.3 à 2.6).
// Gestes disponibles à l'étape 2 : éteindre (simple et fort).

import { ROLES, VALUES } from './config.js';
import { inBounds, neighbors, reachable, samePos, cellName, directionBetween, step } from './grid.js';
import {
  unitAt, systemAt, isOnFire, findUnit, setFire, addLog, checkDefeat, unitLabel, capitalize,
  isFireImmune, damageUnit, damageSystem, removeDead,
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
  strike: { targets: strikeTargets, apply: applyStrike },
};

// Gestes du rôle déjà implantés (réparer : étape 4).
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

// Frapper (section 2.6) : une unité adjacente, intrus ou équipier.
function strikeTargets(state, unit) {
  return neighbors(unit.pos).filter((p) => unitAt(state, p));
}

// Trajet prévu du recul d'une cible frappée par `striker`, case par case.
// Rend { path, collision } : `path` = cases traversées ; `collision` = obstacle heurté
// ({ kind: 'hull' } | { kind: 'system', key } | { kind: 'unit', id }) ou null.
// Ne tient pas compte des points de vie : la cible doit être encore debout.
export function knockback(state, striker, targetPos) {
  const dir = directionBetween(striker.pos, targetPos);
  const distance = ROLES[striker.role].strong ? VALUES.knockback.strong : VALUES.knockback.simple;
  const path = [];
  let pos = targetPos;
  for (let i = 0; i < distance; i++) {
    const next = step(pos, dir);
    let collision = null;
    if (!inBounds(next)) collision = { kind: 'hull' };
    else if (systemAt(state, next)) collision = { kind: 'system', key: systemAt(state, next) };
    else if (unitAt(state, next)) collision = { kind: 'unit', id: unitAt(state, next).id };
    if (collision) return { path, collision };
    path.push(next);
    pos = next;
  }
  return { path, collision: null };
}

// Cases à surligner au survol d'une cible de frappe : la cible et son trajet de recul.
export function strikePreview(state, unitId, targetPos) {
  const striker = findUnit(state, unitId);
  return [targetPos, ...knockback(state, striker, targetPos).path];
}

function applyStrike(state, striker, targetPos) {
  const target = unitAt(state, targetPos);
  const who = capitalize(unitLabel(striker));
  addLog(state, `${who} frappe ${unitLabel(target)} en ${cellName(targetPos)}.`);

  // 1. Un intrus perd 1 PV ; un équipier est seulement bousculé.
  if (target.kind === 'intruder') {
    damageUnit(state, target, VALUES.damage.strike, 'coup');
    if (target.hp <= 0) {
      removeDead(state);
      return;
    }
  }

  // 2-3. Recul, interrompu par un heurt.
  const { path, collision } = knockback(state, striker, targetPos);
  if (path.length > 0) {
    target.pos = path[path.length - 1];
    addLog(state, `${capitalize(unitLabel(target))} recule en ${cellName(target.pos)}.`);
  }
  if (collision) {
    damageUnit(state, target, VALUES.damage.collision, 'heurt');
    if (collision.kind === 'system') damageSystem(state, collision.key, VALUES.damage.collision, 'heurt');
    if (collision.kind === 'unit') {
      damageUnit(state, findUnit(state, collision.id), VALUES.damage.collision, 'heurt');
    }
    if (collision.kind === 'hull') addLog(state, 'Heurt contre la coque.');
  }

  // 4. Fin du recul sur une case en feu (seulement si la cible a bougé) : −1 PV, sauf le pompier.
  // Elle ne reprendra pas de dégât du feu à la résolution de ce tour.
  if (target.hp > 0 && path.length > 0 && isOnFire(state, target.pos) && !isFireImmune(target)) {
    damageUnit(state, target, VALUES.damage.fire, 'feu');
    target.scorched = true;
  }
  removeDead(state);
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
