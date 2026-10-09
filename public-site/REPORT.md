# GymLeader javni sajt — izvještaj o doradi

Naknadna dorada menija, app zaglavlja i zajedničkog jezika opisana je u
`NAVIGATION.md`. Upload spisak iz `UPLOAD.md` je ažuriran za tu doradu.

Dorade su završene lokalno 9. oktobra 2026. Ništa nije deployano.

## Izmijenjeni fajlovi

U postojećoj aplikaciji samo:

- `language-boot.js`: čita postojeći zajednički izbor jezika prije prikaza loading
  ekrana, upisuje ga u postojeći `gym-language` i objavljuje helper za cookie.
- `javascript.js`: jedna dodata linija u `changeAppLanguage`, koja kroz taj helper
  upisuje ručni izbor jezika u zajednički cookie.

Postojeći javni fajlovi koji su ažurirani:

- `public-site/index.html`
- `public-site/terms.html`
- `public-site/privacy.html`
- `public-site/site.css`
- `public-site/site.js`
- `public-site/robots.txt`
- `public-site/sitemap.xml`
- `public-site/UPLOAD.md`

Novi javni izvršni fajl:

- `public-site/language.js`

Nove lokalizovane stranice (tačno 24 fajla):

| Mapa | Fajlovi |
| --- | --- |
| public-site/bs/ | index.html, terms.html, privacy.html |
| public-site/sr/ | index.html, terms.html, privacy.html |
| public-site/hr/ | index.html, terms.html, privacy.html |
| public-site/en/ | index.html, terms.html, privacy.html |
| public-site/de/ | index.html, terms.html, privacy.html |
| public-site/fr/ | index.html, terms.html, privacy.html |
| public-site/it/ | index.html, terms.html, privacy.html |
| public-site/es/ | index.html, terms.html, privacy.html |

Nove fotografije, kopirane bez promjene originala:

- `public-site/assets/home-hero-male-desktop.webp` — 57.700 bajtova
- `public-site/assets/home-hero-male-mobile.webp` — 74.454 bajta
- `public-site/assets/home-hero-female-desktop.webp` — 52.130 bajtova
- `public-site/assets/home-hero-female-mobile.webp` — 78.864 bajta

Novi lokalni izvori/provjere, nisu potrebni za hosting:

- `public-site/content/locales.json`
- `public-site/generate.py`
- `public-site/checks/verify.mjs`
- `public-site/checks/desktop.png`
- `public-site/checks/mobile.png`
- `public-site/checks/desktop-female.png`
- `public-site/checks/mobile-female.png`
- `public-site/REPORT.md`

Logo i favicon ostali su isti. `assets/training-hero.webp` je postojeći, sada
neiskorišten fajl; nije obrisan. Firebase, API, dokumenti i ostali tokovi aplikacije
nisu mijenjani.

## Hero

`picture` bira mobile crop do 760 px, desktop crop iznad te širine. Muška
fotografija je početna; ženska se priprema nakon početnog rendera, samo u varijanti
potrebnoj za trenutnu širinu. Prva promjena je približno nakon 13,5 sekundi,
sljedeće svakih 12 sekundi, s fadeom od 1,6 sekundi. Fotografija se prikazuje tek
nakon učitavanja/dekodiranja. Ako druga fotografija ne uspije, početna ostaje.

Fraze se mijenjaju svakih 6 sekundi s fadeom od 0,7 sekundi. Sve fraze zauzimaju
istu grid ćeliju, pa najduža unaprijed rezerviše visinu. Pristupačni naslov ostaje
stabilan; dekorativne fraze ne najavljuju se čitaču ekrana pri svakoj promjeni.
Gradijent je na pojedinačnoj frazi, da skrivene fraze ne budu iscrtane preko nje.

