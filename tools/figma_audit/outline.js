// Print the box tree of one prototype element (tag.classes [x,y w x h] relative to it, padding, gap, text and font)
// to compare by eye with a Figma outline. <w> <h> = the app size (the 44 px presentation bar is added on top).
// usage: NODE_PATH=... node tools/figma_audit/outline.js <w> <h> <mobile 0/1> '<json setup ops>' '<root css>' [depth]
// setup ops: {"click":sel} {"eval":"js","after":ms} {"scroll":sel} {"wait":ms}
const { chromium } = require('playwright');
const [w, h, mob, ops, root, depth] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(+mob ? {viewport: {width: +w, height: +h + 44}, isMobile: true, hasTouch: true} : {viewport: {width: +w, height: +h + 44}});
  const p = await ctx.newPage(); const FONT = require('fs').readFileSync(require('path').join(__dirname, 'fonts', 'inter-opsz.woff2'));
  await p.route(/fonts\.googleapis\.com/, (r) => r.fulfill({contentType: 'text/css', body: "@font-face{font-family:'Inter';font-weight:100 900;src:url(https://fonts.gstatic.com/x/i.woff2) format('woff2');}"}));
  await p.route(/fonts\.gstatic\.com/, (r) => r.fulfill({contentType: 'font/woff2', body: FONT})); await p.goto('http://localhost:8801/index.html'); await p.waitForTimeout(2000);
  for (const op of JSON.parse(ops)) {
    if (op.wait) await p.waitForTimeout(op.wait);
    if (op.eval) { await p.evaluate(op.eval); await p.waitForTimeout(op.after || 600); }
    if (op.click) { await p.click(op.click); await p.waitForTimeout(op.after || 900); }
    if (op.scroll) { await p.evaluate((s) => document.querySelector(s)?.scrollIntoView({block: 'center'}), op.scroll); await p.waitForTimeout(500); }
  }
  const out = await p.evaluate(([root, depth]) => {
    const r0 = document.querySelector(root); if (!r0) return 'NO ROOT ' + root;
    const rb = r0.getBoundingClientRect(); const lines = [];
    const walk = (e, d) => { const b = e.getBoundingClientRect(); if (!b.width && !b.height) return; const s = getComputedStyle(e);
      const t = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ').slice(0, 30);
      lines.push('  '.repeat(d) + e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '') + ` [${Math.round((b.left - rb.left) * 10) / 10},${Math.round((b.top - rb.top) * 10) / 10} ${Math.round(b.width * 10) / 10}x${Math.round(b.height * 10) / 10}]` + (s.paddingTop !== '0px' || s.paddingLeft !== '0px' ? ` pad ${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}` : '') + (s.gap && s.gap !== 'normal' ? ' gap ' + s.gap : '') + (t ? ` "${t}" ${s.fontSize}/${s.lineHeight} ${s.fontWeight}` : '') + (s.borderRadius !== '0px' ? ' r ' + s.borderRadius : ''));
      if (d < depth && e.tagName !== 'svg') for (const c of e.children) walk(c, d + 1); };
    walk(r0, 0); return lines.join('\n');
  }, [root, +(depth || 3)]);
  console.log(out); await b.close();
})();
