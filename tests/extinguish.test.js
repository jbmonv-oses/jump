import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gestureTargets, doGesture, moveCrew, finishCrew, crewMoveTargets, crewGestures, findUnit, isFinished,
} from '../src/rules/actions.js';
import { resolveTurn } from '../src/rules/resolve.js';
import { parseCell } from '../src/rules/grid.js';
import { makeState, names, burning } from './helpers.js';

const P = parseCell;

test('éteindre simple : seulement une case adjacente en feu', () => {
  const s = makeState({ positions: { c3: 'B1' }, fires: ['A1', 'C1', 'A3', 'D1'] });
  assert.deepEqual(names(gestureTargets(s, 'c3', 'extinguish')), ['A1', 'C1']);
  const next = doGesture(s, 'c3', 'extinguish', P('A1'));
  assert.deepEqual(burning(next), ['A3', 'C1', 'D1']);
  assert.deepEqual(burning(s), ['A1', 'A3', 'C1', 'D1'], 'ancien état intact');
});

test('éteindre fort : toute case adjacente, même sans feu, éteint une croix de 5 cases', () => {
  const s = makeState({ positions: { c1: 'B2' }, fires: ['B2', 'C1', 'C3', 'A1', 'E2'] });
  // Le pompier est en feu en B2 ; il vise C2 (ne brûle pas).
  assert.deepEqual(names(gestureTargets(s, 'c1', 'extinguish')), ['A2', 'B1', 'B3', 'C2']);
  const next = doGesture(s, 'c1', 'extinguish', P('C2'));
  // Croix C2 : C1, D2 (bouclier), C3, B2 (sa propre case).
  assert.deepEqual(burning(next), ['A1', 'E2']);
});

test('éteindre fort : la case visée peut être un système', () => {
  // Pompier en C2, vise le bouclier en D2 : éteint D1, E2, C2.
  const s = makeState({ positions: { c1: 'C2' }, fires: ['D1', 'E2', 'C2', 'C1'] });
  assert.ok(names(gestureTargets(s, 'c1', 'extinguish')).includes('D2'));
  const next = doGesture(s, 'c1', 'extinguish', P('D2'));
  assert.deepEqual(burning(next), ['C1']);
});

test('éteindre fort près du bord : la croix est coupée par la coque', () => {
  const s = makeState({ positions: { c1: 'B1' }, fires: ['A1', 'A2'] });
  const next = doGesture(s, 'c1', 'extinguish', P('A1'));
  assert.deepEqual(burning(next), []);
});

test('éteindre la source d\'une propagation l\'annule pour de bon', () => {
  const s = makeState({ positions: { c3: 'B1' }, fires: ['A1'], spreads: [['A1', 'A2']], volleys: ['A1'] });
  const after = doGesture(s, 'c3', 'extinguish', P('A1'));
  assert.equal(after.announcements.spreads[0].cancelled, true);
  // La salve rallume A1, mais la propagation reste annulée : A2 ne brûle pas.
  assert.deepEqual(burning(resolveTurn(after)), ['A1']);
});

test('se déplacer puis faire un geste ; le geste termine l\'activation', () => {
  let s = makeState({ fires: ['E1'] });
  s = moveCrew(s, 'c3', P('E2'));
  s = doGesture(s, 'c3', 'extinguish', P('E1'));
  assert.ok(isFinished(findUnit(s, 'c3')));
  assert.deepEqual(crewMoveTargets(s, 'c3'), []);
  assert.deepEqual(gestureTargets(s, 'c3', 'extinguish'), []);
});

test('un geste sans déplacement interdit ensuite de se déplacer', () => {
  let s = makeState({ positions: { c3: 'E2' }, fires: ['E1'] });
  s = doGesture(s, 'c3', 'extinguish', P('E1'));
  assert.deepEqual(crewMoveTargets(s, 'c3'), []);
});

test('un geste hors des cibles valides est refusé', () => {
  const s = makeState({ positions: { c3: 'B1' }, fires: ['D1'] });
  assert.throws(() => doGesture(s, 'c3', 'extinguish', P('C1')));
  assert.throws(() => doGesture(s, 'c3', 'extinguish', P('D1')));
});

test('personne n\'a d\'autre geste que ceux de son rôle', () => {
  const s = makeState({ positions: { c2: 'B1' }, fires: ['A1'] });
  assert.ok(!crewGestures(s, 'c2').includes('extinguish'));
  assert.deepEqual(gestureTargets(s, 'c2', 'extinguish'), []);
  assert.throws(() => doGesture(s, 'c2', 'extinguish', P('A1')));
});

test('« Terminer » grise un membre sans geste', () => {
  const s = finishCrew(makeState(), 'c2');
  assert.ok(isFinished(findUnit(s, 'c2')));
  assert.deepEqual(crewMoveTargets(s, 'c2'), []);
  assert.throws(() => finishCrew(s, 'c2'));
});
