import { createHash } from 'node:crypto';
import { getAdminAuth, getAdminDb, verifyAppCheckRequest } from './firebase-admin.js';

const DELETE_REASONS = new Set([
  'no-longer-needed',
  'missing-features',
  'too-difficult',
  'technical-problems',
  'privacy',
  'other'
]);

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || 'https://gymleader.app,https://stijepic404.rf.gd,https://your-gym-planner.vercel.app,http://127.0.0.1:5500,http://localhost:5500')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Firebase-AppCheck');
    return true;
  }
  return !origin;
}

async function deleteOwnedDocuments(db, collectionName, uid) {
  const collectionRef = db.collection(collectionName);
  let removed = 0;
  while (true) {
    const snapshot = await collectionRef.where('userId', '==', uid).limit(400).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    removed += snapshot.size;
  }
  return removed;
}

export default async function handler(req, res) {
  if (!setCors(req, res)) return res.status(403).json({ error: 'Domen nije dozvoljen.' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await verifyAppCheckRequest(req))) return res.status(401).json({ error: 'App Check provjera nije uspjela.' });

  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Prijava je istekla.' });

  const reason = String(req.body?.reason || '');
  const details = String(req.body?.details || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, 500);
  if (!DELETE_REASONS.has(reason)) return res.status(400).json({ error: 'Odaberi razlog brisanja naloga.' });

  try {
    const adminAuth = getAdminAuth();
    const token = await adminAuth.verifyIdToken(authorization.slice(7), true);
    if (Date.now() / 1000 - Number(token.auth_time || 0) > 10 * 60) {
      return res.status(401).json({ code: 'RECENT_LOGIN_REQUIRED', error: 'Prijavi se ponovo prije brisanja naloga.' });
    }

    const db = getAdminDb();
    const uid = token.uid;
    const deletingUser = await adminAuth.getUser(uid);

    // These are all current application records owned by a user. Remove them
    // through Admin SDK so cleanup still works after confirmation and logout.
    const [workoutsDeleted, routinesDeleted, bodyMeasurementsDeleted, foodEntriesDeleted] = await Promise.all([
      deleteOwnedDocuments(db, 'workouts', uid),
      deleteOwnedDocuments(db, 'routines', uid),
      deleteOwnedDocuments(db, 'bodyMeasurements', uid),
      deleteOwnedDocuments(db, 'foodEntries', uid)
    ]);
    const profileRef = db.collection('users').doc(uid);
    await db.recursiveDelete(profileRef);
    if (deletingUser.email) {
      const verificationId = createHash('sha256').update(deletingUser.email.trim().toLowerCase()).digest('hex');
      await db.collection('_verificationCodes').doc(verificationId).delete();
    }
    await adminAuth.deleteUser(uid);

    // Keep only the requested reason and optional comment for product feedback.
    // No UID or email is stored with this feedback record.
    let feedbackSaved = true;
    try {
      await db.collection('accountDeletionFeedback').add({
        reason,
        details,
        createdAt: new Date().toISOString(),
        workoutsDeleted,
        routinesDeleted,
        bodyMeasurementsDeleted,
        foodEntriesDeleted
      });
    } catch (feedbackError) {
      feedbackSaved = false;
      console.error('Razlog brisanja naloga nije sačuvan:', feedbackError);
    }

    return res.status(200).json({ success: true, feedbackSaved });
  } catch (error) {
    if (error.code === 'auth/id-token-revoked' || error.code === 'auth/invalid-user-token' || error.code === 'auth/user-not-found') {
      return res.status(401).json({ error: 'Sesija je istekla. Prijavi se ponovo.' });
    }
    console.error('Brisanje naloga nije uspjelo:', error);
    return res.status(500).json({ error: 'Nalog i podaci nisu mogli biti obrisani. Pokušaj ponovo ili se javi podršci.' });
  }
}
