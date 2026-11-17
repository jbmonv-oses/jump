// Phase 3 : résolution (section 2.5), dans un ordre fixe :
// 1. attaques des intrus (étape 3), 2. dégâts du feu, 3. salves,
// 4. propagation du feu, 5. arrivée de l'intrus annoncé (étape 3).
// Aucun tirage au sort ici. La défaite est vérifiée après chaque étape.

import { VALUES } from './config.js';
import { neighbors, cellName } from './grid.js';
import { announce } from './announce.js';
import {
  unitAt, systemAt, isOnFire, isDestroyed, isFireImmune, setFire,
  damageUnit, damageSystem, removeDead, checkDefeat, addLog,
} from './board.js';

const STEPS = [fireDamage, volleys, fireSpread];

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

// Étape 2 : chaque unité sur une case en feu perd 1 PV (sauf le pompier) ;
// chaque système non détruit adjacent à au moins une case en feu perd 1 point.
function fireDamage(state) {
  for (const unit of state.units) {
    if (isOnFire(state, unit.pos) && !isFireImmune(unit)) {
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
