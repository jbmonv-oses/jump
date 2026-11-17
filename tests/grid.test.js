import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT, cellName, parseCell, neighbors, isAdjacent } from '../src/rules/grid.js';
import { names } from './helpers.js';

test('la grille fait 7 colonnes sur 5 lignes', () => {
  assert.equal(WIDTH, 7);
  assert.equal(HEIGHT, 5);
});

test('notation des cases : colonne puis ligne, D3 au centre', () => {
  assert.equal(cellName({ x: 3, y: 2 }), 'D3');
  assert.equal(cellName({ x: 0, y: 0 }), 'A1');
  assert.deepEqual(parseCell('G5'), { x: 6, y: 4 });
});

test('voisins orthogonaux, dans l\'ordre haut, droite, bas, gauche', () => {
  const n = neighbors(parseCell('D3')).map(cellName);
  assert.deepEqual(n, ['D2', 'E3', 'D4', 'C3']);
});

test('les bords coupent les voisins (coque)', () => {
  assert.deepEqual(names(neighbors(parseCell('A1'))), ['A2', 'B1']);
});

test('pas de diagonale dans les adjacences', () => {
  assert.ok(isAdjacent(parseCell('C3'), parseCell('C4')));
  assert.ok(!isAdjacent(parseCell('C3'), parseCell('D4')));
});
