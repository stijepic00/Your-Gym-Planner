// GymLeader's initial offline exercise catalogue. It never writes to Firebase.
export const EXERCISE_LIBRARY_VERSION = 1;

import { CATALOG_TRANSLATIONS } from './catalog-translations.js?v=20261005-bcs-settings-v132';
import { localizeBcsText } from './translations-bs-hr.js?v=20261005-bcs-settings-v132';
const names = (sr, en, de) => ({ sr, bs: localizeBcsText(sr, 'bs'), hr: localizeBcsText(sr, 'hr'), en, de, ...Object.fromEntries(['fr', 'it', 'es'].map(language => [language, CATALOG_TRANSLATIONS[language][sr]])) });
const exercise = (id, title, muscles, equipment, measurementType, defaults, instruction, aliases = []) => ({
  id,
  names: names(...title),
  aliases,
  muscles,
  equipment,
  measurementType,
  defaults: {
    repRangeMin: defaults[0],
    repRangeMax: defaults[1],
    weightIncrement: defaults[2],
    timeIncrement: defaults[3] ?? 5,
    restSeconds: defaults[4]
  },
  instruction
});

export const EXERCISE_LIBRARY = Object.freeze([
  // Grudi
  exercise('barbell-bench-press', ['Bench press sa šipkom', 'Barbell bench press', 'Bankdrücken mit Langhantel'], ['chest', 'triceps', 'shoulders'], ['barbell', 'bench'], 'weight_reps', [6, 10, 2.5, 5, 150], 'Lezi stabilno, spusti šipku kontrolisano do grudi i potisni bez odvajanja stopala od poda.'),
  exercise('dumbbell-bench-press', ['Bench press s bučicama', 'Dumbbell bench press', 'Kurzhantel-Bankdrücken'], ['chest', 'triceps', 'shoulders'], ['dumbbells', 'bench'], 'weight_reps', [8, 12, 2, 5, 120], 'Drži lopatice spojene, spuštaj bučice kontrolisano i potisni ih iznad grudi.'),
  exercise('incline-barbell-bench-press', ['Kosi bench press sa šipkom', 'Incline barbell bench press', 'Schrägbankdrücken mit Langhantel'], ['upper_chest', 'triceps', 'shoulders'], ['barbell', 'incline_bench'], 'weight_reps', [6, 10, 2.5, 5, 150], 'Namjesti blagi nagib klupe, spusti šipku prema gornjim grudima i potisni kontrolisano.'),
  exercise('incline-dumbbell-press', ['Kosi potisak bučicama', 'Incline dumbbell press', 'Schrägbankdrücken mit Kurzhanteln'], ['upper_chest', 'triceps', 'shoulders'], ['dumbbells', 'incline_bench'], 'weight_reps', [8, 12, 2, 5, 120], 'Lopatice drži stabilno na klupi, spuštaj bučice do ugodne dubine i potisni ih gore.'),
  exercise('chest-fly-machine', ['Pec deck', 'Chest fly machine', 'Butterfly-Maschine'], ['chest'], ['machine'], 'weight_reps', [10, 15, 5, 5, 90], 'Sjedi uspravno, laktove drži blago savijene i spoji ručke bez zamaha tijelom.'),
  exercise('cable-chest-fly', ['Cable fly', 'Cable chest fly', 'Kabel-Flys'], ['chest'], ['cable_machine'], 'weight_reps', [10, 15, 2.5, 5, 75], 'Stani stabilno, zadrži blagi pregib lakta i spajaj ručke ispred grudi.', ['leptir na sajli', 'leptir sajla']),
  exercise('push-up', ['Sklek', 'Push-up', 'Liegestütz'], ['chest', 'triceps', 'shoulders'], ['bodyweight'], 'reps', [8, 20, 0, 5, 75], 'Tijelo drži ravno, spusti grudi prema podu i potisni se bez propadanja kukova.'),
  exercise('knee-push-up', ['Sklek na koljenima', 'Knee push-up', 'Liegestütz auf Knien'], ['chest', 'triceps'], ['bodyweight'], 'reps', [8, 20, 0, 5, 60], 'Osloni se na koljena, zadrži tijelo u ravnoj liniji i spuštaj grudi kontrolisano.'),
  exercise('dumbbell-pullover', ['Pullover bučicom', 'Dumbbell pullover', 'Kurzhantel-Pullover'], ['chest', 'lats'], ['dumbbells', 'bench'], 'weight_reps', [10, 15, 2, 5, 90], 'Lezi preko klupe stabilno, spuštaj bučicu iza glave uz kontrolu i vrati je iznad grudi.'),
  exercise('machine-chest-press', ['Potisak za grudi na mašini', 'Machine chest press', 'Brustpresse Maschine'], ['chest', 'triceps'], ['machine'], 'weight_reps', [8, 12, 5, 5, 90], 'Namjesti sjedište tako da su ručke u visini sredine grudi i potiskuj bez podizanja ramena.'),

  // Leđa
  exercise('lat-pulldown', ['Lat povlačenje', 'Lat pulldown', 'Latzug'], ['lats', 'biceps'], ['cable_machine'], 'weight_reps', [8, 12, 5, 5, 120], 'Povuci šipku prema gornjim grudima, laktove vodi prema dolje i ne zabacuj tijelo.'),
  exercise('pull-up', ['Zgib', 'Pull-up', 'Klimmzug'], ['lats', 'upper_back', 'biceps'], ['pull_up_bar'], 'reps', [5, 12, 0, 5, 120], 'Kreni iz aktivnih ramena, povuci laktove prema rebrima i spusti se kontrolisano.'),
  exercise('scapular-pull-up', ['Zgib lopaticama', 'Scapular pull-up', 'Schulterblatt-Klimmzug'], ['lats', 'upper_back', 'shoulders'], ['pull_up_bar'], 'reps', [8, 15, 0, 5, 60], 'Ostani u visu s ravnim rukama, spusti i podigni tijelo samo pokretom lopatica, bez savijanja laktova.', ['aktivacija lopatica na šipci']),
  exercise('assisted-pull-up', ['Potpomognuti zgib', 'Assisted pull-up', 'Unterstützter Klimmzug'], ['lats', 'upper_back', 'biceps'], ['assisted_machine'], 'reps', [6, 12, 0, 5, 120], 'Postavi pomoć koja ti dopušta punu kontrolu i izvodi zgib bez zamaha.'),
  exercise('barbell-row', ['Veslanje sa šipkom', 'Barbell row', 'Langhantelrudern'], ['lats', 'upper_back', 'biceps'], ['barbell'], 'weight_reps', [6, 10, 2.5, 5, 150], 'Nagnut trup drži čvrsto, povuci šipku prema donjim rebrima i ne zaokružuj leđa.'),
  exercise('dumbbell-row', ['Jednoručno veslanje bučicom', 'One-arm dumbbell row', 'Einarmiges Kurzhantelrudern'], ['lats', 'upper_back', 'biceps'], ['dumbbells', 'bench'], 'weight_reps', [8, 12, 2, 5, 90], 'Osloni se stabilno, povuci lakat prema kuku i spusti bučicu do punog istezanja.'),
  exercise('seated-cable-row', ['Sjedaće veslanje na sajli', 'Seated cable row', 'Sitzendes Kabelrudern'], ['lats', 'middle_back', 'biceps'], ['cable_machine'], 'weight_reps', [8, 12, 5, 5, 120], 'Sjedi uspravno, povuci ručku prema stomaku i vrati je bez ljuljanja tijela.'),
  exercise('chest-supported-row', ['Veslanje s osloncem na grudima', 'Chest-supported row', 'Brustgestütztes Rudern'], ['upper_back', 'lats', 'biceps'], ['machine', 'bench'], 'weight_reps', [8, 12, 5, 5, 90], 'Osloni grudi na klupu ili podlogu, povuci laktove nazad i kontrolisano spusti težinu.'),
  exercise('t-bar-row', ['T-bar veslanje', 'T-bar row', 'T-Bar-Rudern'], ['upper_back', 'lats', 'biceps'], ['machine', 'barbell'], 'weight_reps', [8, 12, 5, 5, 120], 'Zadrži neutralna leđa, povuci ručku prema grudima i izbjegavaj trzaj kukovima.'),
  exercise('straight-arm-pulldown', ['Ravno povlačenje ruku na sajli', 'Straight-arm pulldown', 'Überzug am Kabel'], ['lats'], ['cable_machine'], 'weight_reps', [10, 15, 2.5, 5, 75], 'Ruke drži gotovo ravne, povuci ručku prema kukovima i zadrži trup mirnim.'),
  exercise('face-pull', ['Face pull', 'Face pull', 'Face Pull'], ['rear_delts', 'upper_back'], ['cable_machine', 'resistance_band'], 'weight_reps', [12, 20, 2.5, 5, 75], 'Povuci uže prema licu, raširi ruke i završi pokret vanjskom rotacijom ramena.'),

  // Ramena
  exercise('barbell-overhead-press', ['Potisak iznad glave sa šipkom', 'Barbell overhead press', 'Schulterdrücken mit Langhantel'], ['shoulders', 'triceps'], ['barbell'], 'weight_reps', [6, 10, 2.5, 5, 150], 'Stisni trup i gluteuse, potisni šipku iznad glave bez prevelikog savijanja leđa.'),
  exercise('dumbbell-shoulder-press', ['Potisak bučicama za ramena', 'Dumbbell shoulder press', 'Kurzhantel-Schulterdrücken'], ['shoulders', 'triceps'], ['dumbbells', 'bench'], 'weight_reps', [8, 12, 2, 5, 120], 'Sjedi ili stoj stabilno, potisni bučice iznad glave i kontrolisano ih spusti.'),
  exercise('machine-shoulder-press', ['Potisak za ramena na mašini', 'Machine shoulder press', 'Schulterpresse Maschine'], ['shoulders', 'triceps'], ['machine'], 'weight_reps', [8, 12, 5, 5, 90], 'Podesi sjedište, drži leđa uz naslon i potiskuj bez podizanja ramena prema ušima.'),
  exercise('dumbbell-lateral-raise', ['Odručenje bučicama', 'Dumbbell lateral raise', 'Seitheben mit Kurzhanteln'], ['side_delts'], ['dumbbells'], 'weight_reps', [12, 20, 1, 5, 60], 'Diži ruke do visine ramena uz blagi pregib lakta i bez zamaha tijelom.'),
  exercise('cable-lateral-raise', ['Odručenje na sajli', 'Cable lateral raise', 'Seitheben am Kabel'], ['side_delts'], ['cable_machine'], 'weight_reps', [12, 20, 1, 5, 60], 'Stani bočno uz sajlu, diži ruku kontrolisano do visine ramena i polako spusti.'),
  exercise('rear-delt-fly', ['Zadnje rame na mašini', 'Rear delt fly', 'Reverse Fly Maschine'], ['rear_delts', 'upper_back'], ['machine'], 'weight_reps', [12, 20, 5, 5, 60], 'Grudi drži uz naslon, raširi ruke u stranu i ne povlači ramenima prema ušima.'),
  exercise('dumbbell-reverse-fly', ['Zadnje rame bučicama', 'Dumbbell reverse fly', 'Reverse Fly mit Kurzhanteln'], ['rear_delts', 'upper_back'], ['dumbbells'], 'weight_reps', [10, 15, 1, 5, 60], 'Nagnut trup drži mirno, raširi blago savijene ruke u stranu i vrati bučice kontrolisano.', ['obrnuti leptir bučicama']),
  exercise('front-raise', ['Predručenje bučicama', 'Dumbbell front raise', 'Frontheben mit Kurzhanteln'], ['front_delts'], ['dumbbells', 'plate'], 'weight_reps', [10, 15, 1, 5, 60], 'Diži težinu do visine ramena bez zamaha i spusti je sporim pokretom.'),
  exercise('arnold-press', ['Arnold potisak', 'Arnold press', 'Arnold Press'], ['shoulders', 'triceps'], ['dumbbells', 'bench'], 'weight_reps', [8, 12, 2, 5, 90], 'Kreni s dlanovima prema licu, rotiraj i potisni bučice iznad glave uz kontrolu.'),

  // Ruke
  exercise('barbell-curl', ['Pregib sa šipkom', 'Barbell curl', 'Langhantelcurls'], ['biceps'], ['barbell'], 'weight_reps', [8, 12, 2.5, 5, 75], 'Laktove zadrži uz tijelo, pregibaj bez ljuljanja leđa i spusti šipku kontrolisano.'),
  exercise('dumbbell-curl', ['Pregib bučicama', 'Dumbbell curl', 'Kurzhantelcurls'], ['biceps'], ['dumbbells'], 'weight_reps', [8, 12, 1, 5, 75], 'Drži laktove uz tijelo, podigni bučice bez zamaha i spuštaj ih polako.'),
  exercise('hammer-curl', ['Hammer pregib', 'Hammer curl', 'Hammercurls'], ['biceps', 'forearms'], ['dumbbells'], 'weight_reps', [10, 15, 1, 5, 75], 'Dlanovi ostaju okrenuti jedan prema drugom, laktove drži mirno i pregibaj kontrolisano.'),
  exercise('preacher-curl', ['Scott pregib', 'Preacher curl', 'Scott-Curls'], ['biceps'], ['machine', 'barbell', 'dumbbells'], 'weight_reps', [10, 15, 2, 5, 75], 'Nasloni nadlaktice na klupu, ispruži gotovo do kraja i pregibaj bez trzaja.'),
  exercise('cable-curl', ['Pregib na sajli', 'Cable curl', 'Kabelcurls'], ['biceps'], ['cable_machine'], 'weight_reps', [10, 15, 2.5, 5, 60], 'Stani uspravno, laktove zadrži uz tijelo i pregibaj ručku prema ramenima.'),
  exercise('triceps-pushdown', ['Triceps potisak na sajli', 'Triceps pushdown', 'Trizepsdrücken am Kabel'], ['triceps'], ['cable_machine'], 'weight_reps', [10, 15, 2.5, 5, 75], 'Laktove zadrži uz tijelo, ispruži podlaktice prema dolje i kontroliši povratak.'),
  exercise('overhead-triceps-extension', ['Triceps ekstenzija iznad glave', 'Overhead triceps extension', 'Trizepsstrecken über Kopf'], ['triceps'], ['dumbbells', 'cable_machine'], 'weight_reps', [10, 15, 2, 5, 75], 'Laktove usmjeri naprijed, spuštaj težinu iza glave i ispruži ruke bez širenja laktova.'),
  exercise('skull-crusher', ['Francuski potisak', 'Skull crusher', 'French Press'], ['triceps'], ['barbell', 'dumbbells', 'bench'], 'weight_reps', [8, 12, 2, 5, 90], 'Lezi stabilno, savij laktove i spuštaj težinu prema čelu, zatim ispruži ruke.'),
  exercise('triceps-dip-bench', ['Propadanje na klupi', 'Bench dip', 'Bankdips'], ['triceps', 'chest'], ['bench', 'bodyweight'], 'reps', [8, 15, 0, 5, 75], 'Ruke postavi na klupu, spuštaj kukove kontrolisano i guraj se kroz dlanove.'),
  exercise('parallel-bar-dip', ['Propadanje na razboju', 'Parallel bar dip', 'Barren-Dips'], ['triceps', 'chest'], ['dip_bars'], 'reps', [5, 12, 0, 5, 120], 'Ramena drži stabilno, spuštaj se do ugodne dubine i potisni se bez zamaha.'),
  exercise('wrist-curl', ['Pregib za podlakticu', 'Wrist curl', 'Handgelenkcurls'], ['forearms'], ['dumbbells', 'barbell'], 'weight_reps', [12, 20, 1, 5, 60], 'Podlaktice osloni, pregibaj samo šake i ne pomjeraj laktove.'),
  exercise('reverse-wrist-curl', ['Obrnuti pregib za podlakticu', 'Reverse wrist curl', 'Umgekehrte Handgelenkcurls'], ['forearms'], ['dumbbells', 'barbell'], 'weight_reps', [12, 20, 1, 5, 60], 'Dlanove okreni prema dolje, podiži šake kontrolisano i ne pomjeraj podlaktice.'),

  // Noge i gluteus
  exercise('barbell-back-squat', ['Čučanj sa šipkom', 'Barbell back squat', 'Kniebeuge mit Langhantel'], ['quadriceps', 'glutes', 'hamstrings'], ['barbell', 'rack'], 'weight_reps', [5, 10, 2.5, 5, 150], 'Postavi šipku stabilno, spusti se uz čvrst trup i guraj pod kroz cijelo stopalo.'),
  exercise('front-squat', ['Prednji čučanj', 'Front squat', 'Frontkniebeuge'], ['quadriceps', 'glutes'], ['barbell', 'rack'], 'weight_reps', [5, 10, 2.5, 5, 150], 'Drži laktove visoko, trup uspravno i spuštaj se uz stabilna stopala.'),
  exercise('goblet-squat', ['Goblet čučanj', 'Goblet squat', 'Goblet Squat'], ['quadriceps', 'glutes'], ['dumbbells', 'kettlebell'], 'weight_reps', [8, 15, 2, 5, 90], 'Drži težinu uz grudi, sjedni između kukova i vrati se gurajući kroz stopala.'),
  exercise('leg-press', ['Potisak nogama', 'Leg press', 'Beinpresse'], ['quadriceps', 'glutes', 'hamstrings'], ['leg_press_machine'], 'weight_reps', [8, 12, 5, 5, 120], 'Leđa i kukove zadrži uz naslon, spuštaj platformu do ugodne dubine i ne zaključavaj koljena.'),
  exercise('leg-extension', ['Ekstenzija nogu', 'Leg extension', 'Beinstrecker'], ['quadriceps'], ['machine'], 'weight_reps', [10, 15, 5, 5, 75], 'Namjesti oslonac iznad stopala, ispruži koljena kontrolisano i ne zamahuj tijelom.'),
  exercise('romanian-deadlift', ['Rumunsko mrtvo dizanje', 'Romanian deadlift', 'Rumänisches Kreuzheben'], ['hamstrings', 'glutes', 'lower_back'], ['barbell', 'dumbbells'], 'weight_reps', [6, 10, 2.5, 5, 150], 'Guraj kukove unazad uz neutralna leđa, osjeti istezanje zadnje lože i vrati se stiskanjem gluteusa.'),
  exercise('conventional-deadlift', ['Mrtvo dizanje', 'Conventional deadlift', 'Kreuzheben'], ['glutes', 'hamstrings', 'lower_back'], ['barbell'], 'weight_reps', [3, 6, 2.5, 5, 180], 'Zategni trup prije podizanja, guraj pod nogama i drži šipku blizu tijela cijelim putem.'),
  exercise('lying-leg-curl', ['Ležeći pregib nogu', 'Lying leg curl', 'Beinbeuger liegend'], ['hamstrings'], ['machine'], 'weight_reps', [10, 15, 5, 5, 75], 'Kukove drži uz klupu, pregibaj noge bez zamaha i polako vrati težinu.'),
  exercise('seated-leg-curl', ['Sjedaći pregib nogu', 'Seated leg curl', 'Beinbeuger sitzend'], ['hamstrings'], ['machine'], 'weight_reps', [10, 15, 5, 5, 75], 'Namjesti oslonac na butinama, pregibaj noge do kraja i kontrolisano se vrati.'),
  exercise('hip-thrust', ['Hip thrust', 'Hip thrust', 'Hip Thrust'], ['glutes', 'hamstrings'], ['barbell', 'bench'], 'weight_reps', [8, 12, 2.5, 5, 120], 'Gornji dio leđa osloni na klupu, podigni kukove stiskanjem gluteusa i ne prelamaj donja leđa.'),
  exercise('cable-pull-through', ['Povlačenje kroz noge na sajli', 'Cable pull-through', 'Kabelzug durch die Beine'], ['glutes', 'hamstrings'], ['cable_machine'], 'weight_reps', [10, 15, 5, 5, 90], 'Stani leđima prema sajli, guraj kukove unazad pa ih snažno ispruži bez zaokruživanja leđa.', ['pull through sajla']),
  exercise('glute-bridge', ['Glute bridge', 'Glute bridge', 'Glute Bridge'], ['glutes', 'hamstrings'], ['bodyweight', 'barbell'], 'reps', [12, 20, 0, 5, 75], 'Lezi na leđa, stopala postavi blizu kukova i podigni kukove stiskanjem gluteusa.'),
  exercise('bulgarian-split-squat', ['Bugarski iskorak', 'Bulgarian split squat', 'Bulgarische Kniebeuge'], ['quadriceps', 'glutes'], ['dumbbells', 'bench', 'bodyweight'], 'weight_reps', [8, 12, 2, 5, 90], 'Zadnju nogu osloni na klupu, spuštaj se ravno dolje i guraj kroz prednje stopalo.'),
  exercise('walking-lunge', ['Iskorak u hodu', 'Walking lunge', 'Ausfallschritte gehend'], ['quadriceps', 'glutes'], ['dumbbells', 'bodyweight'], 'reps', [10, 20, 0, 5, 90], 'Napravi kontrolisan korak, spusti zadnje koljeno prema podu i odgurni se prednjom nogom.'),
  exercise('reverse-lunge', ['Iskorak unazad', 'Reverse lunge', 'Rückwärts-Ausfallschritt'], ['quadriceps', 'glutes'], ['dumbbells', 'bodyweight'], 'reps', [8, 16, 0, 5, 75], 'Zakorači unazad, zadrži stabilan trup i vrati se gurajući kroz prednje stopalo.'),
  exercise('calf-raise-standing', ['Podizanje na prste stojeći', 'Standing calf raise', 'Wadenheben stehend'], ['calves'], ['machine', 'bodyweight'], 'weight_reps', [12, 20, 5, 5, 60], 'Spusti pete do istezanja, podigni se visoko na prste i kratko zadrži vrh pokreta.'),
  exercise('calf-raise-seated', ['Podizanje na prste sjedeći', 'Seated calf raise', 'Wadenheben sitzend'], ['calves'], ['machine'], 'weight_reps', [12, 20, 5, 5, 60], 'Kukove drži mirno, spuštaj pete do istezanja i podigni se na prste kontrolisano.'),
  exercise('adductor-machine', ['Adduktor mašina', 'Adductor machine', 'Adduktorenmaschine'], ['adductors'], ['machine'], 'weight_reps', [12, 20, 5, 5, 60], 'Sjedi uspravno, spoji noge kontrolisano i ne odbijaj težinu pri povratku.'),
  exercise('abductor-machine', ['Abduktor mašina', 'Abductor machine', 'Abduktorenmaschine'], ['glutes', 'abductors'], ['machine'], 'weight_reps', [12, 20, 5, 5, 60], 'Sjedi stabilno, raširi koljena kontrolisano i vrati ih bez trzaja.'),
  exercise('step-up', ['Penjanje na klupu', 'Step-up', 'Step-up'], ['quadriceps', 'glutes'], ['bench', 'dumbbells', 'bodyweight'], 'reps', [8, 16, 0, 5, 75], 'Cijelo stopalo postavi na klupu, podigni se kroz gornju nogu i kontrolisano siđi.'),
  exercise('sumo-deadlift', ['Sumo mrtvo dizanje', 'Sumo deadlift', 'Sumo-Kreuzheben'], ['glutes', 'adductors', 'hamstrings'], ['barbell'], 'weight_reps', [3, 6, 2.5, 5, 180], 'Stopala postavi šire, koljena prati liniju prstiju i podigni šipku uz čvrst trup.'),

  // Stomak
  exercise('plank', ['Plank', 'Plank', 'Plank'], ['core'], ['bodyweight'], 'seconds', [0, 0, 0, 5, 60], 'Osloni se na podlaktice, tijelo drži ravno i diši mirno bez propadanja kukova.'),
  exercise('side-plank', ['Bočni plank', 'Side plank', 'Seitstütz'], ['core', 'obliques'], ['bodyweight'], 'seconds', [0, 0, 0, 5, 60], 'Osloni se na jednu podlakticu, podigni kukove i zadrži tijelo u ravnoj liniji.'),
  exercise('cable-crunch', ['Cable crunch', 'Cable crunch', 'Kabel-Crunch'], ['abs'], ['cable_machine'], 'weight_reps', [10, 15, 2.5, 5, 75], 'Kleči uz sajlu, savij trup prema podu i zadrži kukove što mirnijim.'),
  exercise('machine-crunch', ['Trbušnjaci na mašini', 'Machine crunch', 'Bauchpresse Maschine'], ['abs'], ['machine'], 'weight_reps', [10, 15, 5, 5, 75], 'Namjesti mašinu, savij rebra prema kukovima i ne povlači vratom.'),
  exercise('hanging-knee-raise', ['Podizanje koljena u visu', 'Hanging knee raise', 'Hängendes Knieheben'], ['abs', 'hip_flexors'], ['pull_up_bar'], 'reps', [8, 15, 0, 5, 75], 'Aktiviraj ramena u visu, podigni koljena bez zamaha i polako ih spusti.'),
  exercise('hanging-leg-raise', ['Podizanje ravnih nogu u visu', 'Hanging leg raise', 'Hängendes Beinheben'], ['abs', 'hip_flexors'], ['pull_up_bar'], 'reps', [6, 12, 0, 5, 90], 'Zadrži ramena aktivnim, podigni ravne noge bez zamaha i spuštaj ih kontrolisano.', ['viseće podizanje nogu']),
  exercise('leg-raise', ['Podizanje nogu ležeći', 'Lying leg raise', 'Beinheben liegend'], ['abs', 'hip_flexors'], ['bodyweight'], 'reps', [8, 15, 0, 5, 60], 'Donja leđa drži što bliže podu, podiži noge kontrolisano i ne zamahuj.'),
  exercise('dead-bug', ['Dead bug', 'Dead bug', 'Dead Bug'], ['core'], ['bodyweight'], 'reps', [8, 16, 0, 5, 60], 'Lezi na leđa, zadrži donja leđa uz pod i naizmjenično ispruži suprotnu ruku i nogu.'),
  exercise('russian-twist', ['Ruski twist', 'Russian twist', 'Russian Twist'], ['obliques', 'abs'], ['bodyweight', 'plate'], 'reps', [12, 24, 0, 5, 60], 'Sjedi stabilno, rotiraj grudni koš lijevo-desno i ne pomjeraj samo ruke.'),
  exercise('ab-wheel-rollout', ['Ab wheel rollout', 'Ab wheel rollout', 'Ab-Wheel-Rollout'], ['abs', 'core'], ['ab_wheel'], 'reps', [6, 12, 0, 5, 90], 'Kreni iz kleka, guraj točak naprijed uz čvrst trup i vrati se bez propadanja leđa.'),
  exercise('mountain-climber', ['Mountain climber', 'Mountain climber', 'Mountain Climber'], ['core', 'shoulders'], ['bodyweight'], 'reps', [20, 40, 0, 5, 45], 'Iz položaja skleka naizmjenično privlači koljena prema grudima uz stabilna ramena.'),

  // Cijelo tijelo i street workout
  exercise('burpee', ['Burpee', 'Burpee', 'Burpee'], ['full_body'], ['bodyweight'], 'reps', [6, 15, 0, 5, 75], 'Spusti se u sklek, vrati stopala naprijed, ustani i doskoči mekano.'),
  exercise('jump-squat', ['Skok čučanj', 'Jump squat', 'Sprungkniebeuge'], ['quadriceps', 'glutes'], ['bodyweight'], 'reps', [6, 15, 0, 5, 75], 'Čučni kontrolisano, skoči eksplozivno i doskoči mekano pa odmah stabilizuj koljena.'),
  exercise('box-jump', ['Skok na kutiju', 'Box jump', 'Box Jump'], ['quadriceps', 'glutes', 'calves'], ['box'], 'reps', [5, 10, 0, 5, 90], 'Odaberi sigurnu visinu, zamahni rukama, doskoči cijelim stopalom i siđi kontrolisano.'),
  exercise('kettlebell-swing', ['Kettlebell swing', 'Kettlebell swing', 'Kettlebell Swing'], ['glutes', 'hamstrings', 'core'], ['kettlebell'], 'weight_reps', [12, 20, 2, 5, 90], 'Guraj kukove unazad pa eksplozivno naprijed; ruke samo vode kettlebell, ne podižu ga ramenima.'),
  exercise('farmer-carry', ['Farmer walk', 'Farmer carry', 'Farmer Walk'], ['full_body', 'forearms', 'core'], ['dumbbells', 'kettlebell'], 'seconds', [0, 0, 0, 10, 90], 'Drži težine uz tijelo, hodaj uspravno kratkim stabilnim koracima i ne naginji se.'),
  exercise('dead-hang', ['Vis na šipci', 'Dead hang', 'Dead Hang'], ['forearms', 'shoulders'], ['pull_up_bar'], 'seconds', [0, 0, 0, 5, 60], 'Objesi se na šipku s kontrolisanim ramenima i prekini ako osjetiš neugodan bol.'),
  exercise('inverted-row', ['Australijski zgib', 'Inverted row', 'Inverted row'], ['upper_back', 'biceps'], ['bar', 'rings'], 'reps', [8, 15, 0, 5, 90], 'Tijelo drži ravno, povuci grudi prema šipci i spuštaj se bez propadanja kukova.'),
  exercise('pike-push-up', ['Pike sklek', 'Pike push-up', 'Pike Push-up'], ['shoulders', 'triceps'], ['bodyweight'], 'reps', [6, 15, 0, 5, 75], 'Kukove podigni visoko, spuštaj glavu prema podu i potisni se kroz ramena.'),
  exercise('diamond-push-up', ['Dijamant sklek', 'Diamond push-up', 'Diamant-Liegestütz'], ['triceps', 'chest'], ['bodyweight'], 'reps', [6, 15, 0, 5, 75], 'Dlanove postavi blizu ispod grudi, tijelo drži ravno i spuštaj se kontrolisano.'),
  exercise('chin-up', ['Zgib podhvatom', 'Chin-up', 'Chin-up'], ['lats', 'biceps'], ['pull_up_bar'], 'reps', [5, 12, 0, 5, 120], 'Dlanove okreni prema sebi, povuci bradu iznad šipke i spusti se bez zamaha.'),

  // Kardio
  exercise('treadmill-walk', ['Hodanje na traci', 'Treadmill walk', 'Gehen auf dem Laufband'], ['cardio'], ['treadmill'], 'cardio', [0, 0, 0, 1, 60], 'Hodaj uspravno u tempu koji možeš održati, bez oslanjanja cijelom težinom na ručke.'),
  exercise('treadmill-run', ['Trčanje na traci', 'Treadmill run', 'Laufbandlauf'], ['cardio'], ['treadmill'], 'cardio', [0, 0, 0, 1, 60], 'Počni umjerenim tempom, drži pogled naprijed i prilagodi brzinu svom osjećaju napora.'),
  exercise('stationary-bike', ['Sobni bicikl', 'Stationary bike', 'Ergometer'], ['cardio'], ['stationary_bike'], 'cardio', [0, 0, 0, 1, 60], 'Namjesti sjedište tako da je koljeno blago savijeno na dnu okreta i pedalaj ravnomjerno.'),
  exercise('rowing-machine', ['Veslački ergometar', 'Rowing machine', 'Ruderergometer'], ['cardio', 'back', 'legs'], ['rowing_machine'], 'cardio', [0, 0, 0, 1, 60], 'Guraj prvo nogama, zatim povuci ručku, a povratak radi obrnutim redoslijedom.'),
  exercise('elliptical', ['Eliptični trenažer', 'Elliptical trainer', 'Crosstrainer'], ['cardio'], ['elliptical'], 'cardio', [0, 0, 0, 1, 60], 'Zadrži uspravan položaj i održavaj ravnomjeran ritam bez naglog povećanja otpora.'),
  exercise('stair-climber', ['Steper', 'Stair climber', 'Stepgerät'], ['cardio', 'glutes', 'quadriceps'], ['stair_climber'], 'cardio', [0, 0, 0, 1, 60], 'Stani uspravno, oslanjaj se lagano na ručke i održavaj stabilan ritam koraka.'),
  exercise('jump-rope', ['Vijača', 'Jump rope', 'Seilspringen'], ['cardio', 'calves'], ['jump_rope'], 'seconds', [0, 0, 0, 15, 45], 'Skači nisko na prednjem dijelu stopala, okreći vijaču zglobovima i doskači mekano.'),
  exercise('outdoor-run', ['Trčanje vani', 'Outdoor run', 'Laufen draußen'], ['cardio'], ['outdoors'], 'cardio', [0, 0, 0, 1, 60], 'Počni lagano, odaberi siguran teren i povećavaj trajanje postepeno prema osjećaju.'),
  exercise('swimming', ['Plivanje', 'Swimming', 'Schwimmen'], ['cardio', 'full_body'], ['pool'], 'cardio', [0, 0, 0, 1, 60], 'Plivaj tempom koji možeš održati, uskladi disanje i napravi pauzu kada ti je potrebna.'),
  exercise('cycling-outdoor', ['Vožnja bicikla', 'Outdoor cycling', 'Radfahren'], ['cardio', 'quadriceps'], ['bicycle'], 'cardio', [0, 0, 0, 1, 60], 'Namjesti bicikl, pedalaj ravnomjerno i povećavaj tempo postepeno kroz vožnju.'),

  // Kuća i osnovni pokreti
  exercise('bodyweight-squat', ['Čučanj s vlastitom težinom', 'Bodyweight squat', 'Kniebeuge mit Körpergewicht'], ['quadriceps', 'glutes'], ['bodyweight'], 'reps', [10, 20, 0, 5, 60], 'Stopala postavi stabilno, sjedni između kukova i vrati se kroz cijelo stopalo.'),
  exercise('wall-sit', ['Zidni čučanj', 'Wall sit', 'Wandsitzen'], ['quadriceps'], ['bodyweight', 'wall'], 'seconds', [0, 0, 0, 10, 60], 'Nasloni leđa na zid, koljena drži približno iznad stopala i diši mirno.'),
  exercise('bird-dog', ['Bird dog', 'Bird dog', 'Bird Dog'], ['core', 'glutes'], ['bodyweight'], 'reps', [8, 16, 0, 5, 45], 'Iz četveronožnog položaja ispruži suprotnu ruku i nogu bez uvrtanja kukova.'),
  exercise('superman', ['Superman', 'Superman', 'Superman'], ['lower_back', 'glutes'], ['bodyweight'], 'reps', [10, 20, 0, 5, 45], 'Lezi na stomak, lagano podigni ruke i noge te spusti bez trzaja u vratu.'),
  exercise('band-row', ['Veslanje gumom', 'Resistance band row', 'Rudern mit Band'], ['upper_back', 'biceps'], ['resistance_band'], 'reps', [12, 20, 0, 5, 60], 'Učvrsti gumu, povuci laktove uz tijelo i vrati ruke kontrolisano.'),
  exercise('band-chest-press', ['Potisak gumom za grudi', 'Resistance band chest press', 'Brustpresse mit Band'], ['chest', 'triceps'], ['resistance_band'], 'reps', [12, 20, 0, 5, 60], 'Učvrsti gumu iza sebe, potisni ruke naprijed i drži ramena spuštena.'),
  exercise('band-pull-apart', ['Razvlačenje gume', 'Band pull-apart', 'Band Pull-Apart'], ['rear_delts', 'upper_back'], ['resistance_band'], 'reps', [12, 25, 0, 5, 45], 'Ruke drži ispred sebe, razvuci gumu do grudi i ne podiži ramena.'),
  exercise('single-leg-glute-bridge', ['Jednonožni glute bridge', 'Single-leg glute bridge', 'Einbeinige Glute Bridge'], ['glutes', 'hamstrings'], ['bodyweight'], 'reps', [8, 15, 0, 5, 75], 'Jednu nogu ispruži, podigni kukove kroz oslonjenu nogu i zadrži kukove ravnima.'),
  exercise('reverse-snow-angel', ['Reverse snow angel', 'Reverse snow angel', 'Reverse Snow Angel'], ['upper_back', 'rear_delts'], ['bodyweight'], 'reps', [10, 20, 0, 5, 45], 'Lezi na stomak, vodi ravne ruke širokim lukom uz lagano podignute grudi.'),
  exercise('high-knees', ['Visoka koljena', 'High knees', 'Kniehebelauf'], ['cardio', 'hip_flexors'], ['bodyweight'], 'seconds', [0, 0, 0, 10, 45], 'Trči u mjestu, podiži koljena kontrolisano i doskači mekano na prednji dio stopala.')
]);

