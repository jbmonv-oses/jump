// Point d'entrée de l'interface : garde l'état courant, transmet les actions aux règles.

import { DEFAULT_CREW } from '../rules/config.js';
import { createGame } from '../rules/state.js';
import { crewMoveTargets, moveCrew, unitAt, isFinished } from '../rules/actions.js';
import { endTurn } from '../rules/resolve.js';
import { randomSeed } from '../rules/rng.js';
import { samePos } from '../rules/grid.js';
import { renderBanner, renderBoard, renderSelection, renderLog } from './render.js';

const els = {
  banner: document.getElementById('banner'),
  board: document.getElementById('board'),
  selection: document.getElementById('selection'),
  log: document.getElementById('log'),
  endTurn: document.getElementById('end-turn'),
  newGame: document.getElementById('new-game'),
};

let state = null;
let selectedId = null;

function seedFromUrl() {
  const raw = new URLSearchParams(location.search).get('seed');
  if (raw === null || raw === '') return null;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

function newGame(seed) {
  state = createGame({ seed, crew: DEFAULT_CREW });
  selectedId = null;
  render();
}

function currentTargets() {
  return selectedId ? crewMoveTargets(state, selectedId) : [];
}

function onCellClick(pos) {
  if (state.phase !== 'player') return;
  const targets = currentTargets();
  if (selectedId && targets.some((t) => samePos(t, pos))) {
    state = moveCrew(state, selectedId, pos);
    selectedId = null;
  } else {
    const unit = unitAt(state, pos);
    selectedId = unit && unit.kind === 'crew' && !isFinished(unit) && unit.id !== selectedId
      ? unit.id
      : null;
  }
  render();
}

function render() {
  const view = { selectedId, targets: currentTargets() };
  renderBanner(els.banner, state);
  renderBoard(els.board, state, view, onCellClick);
  renderSelection(els.selection, state, view);
  renderLog(els.log, state);
  els.endTurn.disabled = state.phase !== 'player';
}

els.endTurn.addEventListener('click', () => {
  if (state.phase !== 'player') return;
  state = endTurn(state);
  selectedId = null;
  render();
});

els.newGame.addEventListener('click', () => newGame(randomSeed()));

newGame(seedFromUrl() ?? randomSeed());
