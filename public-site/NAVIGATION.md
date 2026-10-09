# Navigacija i zajednički jezik — 9. oktobar 2026.

## Promjena

Javni mobilni meni bio je običan element unutar fleksibilnog zaglavlja. Otvaranje
je proširivalo zaglavlje i guralo hero naniže. Sada je apsolutno pozicioniran panel
ispod zaglavlja. Njegov sadržaj se skroluje unutar ograničene visine; stranica ne
mijenja raspored. Jezički meni pravnih stranica je takođe sloj preko sadržaja.

Aplikacija ranije nije imala hamburger ni jezik/link u zaglavlju. Sada na uskom
ekranu ima panel, a na desktopu direktne kontrole. Zaglavlje je fiksirano uz vrh:
postojeći body overflow sprečavao je pouzdano sticky ponašanje nakon skrolovanja.
Razmak visine zaglavlja ostaje rezervisan na bodyju. Nema novog scroll locka niti
izmjena u treningu, authu, Firebaseu, API-ju ili korisničkim podacima.

Kontrole jezika koriste postojeći `data-action="set-language"` i
`changeAppLanguage`; Podešavanja i zaglavlje imaju isti state i handler.

URL fragmenti i ID-jevi glavnih sekcija prevedeni su po stranici: bs/sr koriste
`#mogucnosti` i `#kako-radi`; hr `#znacajke` i `#kako-funkcionira`; en
`#features` i `#how-it-works`; de `#funktionen` i `#so-funktioniert-es`; fr
`#fonctionnalites` i `#comment-ca-marche`; it `#funzionalita` i
`#come-funziona`; es `#funciones` i `#como-funciona`. FAQ i kontakt imaju
lokalizovane ID-jeve tamo gdje se naziv razlikuje. Meni, hero, FAQ i footer
linkuju ID-jeve odgovarajuće jezičke stranice.

## Jezik

Postojeći cookie `gymleader-language` sadrži samo bs/sr/hr/en/de/fr/it/es.
Domain=gymleader.app, Path=/, Secure, SameSite=Lax, trajanje godinu dana.
Aplikacija pri učitavanju čita cookie ispred lokalnog `gym-language` izbora.
Javni root koristi cookie, lokalni izbor, browser jezik, pa bs. Direktni
lokalizovani URL ostaje na jeziku URL-a. CTA sa takve stranice ponovo upisuje
jezik trenutno prikazane stranice, tako da se u aplikaciju prenese taj jezik,
a ne raniji cookie. Klik na app info link takođe upisuje trenutni app jezik.

Cookie važi samo na HTTPS GymLeader domenama u istom browser profilu. Ne dijeli
se preko Live Servera, različitih browsera ili uređaja. Već otvorena druga kartica
se ne prevodi automatski; ponovo je otvori ili osvježi. Blokirano skladištenje
ima postojeće lokalne/browser fallbacke.

## Upload samo ove dorade

* info.gymleader.app/htdocs: `site.css`, `site.js`, `language.js` iz public-site/.
  HTML stranice i asseti prethodne verzije ostaju isti. Ako prethodna verzija
  još nije uploadovana, slijedi kompletan spisak iz UPLOAD.md.
* gymleader.app/htdocs: korijenski `index.html`, `styles.css`, `javascript.js`,
  `translations.js`, `ui-i18n.js`. Zadrži postojeći `language-boot.js`; ako prethodni jezički
  most nije uploadovan, uploaduj i njega iz korijena projekta.
* `tests/`, `checks/`, generate.py, content/ i dokumentacija nisu za hosting.

