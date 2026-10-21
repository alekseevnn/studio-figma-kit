// notes_hashes: read-only. Returns {pageId: {cardId: hash}} for every Interaction notes card in the file (the hash
// notes_sync.py stored when it built the card; '' for cards built before 21 Oct 2026). Optional global SEED
// ({pageId: {cardId: hash}}): writes those hashes into the cards' note data instead (one-time, when Figma is known to
// match the JSON).
const SEED = globalThis.SEED || null, out = {};
for (const p of figma.root.children) { await p.loadAsync();
  const sec = p.children.find(s => s.type === 'SECTION' && /Interaction notes/.test(s.name)); if (!sec) continue;
  const m = out[p.id] = {};
  for (const n of [sec, ...sec.children.filter(x => x.type === 'SECTION')].flatMap(S => S.children.filter(n => n.name.startsWith('Note · ')))) {
    let d; try { d = JSON.parse(n.getSharedPluginData('claudekit', 'note')); } catch (e) { continue; }
    if (SEED && SEED[p.id] && SEED[p.id][d.id] !== undefined) { d.hash = SEED[p.id][d.id]; n.setSharedPluginData('claudekit', 'note', JSON.stringify(d)); }
    m[d.id] = d.hash || ''; } }
return out;
