import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endTurn, resolveTurn } from '../src/rules/resolve.js';
import { moveCrew, findUnit, crewMoveTargets } from '../src/rules/actions.js';
import { emptyAnnouncements } from '../src/rules/state.js';
import { parseCell } from '../src/rules/grid.js';
import { VALUES } from '../src/rules/config.js';
import { makeState, burning, unitHp } from './helpers.js';

// Passe des tours en effaçant les annonces : seul le compteur de tours avance.
function quietTurns(state, n) {
  let s = state;
  for (let i = 0; i < n; i++) {
    s = endTurn({ ...s, announcements: emptyAnnouncements(), fire: s.fire.map((r) => r.map(() => false)) });
  }
  return s;
}

// ——— Enchaînement des tours ———

test('fin du tour : tour suivant, équipage de nouveau disponible', () => {
  const s = moveCrew(makeState(), 'c3', parseCell('E2'));
  const before = JSON.stringify(s);
  const next = endTurn(s);
  assert.equal(JSON.stringify(s), before, 'l\'ancien état est intact');
  assert.equal(next.turn, 2);
  assert.equal(next.phase, 'player');
  assert.equal(findUnit(next, 'c3').moved, false);
  assert.ok(crewMoveTargets(next, 'c3').length > 0);
});

test('victoire : la résolution du tour 7 se termine sans défaite', () => {
  let s = quietTurns(makeState(), VALUES.turns - 1);
  assert.equal(s.turn, VALUES.turns);
  assert.equal(s.phase, 'player');
  s = quietTurns(s, 1);
  assert.equal(s.phase, 'over');
  assert.equal(s.outcome.result, 'victory');
});

test('après la fin de partie, plus de tour ni de déplacement', () => {
  const s = quietTurns(makeState(), VALUES.turns);
  assert.throws(() => endTurn(s));
  assert.deepEqual(crewMoveTargets(s, 'c1'), []);
});

test('la résolution ne tire rien au sort', () => {
  const s = makeState({ fires: ['A1', 'C1'], volleys: ['G5', 'D2'], spreads: [['A1', 'A2']] });
  assert.equal(resolveTurn(s).rng, s.rng);
});

// ——— Dégâts du feu (étape 2) ———

test('feu : une unité sur une case en feu perd 1 PV, sauf le pompier', () => {
  const s = resolveTurn(makeState({ positions: { c1: 'A1', c3: 'G1' }, fires: ['A1', 'G1'] }));
  assert.equal(unitHp(s, 'c1'), 3);
  assert.equal(unitHp(s, 'c3'), 2);
});

test('feu : un système adjacent perd 1 point, quel que soit le nombre de cases en feu', () => {
  // Bouclier en D2 : C2, E2 et D1 brûlent.
  const s = resolveTurn(makeState({ fires: ['C2', 'E2', 'D1'] }));
  assert.equal(s.systems.shield.hp, 3);
  assert.equal(s.systems.engine.hp, 4);
});

test('une unité à 0 PV est retirée aussitôt', () => {
  const s = resolveTurn(makeState({ positions: { c3: 'G1' }, hp: { c3: 1 }, fires: ['G1'] }));
  assert.equal(findUnit(s, 'c3'), null);
});

// ——— Salves (étape 3) ———

test('salve sur un système : −2 points', () => {
  const s = resolveTurn(makeState({ volleys: ['F3'] }));
  assert.equal(s.systems.piloting.hp, 2);
  assert.deepEqual(burning(s), []);
});

test('salve sur une unité : −2 PV, pompier compris, et la case s\'enflamme', () => {
  const s = resolveTurn(makeState({ positions: { c1: 'A1' }, volleys: ['A1', 'G5'] }));
  assert.equal(unitHp(s, 'c1'), 1);
  assert.deepEqual(burning(s), ['A1', 'G5']);
});

test('un système détruit le reste et ne descend pas sous 0', () => {
  const s = resolveTurn(makeState({ systems: { piloting: 1 }, volleys: ['F3'] }));
  assert.equal(s.systems.piloting.hp, 0);
});

test('le feu allumé par une salve ne blesse qu\'au tour suivant', () => {
  // E2 touche le bouclier (D2) ; l'unité sur E2 ne prend que la salve.
  const s = resolveTurn(makeState({ positions: { c3: 'E2' }, volleys: ['E2'] }));
  assert.equal(s.systems.shield.hp, 4);
  assert.equal(unitHp(s, 'c3'), 1);
});

// ——— Propagation (étape 4) ———

test('propagation : la cible s\'enflamme, même occupée, sans blesser ce tour-ci', () => {
  const s = resolveTurn(makeState({ positions: { c3: 'A2' }, fires: ['A1'], spreads: [['A1', 'A2']] }));
  assert.deepEqual(burning(s), ['A1', 'A2']);
  assert.equal(unitHp(s, 'c3'), 3);
});

test('propagation annulée si la source ne brûle plus', () => {
  const s = makeState({ fires: ['A1'], spreads: [['A1', 'A2']] });
  s.fire[0][0] = false;
  assert.deepEqual(burning(resolveTurn(s)), []);
});

test('une propagation annulée le reste même si une salve rallume la source', () => {
  const s = makeState({ fires: [], volleys: ['A1'], spreads: [['A1', 'A2']] });
  s.announcements.spreads[0].cancelled = true;
  assert.deepEqual(burning(resolveTurn(s)), ['A1']);
});

// ——— Défaite ———

test('défaite : moteur détruit', () => {
  const s = endTurn(makeState({ systems: { engine: 2 }, volleys: ['B3'] }));
  assert.equal(s.phase, 'over');
  assert.equal(s.outcome.result, 'defeat');
  assert.match(s.outcome.cause, /moteur/);
});

test('défaite : deux systèmes détruits', () => {
  const s = endTurn(makeState({ systems: { shield: 2, oxygen: 2 }, volleys: ['D2', 'D4'] }));
  assert.equal(s.outcome.result, 'defeat');
  assert.match(s.outcome.cause, /deux systèmes/);
});

test('un seul système détruit (hors moteur) ne fait pas perdre', () => {
  const s = endTurn(makeState({ systems: { shield: 2 }, volleys: ['D2'] }));
  assert.equal(s.phase, 'player');
  assert.equal(s.systems.shield.hp, 0);
});

test('défaite : plus aucun membre d\'équipage debout', () => {
  const s = endTurn(makeState({
    positions: { c1: 'A1', c2: 'A5', c3: 'G5' }, hp: { c1: 2, c2: 1, c3: 1 },
    fires: ['A5', 'G5'], volleys: ['A1'],
  }));
  assert.equal(s.outcome.result, 'defeat');
  assert.match(s.outcome.cause, /équipage/);
  assert.equal(s.units.length, 0);
});

test('la défaite est vérifiée après chaque étape : la suite n\'a pas lieu', () => {
  // Le feu détruit le moteur à l'étape 2 : la salve de l'étape 3 ne part pas.
  const s = resolveTurn(makeState({ systems: { engine: 1 }, fires: ['A3'], volleys: ['G5'] }));
  assert.equal(s.outcome.result, 'defeat');
  assert.deepEqual(burning(s), ['A3']);
});

test('une défaite pendant la résolution du tour 7 l\'emporte sur la victoire', () => {
  let s = makeState({ turn: VALUES.turns, systems: { engine: 2 }, volleys: ['B3'] });
  s = endTurn(s);
  assert.equal(s.outcome.result, 'defeat');
});
