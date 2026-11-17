// Lectures de l'état et petites opérations partagées par les phases.
// Les fonctions qui modifient (`set…`, `damage…`, `removeDead`, `checkDefeat`) travaillent
// sur une copie déjà faite par l'appelant : les règles publiques restent pures.

import { ROLES, SYSTEMS, DIRECTIONS } from './config.js';
import { inBounds, samePos, cellName, allPositions, step } from './grid.js';

export function unitAt(state, pos) {
  return state.units.find((u) => samePos(u.pos, pos)) ?? null;
}

export function systemAt(state, pos) {
  return Object.keys(state.systems).find((k) => samePos(state.systems[k].pos, pos)) ?? null;
}

export function findUnit(state, unitId) {
  return state.units.find((u) => u.id === unitId) ?? null;
}

export function isOnFire(state, pos) {
  return inBounds(pos) && state.fire[pos.y][pos.x];
}

export function burningCells(state) {
  return allPositions().filter((p) => state.fire[p.y][p.x]);
}

export function isDestroyed(system) {
  return system.hp <= 0;
}

export function isFireImmune(unit) {
  return unit.kind === 'crew' && ROLES[unit.role].fireImmune;
}

// Nom lisible d'une unité pour le journal : « le pompier », « l'intrus ».
export function unitLabel(unit) {
  if (unit.kind === 'intruder') return 'l\'intrus';
  const name = ROLES[unit.role].name.toLowerCase();
  return /^[aeiouéè]/.test(name) ? `l'${name}` : `le ${name}`;
}

export function systemLabel(key) {
  const name = SYSTEMS[key].name;
  return /^[aeiouéè]/.test(name) ? `l'${name}` : `le ${name}`;
}

// Systèmes non détruits adjacents à `pos`, avec la direction, dans l'ordre haut, droite, bas, gauche.
export function adjacentSystems(state, pos) {
  return DIRECTIONS
    .map((dir) => ({ dir, key: systemAt(state, step(pos, dir)) }))
    .filter(({ key }) => key && !isDestroyed(state.systems[key]));
}

export function adjacentCrew(state, pos) {
  return DIRECTIONS
    .map((dir) => ({ dir, unit: unitAt(state, step(pos, dir)) }))
    .filter(({ unit }) => unit && unit.kind === 'crew');
}

export function intruders(state) {
  return state.units.filter((u) => u.kind === 'intruder');
}

export function setFire(state, pos, burning) {
  state.fire[pos.y][pos.x] = burning;
}

function log(state, text) {
  state.log.push({ turn: state.turn, text });
}

export function addLog(state, text) {
  log(state, text);
}

export function damageUnit(state, unit, amount, reason) {
  unit.hp = Math.max(0, unit.hp - amount);
  log(state, `${capitalize(unitLabel(unit))} en ${cellName(unit.pos)} perd ${amount} PV (${reason}).`);
}

export function damageSystem(state, key, amount, reason) {
  const sys = state.systems[key];
  if (isDestroyed(sys)) return;
  sys.hp = Math.max(0, sys.hp - amount);
  log(state, `${capitalize(systemLabel(key))} perd ${amount} point${amount > 1 ? 's' : ''} (${reason}).`
    + (isDestroyed(sys) ? ' Il est détruit.' : ''));
}

export function directionName(key) {
  return DIRECTIONS.find((d) => d.key === key).name;
}

// Retire les unités à 0 point de vie (une unité à 0 quitte la grille aussitôt).
export function removeDead(state) {
  for (const unit of state.units.filter((u) => u.hp <= 0)) {
    log(state, `${capitalize(unitLabel(unit))} en ${cellName(unit.pos)} est hors de combat.`);
  }
  state.units = state.units.filter((u) => u.hp > 0);
}

// Vérifie les conditions de défaite (section 2.2) ; si l'une est vraie, la partie s'arrête.
export function checkDefeat(state) {
  if (state.phase === 'over') return state;
  let cause = null;
  const destroyed = Object.values(state.systems).filter(isDestroyed).length;
  if (isDestroyed(state.systems.engine)) cause = 'le moteur est détruit';
  else if (destroyed >= 2) cause = 'deux systèmes sont détruits';
  else if (!state.units.some((u) => u.kind === 'crew')) cause = 'plus aucun membre d\'équipage n\'est debout';
  if (cause) {
    state.phase = 'over';
    state.outcome = { result: 'defeat', cause };
    log(state, `Défaite : ${cause}.`);
  }
  return state;
}

export function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
