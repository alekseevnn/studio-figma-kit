// Page-level positions of blocks (first 3 matches per selector), in app coordinates with the scroll added, to check a
// Figma screen frame's section spacing. <w> <h> = the app size (the 44 px presentation bar is added and subtracted).
// usage: NODE_PATH=... node tools/figma_audit/blocks.js <w> <h> <mobile 0/1> '<ops json>' 'sel1|sel2|...'
// ops: {"click":sel} {"e":"js","after":ms}
const { chromium } = require('playwright');
const FONT = require('fs').readFileSync(require('path').join(__dirname, 'fonts', 'inter-opsz.woff2'));
const [w, h, mob, ops, sels] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(+mob ? {viewport: {width: +w, height: +h + 44}, isMobile: true, hasTouch: true} : {viewport: {width: +w, height: +h + 44}});
  const p = await ctx.newPage();
  await p.route(/fonts\.googleapis\.com/, (r) => r.fulfill({contentType: 'text/css', body: "@font-face{font-family:'Inter';font-weight:100 900;src:url(https://fonts.gstatic.com/x/i.woff2) format('woff2');}"}));
  await p.route(/fonts\.gstatic\.com/, (r) => r.fulfill({contentType: 'font/woff2', body: FONT}));
  await p.goto('http://localhost:8801/index.html'); await p.waitForTimeout(1800);
  for (const o of JSON.parse(ops)) { if (o.click) { await p.click(o.click); await p.waitForTimeout(900); } if (o.e) { await p.evaluate(o.e); await p.waitForTimeout(o.after || 900); } }
  const r = await p.evaluate((sels) => sels.split('|').map(s => { const all = [...document.querySelectorAll(s)].filter(e => e.getClientRects().length); if (!all.length) return s + ': none';
    const sc = document.scrollingElement.scrollTop; const scroller = document.querySelector('.app-main, .app-scroll'); const st = scroller ? scroller.scrollTop : 0;
    return s + ': ' + all.slice(0, 3).map(e => { const b = e.getBoundingClientRect(); const top = document.querySelector('.app').getBoundingClientRect().top; return `[${Math.round(b.x * 10) / 10},${Math.round((b.y - top + sc + st) * 10) / 10} ${Math.round(b.width * 10) / 10}x${Math.round(b.height * 10) / 10}]`; }).join(' ') + (all.length > 3 ? ` (+${all.length - 3})` : ''); }).join('\n'), sels);
  console.log(r); await b.close();
})();
