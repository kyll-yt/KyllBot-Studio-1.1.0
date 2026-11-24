import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const KEY_FILE = path.join(DATA_DIR, '.token-key');
const AUTH_SECRET_FILE = path.join(DATA_DIR, '.auth-secret');
let cachedKey = null;
let cachedAuthSecret = null;

function fileSecret(file) {
  try {
    const existing = fs.readFileSync(file);
    if (existing.length >= 32) return existing.toString('utf8').trim();
  } catch {
    /* première utilisation */
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

export function authSecret() {
  if (cachedAuthSecret) return cachedAuthSecret;
  const configured = String(process.env.AUTH_SECRET || '').trim();
  if (configured && configured !== 'change-me-in-production') {
    cachedAuthSecret = configured;
    return cachedAuthSecret;
  }
  // Réutilise la clé de chiffrement stable pour éviter de perdre les sessions
  // quand le dossier data/ est effacé à chaque déploiement.
  let stableKey = null;
  try {
    stableKey = parseKey(process.env.TOKEN_ENCRYPTION_KEY);
  } catch {
    /* clé invalide : on retombe sur le fichier local */
  }
  if (stableKey) {
    cachedAuthSecret = crypto.createHash('sha256').update(`auth:${stableKey.toString('hex')}`).digest('hex');
    return cachedAuthSecret;
  }
  cachedAuthSecret = fileSecret(AUTH_SECRET_FILE);
  if (process.env.NODE_ENV === 'production') {
    console.warn('[security] AUTH_SECRET et TOKEN_ENCRYPTION_KEY absents : un secret local a été généré. Les sessions seront perdues au prochain redéploiement.');
  }
  return cachedAuthSecret;
}

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
