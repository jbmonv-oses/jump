import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crewMoveTargets, moveCrew, findUnit, isFinished } from '../src/rules/actions.js';
import { parseCell, cellName } from '../src/rules/grid.js';
import { makeState, names } from './helpers.js';

// Équipage par défaut des tests : c1 pompier (4), c2 garde (4), c3 technicien (2).

test('polyvalent : 2 cases, sans entrer sur un système ni s\'arrêter sur un équipier', () => {
  const s = makeState();
  // Technicien en E3 : F3 (pilotage) bloque, D3 (garde) se traverse sans s'y arrêter.
  assert.deepEqual(names(crewMoveTargets(s, 'c3')), ['E1', 'E2', 'E4', 'E5', 'F2', 'F4']);
});

test('spécialiste : 4 cases ; au-delà, rien', () => {
  const s = makeState({ positions: { c2: 'A1' } });
  const t = names(crewMoveTargets(s, 'c2'));
  assert.ok(t.includes('E1'));
  assert.ok(!t.includes('F1'));
});

test('un équipier se traverse sans s\'y arrêter', () => {
  const s = makeState({ positions: { c3: 'A1', c2: 'B1' } });
  assert.deepEqual(names(crewMoveTargets(s, 'c3')), ['A2', 'A3', 'B2', 'C1']);
});

test('un intrus bloque le passage', () => {
  const s = makeState({ positions: { c3: 'A1' }, intruders: ['B1'] });
  assert.deepEqual(names(crewMoveTargets(s, 'c3')), ['A2', 'A3', 'B2']);
});

test('le feu bloque l\'équipage, sauf le pompier qui le traverse et l\'occupe', () => {
  const fires = ['A2', 'B1'];
  const tech = makeState({ positions: { c3: 'A1' }, fires });
  assert.deepEqual(crewMoveTargets(tech, 'c3'), []);
  const pompier = makeState({ positions: { c1: 'A1' }, fires });
  const t = names(crewMoveTargets(pompier, 'c1'));
  assert.ok(t.includes('A2') && t.includes('B1') && t.includes('C1'));
});

test('sortir d\'une case en feu est toujours possible', () => {
  const s = makeState({ positions: { c3: 'A1' }, fires: ['A1'] });
  assert.ok(names(crewMoveTargets(s, 'c3')).includes('A2'));
});

test('déplacer rend un nouvel état sans modifier l\'ancien', () => {
  const s = makeState();
  const before = JSON.stringify(s);
  const next = moveCrew(s, 'c3', parseCell('E1'));
  assert.equal(JSON.stringify(s), before);
  assert.equal(cellName(findUnit(next, 'c3').pos), 'E1');
});

test('un seul déplacement par tour, puis le membre est grisé', () => {
  const s = moveCrew(makeState(), 'c3', parseCell('E2'));
  assert.ok(isFinished(findUnit(s, 'c3')));
  assert.deepEqual(crewMoveTargets(s, 'c3'), []);
  assert.throws(() => moveCrew(s, 'c3', parseCell('E1')));
});

test('un déplacement hors de portée est refusé', () => {
  const s = makeState();
  assert.throws(() => moveCrew(s, 'c3', parseCell('A1')));
  assert.throws(() => moveCrew(s, 'c3', parseCell('F3')), 'pas sur un système');
  assert.throws(() => moveCrew(s, 'c3', parseCell('D3')), 'pas sur un équipier');
});

test('on peut alterner entre membres', () => {
  let s = makeState();
  s = moveCrew(s, 'c1', parseCell('C1'));
  s = moveCrew(s, 'c3', parseCell('E1'));
  s = moveCrew(s, 'c2', parseCell('C3'));
  assert.deepEqual(s.units.map((u) => cellName(u.pos)), ['C1', 'C3', 'E1']);
});
