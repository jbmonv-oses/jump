import { test } from 'node:test';
import assert from 'node:assert/strict';
import { announce } from '../src/rules/announce.js';
import { createGame } from '../src/rules/state.js';
import { readMap, isAdjacent, cellName } from '../src/rules/grid.js';
import { systemAt, unitAt, isOnFire } from '../src/rules/board.js';
import { VALUES } from '../src/rules/config.js';
import { makeState } from './helpers.js';

const CREW = ['firefighter', 'guard', 'technician'];
const FLOOR = readMap().floor.map(cellName);

function announced(opts) {
  const s = makeState(opts);
  return { before: s, after: announce(s) };
}

// ——— Salves ———

test('nombre de salves selon le tour', () => {
  for (let turn = 1; turn <= VALUES.turns; turn++) {
    for (let seed = 0; seed < 20; seed++) {
      const { after } = announced({ turn, seed });
      assert.equal(after.announcements.volleys.length, VALUES.volleysPerTurn[turn - 1]);
    }
  }
});

test('salves : cibles distinctes, système non détruit ou sol sans feu ni unité', () => {
  for (let seed = 0; seed < 300; seed++) {
    const { before, after } = announced({ turn: 7, seed, fires: ['A1', 'G5', 'C2'], systems: { oxygen: 0 } });
    const targets = after.announcements.volleys.map((v) => cellName(v.pos));
    assert.equal(new Set(targets).size, targets.length);
    for (const v of after.announcements.volleys) {
      const sys = systemAt(before, v.pos);
      if (sys) assert.ok(before.systems[sys].hp > 0, `graine ${seed} : système détruit visé`);
      else {
        assert.ok(!isOnFire(before, v.pos), `graine ${seed} : case en feu visée`);
        assert.ok(!unitAt(before, v.pos), `graine ${seed} : case occupée visée`);
      }
    }
  }
});

test('salves : environ une sur trois vise un système', () => {
  let systems = 0;
  let total = 0;
  for (let seed = 0; seed < 2000; seed++) {
    const { before, after } = announced({ turn: 1, seed });
    for (const v of after.announcements.volleys) {
      total += 1;
      if (systemAt(before, v.pos)) systems += 1;
    }
  }
  const ratio = systems / total;
  assert.ok(ratio > 0.28 && ratio < 0.39, `proportion ${ratio}`);
});

test('salves : sans système à viser, la salve vise le sol', () => {
  for (let seed = 0; seed < 50; seed++) {
    const { before, after } = announced({ turn: 7, seed, systems: { engine: 0, shield: 0, oxygen: 0, piloting: 0 } });
    assert.equal(after.announcements.volleys.length, 3);
    for (const v of after.announcements.volleys) assert.equal(systemAt(before, v.pos), null);
  }
});

// ——— Propagations ———

function spreadCount(fires, seed = 1) {
  return announced({ fires, seed }).after.announcements.spreads.length;
}

test('⌈F / 3⌉ propagations', () => {
  assert.equal(spreadCount([]), 0);
  assert.equal(spreadCount(['A1']), 1);
  assert.equal(spreadCount(['A1', 'G1', 'A5']), 1);
  assert.equal(spreadCount(['A1', 'G1', 'A5', 'G5']), 2);
  assert.equal(spreadCount(['A1', 'G1', 'A5', 'G5', 'C1', 'E5', 'C5']), 3);
});

test('propagations : source en feu, cible de sol adjacente qui ne brûle pas, sources et cibles distinctes', () => {
  const fires = ['A1', 'B1', 'C1', 'A2', 'G5', 'F5', 'E5'];
  for (let seed = 0; seed < 300; seed++) {
    const { before, after } = announced({ fires, seed });
    const spreads = after.announcements.spreads;
    assert.equal(spreads.length, 3);
    for (const sp of spreads) {
      assert.ok(isOnFire(before, sp.from));
      assert.ok(!isOnFire(before, sp.to) && !systemAt(before, sp.to));
      assert.ok(isAdjacent(sp.from, sp.to));
    }
    for (const key of ['from', 'to']) {
      const cells = spreads.map((sp) => cellName(sp[key]));
      assert.equal(new Set(cells).size, cells.length, `graine ${seed} : ${key} en double`);
    }
  }
});

test('propagations : moins de possibilités que prévu, on annonce celles qui existent', () => {
  // Tout le sol brûle sauf E5 : une seule cible possible.
  const fires = FLOOR.filter((n) => n !== 'E5');
  const spreads = announced({ fires }).after.announcements.spreads;
  assert.equal(spreads.length, 1);
  assert.equal(cellName(spreads[0].to), 'E5');
});

// ——— Hasard ———

test('même graine, mêmes annonces ; graines différentes, annonces variées', () => {
  assert.deepEqual(createGame({ seed: 77, crew: CREW }), createGame({ seed: 77, crew: CREW }));
  const seen = new Set();
  for (let seed = 0; seed < 30; seed++) {
    seen.add(JSON.stringify(createGame({ seed, crew: CREW }).announcements));
  }
  assert.ok(seen.size > 10);
});

test('l\'annonce remet l\'équipage en état d\'agir', () => {
  const s = makeState();
  s.units[0].moved = true;
  s.units[0].acted = true;
  const next = announce(s);
  assert.equal(next.units[0].moved, false);
  assert.equal(next.units[0].acted, false);
});
