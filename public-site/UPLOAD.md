# Upload javnog sajta

Uploaduj sadržaj ove mape u document root `info.gymleader.app/htdocs/`.
Nemoj uploadovati mapu `public-site` kao dodatni nivo: `index.html` treba biti direktno u `htdocs`.

Fajlovi za upload:
- index.html
- site.css
- site.js
- terms.html
- privacy.html
- robots.txt
- sitemap.xml
- assets/gymleader-mark.png
- assets/gymleader-icon.png
- language.js
- bs/index.html, bs/terms.html, bs/privacy.html
- sr/index.html, sr/terms.html, sr/privacy.html
- hr/index.html, hr/terms.html, hr/privacy.html
- en/index.html, en/terms.html, en/privacy.html
- de/index.html, de/terms.html, de/privacy.html
- fr/index.html, fr/terms.html, fr/privacy.html
- it/index.html, it/terms.html, it/privacy.html
- es/index.html, es/terms.html, es/privacy.html
- assets/home-hero-male-desktop.webp
- assets/home-hero-male-mobile.webp
- assets/home-hero-female-desktop.webp
- assets/home-hero-female-mobile.webp

`generate.py`, `content/`, `checks/`, `REPORT.md` i ovaj dokument služe za lokalnu
doradu/provjeru i ne trebaju na hosting. Stari `assets/training-hero.webp` više
nije potreban novim stranicama. Nema build koraka na hostingu.

U postojeći `gymleader.app/htdocs/` uploaduj korijenske fajlove
`index.html`, `styles.css`, `javascript.js`, `translations.js`, `ui-i18n.js` i `language-boot.js`.
Prvih pet uključuju zaglavlje, meni i izbor jezika; language-boot.js
je postojeći most za jezik iz prethodne dorade. Nemoj tamo
uploadovati index.html iz public-site/ niti bilo koju javnu jezičku mapu.
Nisu potrebne promjene Firebasea, API-ja, DNS-a ili Service Workera.
Query oznake ažuriranih app skripti/CSS-a i prevoda promijenjene su na v145,
da browser ne preuzme staru HTTP cache kopiju. ui-i18n.js mijenja samo import URL.
Javni sajt ne poziva API, Firebase niti registruje Service Worker.

## Sadržaj dokumenata

Pravila i politika preneseni su iz legal modala postojećeg `index.html` aplikacije.
Izvorni datum dokumenata je 29. septembar 2026.
U javnoj politici zastarjeli kontakt preko budućeg kanala podrške zamijenjen je
adresom gymleaderapp@gmail.com. Dodato je zasebno objašnjenje jezičke pohrane
javnog sajta; izvorne odredbe aplikacije zadržale su svoje značenje.
Javna politika i dalje prenosi izvornu uslovnu odredbu o budućem plaćanju; ona ne znači da je plaćanje aktivno.
Postojeći dokumenti u aplikaciji nisu mijenjani.

## Ručna provjera

1. Na oba uređaja otvori svaku jezičku mapu direktno (npr. `/de/`, `/it/`).
   Odabrani jezik mora ostati i pri refreshu iako si ranije izabrao drugi jezik.
2. Na telefonu otvori hamburger, zatvori ga tipkom Escape ili izborom sekcije.
   Prebaci jezik kroz meni; otvorena pravna stranica treba ostati isti tip dokumenta.
3. Na hero sekciji sačekaj oko 14 sekundi: pojavi se druga fotografija blagim fadeom.
   Fraza se mijenja svakih 6 sekundi bez pomjeranja CTA-a. Pauza zamrzava smjenu.
   Uključi reduced motion u postavkama uređaja/browsera: hero postaje statičan.
4. Izaberi italijanski u aplikaciji, pa otvori `https://info.gymleader.app/` u istom
   browser profilu. Treba otvoriti `/it/`. Izaberi francuski na sajtu i ponovo otvori
   aplikaciju: treba koristiti francuski. Zajednički cookie važi samo preko HTTPS-a
   na GymLeader domenama, ne između dva različita browsera/uređaja.
5. Na Live Serveru jezik sajta se pamti lokalno i radi browser fallback. Dijeljenje
   između domena provjeri nakon vlastitog uploada navedenih app fajlova i javnog sajta.
6. Provjeri FAQ, pravila, privatnost i kontakt. Mailto otvara email program,
   ništa ne šalje sam; adresa je vidljiva i može se kopirati.
7. CTA u zaglavlju, hero dijelu i pri dnu mora voditi na `https://gymleader.app/`.
8. Nakon uploada provjeri HTTP 200 za sve jezičke i pravne URL-ove, zatim u Search
   Console pošalji `https://info.gymleader.app/sitemap.xml` i provjeri URL Inspection.
   Lokalni test ne potvrđuje indeksiranje niti garantuje poziciju u pretrazi.

## Održavanje

Prevodi su u `content/locales.json`; sr/hr dijele zajedničke rečenice s bs uz
regionalne prilagodbe u `generate.py`. `python public-site/generate.py` ponovo
generiše gotove HTML stranice i sitemap. Python standardna biblioteka je dovoljna.
Browser test `checks/verify.mjs` koristi postojeću instalaciju Playwrighta samo
lokalno; nema potrebe instalirati zavisnosti ili postavljati testove na hosting.
