# GymLeader: jezici i dvojezični nazivi vježbi

## Uzrok

- Izbor jezika, početno učitavanje i nekoliko dinamičkih prikaza podržavali su samo SR/EN/DE.
- Dio teksta bio je ugrađen u HTML/JS, izvan prevodnih tabela. Dinamički sadržaj i nazivi iz sačuvane historije nisu uvijek koristili isti prevodni put.
- Lokalizator je pamtio izvorni tekst DOM čvora, ali nije uvijek prepoznao kada aplikacija kasnije promijeni taj čvor.
- Prikazi vježbi koristili su pojedinačni naziv ili sačuvani string. Nije postojao zajednički prikaz lokalnog i engleskog naziva.

## Izmjene

- Dodani FR/IT/ES kroz postojeće prevodne tabele, izbor jezika, početno učitavanje, lokalizaciju datuma/brojeva i osvježavanje dinamičkih prikaza.
- Jedan helper prikazuje nazive iz biblioteke kao lokalni naziv · engleski naziv. Engleski se ne ponavlja kada su nazivi isti. Nepostojeći engleski naziv se ne izmišlja.
- Biblioteka, pretraga, ručni editor, generator, aktivni trening, historija, posljednji trening, izbor postojeće vježbe i grafikoni koriste taj prikaz.
- Dopunjen srpski naziv „Potisak nogama”. „Leg press” ostaje engleski naziv i prepoznaje se u starim zapisima i pretrazi; ID `leg-press` i svi parametri ostaju isti.
- Editor odvojeno pamti sačuvani naziv i prevedeni prikaz. Samo promjena jezika ne prepisuje naziv pri čuvanju. Vlastita imena i bilješke ostaju zaštićeni od DOM prevođenja.
- Alert/potvrda za prekid treninga prolazi kroz prevode. Standardni nazivi ranijih generisanih treninga prevode se samo u prikazu.
- Nove statične prevodne datoteke uključene su u postojeći service worker, build `20261003-i18n-v111`.

## Promijenjeni fajlovi

Produkcija:

- `javascript.js`: prikazi, poruke, osvježavanje jezika, zaštita korisničkog teksta i odvojeni izvor naziva u editoru.
- `exercise-library.js`: šest naziva, zajednički dvojezični helper, prepoznavanje postojećih naziva.
- `food-library.js`, `meal-planner.js`: prevedeni nazivi i lokalizovani pojmovi za postojeća ograničenja.
- `translations.js`: povezivanje postojećih i novih prevoda.
- `translations-fr-it-es.js`: prevodi postojećih fraza na tri nova jezika.
- `translations-dynamic.js`: dinamičke poruke, oznake i uputstva vježbi.
- `catalog-translations.js`: statični prevodi naziva biblioteka.
- `ui-i18n.js`: izdvojen postojeći prevodni put, prepoznavanje fraza i imenovanih predložaka.
- `language-boot.js`, `index.html`: izbor i inicijalizacija šest jezika.
- `styles.css`: prelamanje dugih naziva i raspored dodatnog naziva u editoru.
- `sw.js`: verzija i offline uključivanje novih datoteka.
- `assets/flag-fr.svg`, `assets/flag-it.svg`, `assets/flag-es.svg`.

Provjere: `tests/i18n.test.mjs`, `tests/create-i18n-browser-fixture.mjs` i ovaj dokument.

## Izvršene provjere

- `node tests/i18n.test.mjs`: 13.851 brojanih provjera i dodatne direktne provjere; 1.843 prevodna ključa u svakom od pet rječnika uz srpski izvor; nazivi svih vježbi, pretraga, englesko ponavljanje, sačuvani/vlastiti nazivi, pokretanje jezika, nutritivna ograničenja i formati.
- `node --check` za izmijenjene JavaScript module: prošao.
- Izolovana stranica u pregledniku: 193 provjere, bez neuspjeha. Koristi stvarne funkcije prikaza i sintetičku historiju, bez Firebase upisa. Obuhvata svih šest jezika, kasnije dodan/promijenjen tekst i atribute, historiju, posljednji trening, potvrdu za prekid, editor, generator sa osam vježbi i stvarnu pretragu „Potisak nogama”/„Leg press”.
- Statički DOM pregled izvornog HTML-a i HTML fragmenata: nema preostalih pronađenih neprevedenih fraza sa srpskim dijakriticima. Ovo nije dokaz za svaki mogući tekst ili stanje aplikacije.
- Širine 320 i 1280 px: u probnim karticama nema horizontalnog prelijevanja ni odsječenih naziva vježbi. Osam vježbi ostaje u prikazu.

Nije obavljen kompletan prolazak kroz produkcijski prijavljen nalog i sve Firebase tokove. Provjere ne predstavljaju takvu potvrdu. Postojeći korisnički podaci nisu korišteni za upise niti brisani.

## Ručna provjera

1. Otvori Podešavanja → Jezik. Redom izaberi srpski, engleski, njemački, francuski, italijanski i španski. Otvoreni sadržaj treba odmah promijeniti jezik; poslije osvježavanja treba ostati isti izbor.
2. U ručnom editoru pretraži `Potisak nogama`, pa `Leg press`. Oba upita moraju pronaći istu vježbu:

   | Jezik | Očekivani naziv |
   |---|---|
   | Srpski | Potisak nogama · Leg press |
   | Engleski | Leg press |
   | Njemački | Beinpresse · Leg press |
   | Francuski | Presse à cuisses · Leg press |
   | Italijanski | Pressa per le gambe · Leg press |
   | Španski | Prensa de piernas · Leg press |

3. Dodaj vježbu, promijeni jezik i sačuvaj. Provjeri naziv u planu, otvorenom treningu, historiji, posljednjem treningu i izboru grafikona. Promjena prikaza ne treba mijenjati stare rezultate ni identitet vježbe.
4. Dodaj vlastitu vježbu `Moj poseban pokret` i bilješku. Promijeni svih šest jezika: taj naziv i bilješka ostaju isti. Provjeri i otvaranje pa čuvanje postojećeg plana bez izmjena.
5. Otvori ranije završeni trening. Standardni naziv generisanog plana, bibliotečke vježbe, datum i oznake trebaju pratiti izabrani jezik. Vlastiti naziv rutine ostaje isti.
6. U aktivnom treningu izaberi obustavu, pročitaj prevedenu potvrdu pa otkaži. Unesene serije trebaju ostati sačuvane.
7. Na telefonu provjeri duge nazive i plan sa 8+ vježbi: svi nazivi i sve vježbe moraju ostati dostupni bez horizontalnog skrolanja kartice.
8. Na FR/IT/ES otvori Dnevnik ishrane, Meal Planner, listu za kupovinu, Moje tijelo, mjerenja, arhivu, profil i modale. Nakon novog online učitavanja provjeri iste prevode offline.

Za ponavljanje izolovanih browser provjera: pokreni `node tests/create-i18n-browser-fixture.mjs`, posluži korijen projekta lokalnim HTTP serverom i otvori `/.i18n-check/index.html`. Rezultat je u sekciji „Isolated i18n checks”. Stranica koristi sintetičke podatke i ne učitava Firebase.
