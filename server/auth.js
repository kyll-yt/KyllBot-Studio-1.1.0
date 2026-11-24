import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { db, findUserByEmail, findUserById, newId, persist } from './db.js';
import { seedWorkspace } from './seed.js';
import { authSecret } from './secrets.js';

const COOKIE = 'kyll_session';
const SESSION_TTL = 30 * 24 * 3600e3;
const CODE_TTL = 10 * 60e3;
const MAX_ATTEMPTS = 5;

function hostedPublicly() {
  if (process.env.NODE_ENV === 'production') return true;
  if (String(process.env.RENDER || '').toLowerCase() === 'true') return true;
  if (process.env.RENDER_EXTERNAL_URL) return true;
  try {
    const host = new URL(String(process.env.PUBLIC_URL || '').trim()).hostname;
    return !['localhost', '127.0.0.1', '::1'].includes(host);
  } catch {
    return false;
  }
}

const DEV_LOGIN_CODE = process.env.ALLOW_DEV_LOGIN_CODE === '1' || !hostedPublicly();

export const resendConfigured = Boolean(process.env.RESEND_API_KEY);
export const smtpConfigured = Boolean(process.env.SMTP_HOST);
export const mailConfigured = resendConfigured || smtpConfigured;
export const mailMode = resendConfigured ? 'resend' : smtpConfigured ? 'smtp' : 'demo';
export const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const devLoginEnabled = DEV_LOGIN_CODE;

const hash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const codeHash = (email, code) => hash(`${email}:${code}:${authSecret()}`);
const tokenHash = (token) => hash(`${token}:${authSecret()}`);

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) && email.length <= 254;
}

/* ---------------- rate limiting ---------------- */

const buckets = new Map();

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) return false;
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}

/* ---------------- email delivery ---------------- */

const mailFrom = () => process.env.MAIL_FROM || 'KyllBot Studio <no-reply@kyllbot.studio>';

function codeEmail(code) {
  return `<div style="font-family:Inter,Arial,sans-serif;background:#0b0a14;color:#e9e7ff;padding:40px;border-radius:16px">
    <h1 style="font-size:20px;margin:0 0 8px">KyllBot Studio</h1>
    <p style="color:#a9a4c9;margin:0 0 24px">Voici votre code de connexion. Il expire dans 10 minutes.</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:10px;background:#16132a;padding:18px 24px;border-radius:12px;display:inline-block">${code}</div>
    <p style="color:#6f6a8f;font-size:12px;margin-top:28px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
  </div>`;
}

let smtpTransport = null;

function getSmtpTransport() {
  if (!smtpTransport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === '1' : port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
        : undefined,
    });
  }
  return smtpTransport;
}

async function sendWithResend(email, code) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailFrom(),
      to: [email],
      subject: `Votre code de connexion : ${code}`,
      html: codeEmail(code),
    }),
  });
  if (!response.ok) throw new Error(`Envoi email impossible (${response.status})`);
}

async function sendWithSmtp(email, code) {
  await getSmtpTransport().sendMail({
    from: mailFrom(),
    to: email,
    subject: `Votre code de connexion : ${code}`,
    html: codeEmail(code),
  });
}

async function sendCodeEmail(email, code) {
  if (!mailConfigured) {
    console.log(`\n  [KyllBot Studio] Code de connexion pour ${email} : ${code}\n`);
    return { delivered: false, transport: 'demo' };
  }
  if (resendConfigured) {
    try {
      await sendWithResend(email, code);
      return { delivered: true, transport: 'resend' };
    } catch (error) {
      if (!smtpConfigured) throw error;
      console.warn(`[KyllBot Studio] Resend indisponible, bascule SMTP : ${error.message}`);
    }
  }
  await sendWithSmtp(email, code);
  return { delivered: true, transport: 'smtp' };
}

/* ---------------- login codes ---------------- */

export async function requestLoginCode(rawEmail, ip) {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) throw Object.assign(new Error('Adresse email invalide.'), { status: 400 });

  if (!rateLimit(`email:${email}`, 5, 15 * 60e3)) {
    throw Object.assign(new Error('Trop de demandes de code. Réessayez dans quelques minutes.'), { status: 429 });
  }
  if (!rateLimit(`ip:${ip}`, 25, 60 * 60e3)) {
    throw Object.assign(new Error('Trop de tentatives depuis cette connexion.'), { status: 429 });
  }

  if (!mailConfigured && !DEV_LOGIN_CODE) {
    return { email, delivered: false, transport: 'unconfigured' };
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  db.codes = db.codes.filter((c) => c.email !== email && c.expiresAt > Date.now() && !c.consumed);
  db.codes.push({
    id: newId(),
    email,
    hash: codeHash(email, code),
    expiresAt: Date.now() + CODE_TTL,
    attempts: 0,
    consumed: false,
    createdAt: new Date().toISOString(),
  });
  persist();

  const result = await sendCodeEmail(email, code);
  return {
    email,
    delivered: result.delivered,
    transport: result.transport,
    devCode: result.delivered || !DEV_LOGIN_CODE ? undefined : code,
  };
}

