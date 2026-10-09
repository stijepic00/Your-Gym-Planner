"""Optional authoring helper. Hosting uses the generated HTML, not Python.
Run with Python 3 (standard library only): python public-site/generate.py
"""
import copy
import html
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
BASE = 'https://info.gymleader.app'
APP = 'https://gymleader.app/'
LANGUAGES = {'bs': 'Bosanski', 'sr': 'Srpski', 'hr': 'Hrvatski', 'en': 'English',
             'de': 'Deutsch', 'fr': 'Français', 'it': 'Italiano', 'es': 'Español'}
LOCALES = {'bs': 'bs_BA', 'sr': 'sr_RS', 'hr': 'hr_HR', 'en': 'en_GB',
           'de': 'de_DE', 'fr': 'fr_FR', 'it': 'it_IT', 'es': 'es_ES'}
# Public section fragments are readable in the language of each static page.
SECTION_SLUGS = {
    'bs': {'features': 'mogucnosti', 'how': 'kako-radi', 'faq': 'cesta-pitanja', 'contact': 'kontakt'},
    'sr': {'features': 'mogucnosti', 'how': 'kako-radi', 'faq': 'cesta-pitanja', 'contact': 'kontakt'},
    'hr': {'features': 'znacajke', 'how': 'kako-funkcionira', 'faq': 'cesta-pitanja', 'contact': 'kontakt'},
    'en': {'features': 'features', 'how': 'how-it-works', 'faq': 'faq', 'contact': 'contact'},
    'de': {'features': 'funktionen', 'how': 'so-funktioniert-es', 'faq': 'faq', 'contact': 'kontakt'},
    'fr': {'features': 'fonctionnalites', 'how': 'comment-ca-marche', 'faq': 'faq', 'contact': 'contact'},
    'it': {'features': 'funzionalita', 'how': 'come-funziona', 'faq': 'domande-frequenti', 'contact': 'contatti'},
    'es': {'features': 'funciones', 'how': 'como-funciona', 'faq': 'preguntas-frecuentes', 'contact': 'contacto'},
}
data = json.loads((ROOT / 'content/locales.json').read_text(encoding='utf-8'))


def dialect(value, replacements):
    if isinstance(value, str):
        for old, new in replacements:
            value = value.replace(old, new)
        return value
    if isinstance(value, list):
        return [dialect(v, replacements) for v in value]
    return {k: dialect(v, replacements) for k, v in value.items()}


# Common wording is shared; regional vocabulary is resolved into static HTML.
data['sr'] = dialect(copy.deepcopy(data['bs']), [
    ('tjelesnu', 'telesnu'), ('tjelesna', 'telesna'), ('tijela', 'tela'), ('tijelo', 'telo'),
    ('Tvoje tijelo', 'Tvoje telo'), ('TIJELO', 'TELO'), ('vježb', 'vežb'),
    ('mjerenja', 'merenja'), ('mjerenje', 'merenje'), ('mjera', 'mera'), ('mjere', 'mere'),
    ('sljedeći', 'sledeći'), ('SLJEDEĆI', 'SLEDEĆI'), ('sedmični', 'nedeljni'),
    ('sedmica', 'nedelja'), ('sedmice', 'nedelje'), ('sedmično', 'nedeljno'),
    ('vlastiti', 'sopstveni'), ('vlastitu', 'sopstvenu'), ('preglednik', 'pregledač'),
    ('prijedlog', 'predlog'), ('Prijedlog', 'Predlog'), ('cijene', 'cene'), ('cijeli', 'ceo'),
    ('vrijednosti', 'vrednosti'), ('mjesto', 'mesto'), ('mjestu', 'mestu'),
    ('vrijeme', 'vreme'), ('prije', 'pre'), ('Prije', 'Pre'), ('procjene', 'procene'),
    ('procjenjuje', 'procenjuje'), ('primjenjivo', 'primenljivo'), ('neovlašten', 'neovlašćen'),
    ('Posljednja', 'Poslednja'), ('posljednji', 'poslednji'), ('izmjena', 'izmena'),
    ('bilježi', 'beleži'), ('Bilježi', 'Beleži'), ('bilježenje', 'beleženje'),
    ('bilješke', 'beleške'), ('bilješk', 'belešk'), ('Zabilježi', 'Zabeleži'),
    ('zabilježi', 'zabeleži'), ('provjeri', 'proveri'), ('Provjeri', 'Proveri'),
    ('izbjegav', 'izbegav'), ('dijeljenje', 'deljenje'), ('dijelove', 'delove'),
    ('ovdje', 'ovde'), ('gdje', 'gde'), ('lijevo', 'levo'), ('dijel', 'del'),
    ('korištenja', 'korišćenja'), ('pohrani', 'skladištu')])
