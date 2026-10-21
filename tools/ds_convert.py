#!/usr/bin/env python3
"""Snap a prototype's colours and typography to the AITV DS (Figma library "AITV DS").

Usage: python3 tools/ds_convert.py p-xxxxxx/index.html [--dry]

Colours
- Solid colours snap to the nearest DS colour (neutral, accent-primary, accent-secondary, system scales).
- Translucent white snaps to the DS white alphas (3 / 5 / 10 / 24 %); 45 %+ white becomes a solid DS text colour.
- Translucent dark snaps to the DS neutral alphas (#0b0c0d at 24 / 60 / 80 %).
- Inside gradients only the base colour snaps; the alpha ramp of the fade is kept.
- Kept as is: per-title glow colours (taken from the poster art), fully transparent stops, and any line ending
  with /* ds-exempt: reason */ (an exception the designer approved).

Typography (DS text styles, the full list in the library's local text styles)
- 20px and up: Title/H6–H1 (Inter Medium, weight 500; Inter Display until 20 Oct 2026); 22–26px Regular: Paragraph/X Large.
- 18: Label/Large or Paragraph/Large · 16: Label/Medium or Paragraph/Medium · 15 → 14: Label/Small or Paragraph/Small ·
  13: Label/Compact or Paragraph/Compact · 12 and below: Label/X Small or Paragraph/X Small (the DS has no smaller lower-case style).
- Uppercase text: Subheading/2X Small (11), X Small (12), Small (14) or Medium (16).
- No 600 / 700 / 800 weights: the DS has Medium (500) and Regular (400) only.
- Skipped: decorative ranking numerals (64px+ or the 'Rank Numerals' font) and the fake iOS status bar (SF Pro).
"""
import re, sys, json, collections

# ---------- DS values (exported from the library, 2026-10-07) ----------
# ---------- DS values: read from ds/tokens.json (the single source, pulled from the Figma library) ----------
import os
_TOK = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ds', 'tokens.json')))
DS_SOLIDS = {v: k for k, v in _TOK['color'].items()}
WHITE_ALPHAS = [.03, .05, .10, .24]
DARK_ALPHAS = [.24, .6, .8]
DARK = (11, 12, 13)

# (name, size, line-height, letter-spacing %, weight, display), keyed by the short codes pick_style() uses
_KEYS = {'Title/H1': 'H1', 'Title/H2': 'H2', 'Title/H3': 'H3', 'Title/H4': 'H4', 'Title/H5': 'H5', 'Title/H6': 'H6',
         'Label/X Large': 'LXL', 'Label/Large': 'LL', 'Label/Medium': 'LM', 'Label/Small': 'LS', 'Label/Compact': 'LC',
         'Label/X Small': 'LXS', 'Paragraph/X Large': 'PXL', 'Paragraph/Large': 'PL', 'Paragraph/Medium': 'PM',
         'Paragraph/Small': 'PS', 'Paragraph/Compact': 'PC', 'Paragraph/X Small': 'PXS', 'Subheading/Medium': 'SUBM',
         'Subheading/Small': 'SUBS', 'Subheading/X Small': 'SUBXS', 'Subheading/2X Small': 'SUB'}
STYLES = {_KEYS[n]: (n, t['size'], t['line'], t['tracking'], t['weight'], t['family'] == 'display') for n, t in _TOK['text'].items()}

