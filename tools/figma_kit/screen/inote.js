// claudekit/inote: rebuilds a page's Interaction notes section from structured notes (Can, 20 Oct 2026).
// Each card: ID + title, where it applies, a one-line summary, "How it works" (numbered trigger → result steps),
// "Rules and edge cases", "See it in" (rows linking to the frames that show it, each with what it shows) and the
// Agent note (exact values for a coding agent). Every linked frame gets a "Notes:" line in its Caption linking back
// to its cards, so the screens and the notes point at each other.
// Globals: PAGE_ID, CARDS (array, already filtered and worded for this file: {id, title, for, summary, steps, edge,
// see: [[frameId, label]], agent}), COLS (default 3). Run in batches: RESET=true on the first batch removes the old
// "Note · …" cards and the frames' "Notes" lines; each call appends its CARDS; FINISH=true (CARDS may be []) lays the
// cards out by ID, writes the back-links and re-stacks the page's sections.
const AF = Object.getPrototypeOf(async function(){}).constructor;
const K = await new AF(figma.root.getSharedPluginData('claudekit', 'skit'))();
const PAGE_ID = globalThis.PAGE_ID, CARDS = globalThis.CARDS || [], COLS = globalThis.COLS || 3, RESET = !!globalThis.RESET, FINISH = !!globalThis.FINISH;
const REMOVE = globalThis.REMOVE || [];   // ids of cards to delete (notes_sync.py); a card in CARDS also replaces its old copy
const W = 760, GAP = 80, PAD = 100;
const nb = (s) => { const i = s.lastIndexOf(' '); return i > 0 ? s.slice(0, i) + ' ' + s.slice(i + 1) : s; };
const FOR = { desktop: 'Desktop', 'mobile web': 'Mobile web', app: 'App' };
const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && /Interaction notes/.test(s.name));
if (!sec) throw new Error('no Interaction notes section');
// frames
const frames = {}; const missing = [];
for (const c of CARDS) for (const [id] of c.see || []) { if (frames[id]) continue; const f = await figma.getNodeByIdAsync(id); if (!f) missing.push(id); else frames[id] = f; }
if (missing.length) throw new Error('frames not found: ' + missing.join(', '));
const capOf = (f) => f.children && f.children.find(c => c.name === 'Caption');
if (RESET) { for (const n of sec.children.filter(n => n.name.startsWith('Note · ') || (n.type === 'SECTION' && n.getSharedPluginData('claudekit', 'noteGroup')))) n.remove();
  for (const t of page.findAll(n => n.type === 'TEXT' && n.name === 'Notes' && n.parent && n.parent.name === 'Caption')) t.remove(); }
// Incremental updates (Can, 21 Oct 2026): drop the old copy of every card being rebuilt and every card in REMOVE
{ const drop = new Set([...REMOVE, ...CARDS.map(c => c.id)]);
  if (drop.size) for (const n of [sec, ...sec.children.filter(x => x.type === 'SECTION')].flatMap(S => S.children.filter(n => n.name.startsWith('Note · ')))) {
    const d = n.getSharedPluginData('claudekit', 'note'); let id = null; try { id = JSON.parse(d).id; } catch (e) { }
    if (id && drop.has(id)) n.remove(); } }
const label = async (p, s) => K.text(p, s, 'Label/Small', 'text/tertiary', { name: 'Label' });
// Thumbnails of the linked frames (the screen without its caption; a full-length page shows its first viewport)
const THUMB_H = 88, thumbs = {};
const thumbOf = async (f) => { if (thumbs[f.id]) return thumbs[f.id];
  const scr = capOf(f) ? ((f.children || []).find(c => c.name !== 'Caption' && c.type !== 'TEXT' && c.width > 200) || f) : f;
  const phone = scr.width < 600, vh = phone ? scr.width * 874 / 402 : scr.width * 900 / 1440, tall = scr.height > vh * 1.15;
  const bytes = await scr.exportAsync({ format: 'PNG', constraint: { type: 'WIDTH', value: phone ? 120 : 360 } });
  return thumbs[f.id] = { hash: figma.createImage(bytes).hash, ratio: scr.width / (tall ? vh : scr.height), crop: tall ? vh / scr.height : 1 }; };