const byId = new Map(EXERCISE_LIBRARY.map((item) => [item.id, item]));
const normalizeName = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const byName = new Map();
EXERCISE_LIBRARY.forEach((item) => [...Object.values(item.names), ...(item.aliases || [])]
  .forEach((name) => byName.set(normalizeName(name), item)));

export function getLibraryExerciseById(id) {
  return typeof id === 'string' ? byId.get(id) || null : null;
}

export function findLibraryExerciseByName(name) {
  return byName.get(normalizeName(name)) || null;
}

export function getLibraryExerciseTrainingPlaces(item) {
  if (!item) return [];
  const equipment = item.equipment || [];
  const places = new Set();
  if (equipment.some((value) => ['machine', 'cable_machine', 'barbell', 'leg_press_machine', 'assisted_machine', 'treadmill', 'stationary_bike', 'rowing_machine', 'elliptical', 'stair_climber', 'pool'].includes(value))) places.add('gym');
  if (equipment.some((value) => ['bodyweight', 'dumbbells', 'kettlebell', 'resistance_band', 'bench', 'wall', 'ab_wheel', 'jump_rope'].includes(value))) places.add('home');
  if (equipment.some((value) => ['bodyweight', 'pull_up_bar', 'dip_bars', 'bar', 'rings', 'outdoors', 'box'].includes(value))) places.add('street');
  return [...places];
}

