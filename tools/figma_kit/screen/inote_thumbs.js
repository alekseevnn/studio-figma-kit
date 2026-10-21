// inote_thumbs: refreshes the "See it in" thumbnails (and frame names) of a page's Interaction notes cards without
// rebuilding the cards (Can, 21 Oct 2026: a frame change used to mean rebuilding every card, hours of calls). Use it
// whenever frames changed but the notes' text did not; rebuild with inote.js only when the text changes.
// Self-contained (no plugin-data code). Globals: PAGE_ID (required), FRAMES (optional array of frame ids: refresh only
// the thumbnails of these frames), FROM / COUNT (optional: refresh the links from FROM to FROM + COUNT − 1, to split a
// big page over several calls). Returns how many thumbnails were refreshed and the next FROM if there are more.
const PAGE_ID = globalThis.PAGE_ID, ONLY = globalThis.FRAMES ? new Set(globalThis.FRAMES) : null;
const FROM = globalThis.FROM || 0, COUNT = globalThis.COUNT || 1e9;
const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && /Interaction notes/.test(s.name));
if (!sec) return { error: 'no Interaction notes section' };
const cards = [sec, ...sec.children.filter(x => x.type === 'SECTION')].flatMap(S => S.children.filter(n => n.name.startsWith('Note · ')));
const links = [];
for (const card of cards) { const see = card.findOne(n => n.type === 'FRAME' && n.name === 'See it in'); if (!see) continue;
  for (const row of see.children.filter(n => n.name === 'Link')) {
    const t = row.findOne(n => n.type === 'TEXT' && n.name === 'Frame'), r = row.findOne(n => n.type === 'RECTANGLE' && n.name === 'Thumbnail');
    if (!t || !r) continue; const h = t.getRangeHyperlink(0, 1); if (!h || h === figma.mixed || h.type !== 'NODE') continue;
    if (ONLY && !ONLY.has(h.value)) continue; links.push([card, t, r, h.value]); } }
const THUMB_H = 88, thumbs = {}, missing = [];
const capOf = (f) => f.children && f.children.find(c => c.name === 'Caption');
const thumbOf = async (f) => { if (thumbs[f.id]) return thumbs[f.id];
  const scr = capOf(f) ? ((f.children || []).find(c => c.name !== 'Caption' && c.type !== 'TEXT' && c.width > 200) || f) : f;
  const phone = scr.width < 600, vh = phone ? scr.width * 874 / 402 : scr.width * 900 / 1440, tall = scr.height > vh * 1.15;
  const bytes = await scr.exportAsync({ format: 'PNG', constraint: { type: 'WIDTH', value: phone ? 120 : 360 } });
  return thumbs[f.id] = { hash: figma.createImage(bytes).hash, ratio: scr.width / (tall ? vh : scr.height), crop: tall ? vh / scr.height : 1 }; };
let done = 0;
const slice = links.slice(FROM, FROM + COUNT);
for (const [card, t, r, id] of slice) {
  const f = await figma.getNodeByIdAsync(id); if (!f) { missing.push(id); continue; }
  const th = await thumbOf(f); const w = Math.min(160, Math.round(THUMB_H * th.ratio)); r.resize(w, Math.round(w / th.ratio));
  r.fills = [th.crop < 1 ? { type: 'IMAGE', imageHash: th.hash, scaleMode: 'CROP', imageTransform: [[1, 0, 0], [0, th.crop, 0]] } : { type: 'IMAGE', imageHash: th.hash, scaleMode: 'FILL' }];
  const name = '↗ ' + f.name;
  if (t.characters !== name) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); t.characters = name; t.setRangeHyperlink(0, name.length, { type: 'NODE', value: id }); }
  done++; }
const next = FROM + COUNT < links.length ? FROM + COUNT : null;
return { page: page.name, cards: cards.length, links: links.length, refreshed: done, frames: Object.keys(thumbs).length, missing, next };
