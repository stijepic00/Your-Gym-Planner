import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getAppCheck } from 'firebase-admin/app-check';

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON nije podešen na Vercelu.');

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON nije ispravan JSON.');
  }

  return initializeApp({ credential: cert(serviceAccount) });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export async function verifyAppCheckRequest(req) {
  if (process.env.APP_CHECK_ENFORCED !== 'true') return true;

  const token = req.headers['x-firebase-appcheck'];
  if (!token || typeof token !== 'string') return false;

  try {
    await getAppCheck(getAdminApp()).verifyToken(token);
    return true;
  } catch {
    return false;
  }
}
