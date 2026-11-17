import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/rules/state.js';
import { cellName } from '../src/rules/grid.js';
import { VALUES } from '../src/rules/config.js';

const CREW = ['firefighter', 'guard', 'technician'];

test('systèmes placés selon la carte, à 4 points', () => {
  const s = createGame({ seed: 1, crew: CREW });
  const where = Object.fromEntries(Object.entries(s.systems).map(([k, v]) => [k, cellName(v.pos)]));
  assert.deepEqual(where, { shield: 'D2', engine: 'B3', oxygen: 'D4', piloting: 'F3' });
  for (const sys of Object.values(s.systems)) assert.equal(sys.hp, VALUES.systemHp);
});

test('l\'équipage occupe C3, D3, E3 dans l\'ordre du choix', () => {
  const s = createGame({ seed: 1, crew: CREW });
  assert.deepEqual(s.units.map((u) => [u.role, cellName(u.pos), u.hp]), [
    ['firefighter', 'C3', 3],
    ['guard', 'D3', 3],
    ['technician', 'E3', 3],
  ]);
});

test('une seule case en feu au départ, sur du sol, hors cases de départ', () => {
  for (let seed = 0; seed < 200; seed++) {
    const s = createGame({ seed, crew: CREW });
    const burning = [];
    s.fire.forEach((row, y) => row.forEach((f, x) => { if (f) burning.push(cellName({ x, y })); }));
    assert.equal(burning.length, VALUES.initialFires);
    assert.ok(!['C3', 'D3', 'E3', 'B3', 'D2', 'D4', 'F3'].includes(burning[0]), `graine ${seed} : ${burning[0]}`);
  }
});

test('même graine, même partie ; graines différentes, feux variés', () => {
  assert.deepEqual(createGame({ seed: 99, crew: CREW }), createGame({ seed: 99, crew: CREW }));
  const fires = new Set();
  for (let seed = 0; seed < 50; seed++) fires.add(JSON.stringify(createGame({ seed, crew: CREW }).fire));
  assert.ok(fires.size > 10);
});

test('l\'état est sérialisable en JSON sans perte', () => {
  const s = createGame({ seed: 5, crew: CREW });
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});

test('la partie commence au tour 1, en phase du joueur', () => {
  const s = createGame({ seed: 1, crew: CREW });
  assert.equal(s.turn, 1);
  assert.equal(s.phase, 'player');
  assert.equal(s.outcome, null);
});

test('l\'équipage doit compter trois rôles différents', () => {
  assert.throws(() => createGame({ seed: 1, crew: ['guard', 'guard', 'mechanic'] }));
  assert.throws(() => createGame({ seed: 1, crew: ['guard', 'mechanic'] }));
  assert.throws(() => createGame({ seed: 1, crew: ['guard', 'mechanic', 'cuisinier'] }));
});
