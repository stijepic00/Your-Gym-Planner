import fs from 'node:fs/promises';
import path from 'node:path';

const targetUrl = process.env.GYMLEADER_AUDIT_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.GYMLEADER_AUDIT_OUTPUT || path.resolve('.responsive-audit');
const widths = [360, 390, 768, 1024, 1440];

const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
const target = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
if (!target) throw new Error('No Chrome debugging page found on port 9222.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let commandId = 0;
const pending = new Map();
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
});
function command(method, params = {}) {
  const id = ++commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
await fs.mkdir(outputDir, { recursive: true });
await command('Page.enable');
await command('Page.navigate', { url: targetUrl });
await wait(1200);

const prepare = String.raw`
  document.getElementById('auth-boot-screen')?.style.setProperty('display', 'none', 'important');
  document.getElementById('view-login')?.classList.remove('active');
  const show = (id) => {
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
  };
  const dashboard = document.getElementById('view-dashboard');
  const goal = document.getElementById('weekly-goal-card');
  if (goal) { goal.hidden = false; goal.innerHTML = '<div class="weekly-goal-heading"><div><span class="weekly-goal-eyebrow">OBJECTIF HEBDOMADAIRE</span><strong>0 sur 4 jours d’entraînement</strong></div></div><div class="weekly-goal-days">' + ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((day) => '<div class="weekly-goal-day"><span></span><small>' + day + '</small></div>').join('') + '</div>'; }
  document.getElementById('dashboard-primary-help').textContent = 'Choisissez le plan d’entraînement que vous souhaitez faire aujourd’hui.';
  document.querySelector('#dashboard-ready .dashboard-hero-eyebrow').textContent = 'BON RETOUR PARMI NOUS';
  document.getElementById('dashboard-hero-name').textContent = 'Alexandrine!';
  document.querySelectorAll('.dashboard-summary-card div > span')[0].textContent = 'Séances d’entraînement cette semaine';
  document.querySelectorAll('.dashboard-summary-card div > span')[1].textContent = 'Apport calorique quotidien moyen cette semaine';
  document.getElementById('dashboard-summary-weight-help').textContent = 'Aucune donnée de mesure disponible';
  const overview = document.getElementById('progress-overview');
  if (overview) overview.innerHTML = '<section class="progress-stats"><article class="progress-stat"><span class="progress-stat-icon">✚</span><span>Entraînements cette semaine</span><strong>12</strong><small>Comparé à la période précédente</small></article><article class="progress-stat"><span class="progress-stat-icon">●</span><span>Apport calorique quotidien moyen</span><strong>2 280 kcal</strong><small>Estimations du journal alimentaire</small></article><article class="progress-stat"><span class="progress-stat-icon">◒</span><span>Poids corporel</span><strong>—</strong><small>Pas assez de mesures pour comparer</small></article></section><section class="progress-panels"><article class="progress-panel"><div class="progress-panel-heading"><div><h3>Historique hebdomadaire des entraînements</h3><p>Activité accomplie au cours de la période sélectionnée</p></div><button>Historique des entraînements</button></div></article><article class="progress-panel"><div class="progress-panel-heading"><div><h3>Progression du poids corporel</h3><p>Mesures dans la période sélectionnée</p></div><button>Mesures du corps</button></div></article></section>';
  const setting = document.getElementById('weekly-goal-settings-summary');
  if (setting) setting.textContent = '4 jours d’entraînement par semaine';
  window.__auditShow = show;
`;
await command('Runtime.evaluate', { expression: prepare });

const screens = [
  ['dashboard', 'view-dashboard'],
  ['progress', 'view-progress'],
  ['food', 'view-food'],
  ['settings', 'view-settings'],
  ['workouts', 'view-workouts'],
  ['active-workout', 'view-active-workout']
];
const results = [];
for (const width of widths) {
  await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 390 });
  for (const [name, id] of screens) {
    await command('Runtime.evaluate', { expression: `window.__auditShow(${JSON.stringify(id)}); window.scrollTo(0, 0);` });
    await wait(60);
    const { result } = await command('Runtime.evaluate', { expression: `(() => {
      const width = window.innerWidth;
      const out = [...document.querySelectorAll('body *')].filter((el) => {
        const style = getComputedStyle(el); const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && (rect.right > width + 1 || rect.left < -1);
      }).map((el) => ({ tag: el.tagName, id: el.id, className: el.className, left: Math.round(el.getBoundingClientRect().left), right: Math.round(el.getBoundingClientRect().right) }));
      return { viewport: width, scrollWidth: document.documentElement.scrollWidth, overflowing: out.slice(0, 12) };
    })()` , returnByValue: true });
    results.push({ width, screen: name, ...result.value });
    if ((width === 390 && name === 'dashboard') || (width === 360 && name === 'progress') || (width === 1440 && name === 'settings')) {
      const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await fs.writeFile(path.join(outputDir, `${name}-${width}.png`), Buffer.from(data, 'base64'));
    }
  }
}
await fs.writeFile(path.join(outputDir, 'results.json'), JSON.stringify(results, null, 2));
socket.close();
const failed = results.filter((result) => result.overflowing.length || result.scrollWidth > result.viewport + 1);
console.log(JSON.stringify({ checked: results.length, failed }, null, 2));
