import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const KEY_FILE = path.join(DATA_DIR, '.token-key');
let cachedKey = null;

function parseKey(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (/^[0-9a-f]{64}$/i.test(value)) return Buffer.from(value, 'hex');
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length === 32) return decoded;
  throw new Error('TOKEN_ENCRYPTION_KEY doit être une clé de 32 octets (hex 64 caractères ou base64).');
}

function fileKey() {
  try {
    const existing = fs.readFileSync(KEY_FILE);
    if (existing.length === 32) return existing;
  } catch {
    /* première utilisation */
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_FILE, key, { mode: 0o600 });
  return key;
}

function encryptionKey() {
  if (cachedKey) return cachedKey;
  const explicit = parseKey(process.env.TOKEN_ENCRYPTION_KEY);
  if (explicit) {
    cachedKey = explicit;
    return cachedKey;
  }
  const authSecret = String(process.env.AUTH_SECRET || '').trim();
  if (authSecret && authSecret !== 'change-me-in-production') {
    cachedKey = crypto.createHash('sha256').update(authSecret).digest();
    return cachedKey;
  }
  cachedKey = fileKey();
  return cachedKey;
}

export function tokenKeySource() {
  try {
    if (parseKey(process.env.TOKEN_ENCRYPTION_KEY)) return 'env';
  } catch {
    return 'invalid-env';
  }
  const authSecret = String(process.env.AUTH_SECRET || '').trim();
  if (authSecret && authSecret !== 'change-me-in-production') return 'auth-secret';
  return 'file';
}

export function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptSecret(payload) {
  const parts = String(payload || '').split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Secret chiffré invalide.');
  const iv = Buffer.from(parts[1], 'base64url');
  const tag = Buffer.from(parts[2], 'base64url');
  const data = Buffer.from(parts[3], 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
