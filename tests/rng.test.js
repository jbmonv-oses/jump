import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedToRngState, nextFloat, nextInt, pick } from '../src/rules/rng.js';

test('même graine, même suite de tirages', () => {
  const draw = (seed) => {
    let rng = seedToRngState(seed);
    const out = [];
    for (let i = 0; i < 20; i++) {
      const r = nextFloat(rng);
      out.push(r.value);
      rng = r.rng;
    }
    return out;
  };
  assert.deepEqual(draw(42), draw(42));
  assert.notDeepEqual(draw(42), draw(43));
});

test('les tirages restent dans les bornes', () => {
  let rng = seedToRngState(7);
  for (let i = 0; i < 1000; i++) {
    const r = nextInt(rng, 5);
    assert.ok(r.value >= 0 && r.value < 5 && Number.isInteger(r.value));
    rng = r.rng;
  }
});

test('l\'état du générateur est un entier sérialisable', () => {
  const rng = seedToRngState('graine texte');
  const r = pick(rng, ['a', 'b', 'c']);
  assert.ok(Number.isInteger(r.rng));
  assert.equal(JSON.parse(JSON.stringify(r.rng)), r.rng);
});
