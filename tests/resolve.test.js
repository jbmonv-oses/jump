import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endTurn } from '../src/rules/resolve.js';
import { moveCrew, findUnit, crewMoveTargets } from '../src/rules/actions.js';
import { parseCell } from '../src/rules/grid.js';
import { VALUES } from '../src/rules/config.js';
import { makeState } from './helpers.js';

test('fin du tour : tour suivant, équipage de nouveau disponible', () => {
  let s = moveCrew(makeState(), 'c3', parseCell('E2'));
  const before = JSON.stringify(s);
  const next = endTurn(s);
  assert.equal(JSON.stringify(s), before, 'l\'ancien état est intact');
  assert.equal(next.turn, 2);
  assert.equal(next.phase, 'player');
  assert.equal(findUnit(next, 'c3').moved, false);
  assert.ok(crewMoveTargets(next, 'c3').length > 0);
});

test('la résolution du dernier tour termine la partie par une victoire', () => {
  let s = makeState();
  for (let i = 1; i < VALUES.turns; i++) s = endTurn(s);
  assert.equal(s.turn, VALUES.turns);
  assert.equal(s.phase, 'player');
  s = endTurn(s);
  assert.equal(s.turn, VALUES.turns);
  assert.equal(s.phase, 'over');
  assert.equal(s.outcome.result, 'victory');
});

test('après la fin de partie, plus de tour ni de déplacement', () => {
  let s = makeState();
  for (let i = 0; i < VALUES.turns; i++) s = endTurn(s);
  assert.throws(() => endTurn(s));
  assert.deepEqual(crewMoveTargets(s, 'c1'), []);
});