export function verifyLoginCode(rawEmail, rawCode, req) {
  const email = normalizeEmail(rawEmail);
  const code = String(rawCode || '').replace(/\D/g, '');
  if (!isValidEmail(email)) throw Object.assign(new Error('Adresse email invalide.'), { status: 400 });
  if (code.length !== 6) throw Object.assign(new Error('Le code doit contenir 6 chiffres.'), { status: 400 });
  if (!rateLimit(`verify:${email}`, 10, 15 * 60e3)) {
    throw Object.assign(new Error('Trop de tentatives. Demandez un nouveau code.'), { status: 429 });
  }

  const entry = db.codes.find((c) => c.email === email && !c.consumed);
  if (!entry || entry.expiresAt < Date.now()) {
    throw Object.assign(new Error('Code incorrect ou expiré. Demandez un nouveau code.'), { status: 400 });
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    throw Object.assign(new Error('Trop d’essais sur ce code. Demandez un nouveau code.'), { status: 429 });
  }

  entry.attempts += 1;
  const expected = Buffer.from(entry.hash, 'hex');
  const provided = Buffer.from(codeHash(email, code), 'hex');
  const ok = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
  if (!ok) {
    persist();
    throw Object.assign(new Error('Code incorrect ou expiré.'), { status: 401 });
  }

  entry.consumed = true;
  db.codes = db.codes.filter((c) => c.email !== email || c.consumed);
  persist();

  const user = findOrCreateUser(email, { provider: 'email' });
  const session = createSession(user.id, req);
  return { user: publicUser(user), token: session.token };
}

/* ---------------- users & sessions ---------------- */

export function findOrCreateUser(email, { name, avatar, googleId, provider } = {}) {
  let user = findUserByEmail(email);
  if (!user) {
    const local = email.split('@')[0];
    const displayName = name || local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    user = {
      id: newId(),
      email,
      name: displayName.slice(0, 60),
      avatar: avatar || '',
      googleId: googleId || null,
      plan: 'Gratuit',
      provider: provider || 'email',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    db.users.push(user);
    db.workspaces[user.id] = seedWorkspace(user, { includeBots: user.provider === 'demo' });
  } else {
    user.lastLoginAt = new Date().toISOString();
    if (googleId && !user.googleId) user.googleId = googleId;
    if (!db.workspaces[user.id]) {
      db.workspaces[user.id] = seedWorkspace(user, { includeBots: user.provider === 'demo' });
    }
  }
  persist();
  return user;
}

export function createSession(userId, req) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.sessions = db.sessions.filter((s) => s.expiresAt > Date.now());
  db.sessions.push({
    id: newId(),
    userId,
    hash: tokenHash(token),
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL,
    ip: req?.ip,
    userAgent: (req?.get?.('user-agent') || '').slice(0, 200),
  });
  persist();
  return { token };
}

export function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === '1';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL / 1000}${secure ? '; Secure' : ''}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function parseCookies(header = '') {
  return String(header)
    .split(';')
    .reduce((acc, part) => {
      const idx = part.indexOf('=');
      if (idx <= 0) return acc;
      const key = part.slice(0, idx).trim();
      const raw = part.slice(idx + 1).trim();
      try {
        acc[key] = decodeURIComponent(raw);
      } catch {
        acc[key] = raw;
      }
      return acc;
    }, {});
}

export function userFromRequest(req) {
  const token = parseCookies(req.headers.cookie || '')[COOKIE];
  if (!token) return null;
  const session = db.sessions.find((s) => s.hash === tokenHash(token) && s.expiresAt > Date.now());
  if (!session) return null;
  const user = findUserById(session.userId);
  return user || null;
}

export function requireAuth(req, res, next) {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié.' });
  req.user = user;
  next();
}

export function destroySession(req) {
  const token = parseCookies(req.headers.cookie || '')[COOKIE];
  if (!token) return;
  db.sessions = db.sessions.filter((s) => s.hash !== tokenHash(token));
  persist();
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    plan: user.plan,
    provider: user.provider,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/* ---------------- Google OAuth ---------------- */

export function googleRedirectUri(req) {
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`;
}

export function googleAuthUrl(req, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(req, code) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(req),
      grant_type: 'authorization_code',
    }),
  });
  if (!response.ok) throw new Error('Échange du code Google impossible.');
  const tokens = await response.json();
  const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString('utf8'));
  if (!payload.email || payload.email_verified === false) throw new Error('Compte Google non vérifié.');
  return {
    email: normalizeEmail(payload.email),
    name: payload.name,
    avatar: payload.picture,
    googleId: payload.sub,
  };
}
