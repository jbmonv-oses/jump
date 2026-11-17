import { test } from 'node:test';
import assert from 'node:assert/strict';
import { announce } from '../src/rules/announce.js';
import { resolveTurn, endTurn } from '../src/rules/resolve.js';
import { doGesture, findUnit } from '../src/rules/actions.js';
import { cellName, parseCell, samePos } from '../src/rules/grid.js';
import { unitAt, isOnFire } from '../src/rules/board.js';
import { VALUES } from '../src/rules/config.js';
import { makeState, unitHp } from './helpers.js';

// Équipage rangé en bas à gauche, loin des intrus, sauf mention contraire.
const AWAY = { c1: 'A5', c2: 'B5', c3: 'C5' };
const ALL_DOWN = { engine: 0, shield: 0, oxygen: 0, piloting: 0 };

function intruderAfterAnnounce(opts, id = 'i1') {
  const s = announce(makeState({ turn: 3, positions: AWAY, ...opts }));
  const i = findUnit(s, id);
  return { pos: cellName(i.pos), dir: i.attackDir, state: s };
}

// ——— Déplacement et annonce (phase 1) ———

test('intrus adjacent à un système : il ne bouge pas et annonce vers lui', () => {
  const r = intruderAfterAnnounce({ intruders: ['C2'] });
  assert.equal(r.pos, 'C2');
  assert.equal(r.dir, 'right');
  assert.match(r.state.log.map((l) => l.text).join('\n'), /L'intrus en C2 frappe vers la droite/);
});

test('deux systèmes adjacents : départage haut, droite, bas, gauche', () => {
  // D3 touche le bouclier (haut) et l'oxygène (bas).
  const r = intruderAfterAnnounce({ intruders: ['D3'] });
  assert.equal(r.pos, 'D3');
  assert.equal(r.dir, 'up');
});

test('il rejoint la case la plus proche adjacente à un système', () => {
  // De G1 : G2 puis G3, qui touche le pilotage (F3).
  const r = intruderAfterAnnounce({ intruders: ['G1'] });
  assert.equal(r.pos, 'G3');
  assert.equal(r.dir, 'left');
});

test('il avance de 2 cases au plus', () => {
  // Pilotage détruit : de G5, la case visée est E4 (3 pas) ; il s'arrête en F4.
  const r = intruderAfterAnnounce({ intruders: ['G5'], systems: { piloting: 0 } });
  assert.equal(r.pos, 'F4');
  assert.equal(r.dir, null, 'un système détruit ne déclenche pas d\'attaque');
});

test('il contourne le feu', () => {
  // De A1, B1 brûle : il passe par A2 puis B2 (touche le moteur en B3).
  const r = intruderAfterAnnounce({ intruders: ['A1'], fires: ['B1'] });
  assert.equal(r.pos, 'B2');
  assert.equal(r.dir, 'down');
});

test('sans système atteignable, il va au contact d\'un membre d\'équipage', () => {
  const r = intruderAfterAnnounce({ intruders: ['A1'], systems: ALL_DOWN, positions: { c1: 'D1', c2: 'G5', c3: 'F5' } });
  assert.equal(r.pos, 'C1');
  assert.equal(r.dir, 'right');
});

test('déjà au contact d\'un équipier, sans système atteignable : il reste sur place', () => {
  const r = intruderAfterAnnounce({ intruders: ['C1'], systems: ALL_DOWN, positions: { c1: 'C2', c2: 'G5', c3: 'F5' } });
  assert.equal(r.pos, 'C1');
  assert.equal(r.dir, 'down');
});

test('rien d\'accessible : il reste sur place sans rien annoncer', () => {
  const r = intruderAfterAnnounce({ intruders: ['A1'], fires: ['A2', 'B1'] });
  assert.equal(r.pos, 'A1');
  assert.equal(r.dir, null);
});

test('les intrus agissent dans leur ordre d\'arrivée', () => {
  // i1 (G2) prend G3 ; i2 (G4) ne peut plus y aller et prend F4.
  const { state } = intruderAfterAnnounce({ intruders: ['G2', 'G4'] });
  assert.equal(cellName(findUnit(state, 'i1').pos), 'G3');
  assert.equal(cellName(findUnit(state, 'i2').pos), 'F4');
  assert.equal(findUnit(state, 'i2').attackDir, 'up');
});

// ——— Attaques (résolution, étape 1) ———

test('attaque sur un système : −1 point', () => {
  const s = resolveTurn(makeState({ intruders: [{ at: 'C2', dir: 'right' }] }));
  assert.equal(s.systems.shield.hp, 3);
});

test('attaque sur une unité, équipier ou autre intrus : −1 PV', () => {
  const s = resolveTurn(makeState({
    positions: { c1: 'A2' },
    intruders: [{ at: 'A1', dir: 'down' }, { at: 'G1', dir: 'left' }, { at: 'F1' }],
  }));
  assert.equal(unitHp(s, 'c1'), 2);
  assert.equal(unitHp(s, 'i3'), 1);
});

test('attaque dans le vide : rien ne se passe', () => {
  const before = makeState({ intruders: [{ at: 'A1', dir: 'right' }] });
  const s = resolveTurn(before);
  assert.deepEqual(s.systems, before.systems);
  assert.deepEqual(s.units.map((u) => u.hp), before.units.map((u) => u.hp));
});

test('un intrus éliminé avant son tour n\'attaque pas', () => {
  // i1 tue i2 (1 PV) avant que i2 ne frappe le bouclier.
  const s = resolveTurn(makeState({ intruders: [{ at: 'B2', dir: 'right' }, { at: 'C2', dir: 'right', hp: 1 }] }));
  assert.equal(findUnit(s, 'i2'), null);
  assert.equal(s.systems.shield.hp, 4);
});

test('un intrus déplacé garde son attaque : elle part de sa nouvelle case', () => {
  // Intrus en C2, annoncé vers la droite (bouclier). Le garde le frappe de C1 vers le bas :
  // recul de 2 cases jusqu'en C4. Il frappe alors vers la droite : l'oxygène (D4).
  let s = makeState({ positions: { c1: 'A5', c2: 'C1' }, intruders: [{ at: 'C2', dir: 'right' }] });
  s = doGesture(s, 'c2', 'strike', parseCell('C2'));
  assert.equal(cellName(findUnit(s, 'i1').pos), 'C4');
  s = resolveTurn(s);
  assert.equal(s.systems.shield.hp, 4);
  assert.equal(s.systems.oxygen.hp, 3);
});

// ——— Abordage ———

test('abordage annoncé seulement aux tours prévus', () => {
  for (let turn = 1; turn <= VALUES.turns; turn++) {
    const s = announce(makeState({ turn, seed: turn }));
    assert.equal(Boolean(s.announcements.boarding), VALUES.boardingTurns.includes(turn), `tour ${turn}`);
  }
});

test('case d\'abordage : sol sans unité, sans feu, ni salve ni propagation', () => {
  for (let seed = 0; seed < 300; seed++) {
    const before = makeState({ turn: 6, seed, fires: ['A1', 'G5', 'D1'] });
    const s = announce(before);
    const p = s.announcements.boarding.pos;
    assert.ok(!unitAt(s, p) && !isOnFire(before, p), `graine ${seed}`);
    assert.ok(!s.announcements.volleys.some((v) => samePos(v.pos, p)), `graine ${seed} : salve`);
    assert.ok(!s.announcements.spreads.some((sp) => samePos(sp.to, p)), `graine ${seed} : propagation`);
  }
});

test('arrivée à la fin de la résolution, sans attaque ce tour-ci', () => {
  const s = resolveTurn(makeState({ boarding: 'A1' }));
  const i = s.units.find((u) => u.kind === 'intruder');
  assert.equal(cellName(i.pos), 'A1');
  assert.equal(i.hp, VALUES.intruderHp);
  assert.equal(i.attackDir, null);
});

test('arrivée sur une case occupée : case libre la plus proche, ordre de lecture', () => {
  // A1 occupée : B1 et A2 sont à 1 case ; B1 vient d'abord dans l'ordre de lecture.
  let s = resolveTurn(makeState({ positions: { c1: 'A1' }, boarding: 'A1' }));
  assert.equal(cellName(s.units.find((u) => u.kind === 'intruder').pos), 'B1');
  // B1 en feu : A2.
  s = resolveTurn(makeState({ positions: { c1: 'A1' }, fires: ['B1'], boarding: 'A1' }));
  assert.equal(cellName(s.units.find((u) => u.kind === 'intruder').pos), 'A2');
});

test('arrivée sur une case qui vient de prendre feu : elle se décale', () => {
  const s = resolveTurn(makeState({ volleys: ['G5'], boarding: 'G5' }));
  assert.equal(cellName(s.units.find((u) => u.kind === 'intruder').pos), 'G4');
});

test('l\'intrus arrivé bouge et annonce au tour suivant', () => {
  const s = endTurn(makeState({ positions: AWAY, boarding: 'G1' }));
  const i = s.units.find((u) => u.kind === 'intruder');
  assert.equal(cellName(i.pos), 'G3');
  assert.equal(i.attackDir, 'left');
});
