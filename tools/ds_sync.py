#!/usr/bin/env python3
"""Inline the AITV DS block (ds/ds.css + ds/ds.js) into prototypes, so each page stays one self-contained file
(artifacts and per-folder Vercel projects cannot load ../ds at runtime).

Usage
  python3 tools/ds_sync.py p-xxxxxx/index.html [more files] [--dedupe]
  python3 tools/ds_sync.py --all [--dedupe]      every */index.html that already carries a DS block
  python3 tools/ds_sync.py --check                list each page's DS version against ds/VERSION

What it does
- CSS: the text between /* ds:begin … */ and /* ds:end */ is replaced with ds/ds.css. Without markers the block is
  inserted at the top of the page's first <style>, so the page's own rules come after it and can build on it.
- JS: <script id="ds-js">…</script> is replaced with ds/ds.js (window.DS). Without one it is inserted before the
  page's first <script> in <body>.
- --dedupe: in the page's own :root, declarations the DS block defines with the same value are removed; ones with
  a different value stay and are listed (a page that overrides a DS token has to say why).
Run tools/ds_build.py first when ds/tokens.json or ds/components.css changed.
"""
import re, sys, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DS = os.path.join(ROOT, 'ds')
# the begin marker carries the version stamp, so a page that merely mentions the markers is never mistaken for a block
CSS_RE = re.compile(r'/\* ds:begin \w{8} ·[^*]*\*/.*?/\* ds:end \*/\n?', re.S)
JS_RE = re.compile(r'<script id="ds-js">.*?</script>\n?', re.S)

def ds_parts():
    css = open(os.path.join(DS, 'ds.css')).read().rstrip() + '\n'
    js = open(os.path.join(DS, 'ds.js')).read().rstrip() + '\n'
    ver = open(os.path.join(DS, 'VERSION')).read().strip()
    return css, js, ver

def css_block(css, ver):
    return f'/* ds:begin {ver} · generated from ds/ by tools/ds_sync.py, edit ds/ and re-sync, never this block */\n{css}/* ds:end */\n'

def js_block(js, ver):
    return f'<script id="ds-js">/* ds {ver} */\n{js}</script>\n'

def norm(v):
    v = v.strip().lower().replace(' ', '')
    return re.sub(r'(?<![\d.])0\.(\d)', r'.\1', v)

def ds_values(css):
    root = re.search(r':root\{(.*?)\n\}', css, re.S).group(1)
    d = dict(re.findall(r'(--[a-z0-9-]+):([^;]+);', root))
    def res(v, depth=0):
        m = re.fullmatch(r'var\((--[a-z0-9-]+)\)', v.strip())
        return res(d[m.group(1)], depth + 1) if m and m.group(1) in d and depth < 8 else v
    return {k: norm(res(v)) for k, v in d.items()}

def dedupe(page, dsv):
    """Drop :root declarations of the page that the DS defines with the same value."""
    rest = CSS_RE.sub('', page, count=1)
    m = re.search(r':root\{[^}]*\}', rest)
    if not m: return page, [], []
    block = m.group(0)
    removed, kept = [], []
    def drop(dm):
        name, val = dm.group(1), dm.group(2)
        if name in dsv:
            if norm(val) == dsv[name]: removed.append(name); return ''
            kept.append(f'{name}: page {val.strip()} / DS {dsv[name]}')
        return dm.group(0)
    new = re.sub(r'\n?[ \t]*(--[a-z0-9-]+)\s*:\s*([^;]+);', drop, block)
    new = re.sub(r'\n[ \t]*/\* AITV DS colour tokens[^*]*\*/', '', new)   # the converter's old note, now empty
    return page.replace(block, new, 1), removed, kept

def sync(path, do_dedupe=False):
    css, js, ver = ds_parts()
    s = open(path).read()
    if CSS_RE.search(s): s = CSS_RE.sub(lambda m: css_block(css, ver), s, count=1)
    else: s = re.sub(r'<style>\n?', lambda m: '<style>\n' + css_block(css, ver), s, count=1)
    if JS_RE.search(s): s = JS_RE.sub(lambda m: js_block(js, ver), s, count=1)
    else:
        b = s.find('<body')
        i = s.find('<script', b if b >= 0 else 0)
        if i < 0: i = s.rfind('</body>')
        s = s[:i] + js_block(js, ver) + s[i:]
    removed, kept = [], []
    if do_dedupe: s, removed, kept = dedupe(s, ds_values(css))
    open(path, 'w').write(s)
    print(f'{path}: DS {ver}' + (f' · {len(removed)} duplicate tokens removed' if do_dedupe else ''))
    for k in kept: print('   keeps its own', k)

def page_version(path):
    m = re.search(r'/\* ds:begin (\w{8}) ·', open(path).read())
    return m.group(1) if m else None

if __name__ == '__main__':
    args = sys.argv[1:]
    if '--check' in args:
        cur = open(os.path.join(DS, 'VERSION')).read().strip()
        for p in sorted(glob.glob(os.path.join(ROOT, '*/index.html'))):
            v = page_version(p)
            if v: print(f'{os.path.relpath(p, ROOT)}: {v}' + ('' if v == cur else f'  (out of date, current {cur})'))
        sys.exit(0)
    files = [a for a in args if not a.startswith('--')]
    if '--all' in args: files += [p for p in sorted(glob.glob(os.path.join(ROOT, '*/index.html'))) if page_version(p)]
    for f in files: sync(f, '--dedupe' in args)
