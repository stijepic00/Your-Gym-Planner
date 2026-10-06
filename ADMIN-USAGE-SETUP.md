# Privatni pregled korištenja

Pregled je na `/admin.html`. Stranica nije povezana iz korisničke navigacije, ali to nije sigurnosna granica: `api/admin-usage.js` vraća podatke samo kada Firebase ID token pripada UID-u vlasnika.

## Prije upotrebe

1. U Firebase Authentication konzoli pronađi **UID svog vlasničkog naloga**. Ne koristi email kao vlasnički identifikator.
2. U serverskom Vercel okruženju postavi `GYMLEADER_OWNER_UID` na taj UID. Ta vrijednost ide samo u serverske environment variables; ne upisuj je u `admin.js`, GitHub ili javni hosting. Postojeći `FIREBASE_SERVICE_ACCOUNT_JSON` ostaje isključivo na serveru.
3. Objavi `api/admin-usage.js` i `api/admin-usage-core.js` kroz postojeći Vercel API tok, a `admin.html`, `admin.js`, `admin.css` i izmijenjeni `sw.js` kroz hosting statičkog sajta. Ovdje ništa nije objavljeno.
4. Ako je `APP_CHECK_ENFORCED` uključen, dodaj/održi odgovarajuću App Check konfiguraciju za domen i debug token za lokalni Live Server kao za glavnu aplikaciju.
5. Pregledaj postojeći tekst Politike privatnosti prije puštanja ovog internog izvještaja: sadašnji tekst opisuje rad naloga i čuvanje podataka, ali ne opisuje jasno vlasnički pregled korištenja. Ova izmjena ne dodaje događaje praćenja niti automatsku saglasnost.

## Šta brojevi znače

- Denominator: svi trenutno postojeći Firebase Authentication nalozi, uključujući naloge koji možda još nisu dovršili profil.
- Rutina/trening: jedinstveni UID sa najmanje jednim trenutno sačuvanim dokumentom u odgovarajućoj root Firestore kolekciji. Arhivirana rutina se i dalje računa kao sačuvana. Više dokumenata istog UID-a broji se jednom.
- Meal Planner: najmanje jedan trenutno sačuvan dokument u `users/{uid}/mealPlans`. Generisani, ali nesačuvani prijedlozi nisu mjerljivi. Neuspješan dohvat prikazuje „nije dostupno”.
- Shopping lista: generiše se u browseru bez sačuvanog zapisa o korištenju, pa istorijski status ostaje nepoznat.
- Posljednja prijava dolazi iz Firebase Auth. To nije pouzdana mjera povratka u aplikaciju; stopa povratka nije prikazana.
- „Bez rutine i treninga” označava odsustvo ta dva sačuvana zapisa, ne sigurno nekorištenje aplikacije. Neobavljeni offline sync i obrisani zapisi nisu uključeni.

## Mjerenje koje još nije uključeno

Ako kasnije želiš znati **ko** je otvorio shopping listu ili se vratio u aplikaciju, postojeći dokumenti to ne mogu retroaktivno pokazati. Najmanje buduće mjerenje bilo bi zabilježiti uspješno generisanu shopping listu, uspješno generisan Meal Planner prijedlog i uspješno otvorenu prijavljenu sesiju, uz UID na zaštićenom serveru i samo nužan datum/status. Sam klik prije uspješne radnje nije dokaz korištenja. Prije aktiviranja treba uskladiti politiku privatnosti, pravni osnov/saglasnost gdje je potrebna, rok čuvanja i serverska pravila pristupa. Nijedan takav događaj nije dodat u ovoj izmjeni; GA4 nije aktiviran.

API koristi potpune Auth stranice i čita samo `userId` iz rutina/treninga, pa je namijenjen sadašnjem malom B2C obimu. Ako broj naloga i dokumenata značajno poraste, prije čestog korištenja zamijeni puni scan sigurnim agregatima ili paginacijom.

## Ručna provjera nakon objave

1. Prijavi se na sajtu vlasničkim testnim nalogom i otvori `/admin.html`. Provjeri zbirne brojeve i pretragu.
2. Prijavi se običnim testnim nalogom i otvori isti URL. Moraš vidjeti odbijen pristup bez liste i brojeva. Direktni API poziv s njegovim ID tokenom mora vratiti `403`.
3. Na testnom nalogu sačuvaj dvije rutine i dva završena treninga. Nakon novog učitavanja pregleda taj nalog mora povećati broj korisnika s rutinom/treningom za najviše jedan.
4. Sačuvaj Meal Planner plan i učitaj pregled ponovo. Treba pisati da nalog ima sačuvan plan. Samo otvaranje shopping liste ne smije promijeniti status, jer se to još ne mjeri.
5. Provjeri odjavu, neispravan App Check token (ako je uključen), i nedostupnu mrežu. Podaci se ne smiju zadržati na stranici nakon promjene naloga.
