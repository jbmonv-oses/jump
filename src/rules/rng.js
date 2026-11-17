// Générateur pseudo-aléatoire à graine (mulberry32).
// L'état tient dans un entier 32 bits pour rester sérialisable en JSON.
// Toutes les fonctions sont pures : elles rendent la valeur tirée et le nouvel état.

const UINT32 = 0x100000000;

export function seedToRngState(seed) {
  // Accepte un nombre ou une chaîne ; une chaîne est hachée (FNV-1a).
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  let h = 0x811c9dc5;
  for (const ch of String(seed)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Rend { value, rng } avec value dans [0, 1[.
export function nextFloat(rng) {
  const s = (rng + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / UINT32;
  return { value, rng: s };
}

// Entier dans [0, n[.
export function nextInt(rng, n) {
  const r = nextFloat(rng);
  return { value: Math.floor(r.value * n), rng: r.rng };
}

// Élément tiré au sort dans une liste non vide.
export function pick(rng, list) {
  const r = nextInt(rng, list.length);
  return { value: list[r.value], rng: r.rng };
}

export function randomSeed() {
  return Math.floor(Math.random() * UINT32) >>> 0;
}