def hex2rgb(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

DS_RGB = {k: hex2rgb(k) for k in DS_SOLIDS}
NEUTRALS = [k for k, v in DS_SOLIDS.items() if v.startswith('neutral')]

def nearest(rgb, pool=None):
    pool = pool or DS_RGB.keys()
    # neutrals win for (near-)grey input, so a dark grey never becomes a dark purple
    if max(rgb) - min(rgb) < 14: pool = NEUTRALS
    return min(pool, key=lambda k: sum((a - b) ** 2 for a, b in zip(rgb, DS_RGB[k])))

def snap(v, opts): return min(opts, key=lambda o: abs(o - v))

def fmt_a(a):
    s = ('%.2f' % a).rstrip('0').rstrip('.')
    return s[1:] if s.startswith('0.') else s

report = collections.Counter()

def convert_color(tok, in_grad):
    m = re.match(r'rgba?\(([^)]*)\)', tok)
    if m:
        parts = [p.strip() for p in m.group(1).replace('/', ',').split(',') if p.strip()]
        if len(parts) < 3 or any(not re.match(r'^[\d.]+%?$', p) for p in parts): return tok   # var() etc.
        r, g, b = (int(float(p)) for p in parts[:3]); a = float(parts[3]) if len(parts) > 3 else 1.0
    else:
        r, g, b = hex2rgb(tok); a = 1.0
    if a == 0:
        if in_grad: return tok
        return tok
    white = min(r, g, b) >= 200 and max(r, g, b) - min(r, g, b) < 12
    dark = max(r, g, b) <= 60 and max(r, g, b) - min(r, g, b) < 14
    if a >= .93 and not in_grad: a = 1.0      # near-opaque surfaces become the solid DS colour
    if a >= 1:
        n = nearest((r, g, b))
        out = n
    elif in_grad:
        base = (255, 255, 255) if white else DARK if dark else DS_RGB[nearest((r, g, b))]
        out = 'rgba(%d,%d,%d,%s)' % (*base, fmt_a(a))
    elif white:
        if a <= .35: out = 'rgba(255,255,255,%s)' % fmt_a(snap(a, WHITE_ALPHAS))
        else: out = '#fcfdff' if a >= .8 else '#adafb2'
    elif dark:
        out = 'rgba(11,12,13,%s)' % fmt_a(snap(a, DARK_ALPHAS))
    else:
        n = nearest((r, g, b))
        if (r, g, b) == (137, 74, 255) or n.startswith('#c77d') or n.startswith('#9d4e'):
            out = 'rgba(137,74,255,%s)' % fmt_a(snap(a, [.05, .10, .24]))   # [alpha] primary
        elif n in ('#ff4a59', '#1fdf75', '#ffcc4a'):
            out = 'rgba(%d,%d,%d,%s)' % (*DS_RGB[n], fmt_a(snap(a, [.05, .10, .24])))
        else:
            out = 'rgba(%d,%d,%d,%s)' % (*DS_RGB[n], fmt_a(a)); report['colour kept alpha (no DS alpha): ' + tok] += 1
    if out.lower() != tok.lower(): report[f'{tok} -> {out}'] += 1
    return out

COLOR_RE = re.compile(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])|rgba?\([^()]*\)')

def gradient_spans(s):
    spans = []
    for m in re.finditer(r'(?:linear|radial|conic)-gradient\(', s):
        i, depth = m.end(), 1
        while i < len(s) and depth:
            depth += {'(': 1, ')': -1}.get(s[i], 0); i += 1
        spans.append((m.start(), i))
    return spans

def protected_spans(s):
    sp = [m.span() for m in re.finditer(r"glow:\[[^\]]*\]", s)]
    sp += [m.span() for m in re.finditer(r'@font-face\{[^}]*\}', s)]
    sp += [m.span() for m in re.finditer(r'data:[a-z]+/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+', s)]
    sp += [m.span() for m in re.finditer(r'href="#[^"]*"|url\(#[^)]*\)|id="[^"]*"', s)]
    # approved exceptions: a rule whose line ends with /* ds-exempt */ is left exactly as written
    sp += [m.span() for m in re.finditer(r'[^\n]*/\* ds-exempt[^*]*\*/', s)]
    return sp

def colours(s):
    grads, prot = gradient_spans(s), protected_spans(s)
    inside = lambda i, spans: any(a <= i < b for a, b in spans)
    out, last = [], 0
    for m in COLOR_RE.finditer(s):
        if inside(m.start(), prot): continue
        # a 3-char hex must look like a colour, not an id/anchor
        tok = m.group(0)
        if tok.startswith('#') and len(tok) == 4 and not re.search(r'[:\s,(]$|^$', s[max(0, m.start() - 1):m.start()]): continue
        out.append(s[last:m.start()]); out.append(convert_color(tok, inside(m.start(), grads))); last = m.end()
    out.append(s[last:]); return ''.join(out)

