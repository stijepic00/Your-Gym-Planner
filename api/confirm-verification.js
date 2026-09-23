import { createHash, timingSafeEqual } from 'node:crypto';
import { getAdminAuth, getAdminDb, verifyAppCheckRequest } from './firebase-admin.js';

const MAX_ATTEMPTS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Firebase-AppCheck');
    return true;
  }
  return !origin;
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function cleanName(value) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 80);
}

export default async function handler(req, res) {
  if (!setCors(req, res)) return res.status(403).json({ error: 'Domen nije dozvoljen.' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await verifyAppCheckRequest(req))) return res.status(401).json({ error: 'App Check provjera nije uspjela.' });

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const code = String(req.body?.code || '').trim();
  const fullName = cleanName(req.body?.name);

  if (!EMAIL_PATTERN.test(email) || email.length > 254 || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Podaci za potvrdu nisu ispravni.' });
  if (password.length < 8 || password.length > 256) return res.status(400).json({ error: 'Lozinka mora imati najmanje 8 karaktera.' });

  try {
    const pepper = process.env.VERIFICATION_CODE_PEPPER;
    if (!pepper) throw new Error('VERIFICATION_CODE_PEPPER nije podešen na Vercelu.');

    const db = getAdminDb();
    const verificationRef = db.collection('_verificationCodes').doc(hash(email));
    const verification = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(verificationRef);
      const data = snapshot.data();
      if (!snapshot.exists || !data || Date.now() > Number(data.expiresAt)) throw new Error('CODE_EXPIRED');
      if (Number(data.attempts || 0) >= MAX_ATTEMPTS) throw new Error('TOO_MANY_ATTEMPTS');
      transaction.update(verificationRef, { attempts: Number(data.attempts || 0) + 1 });
      return data;
    });

    const receivedHash = Buffer.from(hash(`${email}:${code}:${pepper}`), 'hex');
    const storedHash = Buffer.from(String(verification.codeHash || ''), 'hex');
    if (receivedHash.length !== storedHash.length || !timingSafeEqual(receivedHash, storedHash)) {
      return res.status(400).json({ error: 'Verifikacioni kod nije tačan.' });
    }

    const adminAuth = getAdminAuth();
    const user = await adminAuth.createUser({ email, password, displayName: fullName || 'Korisnik', emailVerified: true });
    await db.collection('users').doc(user.uid).set({ fullName: fullName || 'Korisnik', email, createdAt: new Date().toISOString() });
    await verificationRef.delete();

    return res.status(201).json({ success: true, customToken: await adminAuth.createCustomToken(user.uid) });
  } catch (error) {
    if (error.message === 'CODE_EXPIRED') return res.status(400).json({ error: 'Kod je istekao. Zatražite novi.' });
    if (error.message === 'TOO_MANY_ATTEMPTS') return res.status(429).json({ error: 'Previše pokušaja. Zatražite novi kod.' });
    if (error.code === 'auth/email-already-exists') return res.status(409).json({ error: 'Ovaj e-mail je već registrovan.' });
    console.error('Greška pri potvrdi verifikacije:', error);
    return res.status(500).json({ error: 'Server nije uspio završiti registraciju.' });
  }
}