data['sr']['title'] = 'GymLeader — Rutine, trening i napredak na jednom mestu'
data['sr']['phrases'] = ['Tvoj napredak.', 'Tvoja ishrana.', 'Tvoja kilaža.', 'Tvoje telo.', 'Tvoji treninzi.']
data['hr'] = dialect(copy.deepcopy(data['bs']), [
    ('istoriju', 'povijest'), ('istoriji', 'povijesti'), ('istorija', 'povijest'),
    ('sedmični', 'tjedni'), ('sedmica', 'tjedana'), ('sedmice', 'tjedna'),
    ('sedmično', 'tjedno'), ('svake tjedna', 'svakog tjedna'),
    ('ishrane', 'prehrane'), ('ishrana', 'prehrana'), ('ishrani', 'prehrani'),
    ('Tvoja ishrana', 'Tvoja prehrana'), ('ISHRANA', 'PREHRANA'),
    ('računaru', 'računalu'), ('nalog', 'račun'), ('Nalog', 'Račun'),
    ('lične', 'osobne'), ('ličnih', 'osobnih'), ('lični', 'osobni'),
    ('ljekara', 'liječnika'), ('doktora', 'liječnika'), ('tačnost', 'točnost'),
    ('pol,', 'spol,'), ('podešavanja', 'postavke'), ('Podešavanja', 'Postavke'),
    ('sajta', 'stranice'), ('sajt', 'web-stranica'), ('Sajt', 'Web-stranica'),
    ('sinhronizaciju', 'sinkronizaciju'), ('sinhronizacije', 'sinkronizacije'),
    ('sinhronizacija', 'sinkronizacija'), ('verifikacionim', 'verifikacijskim'),
    ('septembar', 'rujna'), ('email', 'e-mail'), ('Email', 'E-mail'),
    ('prikazaćemo', 'prikazat ćemo'), ('garantovati', 'jamčiti'),
    ('sistema', 'sustava'), ('sistem', 'sustav'), ('provajdere', 'pružatelje usluga')])
data['hr']['title'] = 'GymLeader — Rutine, treninzi i napredak na jednom mjestu'
data['hr']['routine'][1] = 'Napravi, recimo, „Plan za noge”, dodaj svoje vježbe i pokreni ga kad želiš. Ne moraš praviti novu rutinu svakog tjedna.'
data['hr']['legal'][3] = 'Posljednja izmjena: 29. rujna 2026.'
data['hr']['cards'][5][2] = 'Postavi tjedni cilj dana treninga i pogledaj aktivnost po danima. Niz tjedana s ostvarenim ciljem pokazuje kontinuitet kada povijest daje dovoljno podataka.'
data['hr']['preference'] = 'Javna web-stranica pamti samo jezični izbor u lokalnoj pohrani preglednika i, na HTTPS GymLeader domenama, u kolačiću gymleader-language koji vrijedi i za aplikaciju. Sadrži samo jezični kod, traje do godinu dana i prenosi tvoj posljednji izbor između stranice i aplikacije. Ova stranica ne dodaje analitičko praćenje.'
def esc(s):
    return html.escape(s, quote=True)


def route(lang, kind='index'):
    return f'/{lang}/' if kind == 'index' else f'/{lang}/{kind}.html'


def alternates(kind):
    default = '/' if kind == 'index' else f'/{kind}.html'
    return '\n'.join(f'<link rel="alternate" hreflang="{code}" href="{BASE}{route(code, kind)}">'
                     for code in LANGUAGES) + f'\n<link rel="alternate" hreflang="x-default" href="{BASE}{default}">'


def language_menu(lang, kind, prefix, u):
    links = ''.join(f'<a href="{prefix}{code}/{"" if kind == "index" else kind + ".html"}" '
                    f'lang="{code}" hreflang="{code}" data-language="{code}"'
                    f'{" aria-current=\"true\"" if code == lang else ""}>{name}</a>'
                    for code, name in LANGUAGES.items())
    return f'<details class="language-menu"><summary>{esc(u[5])}: <span lang="{lang}">{LANGUAGES[lang]}</span></summary><nav aria-label="{esc(u[5])}">{links}</nav></details>'


