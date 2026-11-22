import crypto from 'node:crypto';
import { db } from './db.js';

export const OWNER_LIMITS = Object.freeze({
  bots: 999,
  courses: 999,
  learners: 999999,
  members: 100,
  commandsPerBot: 300,
  apiKeys: 10,
});

const SECRET = process.env.AUTH_SECRET || 'kyllbot-studio-dev-secret';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const attempts = new Map();

const normalizeCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const hash = (code) => crypto.createHash('sha256').update(`${normalizeCode(code)}:${SECRET}`).digest('hex');

export function ownerEmail() {
  const configured = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
  if (configured) return configured;
  const account = db.users.find((user) => !user.email.toLowerCase().endsWith('@kyllbot.studio')) || db.users[0];
  return account?.email?.toLowerCase() || '';
}

export function isAppOwner(user) {
  const email = ownerEmail();
  return Boolean(email && user?.email && user.email.toLowerCase() === email);
}

export function ownerUser() {
  const email = ownerEmail();
  return email ? db.users.find((user) => user.email.toLowerCase() === email) || null : null;
}

export function ownerAccessStatus() {
  const access = db.ownerAccess || {};
  return {
    enabled: Boolean(access.codeHash),
    createdAt: access.createdAt || null,
    lastUsedAt: access.lastUsedAt || null,
    ownerEmail: ownerEmail(),
  };
}

export function generateOwnerCode() {
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)]).join(''),
  ).join('-');
}

export function setOwnerCode(code) {
  db.ownerAccess = {
    codeHash: hash(code),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
}

export function revokeOwnerCode() {
  db.ownerAccess = { codeHash: null, createdAt: null, lastUsedAt: null };
}

export function canAttemptOwnerUnlock(ip) {
  const now = Date.now();
  const windowMs = 15 * 60e3;
  const hits = (attempts.get(ip) || []).filter((time) => now - time < windowMs);
  if (hits.length >= 10) return false;
  hits.push(now);
  attempts.set(ip, hits);
  if (attempts.size > 1000) {
    for (const [key, value] of attempts) if (!value.some((time) => now - time < windowMs)) attempts.delete(key);
  }
  return true;
}

export function verifyOwnerCode(code) {
  const access = db.ownerAccess;
  if (!access?.codeHash) return false;
  const provided = hash(String(code || '').trim().toUpperCase());
  const expected = Buffer.from(access.codeHash, 'hex');
  const actual = Buffer.from(provided, 'hex');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return false;
  access.lastUsedAt = new Date().toISOString();
  return true;
}
