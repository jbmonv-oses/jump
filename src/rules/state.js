// État initial de la partie (section 2.10).
// L'état est un objet simple, sérialisable en JSON, qui contient tout.

import { ROLES, VALUES } from './config.js';
import { WIDTH, HEIGHT, readMap, samePos } from './grid.js';
import { seedToRngState, pick } from './rng.js';
import { announce } from './announce.js';

export function emptyFireGrid() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(false));
}

export function emptyAnnouncements() {
  return { volleys: [], spreads: [], boarding: null };
}

// Mise en place sans la phase 1 : utile aux tests qui composent une situation.
export function setupGame({ seed, crew }) {
  if (crew.length !== VALUES.crewSize || new Set(crew).size !== crew.length) {
    throw new Error(`L'équipage doit compter ${VALUES.crewSize} rôles différents.`);
  }
  for (const role of crew) {
    if (!ROLES[role]) throw new Error(`Rôle inconnu : ${role}`);
  }

  const map = readMap();
  let rng = seedToRngState(seed);

  const systems = {};
  for (const [key, pos] of Object.entries(map.systems)) {
    systems[key] = { pos, hp: VALUES.systemHp };
  }

  const units = crew.map((role, i) => ({
    id: `c${i + 1}`,
    kind: 'crew',
    role,
    pos: map.crewStarts[i],
    hp: VALUES.crewHp,
    moved: false,
    acted: false,
    scorched: false, // brûlé par un recul ce tour-ci (pas de 2e dégât de feu)
  }));

  // Feu initial : cases de sol tirées au sort, hors cases de départ.
  const fire = emptyFireGrid();
  let candidates = map.floor.filter((p) => !map.crewStarts.some((s) => samePos(s, p)));
  for (let i = 0; i < VALUES.initialFires && candidates.length > 0; i++) {
    const r = pick(rng, candidates);
    rng = r.rng;
    fire[r.value.y][r.value.x] = true;
    candidates = candidates.filter((p) => !samePos(p, r.value));
  }

  return {
    seed,
    rng,
    turn: 1,
    phase: 'announce',
    outcome: null,
    systems,
    units,
    nextUnitId: 1, // compteur des intrus (ordre d'arrivée)
    fire,
    announcements: emptyAnnouncements(),
    log: [],
  };
}

// Crée une partie et joue la phase 1 du tour 1.
// `crew` : liste ordonnée de clés de rôles (trois rôles différents).
export function createGame({ seed, crew }) {
  return announce(setupGame({ seed, crew }));
}
