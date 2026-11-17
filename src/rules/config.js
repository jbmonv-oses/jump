// Configuration du prototype : carte, rôles et toutes les valeurs chiffrées (section 2.11).
// Aucune autre partie du code ne doit contenir de valeur de réglage.

// Carte : `.` sol, `M` moteur, `B` bouclier, `O` oxygène, `P` pilotage,
// `1` `2` `3` cases de départ de l'équipage (ce sont des cases de sol).
export const MAP = [
  '.......',
  '...B...',
  '.M123P.',
  '...O...',
  '.......',
];

export const MAP_SYMBOLS = {
  floor: '.',
  systems: { M: 'engine', B: 'shield', O: 'oxygen', P: 'piloting' },
  crewStarts: ['1', '2', '3'],
};

export const SYSTEMS = {
  engine: { name: 'moteur', emoji: '⚙️' },
  shield: { name: 'bouclier', emoji: '🛡️' },
  oxygen: { name: 'oxygène', emoji: '🫧' },
  piloting: { name: 'pilotage', emoji: '🧭' },
};

export const GESTURES = {
  strike: { name: 'frapper' },
  extinguish: { name: 'éteindre' },
  repair: { name: 'réparer' },
};

// Ordre des directions pour départager les égalités : haut, droite, bas, gauche.
export const DIRECTIONS = [
  { key: 'up', name: 'le haut', dx: 0, dy: -1 },
  { key: 'right', name: 'la droite', dx: 1, dy: 0 },
  { key: 'down', name: 'le bas', dx: 0, dy: 1 },
  { key: 'left', name: 'la gauche', dx: -1, dy: 0 },
];

export const VALUES = {
  turns: 7,
  systemHp: 4,
  crewHp: 3,
  intruderHp: 2,
  move: { specialist: 4, generalist: 2, intruder: 2 },
  damage: { strike: 1, collision: 1, fire: 1, intruderAttack: 1, volley: 2 },
  knockback: { simple: 1, strong: 2 },
  repair: { simple: 1 }, // la version forte remet le système à `systemHp`
  volleysPerTurn: [1, 1, 1, 2, 2, 2, 3], // index 0 = tour 1
  volleySystemChance: { numerator: 1, denominator: 3 },
  boardingTurns: [1, 2, 4, 6],
  fireSpreadDivisor: 3, // ⌈F / 3⌉ propagations
  initialFires: 1,
  crewSize: 3,
};

// Rôles : `strong` indique la version forte du geste (spécialistes).
export const ROLES = {
  guard: {
    name: 'Garde', emoji: '💂', type: 'specialist',
    gestures: ['strike'], strong: true, fireImmune: false,
  },
  mechanic: {
    name: 'Mécano', emoji: '🔧', type: 'specialist',
    gestures: ['repair'], strong: true, fireImmune: false,
  },
  firefighter: {
    name: 'Pompier', emoji: '🧯', type: 'specialist',
    gestures: ['extinguish'], strong: true, fireImmune: true,
  },
  sapper: {
    name: 'Sapeur', emoji: '⛏️', type: 'generalist',
    gestures: ['strike', 'repair'], strong: false, fireImmune: false,
  },
  security: {
    name: 'Agent de sécurité', emoji: '🦺', type: 'generalist',
    gestures: ['strike', 'extinguish'], strong: false, fireImmune: false,
  },
  technician: {
    name: 'Technicien', emoji: '🧰', type: 'generalist',
    gestures: ['repair', 'extinguish'], strong: false, fireImmune: false,
  },
};

// Équipage imposé tant que l'écran de composition n'existe pas (étape 4).
export const DEFAULT_CREW = ['firefighter', 'guard', 'technician'];

export const INTRUDER = { name: 'Intrus', emoji: '👾' };
export const FIRE_EMOJI = '🔥';
