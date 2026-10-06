export function isConfiguredOwner(decodedToken, ownerUid) {
  return typeof ownerUid === 'string'
    && ownerUid.trim().length > 0
    && decodedToken?.uid === ownerUid.trim();
}

function percentage(count, total) {
  return total ? Math.round((count / total) * 1000) / 10 : null;
}

export function buildUsageReport(authUsers, routineOwners, workoutOwners, savedPlanByUid) {
  const routineUids = new Set(routineOwners.filter((uid) => typeof uid === 'string'));
  const workoutUids = new Set(workoutOwners.filter((uid) => typeof uid === 'string'));
  const accounts = authUsers.map((user) => {
    const uid = user.uid;
    const hasRoutine = routineUids.has(uid);
    const hasWorkout = workoutUids.has(uid);
    const planState = savedPlanByUid.get(uid);
    return {
      uid,
      email: user.email || null,
      displayName: user.displayName || null,
      createdAt: user.metadata?.creationTime || null,
      lastSignInAt: user.metadata?.lastSignInTime || null,
      hasRoutine,
      hasWorkout,
      savedMealPlan: planState === true ? true : planState === false ? false : null,
      shoppingListUsage: null,
      noRecordedRoutineOrWorkout: !hasRoutine && !hasWorkout
    };
  }).sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0));
  const total = accounts.length;
  const count = (predicate) => accounts.filter(predicate).length;
  const routineUsers = count((account) => account.hasRoutine);
  const workoutUsers = count((account) => account.hasWorkout);
  const savedMealPlanUsers = count((account) => account.savedMealPlan === true);
  const unknownMealPlanUsers = count((account) => account.savedMealPlan === null);
  const noRecordedRoutineOrWorkout = count((account) => account.noRecordedRoutineOrWorkout);
  return {
    generatedAt: new Date().toISOString(),
    definitions: {
      denominator: 'Svi trenutno registrovani Firebase Authentication nalozi.',
      routine: 'Najmanje jedna trenutno sačuvana rutina u Firestoreu, uključujući arhivirane.',
      workout: 'Najmanje jedan trenutno sačuvan završen trening u Firestoreu.',
      mealPlan: 'Najmanje jedan trenutno sačuvan Meal Planner plan; prijedlozi bez čuvanja nisu obuhvaćeni.',
      shoppingList: 'Lista se generiše u browseru i korištenje se ne čuva.',
      returnVisits: 'Vrijeme posljednje prijave ne dokazuje povratak u aplikaciju; stopa povratka nije dostupna.'
    },
    totals: {
      accounts: total,
      routineUsers,
      routinePercent: percentage(routineUsers, total),
      workoutUsers,
      workoutPercent: percentage(workoutUsers, total),
      savedMealPlanUsers: unknownMealPlanUsers ? null : savedMealPlanUsers,
      savedMealPlanPercent: unknownMealPlanUsers ? null : percentage(savedMealPlanUsers, total),
      unknownMealPlanUsers,
      noRecordedRoutineOrWorkout,
      noRecordedPercent: percentage(noRecordedRoutineOrWorkout, total),
      shoppingListUsers: null,
      returnUsers: null
    },
    accounts
  };
}

async function listAllAuthUsers(auth) {
  const users = [];
  let nextPageToken;
  do {
    const page = await auth.listUsers(1000, nextPageToken);
    users.push(...page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);
  return users;
}

async function listOwners(db, collectionName) {
  const snapshot = await db.collection(collectionName).select('userId').get();
  return snapshot.docs.map((document) => document.get('userId'));
}

async function getSavedPlanStates(db, users) {
  const states = new Map();
  let cursor = 0;
  const workerCount = Math.min(8, users.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (cursor < users.length) {
      const user = users[cursor++];
      try {
        const snapshot = await db.collection('users').doc(user.uid).collection('mealPlans').limit(1).get();
        states.set(user.uid, !snapshot.empty);
      } catch {
        states.set(user.uid, null);
      }
    }
  }));
  return states;
}

export async function collectUsageReport(auth, db) {
  const [users, routineOwners, workoutOwners] = await Promise.all([
    listAllAuthUsers(auth),
    listOwners(db, 'routines'),
    listOwners(db, 'workouts')
  ]);
  const savedPlanStates = await getSavedPlanStates(db, users);
  return buildUsageReport(users, routineOwners, workoutOwners, savedPlanStates);
}

export function createAdminUsageHandler({ getAuth, getDb, verifyAppCheck, ownerUid, allowedOrigins }) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) return res.status(403).json({ error: 'Domen nije dozvoljen.' });
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-Firebase-AppCheck');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!ownerUid?.trim()) return res.status(503).json({ error: 'Privatni pregled još nije konfigurisan.' });
    const authorization = String(req.headers.authorization || '');
    if (!authorization.startsWith('Bearer ') || !authorization.slice(7).trim()) {
      return res.status(401).json({ error: 'Prijava je potrebna.' });
    }
    let appCheckValid = false;
    try {
      appCheckValid = await verifyAppCheck(req);
    } catch { /* A failed verification is denied. */ }
    if (!appCheckValid) return res.status(401).json({ error: 'App Check provjera nije uspjela.' });
    let auth;
    try { auth = getAuth(); }
    catch { return res.status(503).json({ error: 'Pregled trenutno nije konfigurisan.' }); }
    try {
      const decoded = await auth.verifyIdToken(authorization.slice(7), true);
      if (!isConfiguredOwner(decoded, ownerUid)) return res.status(403).json({ error: 'Pristup nije dozvoljen.' });
    } catch {
      return res.status(401).json({ error: 'Prijava nije važeća.' });
    }
    try {
      const report = await collectUsageReport(auth, getDb());
      return res.status(200).json(report);
    } catch (error) {
      console.error('Admin usage pregled nije dostupan:', error);
      return res.status(503).json({ error: 'Pregled trenutno nije dostupan. Pokušaj ponovo kasnije.' });
    }
  };
}
