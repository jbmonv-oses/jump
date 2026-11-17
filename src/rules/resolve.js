// Phase 3 : résolution (section 2.5), dans un ordre fixe :
// 1. attaques des intrus, 2. dégâts du feu, 3. salves,
// 4. propagation du feu, 5. arrivée de l'intrus annoncé.
// Aucun tirage au sort ici. La défaite est vérifiée après chaque étape.

import { VALUES, DIRECTIONS } from './config.js';
import { neighbors, cellName, readMap, manhattan, step } from './grid.js';
import { announce } from './announce.js';
import {
  unitAt, systemAt, isOnFire, isDestroyed, isFireImmune, setFire, intruders, directionName,
  damageUnit, damageSystem, removeDead, checkDefeat, addLog,
} from './board.js';

const STEPS = [intruderAttacks, fireDamage, volleys, fireSpread, boardingArrival];

// Étape 1 : chaque intrus encore debout frappe la case dans la direction annoncée,
// depuis sa position actuelle. Ordre d'arrivée.
function intruderAttacks(state) {
  for (const intruder of intruders(state)) {
    if (intruder.hp <= 0 || !intruder.attackDir) continue;
    const dir = DIRECTIONS.find((d) => d.key === intruder.attackDir);
    const target = step(intruder.pos, dir);
    const reason = `attaque de l'intrus en ${cellName(intruder.pos)}`;
    const key = systemAt(state, target);
    const unit = unitAt(state, target);
    if (key && !isDestroyed(state.systems[key])) damageSystem(state, key, VALUES.damage.intruderAttack, reason);
    else if (unit) damageUnit(state, unit, VALUES.damage.intruderAttack, reason);
    else addLog(state, `L'intrus en ${cellName(intruder.pos)} frappe vers ${directionName(intruder.attackDir)} dans le vide.`);
    removeDead(state);
  }
}

// Étape 5 : l'intrus annoncé apparaît. Si la case est occupée ou en feu, il apparaît sur la
// case de sol libre et sans feu la plus proche (à égalité, ordre de lecture).
function boardingArrival(state) {
  const boarding = state.announcements.boarding;
  if (!boarding) return;
  const free = (p) => !unitAt(state, p) && !isOnFire(state, p);
  let pos = boarding.pos;
  if (!free(pos)) {
    const candidates = readMap().floor.filter(free); // déjà en ordre de lecture
    if (candidates.length === 0) {
      addLog(state, 'Aucune case libre : l\'intrus ne peut pas aborder.');
      return;
    }
    pos = candidates.reduce((best, p) => (manhattan(p, boarding.pos) < manhattan(best, boarding.pos) ? p : best));
  }
  state.units.push({
    id: `i${state.nextUnitId}`, kind: 'intruder', pos, hp: VALUES.intruderHp, attackDir: null, scorched: false,
  });
  state.nextUnitId += 1;
  addLog(state, `Un intrus aborde en ${cellName(pos)}.`);
}

export function resolveTurn(state) {
  if (state.phase !== 'player') throw new Error('La résolution suit la phase du joueur.');
  const next = structuredClone(state);
  next.phase = 'resolve';
  addLog(next, `Résolution du tour ${next.turn}.`);
  for (const step of STEPS) {
    step(next);
    removeDead(next);
    checkDefeat(next);
    if (next.phase === 'over') return next;
  }
  return next;
}

// Étape 2 : chaque unité sur une case en feu perd 1 PV (sauf le pompier, et sauf une unité
// déjà brûlée par un recul ce tour-ci) ; chaque système non détruit adjacent à au moins
// une case en feu perd 1 point.
function fireDamage(state) {
  for (const unit of state.units) {
    if (isOnFire(state, unit.pos) && !isFireImmune(unit) && !unit.scorched) {
      damageUnit(state, unit, VALUES.damage.fire, 'feu');
    }
  }
  for (const [key, sys] of Object.entries(state.systems)) {
    if (!isDestroyed(sys) && neighbors(sys.pos).some((p) => isOnFire(state, p))) {
      damageSystem(state, key, VALUES.damage.fire, 'feu');
    }
  }
}

// Étape 3 : salve sur un système : −2 points ; sur une case de sol : l'unité qui s'y trouve
// perd 2 PV (pompier compris) et la case s'enflamme.
function volleys(state) {
  for (const { pos } of state.announcements.volleys) {
    const key = systemAt(state, pos);
    if (key) {
      damageSystem(state, key, VALUES.damage.volley, `salve en ${cellName(pos)}`);
      continue;
    }
    const unit = unitAt(state, pos);
    if (unit) damageUnit(state, unit, VALUES.damage.volley, 'salve');
    setFire(state, pos, true);
    addLog(state, `La salve embrase ${cellName(pos)}.`);
  }
}

// Étape 4 : chaque propagation non annulée dont la source brûle encore enflamme sa cible,
// même si une unité s'y trouve.
function fireSpread(state) {
  for (const spread of state.announcements.spreads) {
    if (spread.cancelled || !isOnFire(state, spread.from) || isOnFire(state, spread.to)) continue;
    setFire(state, spread.to, true);
    addLog(state, `Le feu gagne ${cellName(spread.to)}.`);
  }
}

// Termine la phase du joueur : résolution, puis tour suivant ou fin de partie.
export function endTurn(state) {
  const resolved = resolveTurn(state);
  if (resolved.phase === 'over') return resolved;
  if (resolved.turn >= VALUES.turns) {
    resolved.phase = 'over';
    resolved.outcome = { result: 'victory', cause: null };
    addLog(resolved, 'Le moteur de saut est chargé : saut !');
    return resolved;
  }
  resolved.turn += 1;
  return announce(resolved);
}
