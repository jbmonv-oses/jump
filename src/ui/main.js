// Point d'entrée de l'interface : garde l'état courant, transmet les actions aux règles.

import { DEFAULT_CREW } from '../rules/config.js';
import { createGame } from '../rules/state.js';
import {
  crewMoveTargets, moveCrew, unitAt, findUnit, isFinished,
  gestureTargets, doGesture, finishCrew, extinguishArea,
} from '../rules/actions.js';
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
let gesture = null; // geste choisi pour le membre sélectionné

function seedFromUrl() {
  const raw = new URLSearchParams(location.search).get('seed');
  if (raw === null || raw === '') return null;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

function newGame(seed) {
  state = createGame({ seed, crew: DEFAULT_CREW });
  select(null);
  render();
}

function select(unitId) {
  selectedId = unitId;
  gesture = null;
}

function currentView() {
  const unit = selectedId ? findUnit(state, selectedId) : null;
  if (!unit || isFinished(unit) || state.phase !== 'player') select(null);
  return {
    selectedId,
    gesture,
    moveTargets: selectedId && !gesture ? crewMoveTargets(state, selectedId) : [],
    gestureTargets: selectedId && gesture ? gestureTargets(state, selectedId, gesture) : [],
  };
}

function onCellClick(pos) {
  if (state.phase !== 'player') return;
  const view = currentView();
  if (view.gestureTargets.some((t) => samePos(t, pos))) {
    state = doGesture(state, selectedId, gesture, pos);
    select(null);
  } else if (view.moveTargets.some((t) => samePos(t, pos))) {
    state = moveCrew(state, selectedId, pos); // il reste sélectionné pour son geste
  } else {
    const unit = unitAt(state, pos);
    const selectable = unit && unit.kind === 'crew' && !isFinished(unit) && unit.id !== selectedId;
    select(selectable ? unit.id : null);
  }
  render();
}

function previewArea(target) {
  if (gesture !== 'extinguish') return null;
  return extinguishArea(findUnit(state, selectedId), target);
}

function onGesture(g) {
  gesture = gesture === g ? null : g;
  render();
}

function onFinish() {
  state = finishCrew(state, selectedId);
  select(null);
  render();
}

function render() {
  const view = currentView();
  renderBanner(els.banner, state);
  renderBoard(els.board, state, view, { onCellClick, previewArea });
  renderSelection(els.selection, state, view, { onGesture, onFinish });
  renderLog(els.log, state);
  els.endTurn.disabled = state.phase !== 'player';
}

els.endTurn.addEventListener('click', () => {
  if (state.phase !== 'player') return;
  state = endTurn(state);
  select(null);
  render();
});

els.newGame.addEventListener('click', () => newGame(randomSeed()));

newGame(seedFromUrl() ?? randomSeed());