export function getLibraryExerciseName(item, language = 'sr') {
  return item?.names?.[language] || item?.names?.sr || '';
}

// Display names must never be used as identifiers or written over stored names.
export function getLibraryExerciseDisplayName(item, language = 'sr') {
  const primary = getLibraryExerciseName(item, language);
  const english = item?.names?.en?.trim();
  if (!english || language === 'en' || primary.trim().normalize('NFC').toLowerCase() === english.normalize('NFC').toLowerCase()) return primary;
  return `${primary} · ${english}`;
}

export function getDisplayLibraryExercise(value) {
  const name = typeof value === 'string' ? value : value?.name || '';
  const identified = typeof value === 'object' && value ? getLibraryExerciseById(value.libraryExerciseId || value.exerciseId || value.id) : null;
  if (identified && (!name || Object.values(identified.names).includes(name))) return identified;
  // Exact catalogue names only: never reinterpret arbitrary custom names or notes.
  return EXERCISE_LIBRARY.find(item => Object.values(item.names).includes(name)) || null;
}

export function getExerciseDisplayName(value, language = 'sr') {
  const item = getDisplayLibraryExercise(value);
  return item ? getLibraryExerciseDisplayName(item, language) : (typeof value === 'string' ? value : value?.name || '');
}

// Safe resolver for future UI. Old free-text routines simply return null.
export function resolveLibraryExercise(value) {
  if (typeof value === 'object' && value) {
    return getLibraryExerciseById(value.libraryExerciseId || value.exerciseId || value.id)
      || findLibraryExerciseByName(value.name);
  }
  return findLibraryExerciseByName(value);
}