Service Worker nije promijenjen: postojeći SW provjerava HTML preko
mreže bez cachea i koristi mrežu pa offline cache za JS/CSS. Query oznake samo
ažuriranog CSS/JS i prevodnog import lanca su v145: `fetch(request)` u postojećem
SW-u može dobiti staru browser HTTP cache kopiju na istom URL-u. Nova oznaka
izbjegava taj slučaj; ui-i18n.js mijenja samo import URL, bez izmjene logike.
Firebase i DNS ne
zahtijevaju promjene. Nakon uploada provjeri normalno osvježavanje i instaliranu
PWA; stara offline kopija prirodno ne može dobiti novu doradu bez mreže.

## Ručna provjera

1. Live Server: javni sajt otvori kao /public-site/en/, aplikaciju na rootu.
   Na 360/390/768 px otvori meni pri vrhu i nakon skrolovanja. Hero i sadržaj
   ostaju na istom položaju. Otvori izbor jezika, skroluj panel na kratkom ekranu,
   zatvori Escapeom (prvo jezik, zatim meni), klikom van i izborom linka.
2. Tastatura: Tab do hamburgera, Enter, Tab kroz kontrole; Escape vraća fokus.
   Izlazak fokusom iz zaglavlja zatvara meni. Na desktopu link i jezik su vidljivi.
3. U aplikaciji promijeni svaki od osam jezika iz zaglavlja i Podešavanja.
   Provjeri naslove, nove linkove i trenutno izabrano ime jezika. Provjeri dark/light.
4. Poslije uploada na HTTPS: aplikacija → italijanski → Informacije o GymLeaderu:
   otvara /it/. Sajt → francuski → Otvori GymLeader: aplikacija je na francuskom.
5. Sa francuskim cookiejem direktno otvori info.gymleader.app/de/. Ostaje njemački,
   a klik na Otvori GymLeader prenosi njemački. Otvori i pravila/privatnost preko
   njihovih lokalizovanih linkova; promjena jezika zadržava vrstu dokumenta.
6. DevTools Application/Cookies: upiši unsupported vrijednost. Aplikacija je
   odbacuje i koristi postojeći lokalni/browser izbor; ne prikazuje nevažeći jezik.
7. Provjeri prijavu, svoje rutine, aktivni trening, Home i Progress na testnom
   nalogu. Izolovani testovi ove dorade nisu produkcijski E2E test autha/Firebasea.

Ništa nije deployano.

## Izvršene provjere

* `checks/verify.mjs`: završni broj provjera ispisuje se pri pokretanju; 27 javnih
  stranica, osam jezika na 360/390/768/1024/1440 px, svaka navigacijska hash veza,
  stabilan meni i scroll, direktni jezički URL-ovi, cookie i reduced motion.
* `../tests/header-navigation.test.mjs`: 122 uspješne provjere stvarnog app
  zaglavlja/CSS-a i izvučenih postojećih jezičkih funkcija; osam jezika desktop/mobile,
  Podešavanja i zaglavlje koriste isti handler, fokus, Escape, panel i korisnička oznaka.
  Business render funkcije su stubovi: ovo nije stvarni auth/Firebase E2E.
* Postojeće ciljane provjere: auth-boot-recovery, workout-draft-isolation,
  home-contact-ui, routine-first-plan-flow, settings-layout, responsive-layout-static
  i i18n prolaze (11 uspješnih testnih stavki; 19670 provjera u i18n skripti).
* JavaScript syntax checks prolaze. Screenshotovi javnog i app menija vizuelno
  pregledani. Chrome pokrenut u izolovanom profilu, svi zahtjevi lokalno presretnuti.
* Nisu pristupani pravi nalozi ni produkcijski Firebase. Ručni HTTPS test na
  stvarnim domenama i fizičkom telefonu ostaje za vlasnika nakon uploada.

Izmijenjeni app izvori: index.html, styles.css, javascript.js, translations.js,
ui-i18n.js. Izmijenjeni javni izvori: site.css, site.js, language.js.
Lokalni testovi/dokumentacija: checks/verify.mjs, UPLOAD.md, REPORT.md,
NAVIGATION.md, ../tests/header-navigation.test.mjs i screenshotovi checks/*.png.