const putThumb = async (parent, f) => { const t = await thumbOf(f); const r = figma.createRectangle(); parent.appendChild(r); r.name = 'Thumbnail';
  const w = Math.min(160, Math.round(THUMB_H * t.ratio)); r.resize(w, Math.round(w / t.ratio)); await K.radius(r, 8);
  r.fills = [t.crop < 1 ? { type: 'IMAGE', imageHash: t.hash, scaleMode: 'CROP', imageTransform: [[1, 0, 0], [0, t.crop, 0]] } : { type: 'IMAGE', imageHash: t.hash, scaleMode: 'FILL' }]; return r; };
// Diagrams: flow (rows of state boxes and labelled arrows) or timeline (segments to scale)
const diagram = async (card, D) => { if (!D) return;
  const box = await K.al(card, 'VERTICAL', { name: 'Diagram', gap: 12, p: 20, r: 16, fill: 'bg/level-0', fillW: true });
  if (D.kind === 'flow') for (const row of D.rows || []) {
    const r = await K.al(box, 'HORIZONTAL', { name: 'Row', gap: 8, cross: 'CENTER', wrap: true, rowGap: 8, fillW: true });
    for (const it of row) {
      if (it && it.label) { await K.text(r, it.label, 'Label/Small', 'text/tertiary', { name: 'Row label' }); continue; }
      if (it && it.e !== undefined) { const e = await K.al(r, 'VERTICAL', { name: 'Arrow', gap: 0, cross: 'CENTER' });
        if (it.e) await K.text(e, it.e, 'Paragraph/X Small', 'text/tertiary', { name: 'Trigger' });
        await K.text(e, '→', 'Label/Medium', 'text/tertiary', { name: 'Arrow' }); continue; }
      const hl = it && it.hl, n = await K.al(r, 'HORIZONTAL', { name: 'State', p: [8, 12, 8, 12], r: 12, fill: hl ? 'text/primary' : 'bg/level-2' });
      await K.text(n, typeof it === 'string' ? it : it.n, 'Label/Small', hl ? 'text/contrast' : 'text/primary', { name: 'Label' }); } }
  if (D.kind === 'timeline') {
    const segs = D.segments || [], tot = segs.reduce((a, s) => a + s[1], 0) || 1, unit = D.unit || 'ms', fmt = (v) => unit === 'ms' && v >= 1000 ? (v / 1000) + ' s' : v + ' ' + unit;
    const tr = await K.al(box, 'HORIZONTAL', { name: 'Track', gap: 4, fillW: true });
    const W0 = 656 - 4 * (segs.length - 1);
    for (const [i, [nm, v]] of segs.entries()) { const sg = await K.al(tr, 'VERTICAL', { name: 'Segment', gap: 6 });
      const w = Math.max(64, Math.round(W0 * v / tot)); sg.resize(w, 10); sg.counterAxisSizingMode = 'FIXED'; sg.primaryAxisSizingMode = 'AUTO';
      const bar = figma.createRectangle(); sg.appendChild(bar); bar.name = 'Bar'; bar.resize(w, 10); bar.layoutSizingHorizontal = 'FILL'; await K.fill(bar, i % 2 ? 'text/tertiary' : 'text/primary'); await K.radius(bar, 'full');
      await K.text(sg, nm, 'Label/Small', 'text/primary', { name: 'Name', fillW: true }); await K.text(sg, fmt(v), 'Paragraph/X Small', 'text/tertiary', { name: 'Time', fillW: true }); }
    if (D.marks && D.marks.length) await K.text(box, nb(D.marks.map(([nm, v]) => nm + ' at ' + fmt(v)).join(' · ')), 'Paragraph/X Small', 'text/tertiary', { name: 'Marks', fillW: true });
  }
};
const built = [];
for (const c of CARDS) {
  const card = await K.al(sec, 'VERTICAL', { name: 'Note · ' + c.id + ' · ' + c.title, gap: 20, p: 32, r: 24, fill: 'bg/level-1' });
  card.resize(W, 10); card.counterAxisSizingMode = 'FIXED'; card.primaryAxisSizingMode = 'AUTO';
  const head = await K.al(card, 'VERTICAL', { name: 'Head', gap: 8, fillW: true });
  const tr = await K.al(head, 'HORIZONTAL', { name: 'Title row', gap: 12, cross: 'CENTER', fillW: true });
  const pill = await K.al(tr, 'HORIZONTAL', { name: 'ID', p: [4, 10, 4, 10], r: 'full', fill: 'bg/level-2' });
  await K.text(pill, c.id, 'Label/Small', 'text/primary', { name: 'ID' });
  const tt = await K.text(tr, c.title, 'Label/X Large', 'text/primary', { name: 'Title' }); tt.textAutoResize = 'HEIGHT'; tt.layoutSizingHorizontal = 'FILL';
  await K.text(head, (c.for || []).map(x => FOR[x] || x).join(' · '), 'Label/Small', 'text/tertiary', { name: 'For' });
  if (c.summary) await K.text(head, nb(c.summary), 'Paragraph/Medium', 'text/secondary', { name: 'Summary', fillW: true });
  await diagram(card, c.diagram);
  const block = async (name, items, numbered) => { if (!items || !items.length) return;
    const b = await K.al(card, 'VERTICAL', { name, gap: 8, fillW: true }); await label(b, name);
    for (const [i, s] of items.entries()) { const r = await K.al(b, 'HORIZONTAL', { name: 'Item', gap: 8, fillW: true });
      const m = await K.text(r, numbered ? String(i + 1) : '•', 'Label/Small', 'text/tertiary', { name: 'Mark' }); m.textAutoResize = 'HEIGHT'; m.resize(16, m.height); m.layoutSizingHorizontal = 'FIXED';
      const t = await K.text(r, nb(s), 'Paragraph/Small', 'text/primary', { name: 'Text' }); t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FILL'; } };
  await block('How it works', c.steps, true);
  await block('Rules and edge cases', c.edge, false);
  if (c.see && c.see.length) { const b = await K.al(card, 'VERTICAL', { name: 'See it in', gap: 8, fillW: true }); await label(b, 'See it in');
    for (const [id, what] of c.see) { const f = frames[id]; const r = await K.al(b, 'HORIZONTAL', { name: 'Link', gap: 14, p: [10, 14, 10, 10], r: 12, fill: 'bg/level-2', cross: 'CENTER', fillW: true });
      await putThumb(r, f);
      const col = await K.al(r, 'VERTICAL', { name: 'Text', gap: 2 }); col.layoutSizingHorizontal = 'FILL';
      const t = await K.text(col, '↗ ' + f.name, 'Label/Small', 'text/primary', { name: 'Frame', fillW: true }); t.setRangeHyperlink(0, t.characters.length, { type: 'NODE', value: id });
      if (what) await K.text(col, nb(what), 'Paragraph/X Small', 'text/tertiary', { name: 'Shows', fillW: true }); } }
  if (c.agent && c.agent.length) {
    const a = await K.al(card, 'VERTICAL', { name: 'Agent note', gap: 8, p: 20, r: 16, fill: 'bg/level-0', fillW: true });
    const hd = await K.al(a, 'VERTICAL', { name: 'Head', gap: 2, fillW: true });
    await K.text(hd, 'Agent note', 'Label/Small', 'text/primary', { name: 'Title' });
    await K.text(hd, nb('For your coding agent: the exact values to rebuild this as in the prototype.'), 'Paragraph/X Small', 'text/tertiary', { name: 'Sub', fillW: true });
    for (const s of c.agent) await K.text(a, nb(s), 'Paragraph/Small', 'text/secondary', { name: 'Spec', fillW: true });
  }
  card.setSharedPluginData('claudekit', 'note', JSON.stringify({ id: c.id, title: c.title, group: c.group || '', see: (c.see || []).map(x => x[0]), hash: c.hash || '' }));
  card.x = -2000; card.y = 0; built.push(c.id);
}
if (!FINISH) return { built, missing };
const allCards = [sec, ...sec.children.filter(n => n.type === 'SECTION')].flatMap(S => S.children.filter(n => n.name.startsWith('Note · ')));
const all = allCards.map(n => [JSON.parse(n.getSharedPluginData('claudekit', 'note') || '{}'), n]).sort((a, b) => a[0].id < b[0].id ? -1 : 1);
for (const [c] of all) for (const id of c.see || []) if (!frames[id]) { const f = await figma.getNodeByIdAsync(id); if (f) frames[id] = f; }
// Grouped like States & cases (Can, 20 Oct 2026): one section per topic, its heading in Title/H1, the cards in one row in
// reading order (by ID), 80 apart; topics stack 160 apart. A card with no group goes into "More".
const groups = []; for (const [c, card] of all) { const g = c.group || 'More'; let G = groups.find(x => x.name === g); if (!G) groups.push(G = { name: g, cards: [] }); G.cards.push(card); }
// Sub-section style (Can, 21 Oct 2026): neutral/900 by its DS key (the old library lookup fell back to the parent's grey)
const fill = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.09, g: 0.094, b: 0.102 } }, 'color', await figma.variables.importVariableByKeyAsync('fb5495d0da5c4353204b440482545d8ff4368f46'))];
const H1 = await figma.importStyleByKeyAsync('2e4238afa63a1ebd195489da69528928b8720ceb');
await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
const keep = sec.children.filter(n => !n.name.startsWith('Note · ') && !(n.type === 'SECTION' && n.getSharedPluginData('claudekit', 'noteGroup')));
let gy = keep.reduce((m, n) => Math.max(m, n.y + n.height), 0) + (keep.length ? 100 : PAD), maxW = 0;
const oldG = sec.children.filter(n => n.type === 'SECTION' && n.getSharedPluginData('claudekit', 'noteGroup'));
for (const G of groups) {
  let S = oldG.find(x => x.name === G.name); if (!S) { S = figma.createSection(); sec.appendChild(S); S.name = G.name; S.setSharedPluginData('claudekit', 'noteGroup', '1'); }
  S.fills = fill; S.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.1 }]; S.strokeWeight = 1; S.strokeAlign = 'INSIDE';   // sub-section style (Can, 21 Oct 2026)
  let t = S.children.find(c => c.type === 'TEXT' && c.name === 'Title'); if (!t) { t = figma.createText(); S.appendChild(t); t.name = 'Title'; }
  t.fontName = { family: 'Inter', style: 'Medium' }; t.characters = G.name; await t.setTextStyleIdAsync(H1.id); await K.fill(t, 'text/primary'); t.x = 100; t.y = 100;
  let x = PAD, h = 0; for (const card of G.cards) { if (card.parent !== S) S.appendChild(card); card.x = x; card.y = 204; x += W + GAP; h = Math.max(h, card.height); }
  const w = Math.max(x - GAP + PAD, Math.round(t.width) + 200); S.x = PAD; S.y = gy; S.resizeWithoutConstraints(w, Math.round(204 + h + 100));
  gy += Math.round(S.height) + 160; maxW = Math.max(maxW, w);
}
for (const S of oldG) if (!groups.some(g => g.name === S.name)) S.remove();
sec.resizeWithoutConstraints(Math.max(PAD * 2 + maxW, ...keep.map(n => n.x + n.width + PAD)), gy - 160 + PAD);
// back-links
const linked = {};
for (const [c, card] of all) for (const id of c.see || []) (linked[id] = linked[id] || []).push([c, card]);
const noCap = [];
for (const [id, list] of Object.entries(linked)) { const f = frames[id]; if (!f) { noCap.push('missing ' + id); continue; } const cap = capOf(f); if (!cap) { noCap.push(f.name); continue; }
  for (const t of cap.children.filter(t => t.name === 'Notes')) t.remove();
  let s = 'Notes: '; const parts = []; for (const [i, [c, card]] of list.entries()) { const seg = list.length > 3 ? c.id : c.id + ' ' + c.title; parts.push([s.length, s.length + seg.length, card.id]); s += seg + (i < list.length - 1 ? ' · ' : ''); }
  const t = await K.text(cap, nb(s), 'Paragraph/X Small', 'text/tertiary', { name: 'Notes', fillW: true });
  for (const [a, b, cid] of parts) { t.setRangeHyperlink(a, b, { type: 'NODE', value: cid }); t.setRangeTextDecoration(a, b, 'UNDERLINE'); } }
// re-stack the page's sections 200 apart in order
const ORDER = ['Screens', 'States & cases', 'Interaction notes', 'Responsive'];
const secs = page.children.filter(c => c.type === 'SECTION');
const list = [...ORDER.map(n => secs.find(s => s.name === n)).filter(Boolean), ...secs.filter(s => !ORDER.includes(s.name))];
let y = list[0].y; for (const s of list) { s.y = y; y += Math.round(s.height) + 200; }
return { cards: all.length, linkedFrames: Object.keys(linked).length, noCaption: noCap, section: [sec.id, Math.round(sec.width), Math.round(sec.height)] };