# ---------- typography ----------
def pick_style(size, weight, upper):
    bold = weight is not None and weight >= 500
    if upper and size <= 17:
        # uppercase labels take the Subheading of the nearest size
        return 'SUB' if size < 11.5 else 'SUBXS' if size <= 13 else 'SUBS' if size <= 15 else 'SUBM'
    if size >= 20:
        if weight is not None and weight < 500 and 22 <= size <= 26: return 'PXL'
        return min(['H6', 'H5', 'H4', 'H3', 'H2', 'H1'], key=lambda k: (abs(STYLES[k][1] - size), STYLES[k][1]))
    if size >= 17: return 'LL' if bold else 'PL'
    if size >= 15.5: return 'LM' if bold else 'PM'
    if size >= 13.5: return 'LS' if bold else 'PS'
    if size >= 12.5: return 'LC' if bold else 'PC'
    return 'LXS' if bold else 'PXS'      # nothing lower-case below 12 in the DS

def decls(text):
    return [d for d in text.split(';')]

def set_decl(parts, prop, value, add=True):
    rx = re.compile(r'^(\s*)' + re.escape(prop) + r'\s*:')
    hits = [i for i, p in enumerate(parts) if rx.match(p)]
    if hits:
        parts[hits[0]] = rx.match(parts[hits[0]]).group(1) + f'{prop}:{value}'
        for i in reversed(hits[1:]): del parts[i]          # no duplicate declarations left behind
        return
    if add: parts.append(f'{prop}:{value}')

def get_decl(parts, prop):
    rx = re.compile(r'^\s*' + re.escape(prop) + r'\s*:\s*(.*)$')
    for p in parts:
        m = rx.match(p)
        if m: return m.group(1).strip()
    return None

def convert_decl_list(body, selector=''):
    if 'Rank Numerals' in body or 'SF Pro' in body: return body
    parts = body.split(';')
    trailing = parts and parts[-1].strip() == ''
    if trailing: parts = parts[:-1]
    fs = get_decl(parts, 'font-size'); fw = get_decl(parts, 'font-weight')
    weight = int(fw) if fw and fw.isdigit() else None
    if weight is None and fw in ('bold', 'bolder'): weight = 700
    last = selector.split(',')[-1].strip()
    # headings, <b>, <strong> and <th> with a type rule of their own were drawn bold: they take the Label (Medium) style
    if weight is None and re.search(r'(?:^|[\s>+~])(?:h[1-6]|b|strong|th)(?=$|[\s.:#\[])', ' ' + last): weight = 700
    if fs and re.match(r'^[\d.]+px$', fs):
        size = float(fs[:-2])
        if size >= 64: return body
        upper = 'uppercase' in (get_decl(parts, 'text-transform') or '')
        k = pick_style(size, weight, upper); name, sz, lh, ls, w, display = STYLES[k]
        set_decl(parts, 'font-size', f'{sz}px')
        set_decl(parts, 'line-height', f'{lh}px')
        set_decl(parts, 'letter-spacing', ('%gem' % round(ls / 100, 4)) if ls else '0')
        if w == 500 or weight is not None: set_decl(parts, 'font-weight', str(w))
        # titles and text styles are both Inter at its default optical size since 20 Oct 2026 (Inter Display dropped)
        set_decl(parts, 'font-family', 'var(--ff-text)'); set_decl(parts, 'font-variation-settings', 'normal')
        report[f'type {size:g}/{weight} -> {name}'] += 1
    elif weight is not None and weight >= 600:
        set_decl(parts, 'font-weight', '500', add=False); report['weight %d -> 500 (no size)' % weight] += 1
    return ';'.join(parts) + (';' if trailing else '')

def typography(s):
    # CSS blocks without nested braces
    s = re.sub(r'([^{}]*)\{([^{}]*font-(?:size|weight)[^{}]*)\}', lambda m: m.group(1) + '{' + convert_decl_list(m.group(2), m.group(1)) + '}', s)
    # inline style attributes
    s = re.sub(r'style="([^"]*font-(?:size|weight)[^"]*)"', lambda m: 'style="' + convert_decl_list(m.group(1)) + '"', s)
    # font shorthands with an explicit weight + size
    def short(m):
        w, size, lh, rest = int(m.group(1)), float(m.group(2)), m.group(3), m.group(4)
        if 'SF Pro' in rest or size >= 64: return m.group(0)
        k = pick_style(size, w, False); name, sz, l, ls, ww, _ = STYLES[k]
        report[f'font shorthand {w} {size:g} -> {name}'] += 1
        return f'font:{ww} {sz}px/{l}px {rest}'
    s = re.sub(r'font:(\d{3}) ([\d.]+)px/([\d.]+px) ([^;"}]*)', short, s)
    return s

