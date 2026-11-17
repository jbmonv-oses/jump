// Phase 3 : résolution (section 2.5).
// Étape 1 du prototype : aucune menace à résoudre, le tour passe simplement.
// Ordre prévu : attaques des intrus, dégâts du feu, salves, propagation, arrivée de l'intrus.

import { VALUES } from './config.js';
import { announce } from './announce.js';

export function resolveTurn(state) {
  if (state.phase !== 'player') throw new Error('La résolution suit la phase du joueur.');
  const next = structuredClone(state);
  next.phase = 'resolve';
  next.log.push({ turn: next.turn, text: `Fin du tour ${next.turn} : rien à résoudre.` });
  return next;
}

// Termine la phase du joueur : résolution, puis tour suivant ou fin de partie.
export function endTurn(state) {
  const resolved = resolveTurn(state);
  if (resolved.turn >= VALUES.turns) {
    resolved.phase = 'over';
    resolved.outcome = { result: 'victory', cause: null };
    resolved.log.push({ turn: resolved.turn, text: 'Le moteur de saut est chargé : saut !' });
    return resolved;
  }
  resolved.turn += 1;
  return announce(resolved);
}