def brand(href, prefix, u, footer=False):
    size = 38 if footer else 44
    return f'<a class="brand{" footer-brand" if footer else ""}" href="{href}" aria-label="GymLeader — {esc(u[1])}"><img src="{prefix}assets/gymleader-mark.png" width="{size}" height="{size}" alt=""><span class="brand-copy"><strong>Gym<span>Leader</span></strong><small>TRAIN. TRACK. LEAD.</small></span></a>'


def button(u, small=False):
    return f'<a class="button{" button-small" if small else ""}" href="{APP}">{esc(u[8])} <span aria-hidden="true">↗</span></a>'


def footer(lang, d, prefix, root=False):
    home = 'index.html'
    contact_slug = SECTION_SLUGS[lang]['contact']
    return f'<footer class="site-footer container">{brand(home, prefix, d["ui"], True)}<nav aria-label="{esc(d["ui"][6])}"><a href="terms.html">{esc(d["legal"][0])}</a><a href="privacy.html">{esc(d["legal"][1])}</a><a href="{home}#{contact_slug}">{esc(d["ui"][12])}</a></nav><p>© GymLeader</p></footer>'


def head(lang, d, kind, prefix, root, structured=None):
    canonical = BASE + (('/' if kind == 'index' else f'/{kind}.html') if root else route(lang, kind))
    title = d['title'] if kind == 'index' else d['legal'][0 if kind == 'terms' else 1] + ' · GymLeader'
    description = d['description'] if kind == 'index' else d['legal'][5 if kind == 'terms' else 6]
    og_alternates = ''.join(f'<meta property="og:locale:alternate" content="{value}">' for key, value in LOCALES.items() if key != lang)
    schema = f'<script type="application/ld+json">{json.dumps(structured, ensure_ascii=False).replace("</", "<\\/")}</script>' if structured else ''
    return f'''<!doctype html>
<html lang="{lang}" data-page="{kind}" data-auto-language="{'true' if root else 'false'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(description)}">
<link rel="canonical" href="{canonical}">
{alternates(kind)}
<meta name="theme-color" content="#090e18"><meta property="og:type" content="website">
<meta property="og:site_name" content="GymLeader"><meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{canonical}">
<meta property="og:locale" content="{LOCALES[lang]}">{og_alternates}
<meta property="og:image" content="{BASE}/assets/gymleader-icon.png"><meta property="og:image:width" content="256"><meta property="og:image:height" content="256"><meta property="og:image:alt" content="GymLeader">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(description)}"><meta name="twitter:image" content="{BASE}/assets/gymleader-icon.png"><meta name="twitter:image:alt" content="GymLeader">
<link rel="icon" href="{prefix}assets/gymleader-icon.png" type="image/png">
<script src="{prefix}language.js"></script><link rel="stylesheet" href="{prefix}site.css">
<script src="{prefix}site.js" defer></script>{schema}</head>
<body><a class="skip-link" href="#main">{esc(d['ui'][0])}</a>'''


ICONS = [
    '<path d="M8 4h8M8 20h8M4 8v8M20 8v8M4 12h16M8 6v12M16 6v12"/>',
    '<path d="M6 4h12a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2ZM8 2v4M16 2v4M8 11h8M8 15h5"/>',
    '<path d="M4 4v16h16M7 15l4-5 4 2 5-7"/>',
    '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 7h8M12 7v3M8 15h8"/>',
    '<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 3c-4 2-4 8 0 9v9M19 3v9"/>',
    '<path d="M9 3h6l-1 7h5l-10 11 2-9H5Z"/>'
]


