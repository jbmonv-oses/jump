// Affichage de l'état. Aucune règle de jeu ici : on lit l'état et les listes
// calculées par src/rules/.

import { ROLES, SYSTEMS, VALUES, INTRUDER, FIRE_EMOJI } from '../rules/config.js';
import { WIDTH, HEIGHT, cellName, samePos } from '../rules/grid.js';
import { unitAt, systemAt, isOnFire, isFinished, findUnit, moveRange } from '../rules/actions.js';

export function renderBanner(el, state) {
  const systems = Object.entries(state.systems)
    .map(([key, s]) => `${SYSTEMS[key].emoji} ${s.hp}/${VALUES.systemHp}`)
    .join('  ');
  let outcome = '';
  if (state.outcome?.result === 'victory') outcome = '<span class="outcome">Victoire : saut réussi !</span>';
  if (state.outcome?.result === 'defeat') outcome = `<span class="outcome">Défaite : ${state.outcome.cause}</span>`;
  el.innerHTML = `
    <span class="turn">Tour ${state.turn} / ${VALUES.turns}</span>
    <span>${systems}</span>
    ${outcome}
    <span class="seed">Graine : ${state.seed}</span>`;
}

// `view` : { selectedId, targets } — targets = cases atteignables du membre sélectionné.
export function renderBoard(el, state, view, onCellClick) {
  el.innerHTML = '';
  el.appendChild(label(''));
  for (let x = 0; x < WIDTH; x++) el.appendChild(label(cellName({ x, y: 0 }).slice(0, 1)));

  for (let y = 0; y < HEIGHT; y++) {
    el.appendChild(label(String(y + 1)));
    for (let x = 0; x < WIDTH; x++) {
      const pos = { x, y };
      el.appendChild(renderCell(state, view, pos, onCellClick));
    }
  }
}

function label(text) {
  const d = document.createElement('div');
  d.className = 'label';
  d.textContent = text;
  return d;
}

function renderCell(state, view, pos, onCellClick) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.title = cellName(pos);
  cell.innerHTML = `<span class="name">${cellName(pos)}</span>`;

  const sys = systemAt(state, pos);
  if (sys) {
    const s = state.systems[sys];
    cell.classList.add('system');
    cell.title += ` — ${SYSTEMS[sys].name}`;
    cell.insertAdjacentHTML('beforeend',
      `<span>${SYSTEMS[sys].emoji}</span><span class="sys-hp">${s.hp}/${VALUES.systemHp}</span>`);
  }

  if (isOnFire(state, pos)) {
    cell.classList.add('fire');
    cell.insertAdjacentHTML('beforeend', `<span class="fire-mark">${FIRE_EMOJI}</span>`);
  }

  const unit = unitAt(state, pos);
  if (unit) {
    const span = document.createElement('span');
    span.className = 'unit';
    if (unit.kind === 'crew') {
      span.textContent = ROLES[unit.role].emoji;
      cell.title += ` — ${ROLES[unit.role].name}`;
      if (isFinished(unit)) span.classList.add('finished');
    } else {
      span.textContent = INTRUDER.emoji;
      cell.title += ` — ${INTRUDER.name}`;
    }
    cell.appendChild(span);
    cell.insertAdjacentHTML('beforeend', `<span class="hp">${'♥'.repeat(unit.hp)}</span>`);
  }

  if (view.selectedId) {
    const selected = findUnit(state, view.selectedId);
    if (selected && samePos(selected.pos, pos)) cell.classList.add('selected');
  }
  if (view.targets.some((t) => samePos(t, pos))) cell.classList.add('reachable');

  cell.addEventListener('click', () => onCellClick(pos));
  return cell;
}

export function renderSelection(el, state, view) {
  const unit = view.selectedId ? findUnit(state, view.selectedId) : null;
  if (!unit) {
    el.textContent = state.phase === 'player'
      ? 'Cliquez sur un membre d\'équipage pour le sélectionner.'
      : '';
    return;
  }
  const role = ROLES[unit.role];
  const move = moveRange(unit);
  el.textContent = `${role.emoji} ${role.name} — déplacement ${move}` +
    (view.targets.length ? ' : cliquez sur une case en vert.' : ' : aucune case accessible.');
}

export function renderLog(el, state) {
  el.innerHTML = '';
  for (const entry of state.log) {
    const li = document.createElement('li');
    li.textContent = entry.text;
    if (entry.turn === state.turn) li.classList.add('current');
    el.appendChild(li);
  }
  el.parentElement.scrollTop = el.parentElement.scrollHeight;
}
