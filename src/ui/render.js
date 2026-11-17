// Affichage de l'état. Aucune règle de jeu ici : on lit l'état et les listes
// calculées par src/rules/.

import { ROLES, SYSTEMS, VALUES, INTRUDER, FIRE_EMOJI, GESTURES, DIRECTIONS } from '../rules/config.js';
import { WIDTH, HEIGHT, cellName, samePos, directionBetween, step } from '../rules/grid.js';
import {
  unitAt, systemAt, isOnFire, isFinished, findUnit, moveRange, crewGestures, gestureTargets,
} from '../rules/actions.js';

const ARROWS = { up: '▲', right: '▶', down: '▼', left: '◀' };
// Bord de la case cible par lequel arrive le feu, selon la direction de propagation.
const ENTRY_EDGE = { up: 'bottom', right: 'left', down: 'top', left: 'right' };
// Bord de la case de l'intrus par lequel part son attaque.
const EXIT_EDGE = { up: 'top', right: 'right', down: 'bottom', left: 'left' };

export function renderBanner(el, state) {
  const systems = Object.entries(state.systems)
    .map(([key, s]) => `<span class="${s.hp <= 0 ? 'destroyed' : ''}" title="${SYSTEMS[key].name}">`
      + `${SYSTEMS[key].emoji} ${s.hp}/${VALUES.systemHp}</span>`)
    .join('');
  let outcome = '';
  if (state.outcome?.result === 'victory') outcome = '<span class="outcome win">Victoire : saut réussi !</span>';
  if (state.outcome?.result === 'defeat') outcome = `<span class="outcome lose">Défaite : ${state.outcome.cause}.</span>`;
  el.innerHTML = `
    <span class="turn">Tour ${state.turn} / ${VALUES.turns}</span>
    <span class="systems">${systems}</span>
    ${outcome}
    <span class="seed">Graine : ${state.seed}</span>`;
}

// `view` : { selectedId, gesture, moveTargets, gestureTargets }
// `handlers` : { onCellClick(pos), previewArea(pos) → positions | null }
export function renderBoard(el, state, view, handlers) {
  el.innerHTML = '';
  el.appendChild(label(''));
  for (let x = 0; x < WIDTH; x++) el.appendChild(label(cellName({ x, y: 0 }).slice(0, 1)));

  const cells = new Map();
  for (let y = 0; y < HEIGHT; y++) {
    el.appendChild(label(String(y + 1)));
    for (let x = 0; x < WIDTH; x++) {
      const pos = { x, y };
      const cell = renderCell(state, view, pos);
      cells.set(cellName(pos), cell);
      cell.addEventListener('click', () => handlers.onCellClick(pos));
      el.appendChild(cell);
    }
  }

  // Aperçu de la zone d'un geste au survol d'une cible.
  for (const target of view.gestureTargets) {
    const cell = cells.get(cellName(target));
    const area = handlers.previewArea(target) ?? [];
    cell.addEventListener('mouseenter', () => area.forEach((p) => cells.get(cellName(p))?.classList.add('preview')));
    cell.addEventListener('mouseleave', () => area.forEach((p) => cells.get(cellName(p))?.classList.remove('preview')));
  }
}

function label(text) {
  const d = document.createElement('div');
  d.className = 'label';
  d.textContent = text;
  return d;
}

