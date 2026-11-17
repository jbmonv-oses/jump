// Phase 1 : annonces (section 2.5).
// Étape 1 du prototype : aucune menace n'est encore annoncée.
// Ordre prévu : intrus (déplacement puis annonce), salves, propagations, abordage.

export function announce(state) {
  const next = structuredClone(state);
  next.announcements = { volleys: [], spreads: [], boarding: null };
  for (const unit of next.units) {
    if (unit.kind === 'crew') {
      unit.moved = false;
      unit.acted = false;
    }
  }
  next.log.push({ turn: next.turn, text: `Tour ${next.turn} : aucune menace annoncée.` });
  next.phase = 'player';
  return next;
}
