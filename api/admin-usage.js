import { getAdminAuth, getAdminDb, verifyAppCheckRequest } from './firebase-admin.js';
import { createAdminUsageHandler } from './admin-usage-core.js';

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://gymleader.app,https://stijepic404.rf.gd,https://your-gym-planner.vercel.app,http://127.0.0.1:5500,http://localhost:5500')
  .split(',').map((origin) => origin.trim()).filter(Boolean);

export default createAdminUsageHandler({
  getAuth: getAdminAuth,
  getDb: getAdminDb,
  verifyAppCheck: verifyAppCheckRequest,
  ownerUid: process.env.GYMLEADER_OWNER_UID,
  allowedOrigins
});