function renderCell(state, view, pos) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  const tips = [cellName(pos)];
  cell.innerHTML = `<span class="name">${cellName(pos)}</span>`;

  const sys = systemAt(state, pos);
  if (sys) {
    const s = state.systems[sys];
    cell.classList.add('system');
    if (s.hp <= 0) cell.classList.add('destroyed');
    tips.push(`${SYSTEMS[sys].name} ${s.hp}/${VALUES.systemHp}`);
    cell.insertAdjacentHTML('beforeend',
      `<span>${SYSTEMS[sys].emoji}</span><span class="sys-hp">${s.hp}/${VALUES.systemHp}</span>`);
  }

  if (isOnFire(state, pos)) {
    cell.classList.add('fire');
    tips.push('en feu');
    cell.insertAdjacentHTML('beforeend', `<span class="fire-mark">${FIRE_EMOJI}</span>`);
  }

  const unit = unitAt(state, pos);
  if (unit) {
    const span = document.createElement('span');
    span.className = 'unit';
    if (unit.kind === 'crew') {
      span.textContent = ROLES[unit.role].emoji;
      tips.push(ROLES[unit.role].name);
      if (isFinished(unit)) span.classList.add('finished');
    } else {
      span.textContent = INTRUDER.emoji;
      tips.push(INTRUDER.name);
    }
    cell.appendChild(span);
    cell.insertAdjacentHTML('beforeend', `<span class="hp">${'♥'.repeat(unit.hp)}</span>`);
  }

  // Annonces.
  if (state.phase !== 'over') {
    if (state.announcements.volleys.some((v) => samePos(v.pos, pos))) {
      cell.classList.add('volley');
      tips.push('visée par une salve');
      cell.insertAdjacentHTML('beforeend', '<span class="volley-mark">🎯</span>');
    }
    const boarding = state.announcements.boarding;
    if (boarding && samePos(boarding.pos, pos)) {
      cell.classList.add('boarding');
      tips.push('abordage annoncé');
      cell.insertAdjacentHTML('beforeend', '<span class="boarding-mark">🌀</span>');
    }
    if (unit?.kind === 'intruder' && unit.attackDir) {
      tips.push(`attaque vers ${DIRECTIONS.find((d) => d.key === unit.attackDir).name}`);
      cell.insertAdjacentHTML('beforeend',
        `<span class="attack-arrow edge-${EXIT_EDGE[unit.attackDir]}">${ARROWS[unit.attackDir]}</span>`);
    }
    for (const attacker of state.units) {
      if (attacker.kind !== 'intruder' || !attacker.attackDir) continue;
      const dir = DIRECTIONS.find((d) => d.key === attacker.attackDir);
      if (samePos(step(attacker.pos, dir), pos)) {
        cell.classList.add('attacked');
        tips.push(`attaquée par l'intrus en ${cellName(attacker.pos)}`);
      }
    }
    for (const spread of state.announcements.spreads) {
      if (spread.cancelled || !samePos(spread.to, pos)) continue;
      const dir = directionBetween(spread.from, spread.to);
      cell.classList.add('spread');
      tips.push(`le feu arrive de ${cellName(spread.from)}`);
      cell.insertAdjacentHTML('beforeend',
        `<span class="spread-arrow edge-${ENTRY_EDGE[dir.key]}">${ARROWS[dir.key]}</span>`);
    }
  }

  // Sélection et cibles.
  if (view.selectedId) {
    const selected = findUnit(state, view.selectedId);
    if (selected && samePos(selected.pos, pos)) cell.classList.add('selected');
  }
  if (view.moveTargets.some((t) => samePos(t, pos))) cell.classList.add('reachable');
  if (view.gestureTargets.some((t) => samePos(t, pos))) cell.classList.add('gesture-target');

  cell.title = tips.join(' — ');
  return cell;
}

// Panneau du membre sélectionné : boutons de gestes et « Terminer ».
// `handlers` : { onGesture(gesture), onFinish() }
export function renderSelection(el, state, view, handlers) {
  el.innerHTML = '';
  const unit = view.selectedId ? findUnit(state, view.selectedId) : null;
  if (!unit) {
    el.textContent = state.phase === 'player'
      ? 'Cliquez sur un membre d\'équipage pour le sélectionner.'
      : '';
    return;
  }
  const role = ROLES[unit.role];
  const info = document.createElement('div');
  info.className = 'who';
  let hint;
  if (view.gesture) hint = 'cliquez sur une case en bleu.';
  else if (view.moveTargets.length) hint = 'cliquez sur une case en vert pour le déplacer, ou choisissez un geste.';
  else hint = 'choisissez un geste ou terminez.';
  info.textContent = `${role.emoji} ${role.name} (${unit.hp} PV, déplacement ${moveRange(unit)}) : ${hint}`;
  el.appendChild(info);

  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  for (const g of crewGestures(state, unit.id)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = GESTURES[g].name.charAt(0).toUpperCase() + GESTURES[g].name.slice(1)
      + (role.strong ? ' (fort)' : '');
    b.disabled = gestureTargets(state, unit.id, g).length === 0;
    if (view.gesture === g) b.classList.add('active');
    b.addEventListener('click', () => handlers.onGesture(g));
    buttons.appendChild(b);
  }
  const finish = document.createElement('button');
  finish.type = 'button';
  finish.textContent = 'Terminer';
  finish.addEventListener('click', handlers.onFinish);
  buttons.appendChild(finish);
  el.appendChild(buttons);
}

export function renderLog(el, state) {
  el.innerHTML = '';
  for (const entry of state.log) {
    const li = document.createElement('li');
    li.textContent = entry.text;
    if (entry.turn === state.turn) li.classList.add('current');
    if (entry.text.startsWith('—')) li.classList.add('turn-head');
    el.appendChild(li);
  }
  el.parentElement.scrollTop = el.parentElement.scrollHeight;
}
