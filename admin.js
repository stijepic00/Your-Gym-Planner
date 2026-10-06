import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js';

const app = initializeApp({
  apiKey: 'AIzaSyCPZxiv-5ob5aYhcVvyuQ_uFu8Q2i6rcSk',
  authDomain: 'gym-tracker-df1de.firebaseapp.com',
  projectId: 'gym-tracker-df1de',
  storageBucket: 'gym-tracker-df1de.firebasestorage.app',
  messagingSenderId: '106914789522',
  appId: '1:106914789522:web:f287e0e84d3252cb328e4b'
});
const auth = getAuth(app);
const siteKey = document.querySelector('meta[name="firebase-app-check-site-key"]')?.content.trim();
if (siteKey && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
const appCheck = siteKey ? initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(siteKey),
  isTokenAutoRefreshEnabled: true
}) : null;
const apiUrl = 'https://your-gym-planner.vercel.app/api/admin-usage';
const status = document.getElementById('admin-status');
const reportRoot = document.getElementById('admin-report');
const accountsBody = document.getElementById('accounts-body');
const search = document.getElementById('account-search');
const filter = document.getElementById('account-filter');
let report = null;
let requestVersion = 0;

function setStatus(message) { status.textContent = message; }
function clearReport() {
  report = null;
  reportRoot.hidden = true;
  accountsBody.replaceChildren();
  document.getElementById('summary-cards').replaceChildren();
  document.getElementById('definitions').replaceChildren();
}
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('sr-Latn', { dateStyle: 'medium' }).format(date);
}
function addCell(row, label, value, className = '') {
  const cell = document.createElement('td');
  cell.dataset.label = label;
  cell.textContent = value;
  if (className) cell.className = className;
  row.append(cell);
}
function planLabel(value) { return value === true ? 'Da' : value === false ? 'Nema sačuvan plan' : 'Nije dostupno'; }
function percentLabel(value) { return value === null ? 'Nema naloga za procenat' : `${value}% svih naloga`; }
function renderAccounts() {
  if (!report) return;
  const term = search.value.trim().toLocaleLowerCase('sr-Latn');
  const selection = filter.value;
  const rows = report.accounts.filter((account) => {
    const matchesText = [account.email, account.displayName, account.uid].some((item) => String(item || '').toLocaleLowerCase('sr-Latn').includes(term));
    const matchesFilter = selection === 'all' || (selection === 'routine' && account.hasRoutine)
      || (selection === 'workout' && account.hasWorkout) || (selection === 'meal' && account.savedMealPlan === true)
      || (selection === 'no-records' && account.noRecordedRoutineOrWorkout);
    return matchesText && matchesFilter;
  });
  document.getElementById('shown-count').textContent = `Prikazano ${rows.length} od ${report.totals.accounts} naloga.`;
  accountsBody.replaceChildren();
  for (const account of rows) {
    const row = document.createElement('tr');
    const accountCell = document.createElement('td');
    accountCell.dataset.label = 'Nalog';
    const name = document.createElement('span');
    name.className = 'account-name';
    name.textContent = account.displayName || account.email || 'Nalog bez imena';
    const uid = document.createElement('small');
    uid.className = 'account-id';
    uid.textContent = `${account.email && account.displayName ? `${account.email} · ` : ''}UID: ${account.uid}`;
    accountCell.append(name, uid);
    row.append(accountCell);
    addCell(row, 'Registrovan', formatDate(account.createdAt));
    addCell(row, 'Posljednja prijava', formatDate(account.lastSignInAt));
    addCell(row, 'Rutina', account.hasRoutine ? 'Da' : 'Nema sačuvane', account.hasRoutine ? 'yes' : '');
    addCell(row, 'Trening', account.hasWorkout ? 'Da' : 'Nema sačuvanog', account.hasWorkout ? 'yes' : '');
    addCell(row, 'Plan obroka', planLabel(account.savedMealPlan), account.savedMealPlan === true ? 'yes' : account.savedMealPlan === null ? 'unknown' : '');
    addCell(row, 'Shopping lista', 'Nije mjerljivo', 'unknown');
    accountsBody.append(row);
  }
  if (!rows.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = 'empty-row';
    cell.textContent = 'Nema naloga za izabrani filter.';
    row.append(cell);
    accountsBody.append(row);
  }
}
function renderReport(nextReport) {
  report = nextReport;
  const t = report.totals;
  document.getElementById('generated-at').textContent = `Dohvaćeno: ${formatDate(report.generatedAt)} · Denominator: ${t.accounts} trenutno registrovanih naloga`;
  const cards = [
    ['Registrovani nalozi', t.accounts, 'Firebase Authentication'],
    ['Imaju rutinu', t.routineUsers, percentLabel(t.routinePercent)],
    ['Završili trening', t.workoutUsers, percentLabel(t.workoutPercent)],
    ['Sačuvan plan obroka', t.savedMealPlanUsers ?? '—', t.unknownMealPlanUsers ? `Podatak nije dostupan za ${t.unknownMealPlanUsers} naloga` : percentLabel(t.savedMealPlanPercent)],
    ['Bez rutine i treninga', t.noRecordedRoutineOrWorkout, `${percentLabel(t.noRecordedPercent)} · bez tih sačuvanih zapisa`],
    ['Shopping lista', '—', 'Korištenje nije zabilježeno'],
    ['Povratak u aplikaciju', '—', 'Nije pouzdano mjerljivo']
  ];
  const cardsRoot = document.getElementById('summary-cards');
  cardsRoot.replaceChildren();
  for (const [label, value, detail] of cards) {
    const card = document.createElement('article');
    card.className = 'summary-card';
    const heading = document.createElement('h2');
    heading.textContent = label;
    const number = document.createElement('strong');
    number.textContent = String(value);
    const note = document.createElement('small');
    note.textContent = detail;
    card.append(heading, number, note);
    cardsRoot.append(card);
  }
  const definitions = document.getElementById('definitions');
  definitions.replaceChildren();
  for (const key of ['denominator', 'routine', 'workout', 'mealPlan', 'shoppingList', 'returnVisits']) {
    const item = document.createElement('li');
    item.textContent = report.definitions[key];
    definitions.append(item);
  }
  reportRoot.hidden = false;
  renderAccounts();
}
async function loadReport(user) {
  const version = ++requestVersion;
  clearReport();
  setStatus('Učitavam privatni pregled…');
  try {
    const headers = { Authorization: `Bearer ${await user.getIdToken()}` };
    if (appCheck) {
      try { headers['X-Firebase-AppCheck'] = (await getToken(appCheck, false)).token; }
      catch { /* API returns an explicit error if App Check is enforced. */ }
    }
    const response = await fetch(apiUrl, { method: 'GET', headers, cache: 'no-store' });
    const payload = await response.json();
    if (version !== requestVersion || auth.currentUser?.uid !== user.uid) return;
    if (!response.ok) throw new Error(response.status === 403 ? 'Ovaj nalog nema pristup privatnom pregledu.' : payload.error || 'Pregled nije dostupan.');
    renderReport(payload);
    setStatus('');
  } catch (error) {
    if (version === requestVersion) {
      const message = error instanceof TypeError
        ? 'Ne mogu dohvatiti admin API. Ako koristiš Live Server, prvo objavi /api/admin-usage na Vercel i provjeri ALLOWED_ORIGINS.'
        : error.message || 'Pregled trenutno nije dostupan.';
      setStatus(message);
    }
  }
}
onAuthStateChanged(auth, (user) => {
  ++requestVersion;
  clearReport();
  if (user) void loadReport(user);
  else setStatus('Prijavi se u GymLeader, pa ponovo otvori privatni pregled.');
}, () => setStatus('Provjera prijave nije uspjela. Pokušaj ponovo.'));
document.getElementById('refresh-report').addEventListener('click', () => {
  if (auth.currentUser) void loadReport(auth.currentUser);
});
search.addEventListener('input', renderAccounts);
filter.addEventListener('change', renderAccounts);
window.addEventListener('pagehide', () => {
  ++requestVersion;
  clearReport();
});
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  if (auth.currentUser) void loadReport(auth.currentUser);
  else setStatus('Prijavi se u GymLeader, pa ponovo otvori privatni pregled.');
});
