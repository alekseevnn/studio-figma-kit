// Page layout check and fix for the screen files (Platform, Mobile App). Run in use_figma; it walks every page.
// 1. Interaction notes: a card whose content is taller than its fixed height, or cards that overlap, make the whole
//    section re-flow: every card hugs its content, cards stack per column 80 apart from y 100, the section fits them.
// 2. Sections: when any two overlap, they are stacked at x 0, 200 apart, in the order below (others after them).
// Returns, per page, "ok" or what it fixed. Read-only use: set FIX = false.
const FIX = globalThis.FIX !== undefined ? globalThis.FIX : false;   // read-only unless FIX = true
const ORDER = ['Screens', 'States & cases', 'Interaction notes', 'Responsive'];
const hit = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const res = {};
for (const pg of figma.root.children) {
  await pg.loadAsync();
  const secs = pg.children.filter(c => c.type === 'SECTION'); if (!secs.length) continue;
  const did = [];
  const notes = secs.find(s => s.name === 'Interaction notes');
  if (notes) {
    const cards = notes.children.filter(c => c.type === 'FRAME'); let bad = false;
    for (const c of cards) if (c.layoutMode === 'VERTICAL' && c.primaryAxisSizingMode === 'FIXED') {
      const need = c.children.reduce((m, k) => Math.max(m, k.y + k.height), 0) + c.paddingBottom; if (need > c.height + 1) bad = true; }
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) if (hit(cards[i], cards[j])) bad = true;
    if (bad && FIX) {
      for (const c of cards) if (c.layoutMode === 'VERTICAL') c.primaryAxisSizingMode = 'AUTO';
      const cols = {}; for (const c of cards) (cols[Math.round(c.x)] = cols[Math.round(c.x)] || []).push(c);
      let mb = 0; for (const l of Object.values(cols)) { l.sort((a, b) => a.y - b.y); let y = 100; for (const c of l) { c.y = y; y += Math.round(c.height) + 80; mb = Math.max(mb, c.y + c.height); } }
      notes.resizeWithoutConstraints(notes.width, Math.round(mb + 100));
    }
    if (bad) did.push('notes re-flowed');
  }
  let ov = false; for (let i = 0; i < secs.length; i++) for (let j = i + 1; j < secs.length; j++) if (hit(secs[i], secs[j])) ov = true;
  if (ov && FIX) { let y = 0; const list = [...ORDER.map(n => secs.find(s => s.name === n)).filter(Boolean), ...secs.filter(s => !ORDER.includes(s.name))];
    for (const s of list) { s.x = 0; s.y = y; y += Math.round(s.height) + 200; } }
  if (ov) did.push('sections re-stacked');
  res[pg.name] = did.length ? did.join(', ') : 'ok';
}
return res;