def home(lang, d, root=False):
    prefix = '' if root else '../'
    u, h, r = d['ui'], d['hero'], d['routine']
    slugs = SECTION_SLUGS[lang]
    path = BASE + ('/' if root else route(lang))
    schema = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'WebPage', '@id': path + '#page', 'url': path, 'name': d['title'], 'description': d['description'], 'inLanguage': lang},
        {'@type': 'FAQPage', 'inLanguage': lang, 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in d['faq']]}
    ]}
    phases = ''.join(f'<span class="hero-phrase gradient-text{" is-active" if i == 0 else ""}">{esc(phrase)}</span>' for i, phrase in enumerate(d['phrases']))
    tags = ''.join(f'<span>{esc(t)}</span>' for t in d['tags'])
    cards = []
    for i, (label, title, text) in enumerate(d['cards']):
        example = f'<div class="routine-example"><span>{esc(r[3])}</span><strong>{esc(r[4])}</strong><p>{esc(r[5])}</p></div>' if i == 0 else ''
        note = f'<p class="estimate-note">{esc(d["estimate"])}</p>' if i == 4 else ''
        cards.append(f'<article class="feature-card{" feature-nutrition" if i == 4 else ""}"><span class="icon-box {"mint" if i == 4 else "purple" if i == 1 else ""}" aria-hidden="true"><svg viewBox="0 0 24 24">{ICONS[i]}</svg></span><span class="card-label">{esc(label)}</span><h3>{esc(title)}</h3><p>{esc(text)}</p>{example}{note}</article>')
    steps = ''.join(f'<li><span class="step-number">0{i+1}</span><h3>{esc(title)}</h3><p>{esc(text)}</p></li>' for i, (title, text) in enumerate(d['steps']))
    faq = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a).replace("gymleader.app", f"<a href=\"{APP}\">gymleader.app</a>")}</p></details>' for q, a in d['faq'])
    return head(lang, d, 'index', prefix, root, schema) + f'''
<header class="site-header"><div class="container header-inner">
{brand('index.html', prefix, u)}
<button class="menu-toggle" type="button" aria-label="{esc(u[3])}" data-open-label="{esc(u[3])}" data-close-label="{esc(u[4])}" aria-expanded="false" aria-controls="site-navigation" hidden><span></span><span></span><span></span></button>
<nav id="site-navigation" class="site-navigation" aria-label="{esc(u[2])}"><a href="#{slugs['features']}">{esc(u[9])}</a><a href="#{slugs['how']}">{esc(u[10])}</a><a href="#{slugs['faq']}">{esc(u[11])}</a><a href="#{slugs['contact']}">{esc(u[12])}</a>{language_menu(lang, 'index', prefix, u)}{button(u, True)}</nav></div></header>
<main id="main"><section class="hero container" aria-labelledby="hero-title"><div class="hero-copy">
<p class="eyebrow"><span class="accent-line"></span>{esc(h[0])}</p>
<h1 id="hero-title"><span class="hero-first">{esc(h[1])}</span><span class="sr-only">{esc(d['phrases'][0])}</span><span class="hero-phrases" aria-hidden="true">{phases}</span></h1>
<p class="hero-lead">{esc(h[2])}</p><p class="hero-description">{esc(h[3])}</p><div class="hero-actions">{button(u)}<a class="text-link" href="#{slugs['how']}">{esc(h[4])}<span aria-hidden="true">↓</span></a></div>
<p class="hero-note">{esc(h[5])}</p></div>
<div class="hero-visual"><div class="hero-images" aria-hidden="true">
<picture class="hero-frame is-active"><source media="(max-width: 760px)" srcset="{prefix}assets/home-hero-male-mobile.webp" width="1145" height="1374"><img class="hero-photo" src="{prefix}assets/home-hero-male-desktop.webp" width="1896" height="830" fetchpriority="high" decoding="async" alt=""></picture>
<picture class="hero-frame"><source media="(max-width: 760px)" data-srcset="{prefix}assets/home-hero-female-mobile.webp" width="1145" height="1374"><img class="hero-photo" data-src="{prefix}assets/home-hero-female-desktop.webp" width="1896" height="830" decoding="async" alt=""></picture></div>
<div class="visual-top-label" aria-hidden="true"><span class="status-dot"></span>{esc(h[6])}</div>
<button class="animation-toggle" type="button" aria-label="{esc(u[13])}" data-pause-label="{esc(u[13])}" data-play-label="{esc(u[14])}" aria-pressed="false" hidden><span aria-hidden="true">Ⅱ</span></button>
<div class="visual-card" aria-hidden="true"><div class="visual-card-head"><span class="visual-icon">↻</span><span>{esc(h[7])}</span></div><strong>{esc(h[8])}</strong><p>{esc(h[9])}</p><div class="visual-tags">{tags}</div></div><span class="visual-corner" aria-hidden="true">GYMLEADER / TRAIN. TRACK. LEAD.</span></div></section>
<section class="routine-note container" aria-labelledby="routine-note-title"><span class="note-symbol" aria-hidden="true">↻</span><div><h2 id="routine-note-title">{esc(r[0])}</h2><p>{esc(r[1])}</p></div><a class="text-link" href="#{slugs['how']}">{esc(r[2])}<span aria-hidden="true">↗</span></a></section>
<section class="section container" id="{slugs['features']}" aria-labelledby="features-title"><div class="section-heading"><div><p class="eyebrow">{esc(d['features'][0])}</p><h2 id="features-title">{esc(d['features'][1])}</h2></div><p>{esc(d['features'][2])}</p></div><div class="feature-grid">{''.join(cards)}</div></section>
<section class="how-section" id="{slugs['how']}" aria-labelledby="how-title"><div class="container"><div class="section-heading"><div><p class="eyebrow">{esc(d['how'][0])}</p><h2 id="how-title">{esc(d['how'][1])}</h2></div><p>{esc(d['how'][2])}</p></div><ol class="steps">{steps}</ol></div></section>
<section class="section container faq-section" id="{slugs['faq']}" aria-labelledby="faq-title"><div class="faq-intro"><p class="eyebrow">{esc(d['faqIntro'][0])}</p><h2 id="faq-title">{esc(d['faqIntro'][1])}</h2><p>{esc(d['faqIntro'][2])}</p><a class="text-link" href="#{slugs['contact']}">{esc(d['faqIntro'][3])}<span aria-hidden="true">↗</span></a></div><div class="faq-list">{faq}</div></section>
<section class="contact-section container" id="{slugs['contact']}" aria-labelledby="contact-title"><div><p class="eyebrow">{esc(d['contact'][0])}</p><h2 id="contact-title">{esc(d['contact'][1])}</h2><p>{esc(d['contact'][2])}</p></div><div class="contact-actions"><a class="button" href="mailto:gymleaderapp@gmail.com?subject={quote(d['contact'][5])}">{esc(d['contact'][3])}<span aria-hidden="true">↗</span></a><a class="email-address" href="mailto:gymleaderapp@gmail.com">gymleaderapp@gmail.com</a><p>{esc(d['contact'][4])}</p></div></section>
<section class="final-cta container" aria-labelledby="cta-title"><p class="eyebrow">{esc(d['final'][0])}</p><h2 id="cta-title">{esc(d['final'][1])}</h2><p>{esc(d['final'][2])}</p>{button(u)}</section></main>
{footer(lang, d, prefix, root)}</body></html>'''


