// Measure prototype parts for the Figma comparison (tools/figma_audit/compare.py).
// Usage: NODE_PATH=<global node_modules> node tools/figma_audit/proto.js [entry-id ...] > proto.json
// Needs the prototype served on http://localhost:8801 (cd p-4f6cb6 && python3 -m http.server 8801).
// Each entry in map.json: {id, url, viewport:[w,h], mobile?, setup?:[ops], root, parts:[{name, css, fig, checks}]}
// setup ops: {"wait":ms} {"scroll":sel} {"hover":sel} {"click":sel} {"eval":"js"}
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, process.env.MAP || 'map.json'), 'utf8'));
const want = process.argv.slice(2);
const FONT = fs.readFileSync(path.join(__dirname, 'fonts', 'inter-opsz.woff2'));
const BASE = process.env.PROTO_BASE || 'http://localhost:8801/index.html';

const measure = (root, parts) => {
  const R = (e) => e.getBoundingClientRect();
  const rgba = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map(x => parseFloat(x)); return [v[0], v[1], v[2], v[3] == null ? 1 : v[3]]; };
  const r0 = document.querySelector(root); if (!r0) return {error: 'root not found: ' + root};
  const rb = R(r0), out = {root: {w: rb.width, h: rb.height}};
  for (const p of parts){
    const e = p.css === ':root' ? r0 : (p.nth != null ? r0.querySelectorAll(p.css)[p.nth] : r0.querySelector(p.css));
    if (!e) { out[p.name] = {missing: true}; continue; }
    const b = R(e), s = getComputedStyle(e);
    const o = {x: b.left - rb.left, y: b.top - rb.top, w: b.width, h: b.height, r: b.right - rb.left, b: b.bottom - rb.top,
      radius: parseFloat(s.borderTopLeftRadius) || 0,
      pad: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat),
      gap: parseFloat(s.rowGap) || parseFloat(s.columnGap) || 0,
      font: {size: parseFloat(s.fontSize), lh: parseFloat(s.lineHeight) || null, weight: +s.fontWeight},
      color: rgba(s.color), bg: rgba(s.backgroundColor), border: parseFloat(s.borderTopWidth) || 0, borderColor: rgba(s.borderTopColor)};
    // the visible fill may sit on a pseudo-element or a child: callers can point css at it instead
    out[p.name] = o;
  }
  return out;
};

(async () => {
  const b = await chromium.launch();
  const res = {};
  for (const en of MAP.entries){
    if (want.length && !want.includes(en.id)) continue;
    // map.json viewports are the app's size: the presentation switcher bar (--switcher-h, 44) sits above the app, so the
    // browser window is 44 taller (a 1440x900 entry renders the app at 1440x900, hero M, like the Figma 1440x900 frames)
    const vp = {width: en.viewport[0], height: en.viewport[1] + 44};
    const ctx = await b.newContext(en.mobile ? {viewport: vp, isMobile: true, hasTouch: true} : {viewport: vp});
    const p = await ctx.newPage();
    // The prototype loads Inter (opsz + wght axes) from Google Fonts, which this sandbox cannot reach; serve the same
    // variable font from tools/figma_audit/fonts (@fontsource-variable/inter, OFL) so text wraps as it does live.
    await p.route(/fonts\.googleapis\.com/, (r) => r.fulfill({contentType: 'text/css', body: "@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:block;src:url(https://fonts.gstatic.com/x/inter-opsz.woff2) format('woff2');}"}));
    await p.route(/fonts\.gstatic\.com/, (r) => r.fulfill({contentType: 'font/woff2', body: FONT}));
    await p.goto(BASE + (en.url || '')); await p.waitForTimeout(2200);
    for (const op of en.setup || []){
      if (op.wait) await p.waitForTimeout(op.wait);
      if (op.eval) { await p.evaluate(op.eval); await p.waitForTimeout(op.after || 400); }
      if (op.scroll) { await p.evaluate((s) => document.querySelector(s)?.scrollIntoView({block: 'center'}), op.scroll); await p.waitForTimeout(500); }
      if (op.click) { await p.click(op.click); await p.waitForTimeout(op.after || 900); }
      if (op.hover){
        await p.mouse.move(3, 3); await p.waitForTimeout(250); await p.mouse.move(5, 5);
        const el = await p.$(op.hover); const bb = await el.boundingBox();
        await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, {steps: 3}); await p.waitForTimeout(op.after || 1500);
      }
    }
    res[en.id] = await p.evaluate(new Function('a', 'return (' + measure.toString() + ')(a[0], a[1]);'), [en.root, en.parts]);
    await ctx.close();
  }
  await b.close();
  process.stdout.write(JSON.stringify(res, null, 1));
})();
