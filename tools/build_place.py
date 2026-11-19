"""Generate a place page (photo essay) from a layout spec."""
import json, sys
from PIL import Image

DOCK = open('tools/dock.html').read()

def fig(name, i, cls=''):
    w, h = Image.open(f'photos/m/{name}.jpg').size
    return (f'<figure class="pf{(" " + cls) if cls else ""}" data-i="{i}" tabindex="0" role="button" aria-label="Open photo {i + 1}">'
            f'<img src="photos/m/{name}.jpg" data-full="photos/{name}.jpg" alt="" width="{w}" height="{h}" loading="lazy"></figure>')

def build(spec):
    i = 0; rows = []
    for row in spec['rows']:
        kind, names = row[0], row[1:]
        figs = []
        for n in names:
            figs.append(fig(n, i)); i += 1
        style = ''
        if kind == 'pair':
            # columns proportional to aspect ratio, so both photos share a height
            ars = [Image.open(f'photos/m/{n}.jpg').size for n in names]
            style = ' style="grid-template-columns: ' + ' '.join(f'{w / h:.3f}fr' for w, h in ars) + '"'
        rows.append(f'    <div class="row row-{kind}"{style}>\n      ' + '\n      '.join(figs) + '\n    </div>')
    total = i
    hero = spec['hero']
    hw, hh = Image.open(f'photos/m/{hero}.jpg').size
    nxt = spec['next']
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{spec['title']} — Valentin Walendy</title>
<meta name="description" content="Photographs of {spec['title']}, {spec['region']}.">
<link rel="preload" href="assets/fraunces-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" as="image" href="photos/{hero}.jpg">
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="about.css">
<link rel="stylesheet" href="place.css">
</head>
<body class="ab pl">

<nav class="nav ab-nav pl-nav">
  <div class="nav-left">
    <a href="index.html" class="nav-logo">Valentin Walendy</a>
    <a href="about.html" class="about-link">About</a>
  </div>
  <div class="nav-links">
    <a href="destinations.html">All destinations</a>
  </div>
</nav>

<header class="pl-hero">
  <div class="pl-hero-img"><img src="photos/{hero}.jpg" alt="" width="{hw}" height="{hh}"></div>
  <div class="pl-hero-text">
    <h1 class="pl-title" data-split="chars">{spec['title']}</h1>
    <p class="pl-sub">{spec['region']}. {total + 1} photographs</p>
  </div>
</header>

<main>
  <section class="pl-intro">
    <p data-split="words" data-reveal>{spec['intro']}</p>
  </section>

  <section class="pl-essay" aria-label="Photographs">
{chr(10).join(rows)}
  </section>

  <a class="pl-next" href="{nxt['href']}">
    <span class="pl-next-img"><img src="{nxt["img"]}" alt="" loading="lazy"></span>
    <span class="pl-next-text">
      <span class="pl-next-label">Next destination</span>
      <span class="pl-next-name" data-split="chars" data-reveal>{nxt['name']}</span>
    </span>
  </a>
</main>

<div class="lb" role="dialog" aria-modal="true" aria-label="Photo viewer" hidden>
  <img class="lb-img" alt="">
  <button class="lb-btn lb-close" type="button" aria-label="Close">
    <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
  </button>
  <button class="lb-btn lb-prev" type="button" aria-label="Previous photo">
    <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>
  </button>
  <button class="lb-btn lb-next" type="button" aria-label="Next photo">
    <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
  </button>
  <span class="lb-count"></span>
</div>

{DOCK}
<script src="cursor.js"></script>
<script src="place.js"></script>
</body>
</html>
'''

if __name__ == '__main__':
    spec = json.load(open(sys.argv[1]))
    open(spec['file'], 'w').write(build(spec))
