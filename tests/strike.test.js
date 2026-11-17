import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gestureTargets, doGesture, findUnit, crewMoveTargets, crewGestures } from '../src/rules/actions.js';
import { resolveTurn } from '../src/rules/resolve.js';
import { cellName, parseCell } from '../src/rules/grid.js';
import { makeState, unitHp, names } from './helpers.js';

// c1 agent de sécurité (frapper simple), c2 garde (frapper fort), c3 pompier.
const CREW = ['security', 'guard', 'firefighter'];
const P = parseCell;

function strike(opts, striker, target) {
  return doGesture(makeState({ crew: CREW, ...opts }), striker, 'strike', P(target));
}
const at = (s, id) => cellName(findUnit(s, id).pos);

test('frapper simple vers une case libre : −1 PV, recul d\'une case', () => {
  const s = strike({ positions: { c1: 'B1' }, intruders: ['C1'] }, 'c1', 'C1');
  assert.equal(unitHp(s, 'i1'), 1);
  assert.equal(at(s, 'i1'), 'D1');
});

test('heurt contre la coque : intrus éliminé', () => {
  const s = strike({ positions: { c1: 'F1' }, intruders: ['G1'] }, 'c1', 'G1');
  assert.equal(findUnit(s, 'i1'), null);
});

test('heurt contre un système : l\'intrus et le système perdent 1 point', () => {
  const s = strike({ positions: { c1: 'B2' }, intruders: ['C2'] }, 'c1', 'C2');
  assert.equal(findUnit(s, 'i1'), null);
  assert.equal(s.systems.shield.hp, 3);
});

test('heurt contre une unité : les deux perdent 1 PV', () => {
  const s = strike({ positions: { c1: 'B1', c2: 'D1' }, intruders: ['C1'] }, 'c1', 'C1');
  assert.equal(findUnit(s, 'i1'), null);
  assert.equal(unitHp(s, 'c2'), 2);
});

test('recul dans le feu : intrus éliminé', () => {
  const s = strike({ positions: { c1: 'B1' }, intruders: ['C1'], fires: ['D1'] }, 'c1', 'C1');
  assert.equal(findUnit(s, 'i1'), null);
});

test('frapper un intrus à 1 PV l\'élimine sans recul', () => {
  const s = strike({ positions: { c1: 'B1' }, intruders: [{ at: 'C1', hp: 1 }, 'D1'] }, 'c1', 'C1');
  assert.equal(findUnit(s, 'i1'), null);
  assert.equal(unitHp(s, 'i2'), 2, 'pas de heurt sur le voisin');
});

test('frapper fort : recul de 2 cases', () => {
  const s = strike({ positions: { c2: 'B1' }, intruders: ['C1'] }, 'c2', 'C1');
  assert.equal(at(s, 'i1'), 'E1');
  assert.equal(unitHp(s, 'i1'), 1);
});

test('recul de 2 cases interrompu : arrêt après 1 case, heurt', () => {
  // Le garde bouscule le pompier de F1 : G1, puis la coque.
  const s = strike({ positions: { c2: 'E1', c3: 'F1' } }, 'c2', 'F1');
  assert.equal(at(s, 'c3'), 'G1');
  assert.equal(unitHp(s, 'c3'), 2);
});

test('recul fort à travers le feu sans s\'y arrêter : pas de dégât de feu', () => {
  const s = strike({ positions: { c2: 'B1' }, intruders: ['C1'], fires: ['D1'] }, 'c2', 'C1');
  assert.equal(at(s, 'i1'), 'E1');
  assert.equal(unitHp(s, 'i1'), 1);
});

test('recul dans le feu puis heurt : les deux dégâts, et pas de 2e brûlure à la résolution', () => {
  // Le garde bouscule l'agent (3 PV) de C1 : D1 en feu, puis heurt contre l'intrus en E1.
  let s = strike({ positions: { c2: 'B1', c1: 'C1' }, intruders: ['E1'], fires: ['D1'] }, 'c2', 'C1');
  assert.equal(at(s, 'c1'), 'D1');
  assert.equal(unitHp(s, 'c1'), 1);
  assert.equal(unitHp(s, 'i1'), 1);
  s = resolveTurn(s);
  assert.equal(unitHp(s, 'c1'), 1);
});

test('le pompier poussé dans le feu ne brûle pas', () => {
  const s = strike({ positions: { c2: 'B1', c3: 'C1' }, fires: ['E1'] }, 'c2', 'C1');
  assert.equal(at(s, 'c3'), 'E1');
  assert.equal(unitHp(s, 'c3'), 3);
});

test('frapper un équipier : pas de dégât, il recule et garde son tour', () => {
  const s = strike({ positions: { c2: 'B1', c1: 'C1' } }, 'c2', 'C1');
  assert.equal(at(s, 'c1'), 'E1');
  assert.equal(unitHp(s, 'c1'), 3);
  assert.ok(crewMoveTargets(s, 'c1').length > 0);
  assert.equal(findUnit(s, 'c1').acted, false);
});

test('recul vers une case visée par une salve : la salve l\'achève', () => {
  let s = strike({ positions: { c1: 'B1' }, intruders: ['C1'], volleys: ['D1'] }, 'c1', 'C1');
  assert.equal(unitHp(s, 'i1'), 1);
  s = resolveTurn(s);
  assert.equal(findUnit(s, 'i1'), null);
});

test('cibles : seulement les unités adjacentes ; le pompier ne frappe pas', () => {
  const s = makeState({ crew: CREW, positions: { c1: 'B2' }, intruders: ['B1', 'A3'] });
  assert.deepEqual(names(gestureTargets(s, 'c1', 'strike')), ['B1']);
  assert.ok(!crewGestures(s, 'c3').includes('strike'));
});

test('un heurt qui détruit le moteur fait perdre aussitôt', () => {
  const s = strike({ positions: { c1: 'B5' }, intruders: ['B4'], systems: { engine: 1 } }, 'c1', 'B4');
  assert.equal(s.phase, 'over');
  assert.match(s.outcome.cause, /moteur/);
});
