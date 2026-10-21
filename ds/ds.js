/* AITV DS behaviour (ds/ds.js). Inlined into every prototype by tools/ds_sync.py; edit here, never in a prototype. */
window.DS = window.DS || (() => {
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Two-state swap (Follow ⇄ Following, Get notified ⇄ Reminder set, …): the icon swaps like SF Symbols "Replace"
     (out: shrinks to 60% with a 2px blur and fades in 110ms; in: grows back from 60%, settling through 1.08 when
     switching on), the label cross-fades with the same blur and a button eases to its new width. ~250ms in all;
     reduced motion gets a plain fade.
     host: the element whose content changes (a button, or the badge inside an avatar button); next: its new HTML
     (an <svg> and/or a <span>); on: true when switching to the "on" state. */
  function swap(host, next, on){
    (host._dsA || []).forEach(a => a.cancel()); host._dsA = [];
    const tok = host._dsT = (host._dsT || 0) + 1;
    if (!host.isConnected || !host.offsetParent || reduced()){
      host.innerHTML = next;
      if (host.offsetParent) host.animate([{opacity:.4}, {opacity:1}], {duration:160});
      return;
    }
    // measure both widths without painting the in-between state (only a button resizes)
    const prev = host.innerHTML, w0 = host.offsetWidth; host.innerHTML = next; const w1 = host.offsetWidth; host.innerHTML = prev;
    const out = {duration:110, easing:'cubic-bezier(.4,0,1,1)', fill:'forwards'};
    const ic0 = host.querySelector(':scope > svg'), tx0 = host.querySelector(':scope > span');
    if (ic0) host._dsA.push(ic0.animate([{transform:'scale(1)', opacity:1, filter:'blur(0)'}, {transform:'scale(.6)', opacity:0, filter:'blur(2px)'}], out));
    if (tx0) host._dsA.push(tx0.animate([{opacity:1, filter:'blur(0)'}, {opacity:0, filter:'blur(2px)'}], out));
    if (host.tagName === 'BUTTON' && Math.abs(w1 - w0) > .5) host._dsA.push(host.animate([{width:w0 + 'px'}, {width:w1 + 'px'}], {duration:260, easing:EASE}));
    // the new content comes in when the old one has left (not on a timer, so it stays in step with the animation)
    (host._dsA[0] ? host._dsA[0].finished : Promise.resolve()).then(() => {
      if (host._dsT !== tok) return;
      host.innerHTML = next;
      const ic = host.querySelector(':scope > svg'), tx = host.querySelector(':scope > span');
      const grow = on
        ? [{transform:'scale(.6)', opacity:0, filter:'blur(2px)'}, {transform:'scale(1.08)', opacity:1, filter:'blur(0)', offset:.6}, {transform:'scale(1)', opacity:1, filter:'blur(0)'}]
        : [{transform:'scale(.6)', opacity:0, filter:'blur(2px)'}, {transform:'scale(1)', opacity:1, filter:'blur(0)'}];
      if (ic) host._dsA.push(ic.animate(grow, {duration:220, easing:EASE}));
      if (tx) host._dsA.push(tx.animate([{opacity:0, filter:'blur(2px)'}, {opacity:1, filter:'blur(0)'}], {duration:180, easing:EASE}));
    }).catch(() => {});
  }

  /* A toggle button: sets .on and aria-pressed, then swaps its content. states = {on:'<svg…><span>…</span>', off:'…'} */
  function toggle(btn, on, states){
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on);
    swap(btn, on ? states.on : states.off, on);
  }

  /* A switch: <button class="ds-switch" role="switch" aria-checked="…">. Returns the new value. */
  function flip(sw){
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', on);
    return on;
  }

  /* Segmented control: the selection slides to the picked item (iOS-style) instead of jumping. Works however the page
     re-renders the control: on a pick, the old selection's box is recorded; one frame later a thumb with the active
     look (.ds-seg__thumb) slides from there to the new active item, which shows its own background again at the end.
     The control is found again by its aria-label when the page replaced it. 0.3 s, DS ease; reduced motion: no slide. */
  document.addEventListener('click', (e) => {
    const it = e.target.closest && e.target.closest('.ds-seg__item'); if (!it || reduced()) return;
    const seg = it.closest('.ds-seg'), from = seg && seg.querySelector('.ds-seg__item.is-active, .ds-seg__item[aria-selected="true"]');
    if (!from || from === it) return;
    const label = seg.getAttribute('aria-label'), r0 = from.getBoundingClientRect(), s0 = seg.getBoundingClientRect();
    requestAnimationFrame(() => {
      const host = seg.isConnected ? seg : (label && [...document.querySelectorAll('.ds-seg')].find(x => x.getAttribute('aria-label') === label && x.offsetParent));
      const to = host && host.querySelector('.ds-seg__item.is-active, .ds-seg__item[aria-selected="true"]'); if (!to) return;
      const s1 = host.getBoundingClientRect(), r1 = to.getBoundingClientRect(), k = (host.offsetWidth / s1.width) || 1;   // (scaled previews)
      if (Math.abs(r1.left - s1.left - (r0.left - s0.left)) < 1) return;
      (host._dsThumb || []).forEach(a => a.cancel());
      let th = host.querySelector(':scope > .ds-seg__thumb'); if (!th){ th = document.createElement('span'); th.className = 'ds-seg__thumb'; host.appendChild(th); }
      const x0 = (r0.left - s0.left) * k, x1 = (r1.left - s1.left) * k, y = (r1.top - s1.top) * k;
      Object.assign(th.style, {top:y + 'px', height:r1.height * k + 'px', width:r1.width * k + 'px', left:'0px'});
      host.classList.add('is-sliding');
      const a = th.animate([{transform:`translateX(${x0}px)`, width:r0.width * k + 'px'}, {transform:`translateX(${x1}px)`, width:r1.width * k + 'px'}], {duration:300, easing:EASE, fill:'forwards'});
      host._dsThumb = [a];
      // hand over in one frame: the item takes its background back with transitions off (its own background fade
      // made the selection blink out and back in when the thumb went away)
      a.finished.then(() => { host.classList.add('is-settling'); host.classList.remove('is-sliding'); th.remove(); host._dsThumb = [];
        requestAnimationFrame(() => requestAnimationFrame(() => host.classList.remove('is-settling'))); }).catch(() => {});
    });
  }, true);   // capture: read the old selection before the page's own handler re-renders (or stops) the click

  return {swap, toggle, flip, ease:EASE};
})();