def legal(lang, d, kind, root=False):
    prefix = '' if root else '../'
    u = d['ui']
    title = d['legal'][0 if kind == 'terms' else 1]
    text = ''.join(f'<p>{esc(p)}</p>' for p in d[kind])
    preference = f'<section class="legal-preference"><h2>{esc(u[5])}</h2><p>{esc(d["preference"])}</p></section>' if kind == 'privacy' else ''
    return head(lang, d, kind, prefix, root) + f'''<header class="site-header legal-header"><div class="container header-inner">{brand('index.html', prefix, u)}<div class="legal-header-actions">{language_menu(lang, kind, prefix, u)}{button(u, True)}</div></div></header>
<main id="main" class="legal-page container"><p class="eyebrow">{esc(d['legal'][2])}</p><h1>{esc(title)}</h1><article class="legal-document"><p><strong>{esc(d['legal'][3])}</strong></p>{text}</article>{preference}<div class="legal-contact"><p>{esc(d['legal'][4])} <a href="mailto:gymleaderapp@gmail.com">gymleaderapp@gmail.com</a>.</p><a class="text-link" href="index.html">← {esc(u[7])}</a></div></main>{footer(lang, d, prefix, root)}</body></html>'''


if __name__ == '__main__':
    paths = []
    for lang in LANGUAGES:
        (ROOT / lang).mkdir(exist_ok=True)
        for kind in ['index', 'terms', 'privacy']:
            (ROOT / lang / f'{kind}.html').write_text(home(lang, data[lang]) if kind == 'index' else legal(lang, data[lang], kind), encoding='utf-8')
            paths.append(BASE + route(lang, kind))
    for kind in ['index', 'terms', 'privacy']:
        (ROOT / f'{kind}.html').write_text(home('bs', data['bs'], True) if kind == 'index' else legal('bs', data['bs'], kind, True), encoding='utf-8')
        paths.append(BASE + ('/' if kind == 'index' else f'/{kind}.html'))
    (ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(f'  <url><loc>{esc(url)}</loc></url>' for url in paths) + '\n</urlset>\n', encoding='utf-8')
    (ROOT / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: https://info.gymleader.app/sitemap.xml\n', encoding='utf-8')
    print(f'Generated {len(paths)} static pages and sitemap. No hosting build step required.')
