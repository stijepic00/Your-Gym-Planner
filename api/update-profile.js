import { createHash, timingSafeEqual } from 'node:crypto';
import { getAdminAuth, getAdminDb, verifyAppCheckRequest } from './firebase-admin.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTEMPTS = 5;

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || 'https://stijepic404.rf.gd,https://your-gym-planner.vercel.app,http://127.0.0.1:5500,http://localhost:5500')
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

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function cleanName(value) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  if (!setCors(req, res)) return res.status(403).json({ error: 'Domen nije dozvoljen.' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await verifyAppCheckRequest(req))) return res.status(401).json({ error: 'App Check provjera nije uspjela.' });

  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Prijava je istekla.' });

  try {
    const adminAuth = getAdminAuth();
    const token = await adminAuth.verifyIdToken(authorization.slice(7), true);
    const user = await adminAuth.getUser(token.uid);
    const name = cleanName(req.body?.name);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const emailChanged = email && email !== String(user.email || '').toLowerCase();

    if (!name) return res.status(400).json({ error: 'Ime i prezime su obavezni.' });
    if (emailChanged && (!EMAIL_PATTERN.test(email) || email.length > 254 || !/^\d{6}$/.test(code))) {
      return res.status(400).json({ error: 'Nova email adresa i šestocifreni kod nisu ispravni.' });
    }

    const db = getAdminDb();
    if (emailChanged) {
      const pepper = process.env.VERIFICATION_CODE_PEPPER;
      if (!pepper) throw new Error('VERIFICATION_CODE_PEPPER nije podešen na Vercelu.');
      const verificationRef = db.collection('_verificationCodes').doc(hash(email));
      const verification = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(verificationRef);
        const data = snapshot.data();
        if (!snapshot.exists || !data || Date.now() > Number(data.expiresAt)) throw new Error('CODE_EXPIRED');
        if (Number(data.attempts || 0) >= MAX_ATTEMPTS) throw new Error('TOO_MANY_ATTEMPTS');
        transaction.update(verificationRef, { attempts: Number(data.attempts || 0) + 1 });
        return data;
      });
      const received = Buffer.from(hash(`${email}:${code}:${pepper}`), 'hex');
      const stored = Buffer.from(String(verification.codeHash || ''), 'hex');
      if (received.length !== stored.length || !timingSafeEqual(received, stored)) {
        return res.status(400).json({ error: 'Verifikacioni kod nije tačan.' });
      }
      await adminAuth.updateUser(user.uid, { email, emailVerified: true, displayName: name });
      await verificationRef.delete();
    } else {
      await adminAuth.updateUser(user.uid, { displayName: name });
    }

    const profileRef = db.collection('users').doc(user.uid);
    const profileSnapshot = await profileRef.get();
    const existing = profileSnapshot.data() || {};
    await profileRef.set({
      fullName: name,
      email: emailChanged ? email : (user.email || existing.email || ''),
      createdAt: existing.createdAt || new Date().toISOString()
    });

    return res.status(200).json({ success: true, email: emailChanged ? email : user.email });
  } catch (error) {
    if (error.message === 'CODE_EXPIRED') return res.status(400).json({ error: 'Kod je istekao. Zatražite novi.' });
    if (error.message === 'TOO_MANY_ATTEMPTS') return res.status(429).json({ error: 'Previše pokušaja. Zatražite novi kod.' });
    if (error.code === 'auth/email-already-exists') return res.status(409).json({ error: 'Ovaj email je već registrovan.' });
    if (error.code === 'auth/id-token-revoked' || error.code === 'auth/invalid-user-token') return res.status(401).json({ error: 'Prijava je istekla.' });
    console.error('Greška pri ažuriranju profila:', error);
    return res.status(500).json({ error: 'Profil nije moguće ažurirati.' });
  }
}