Dugme za pauzu zaustavlja slike i tekst. `visibilitychange` zaustavlja tajmere
kada je stranica u pozadini; povratak pokreće nove pune intervale. U režimu
`prefers-reduced-motion: reduce` naslov i početna fotografija su statični,
dugme za animaciju je skriveno, a druga fotografija se ne preuzima pri takvom
početnom otvaranju. Vizuali javnog sajta nisu povezani s polom posjetioca.

## Jezik

Stvarna postavka aplikacije je `localStorage['gym-language']` uz oznaku izvora
`gym-language-source`. Aplikacija koristi postojeću podršku za osam jezika.

Cookie `gymleader-language` čuva isključivo jedan od kodova
`bs,sr,hr,en,de,fr,it,es`, s atributima `Domain=gymleader.app`, `Path=/`,
`Max-Age=31536000`, `SameSite=Lax`, `Secure`. Domain atribut obuhvata i poddomenu.
Nema naloga, UID-a, emaila, tokena ili treninga. Neispravne vrijednosti se odbijaju.

Aplikacija pri otvaranju daje prednost validnom cookieju, zatim svom postojećem
jeziku/device fallbacku. Njena ručna promjena jezika upisuje i cookie.

Javni ulaz `/` bira: validan zajednički cookie → lokalni izbor sajta
`gymleader-site-language` → prvi podržani kod iz `navigator.languages` → `bs`.
Ručni izbor jezičkog HTML linka upisuje lokalnu postavku i cookie. Promjena jezika
u aplikaciji čita se pri narednom otvaranju javnog ulaza, a promjena sa sajta pri
narednom otvaranju aplikacije.

Direktni `/it/`, `/de/` i ostali jezički URL-ovi uvijek ostaju na svom jeziku.
Isto važi za lokalizovane pravne stranice; promjena jezika čuva tip dokumenta.
Neutralni `/terms.html` i `/privacy.html` biraju jezik odgovarajućeg dokumenta.
Bez JavaScripta neutralne stranice imaju potpuni bs sadržaj, a svi direktni
jezički URL-ovi i obični linkovi rade.

Most radi samo na HTTPS GymLeader domenama i u istom browser profilu. Live Server,
različiti uređaji, drugi browseri ili blokirani cookieji ne dijele ovu postavku.
Lokalni izbor i browser fallback tada ostaju dostupni. Javni dokument privatnosti
ima zasebno prevedeno objašnjenje ove pohrane, bez dodavanja analitike.

## URL-ovi nakon uploada

- https://info.gymleader.app/bs/
- https://info.gymleader.app/sr/
- https://info.gymleader.app/hr/
- https://info.gymleader.app/en/
- https://info.gymleader.app/de/
- https://info.gymleader.app/fr/
- https://info.gymleader.app/it/
- https://info.gymleader.app/es/

Svaka mapa ima `terms.html` i `privacy.html`. Ukupno ima 27 gotovih HTML stranica:
24 lokalizovane i tri neutralne ulazne stranice. Svi glavni CTA linkovi vode na
https://gymleader.app/. Kontakt je gymleaderapp@gmail.com.

## SEO i provjere

Provjereni su:

- Jedinstveni title/description za svih osam početnih jezičkih stranica.
- Self-canonical svakog direktnog jezičkog i pravnog URL-a.
- Devet alternate oznaka po stranici: osam uzajamnih jezika i odgovarajući x-default.
- Sitemap sa 27 jedinstvenih postojećih javnih URL-ova, bez app/admin/API putanja.
- Robots dozvoljava javne stranice i navodi info sitemap.
- OG/Twitter naslov, opis, URL, postojeći favicon/preview i OG locale po jeziku.
- WebPage/FAQPage JSON-LD na početnim stranicama; svih sedam pitanja i odgovora
  odgovaraju stvarnom vidljivom FAQ sadržaju. Nema izmišljenih ocjena ili cijena.
- Obični HTML linkovi između jezičkih i pravnih stranica; sadržaj postoji i bez JS-a.
- Slike imaju dimenzije, responsive source i object-fit bez deformacije.
- Nema novih vanjskih mrežnih zahtjeva, fontova, analitike ili runtime zavisnosti.