def tokens(s):
    s = s.replace('family=Inter:wght@400;500;600;700', 'family=Inter:opsz,wght@14..32,400;500')
    s = s.replace('var(--w20)', 'var(--w24)').replace('var(--w80)', 'var(--text-primary)')
    def root(m):
        b = m.group(0)
        b = re.sub(r'\n\s*--w20:[^;]*;', '', b); b = re.sub(r'\n\s*--w80:[^;]*;', '', b)
        add = """
    /* AITV DS colour tokens (Figma library "AITV DS"; tools/ds_convert.py) */
    --ff-text:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;
    --bg-3:rgba(255,255,255,.03);
    --icon-secondary:#adafb2;
    --icon-tertiary:#939599;
    --icon-disabled:#47494d;
    --icon-contrast:#232426;
    --w24:rgba(255,255,255,.24);
    --n24:rgba(11,12,13,.24);
    --n60:rgba(11,12,13,.6);
    --n80:rgba(11,12,13,.8);
    --red:#ff4a59;
    --green:#1fdf75;
    --yellow:#ffcc4a;"""
        if '--w24:' in b:
            return b if '--ff-text:' in b else b.replace('--accent:', "--ff-text:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;\n    --accent:", 1)
        return b.replace('--accent:', add.strip() + '\n    --accent:', 1) if '--accent:' in b else b
    s = re.sub(r':root\{[^}]*\}', root, s, count=1)
    # Inter: text cuts at the default optical size (as in Figma); titles opt into the Display cut per rule
    s = s.replace('b,strong{font-weight:500;}', 'b,strong{font-weight:inherit;}')
    if 'b,strong{font-weight:inherit;}' not in s:
        # DS has no bold: <b> takes its parent's style and stands out by colour only
        s = s.replace('*{box-sizing:border-box;', 'b,strong{font-weight:inherit;}\n  *{box-sizing:border-box;', 1)
    if 'font-optical-sizing:none' not in s:
        s = s.replace("font-family:'Inter',ui-sans-serif", "font-optical-sizing:none;font-family:'Inter',ui-sans-serif", 1)
    return s

def components(s):
    """DS component states (Buttons [1.1] Secondary): Follow and Following both use Default (alpha-5, text/primary)
    and Hover (alpha-10); only the label and icon change."""
    s = re.sub(r'(\.ch-follow\{[^}]*?background:)var\(--w10\)', r'\1var(--w5)', s)
    # its label is the button's Label/Small (14/20 Medium)
    s = re.sub(r'(\.ch-follow\{[^}]*?)font-size:13px;', r'\1font-size:14px;font-weight:500;', s)
    s = s.replace('.ch-follow.on{background:var(--w5);color:var(--text-secondary);}', '.ch-follow.on{background:var(--w5);color:var(--text-primary);}')
    # Following uses the button's default state (the user asked for it: disabled read as inactive)
    s = s.replace('.ch-follow.on{background:var(--w5);color:var(--text-disabled);}', '.ch-follow.on{background:var(--w5);color:var(--text-primary);}')
    s = re.sub(r'\.ch-follow:hover\{background:var\(--w(?:20|24)\);\} \.ch-follow\.on:hover\{background:var\(--w10\);\}',
               '.ch-follow:hover{background:var(--w10);}', s)
    s = s.replace('.ch-follow:hover{background:var(--w10);} .ch-follow.on:hover{background:var(--w5);}', '.ch-follow:hover{background:var(--w10);}')
    return s

if __name__ == '__main__':
    path = sys.argv[1]; dry = '--dry' in sys.argv
    src = open(path).read()
    # the inlined DS block (tools/ds_sync.py) is the reference itself: set it aside while converting the page
    held = []
    def hold(m): held.append(m.group(0)); return f'@@DS{len(held) - 1}@@'
    src = re.sub(r'/\* ds:begin \w{8} ·[^*]*\*/.*?/\* ds:end \*/\n?|<script id="ds-js">.*?</script>\n?', hold, src, flags=re.S)
    out = colours(tokens(typography(components(src))))
    out = re.sub(r'@@DS(\d+)@@', lambda m: held[int(m.group(1))], out)
    for k, v in sorted(report.items(), key=lambda kv: -kv[1]): print(f'{v:4d}  {k}')
    if not dry: open(path, 'w').write(out)
