import { createHash, randomInt } from 'node:crypto';
import { getAdminDb, verifyAppCheckRequest } from './firebase-admin.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;
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

function emailId(email) {
  return createHash('sha256').update(email).digest('hex');
}

function codeHash(email, code) {
  const pepper = process.env.VERIFICATION_CODE_PEPPER;
  if (!pepper) throw new Error('VERIFICATION_CODE_PEPPER nije podešen na Vercelu.');
  return createHash('sha256').update(`${email}:${code}:${pepper}`).digest('hex');
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return String(req.socket?.remoteAddress || 'unknown');
}

export default async function handler(req, res) {
  if (!setCors(req, res)) return res.status(403).json({ error: 'Domen nije dozvoljen.' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await verifyAppCheckRequest(req))) return res.status(401).json({ error: 'App Check provjera nije uspjela.' });

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return res.status(400).json({ error: 'Unesite ispravan e-mail.' });

  try {
    const db = getAdminDb();
    const verificationRef = db.collection('_verificationCodes').doc(emailId(email));
    const ipRateRef = db.collection('_verificationRateLimits').doc(emailId(clientIp(req)));
    const [previous, previousIpRequest] = await Promise.all([verificationRef.get(), ipRateRef.get()]);
    const now = Date.now();

    if (previous.exists && now - Number(previous.data().sentAt || 0) < RESEND_DELAY_MS) {
      return res.status(429).json({ error: 'Sačekajte minut prije slanja novog koda.' });
    }
    if (previousIpRequest.exists && now - Number(previousIpRequest.data().sentAt || 0) < RESEND_DELAY_MS) {
      return res.status(429).json({ error: 'Sačekajte minut prije slanja novog koda.' });
    }

    const code = String(randomInt(100000, 1000000));
    await Promise.all([
      verificationRef.set({ codeHash: codeHash(email, code), sentAt: now, expiresAt: now + CODE_TTL_MS, attempts: 0 }),
      ipRateRef.set({ sentAt: now })
    ]);

    const brevoKey = process.env.BREVO_API_KEY;
    if (!brevoKey) throw new Error('BREVO_API_KEY nije podešen na Vercelu.');

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': brevoKey },
      body: JSON.stringify({ to: [{ email }], templateId: 1, params: { code, expirationMinutes: '10' } })
    });

    if (!brevoResponse.ok) {
      await verificationRef.delete();
      const rawBrevoError = await brevoResponse.text();
      let brevoMessage = 'Brevo nije naveo razlog.';
      try {
        const brevoError = JSON.parse(rawBrevoError);
        brevoMessage = String(brevoError.message || brevoError.code || brevoMessage);
      } catch {
        if (rawBrevoError) brevoMessage = rawBrevoError.slice(0, 300);
      }
      console.error('Brevo odbio slanje:', brevoResponse.status, brevoMessage);
      return res.status(502).json({ error: `Brevo je odbio slanje (${brevoResponse.status}): ${brevoMessage}` });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Greška pri slanju verifikacije:', error);
    return res.status(500).json({ error: 'Server nije pravilno podešen za verifikaciju.' });
  }
}