Hreflang je usklađen s [Google dokumentacijom](https://developers.google.com/search/docs/specialty/international/localized-versions).
Automatski odabir ne mijenja direktne jezičke URL-ove i ne koristi detekciju crawlera.
Indeksiranje, HTTPS stanje stvarnog hostinga i pozicija u pretrazi nisu potvrđeni
lokalnim testom; nakon uploada potrebna je Search Console provjera.

Rezultati lokalnih testova:

- `public-site/checks/verify.mjs`: **PASS, 1.498 provjera**. Svih osam početnih
  jezika na 360/390/768/1024/1440 px, pravni dokumenti na uskom telefonu, lokalni
  linkovi, SEO, podaci FAQ, keyboard hamburger, Escape, izbor sekcije/jezika,
  cookie atributi, oba smjera prijenosa jezika, fallbacki, stabilna visina naslova,
  desktop/mobile crop, pauza, simulirani background visibility događaj,
  reduced motion i početni prikaz bez JS-a.
- Postojeći `tests/i18n.test.mjs`: **PASS, 19.642 provjere** lokalizacije,
  kataloga, pretrage, bootstrap jezika i ograničenja namirnica.
- Sintaksne provjere za `language-boot.js`, `javascript.js`, `site.js` i
  `language.js` prošle su.
- Hash poređenje sva četiri kopirana WebP fajla odgovara originalima.
- Vizuelno pregledani snimci muške/ženske fotografije na desktopu/telefonu.

Browser test koristi izolovan Chrome profil i lokalno presretanje svih URL-ova,
uključujući simulirane HTTPS GymLeader domene. Nijedan zahtjev ne ide prema
produkcijskom Firebaseu/API-ju. Cookie je provjeren kroz stvarni browser i stvarni
app language bootstrap, ali ne kroz prijavu na stvarni produkcijski nalog.

## Potvrđene funkcije

U `javascript.js` i povezanim modulima potvrđeni su čuvanje/ponavljanje rutina,
generator prijedloga prije čuvanja, aktivni trening i zapis serija/kilaža/
ponavljanja/bilješki, istorija i grafikoni/PR, mjere tijela i grafikoni mjerenja,
food diary/kalorije/makroi, Meal Planner i njegova lista ukupnih sastojaka.

`getWeeklyStreak` i `renderWeeklyGoalCard` prikazuju niz sedmica s ostvarenim
ciljem dana treninga, uz ograničenje dostupne istorije. Sadržaj ga opisuje upravo
tako, a ne kao svakodnevni niz otvaranja aplikacije. Shopping lista je lista
namirnica i količina za plan; nije reklamirana kao dostava ili automatska kupovina.

Nisu dodane tvrdnje o AI skeniranju hrane, automatskim koracima, mobilnim
prodavnicama, preciznoj kalorijskoj optimizaciji, medicinskim rezultatima,
plaćenim paketima, broju korisnika ili svjedočanstvima. Izvorna uslovna rečenica
o budućem Lemon Squeezy plaćanju ostala je samo u prevedenom izvornom dokumentu;
ne znači da je plaćanje dostupno.

## Upload i ručna provjera

Tačan raspored uploada i osam ručnih provjera su u `UPLOAD.md`.
`public-site` sadržaj za sajt ide u `info.gymleader.app/htdocs`.
Korijenski `language-boot.js` i `javascript.js` idu u postojeći app htdocs.
Dokumentacija, prevodilački izvor, generator, testovi i snimci ostaju lokalno.

Nakon uploada posebno provjeri app italijanski → novi info ulaz → `/it/`, pa
javni francuski → novo otvaranje aplikacije → francuski. Time potvrđuješ stvarni
HTTPS deployment i dijeljenje cookieja. Takođe provjeri hamburger, obje slike,
pauzu, reduced motion, FAQ/pravne dokumente, CTA i mailto na vlastitim uređajima.
