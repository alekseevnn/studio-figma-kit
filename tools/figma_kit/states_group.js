// States & cases, grouped by topic (Can, 20 Oct 2026). Stored in each file's root plugin data as claudekit/statesgroup;
// run it with globals set: globalThis.PAGE_ID = '8:7'; globalThis.GROUPS = [['Topic name', [['desktopId', 'mobileId', …], ['desktopOnlyId'], …]], …];
// Each topic becomes a section inside the page's "States & cases" section, with its heading as a text layer "Title"
// (Title/H1, applied directly: titles are Inter since 20 Oct 2026). In a topic every case is a pair: the desktop frame first,
// its mobile frame(s) right beside it 40 apart, cases 160 apart, one row. Topics stack 160 apart; the parent fits them and
// the page's sections are re-stacked 200 apart (Screens, States & cases, Interaction notes, Responsive). Frames keep
// their ids, so Jira links hold. Every frame of the section must be placed (the call throws before any change if not).
// For a file with only phone frames (Mobile App) a "pair" is simply the related phone frames side by side.
const PAGE_ID = globalThis.PAGE_ID, GROUPS = globalThis.GROUPS;
const IN = 40, PAIR = 160, PADX = 100, TOP = 204, BOT = 100, GAPY = 160, H1KEY = '2e4238afa63a1ebd195489da69528928b8720ceb';
const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
const parent = page.children.find(s => s.type === 'SECTION' && s.name === 'States & cases');
const used = new Set(GROUPS.flatMap(g => g[1].flat()));
const all = parent.findAll(n => n.type !== 'SECTION' && n.type !== 'TEXT' && n.parent && n.parent.type === 'SECTION');
const left = all.filter(c => !used.has(c.id)).map(c => c.id + ' ' + c.name);
if (left.length) throw new Error('not placed: ' + left.join(', '));
for (const id of used) if (!(await figma.getNodeByIdAsync(id))) throw new Error('missing ' + id);
let fill = JSON.parse(JSON.stringify(parent.fills));
try {
  for (const c of (await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()).filter(c => /Foundations/.test(c.name))) {
    const v = (await figma.teamLibrary.getVariablesInLibraryCollectionAsync(c.key)).find(v => v.name === 'neutral/900');
    if (v) { fill = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.09, g: 0.094, b: 0.102 } }, 'color', await figma.variables.importVariableByKeyAsync(v.key))]; break; }
  }
} catch (e) { }
const textPrimary = await (async () => {
  try { for (const c of (await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()).filter(c => /Tokens/.test(c.name))) {
    const v = (await figma.teamLibrary.getVariablesInLibraryCollectionAsync(c.key)).find(v => v.name === 'text/primary');
    if (v) return await figma.variables.importVariableByKeyAsync(v.key); } } catch (e) { } return null; })();
await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
let y = 100, maxW = 0; const made = [];
for (const [name, pairs] of GROUPS) {
  let S = parent.children.find(c => c.type === 'SECTION' && c.name === name);
  if (!S) { S = figma.createSection(); S.name = name; parent.appendChild(S); }
  S.fills = fill;
  let t = S.children.find(c => c.type === 'TEXT' && c.name === 'Title');
  if (!t) { t = figma.createText(); S.appendChild(t); t.name = 'Title'; }
  t.fontName = { family: 'Inter', style: 'Medium' }; t.fontSize = 56; t.lineHeight = { unit: 'PIXELS', value: 64 }; t.letterSpacing = { unit: 'PERCENT', value: -2.4 };
  t.characters = name; t.x = 100; t.y = 100;
  if (textPrimary) t.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.988, g: 0.992, b: 1 } }, 'color', textPrimary)];
  await t.setTextStyleIdAsync((await figma.importStyleByKeyAsync(H1KEY)).id);   // Title/H1 (Inter since 20 Oct 2026)
  let x = PADX, h = 0;
  for (const pair of pairs) {
    for (let i = 0; i < pair.length; i++) {
      const n = await figma.getNodeByIdAsync(pair[i]); if (n.parent !== S) S.appendChild(n);
      n.x = x; n.y = TOP; x += Math.round(n.width) + (i < pair.length - 1 ? IN : 0); h = Math.max(h, n.height);
    }
    x += PAIR;
  }
  const w = Math.max(x - PAIR + PADX, Math.round(t.width) + 200);
  S.x = 100; S.y = y; S.resizeWithoutConstraints(w, Math.round(TOP + h + BOT));
  y += Math.round(S.height) + GAPY; maxW = Math.max(maxW, w); made.push({ id: S.id, name });
}
for (const S of parent.children.filter(c => c.type === 'SECTION' && !GROUPS.some(g => g[0] === c.name))) if (!S.children.length) S.remove();
for (const t of parent.children.filter(c => c.type === 'TEXT' && c.name === 'Row title')) t.remove();   // the old row headings: the topics replace them
parent.resizeWithoutConstraints(maxW + 200, y - GAPY + 100);
const ORDER = ['Screens', 'States & cases', 'Interaction notes', 'Responsive'];
const secs = page.children.filter(c => c.type === 'SECTION');
let yy = 0; for (const s of [...ORDER.map(n => secs.find(x => x.name === n)).filter(Boolean), ...secs.filter(s => !ORDER.includes(s.name))]) { s.x = 0; s.y = yy; yy += Math.round(s.height) + 200; }
const hit = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const bad = []; for (const S of parent.children.filter(c => c.type === 'SECTION')) { const k = S.children; for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) if (hit(k[i], k[j])) bad.push(S.name + ': ' + k[i].name + ' / ' + k[j].name); }
return { page: page.name, made, parent: [parent.id, parent.width, parent.height], overlaps: bad, textBound: !!textPrimary };
