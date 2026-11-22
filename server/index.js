import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { db, findUserByEmail, findUserById, flushPersistence, newId, persist, storageError, storageMode } from './db.js';
import {
  clearCookie,
  createSession,
  destroySession,
  exchangeGoogleCode,
  findOrCreateUser,
  googleAuthUrl,
  googleConfigured,
  mailConfigured,
  mailMode,
  parseCookies,
  publicUser,
  requireAuth,
  requestLoginCode,
  sessionCookie,
  userFromRequest,
  verifyLoginCode,
} from './auth.js';
import { seedWorkspace } from './seed.js';
import { pushActivity, recordEvent } from './activity.js';
import { defaultDiscordServer, normalizeDiscordServer } from './discord.js';
import { encryptSecret } from './secrets.js';
import {
  autostartBots,
  getBotRuntime,
  sendSavedMessageNow,
  sendScheduledMessageNow,
  sendTestMessage,
  shutdownBots,
  startBot,
  stopBot,
  syncBotCommands,
  syncDiscordMetadata,
  testBotConnection,
  validateDiscordToken,
} from './discord-runtime.js';
import {
  OWNER_LIMITS,
  canAttemptOwnerUnlock,
  generateOwnerCode,
  isAppOwner,
  ownerAccessStatus,
  ownerUser,
  revokeOwnerCode,
  setOwnerCode,
  verifyOwnerCode,
} from './owner.js';
import { describeTrigger, ensureBotFlows, flowTemplate, runFlow, sanitizeFlow } from './flows.js';
import {
  DEFAULT_PLAN,
  PLAN_NAMES,
  SHOP,
  dailyRewardStatus,
  effectiveLimits,
  ensureAddons,
  normalizePlanName,
  publicPlans,
  publicShop,
} from './plans.js';
import { sanitizeScheduledMessage, scheduledMessageLabel } from './scheduled.js';
import {
  sanitizeSavedMessage,
  savedMessageHasEmbed,
  savedMessageLabel,
  savedMessagePreview,
} from './messages.js';

const app = express();
const PORT = Number(process.env.PORT || 12000);
const PID_FILE = process.env.PID_FILE || path.join(os.tmpdir(), 'kyllbot-app.pid');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "script-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'self'",
    ].join('; '),
  );
  next();
});

app.get('/healthz', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    pid: process.pid,
    uptime: Math.round(process.uptime()),
    storage: storageMode,
    storageError: storageError || null,
    env: {
      supabaseUrl: Boolean(process.env.SUPABASE_URL),
      supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  });
});

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const str = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const describeFlowTrigger = (trigger) => describeTrigger(trigger);

const SCHEMA_VERSION = 2;
const FAKE_EMAIL = /@example\.com$/i;
const FAKE_NAME = /Emma Petit|Lucas Moreau|Sarah Benali|Hugo Lefèvre|Inès Garnier|Nathan Roy|Léa Martin|Noah Bernard/;
const TEST_ACTIVITY =
  /test API|Bot de test|Formation de test|Inconnu|a traité [\d\s]+ commandes|certificats ont été générés|panneau de tickets a été désactivé|Le module « Prévenir » a été ajouté/i;
const ACTIVITY_EVENTS = new Set(['command.run', 'flow.run', 'learner.active', 'learner.created']);

function migrateWorkspace(ws) {
  let changed = false;
  if ((ws.schemaVersion || 1) < SCHEMA_VERSION) {
    for (const bot of ws.bots || []) {
      for (const command of bot.commands || []) command.uses = 0;
      for (const flow of bot.flows || []) flow.runs = 0;
    }
    ws.schemaVersion = SCHEMA_VERSION;
    changed = true;
  }
  for (const bot of ws.bots || []) {
    const discord = normalizeDiscordServer(bot.discord, bot);
    if (JSON.stringify(bot.discord) !== JSON.stringify(discord)) {
      bot.discord = discord;
      changed = true;
    }
    if (bot.tokenHash && !bot.tokenEnc) {
      bot.tokenHash = null;
      bot.tokenHint = '••••••••';
      bot.tokenNeedsReconnect = true;
      if (bot.status === 'online') bot.status = 'offline';
      changed = true;
    }
    if (bot.tokenEnc === undefined) bot.tokenEnc = null;
    if (bot.tokenNeedsReconnect === undefined) bot.tokenNeedsReconnect = false;
    if (!Array.isArray(bot.scheduledMessages)) {
      bot.scheduledMessages = [];
      changed = true;
    }
    if (!Array.isArray(bot.savedMessages)) {
      bot.savedMessages = [];
      changed = true;
    }
    for (const flow of bot.flows || []) {
      if (flow.trigger?.type !== 'slash') continue;
      const command = String(flow.trigger.command || '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 32) || 'mon-flux';
      if (flow.trigger.command !== command) {
        flow.trigger.command = command;
        changed = true;
      }
    }
  }
  const learners = (ws.learners || []).filter((learner) => !FAKE_EMAIL.test(learner.email));
  if (learners.length !== (ws.learners || []).length) {
    ws.learners = learners;
    changed = true;
  }
  const team = (ws.team || []).filter((member) => !FAKE_EMAIL.test(member.email));
  if (team.length !== (ws.team || []).length) {
    ws.team = team;
    changed = true;
  }
  const teamNames = new Set((ws.team || []).map((member) => String(member.name || '').toLowerCase()));
  const activity = (ws.activity || []).filter((entry) => {
    const message = String(entry.message || '');
    if (FAKE_NAME.test(message) || TEST_ACTIVITY.test(message)) return false;
    const added = message.match(/([\p{L}][\p{L}-]+) a été ajouté à l.équipe/iu);
    return !added || teamNames.has(added[1].toLowerCase());
  });
  if (activity.length !== (ws.activity || []).length) {
    ws.activity = activity;
    changed = true;
  }
  if (!Array.isArray(ws.events)) {
    ws.events = [];
    changed = true;
  }
  const botIds = new Set((ws.bots || []).map((bot) => bot.id));
  const commandIds = new Set((ws.bots || []).flatMap((bot) => (bot.commands || []).map((command) => command.id)));
  const flowIds = new Set((ws.bots || []).flatMap((bot) => (bot.flows || []).map((flow) => flow.id)));
  const courseIds = new Set((ws.courses || []).map((course) => course.id));
  const learnerIds = new Set((ws.learners || []).map((learner) => learner.id));
  const memberIds = new Set((ws.team || []).map((member) => member.id));
  const events = ws.events.filter((event) => {
    if (event.botId && !botIds.has(event.botId)) return false;
    if (event.commandId && !commandIds.has(event.commandId)) return false;
    if (event.flowId && !flowIds.has(event.flowId)) return false;
    if (event.courseId && !courseIds.has(event.courseId)) return false;
    if (event.learnerId && !learnerIds.has(event.learnerId)) return false;
    if (event.memberId && !memberIds.has(event.memberId)) return false;
    return true;
  });
  if (events.length !== ws.events.length) {
    ws.events = events;
    changed = true;
  }
  if (!Array.isArray(ws.purchases)) {
    ws.purchases = [];
    changed = true;
  }
  if (!Array.isArray(ws.invoices)) {
    ws.invoices = [];
    changed = true;
  }
  if (typeof ws.credits !== 'number') {
    ws.credits = 0;
    changed = true;
  }
  if (!ws.dailyReward || typeof ws.dailyReward !== 'object') {
    ws.dailyReward = { lastClaimAt: null, streak: 0, totalClaimed: 0 };
    changed = true;
  }
  if (ws.plan === 'Starter' || !PLAN_NAMES.includes(ws.plan)) {
    ws.plan = normalizePlanName(ws.plan);
    changed = true;
  }
  if (ws.planExpiresAt && Date.parse(ws.planExpiresAt) <= Date.now() && ws.plan !== DEFAULT_PLAN) {
    ws.plan = DEFAULT_PLAN;
    ws.planExpiresAt = null;
    changed = true;
  }
  const previousAddons = JSON.stringify(ws.addons || {});
  ensureAddons(ws);
  if (JSON.stringify(ws.addons) !== previousAddons) changed = true;
  return changed;
}

function getWorkspace(userId) {
  if (!db.workspaces[userId]) {
    const user = findUserById(userId);
    db.workspaces[userId] = seedWorkspace(user, { includeBots: user?.provider === 'demo' });
    persist();
  }
  if (migrateWorkspace(db.workspaces[userId])) persist();
  return db.workspaces[userId];
}

function findOr404(list, id, label = 'Élément') {
  const item = list.find((entry) => entry.id === id);
  if (!item) throw Object.assign(new Error(`${label} introuvable.`), { status: 404 });
  return item;
}

const bad = (message) => Object.assign(new Error(message), { status: 400 });

function pickColors(value) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#6d5efc';
}

function publicSavedMessage(message) {
  return {
    ...message,
    label: savedMessageLabel(message),
    preview: savedMessagePreview(message),
    hasEmbed: savedMessageHasEmbed(message),
    buttonCount: (message.buttons || []).length,
  };
}

function publicBot(bot) {
  const { tokenHash, tokenEnc, ...rest } = bot;
  return {
    ...rest,
    scheduledMessages: (bot.scheduledMessages || []).map((message) => ({
      ...message,
      scheduleLabel: scheduledMessageLabel(message),
    })),
    savedMessages: (bot.savedMessages || []).map(publicSavedMessage),
    hasToken: Boolean(tokenEnc),
    tokenNeedsReconnect: Boolean(bot.tokenNeedsReconnect),
    runtime: getBotRuntime(bot.id),
  };
}

async function applyBotToken(bot, token) {
  const value = String(token ?? '').trim();
  if (value.length < 20 || /\s/.test(value)) {
    throw bad('Token Discord invalide : il doit contenir au moins 20 caractères, sans espace.');
  }
  let account;
  try {
    account = await validateDiscordToken(value);
  } catch (error) {
    if (error.code === 'DISCORD_NETWORK') {
      throw bad('Impossible de joindre Discord pour vérifier le token. Vérifie la connexion réseau du serveur.');
    }
    throw bad(`Token refusé par Discord : ${error.message}`);
  }
  bot.tokenEnc = encryptSecret(value);
  bot.tokenHash = null;
  bot.tokenHint = value.slice(-4);
  bot.tokenUpdatedAt = new Date().toISOString();
  bot.tokenNeedsReconnect = false;
  bot.discordAccount = account;
  bot.status = 'online';
  if (!bot.discord?.guildId && account.guilds.length) {
    bot.discord = { ...(bot.discord || {}), guildId: account.guilds[0].id, guildName: account.guilds[0].name };
  }
  return account;
}

async function startBotWithTimeout(botId, timeoutMs = 12000) {
  return Promise.race([
    startBot(botId, { force: true }).catch((error) => ({ status: 'error', lastError: error.message })),
    new Promise((resolve) => setTimeout(() => resolve(getBotRuntime(botId)), timeoutMs)),
  ]);
}

async function connectBot(bot) {
  const runtime = await startBotWithTimeout(bot.id);
  if (runtime?.status === 'error' || runtime?.status === 'offline') {
    bot.status = 'offline';
    persist();
  }
  return runtime;
}

const AUTOMATION_TYPE_LABELS = {
  welcome: "Message d'accueil",
  autorole: 'Rôle automatique',
  levels: 'Niveaux et XP',
  ticketPanel: 'Panneau de tickets',
  moderation: 'Modération automatique',
  antiSpam: 'Anti-spam',
  autoMod: 'Auto-modération',
  logs: 'Journaux de modération',
  reminders: 'Rappels de formation',
};

const AUTOMATION_CONFIG_KEYS = new Set([
  'channel',
  'category',
  'message',
  'role',
  'cron',
  'threshold',
  'xpPerMessage',
  'antiSpam',
  'blockLinks',
  'logChannel',
]);

function sanitizeAutomationConfig(input, previous = {}) {
  const next = { ...previous };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return next;
  for (const [key, value] of Object.entries(input)) {
    if (!AUTOMATION_CONFIG_KEYS.has(key)) continue;
    if (typeof value === 'boolean') next[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) next[key] = Math.max(0, Math.min(1_000_000, value));
    else if (typeof value === 'string') next[key] = str(value, 200);
  }
  return next;
}

function nextInvoiceId(ws) {
  return `INV-${new Date().getFullYear()}-${String((ws.invoices || []).length + 1).padStart(4, '0')}`;
}

function pushInvoice(ws, { label, amount = 0, status = 'Payée', credits = 0 }) {
  if (!Array.isArray(ws.invoices)) ws.invoices = [];
  ws.invoices.unshift({
    id: nextInvoiceId(ws),
    date: new Date().toISOString(),
    label,
    amount,
    credits,
    status,
  });
  ws.invoices = ws.invoices.slice(0, 50);
}

function assertLimit(ws, kind, current, user) {
  const limits = isAppOwner(user) ? OWNER_LIMITS : effectiveLimits(ws);
  const labels = {
    bots: 'bots',
    courses: 'formations',
    learners: 'apprenants',
    members: 'membres d’équipe',
    commands: 'commandes par bot',
    apiKeys: 'clés API',
  };
  const max = kind === 'commands' ? limits.commandsPerBot : limits[kind];
  if (current >= max) {
    throw bad(
      `Limite du plan ${normalizePlanName(ws.plan)} atteinte (${max} ${labels[kind]}). Passez à un plan supérieur ou utilisez vos crédits.`,
    );
  }
}

const dayKey = (date = new Date()) => new Date(date).toISOString().slice(0, 10);

function computeStats(ws) {
  const commands = ws.bots.flatMap((bot) => bot.commands);
  const executions = commands.reduce((sum, command) => sum + (command.uses || 0), 0);
  const published = ws.courses.filter((course) => course.status === 'published').length;
  const avgProgress = ws.learners.length
    ? Math.round(ws.learners.reduce((sum, learner) => sum + learner.progress, 0) / ws.learners.length)
    : 0;
  const certificates = ws.learners.filter((learner) => learner.progress === 100).length;
  const modules = ws.courses.reduce((sum, course) => sum + course.modules.length, 0);
  const lessons = ws.courses.reduce(
    (sum, course) => sum + course.modules.reduce((count, module) => count + module.lessons.length, 0),
    0,
  );
  const flowRuns = ws.bots.reduce(
    (sum, bot) => sum + (bot.flows || []).reduce((count, flow) => count + (flow.runs || 0), 0),
    0,
  );

  const events = Array.isArray(ws.events) ? ws.events : [];
  const since7d = Date.now() - 7 * 864e5;
  const recent = events.filter((event) => new Date(event.at).getTime() >= since7d);
  const executions7d = recent.filter((event) => event.type === 'command.run').length;
  const flowRuns7d = recent.filter((event) => event.type === 'flow.run').length;
  const activeLearners7d = new Set(
    recent
      .filter((event) => event.type === 'learner.active' || event.type === 'learner.created')
      .map((event) => event.learnerId)
      .filter(Boolean),
  ).size;

  const series = Array.from({ length: 14 }, (_, index) => {
    const date = dayKey(new Date(Date.now() - (13 - index) * 864e5));
    const dayEvents = events.filter((event) => String(event.at || '').slice(0, 10) === date);
    const learners = new Set(
      dayEvents
        .filter((event) => event.type === 'learner.active' || event.type === 'learner.created')
        .map((event) => event.learnerId)
        .filter(Boolean),
    );
    return {
      date,
      commands: dayEvents.filter((event) => event.type === 'command.run').length,
      learners: learners.size,
    };
  });

  return {
    bots: ws.bots.length,
    botsOnline: ws.bots.filter((bot) => getBotRuntime(bot.id).status === 'online').length,
    commands: commands.length,
    executions,
    executions7d,
    flowRuns,
    flowRuns7d,
    activeLearners7d,
    hasActivity: events.some((event) => ACTIVITY_EVENTS.has(event.type)),
    courses: ws.courses.length,
    published,
    modules,
    lessons,
    learners: ws.learners.length,
    avgProgress,
    certificates,
    team: ws.team.length + 1,
    series,
    perBot: ws.bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      color: bot.color,
      uses: bot.commands.reduce((sum, command) => sum + (command.uses || 0), 0),
    })),
  };
}

function workspacePayload(user) {
  const ws = getWorkspace(user.id);
  const owner = isAppOwner(user);
  for (const bot of ws.bots) ensureBotFlows(bot);
  const { events, ...workspace } = ws;
  workspace.bots = ws.bots.map(publicBot);
  workspace.team = ws.team.map((member) => ({
    ...member,
    hasAccount: Boolean(findUserByEmail(member.email)),
  }));
  workspace.learners = ws.learners.map((learner) => ({
    ...learner,
    hasAccount: Boolean(findUserByEmail(learner.email)),
  }));
  workspace.credits = Number(ws.credits) || 0;
  workspace.addons = ensureAddons(ws);
  workspace.dailyReward = ws.dailyReward;
  workspace.owner = owner;
  workspace.ownerAccess = owner ? ownerAccessStatus() : null;
  return {
    user: publicUser(user),
    workspace,
    stats: computeStats(ws),
    billing: {
      plans: publicPlans(ws),
      shop: publicShop(ws),
      limits: owner ? OWNER_LIMITS : effectiveLimits(ws),
      credits: workspace.credits,
      dailyReward: dailyRewardStatus(ws),
      addons: workspace.addons,
      purchases: ws.purchases || [],
      invoices: ws.invoices || [],
    },
    config: { google: googleConfigured, mail: mailConfigured, mailMode },
  };
}

/* ------------------------------------------------------------------ */
/* authentication                                                      */
/* ------------------------------------------------------------------ */

app.get('/api/auth/config', (req, res) => {
  res.json({ google: googleConfigured, mail: mailConfigured, mailMode, demo: true });
});

app.post(
  '/api/auth/request-code',
  wrap(async (req, res) => {
    const result = await requestLoginCode(req.body?.email, req.ip);
    res.json(result);
  }),
);

app.post(
  '/api/auth/verify-code',
  wrap(async (req, res) => {
    const { user, token } = verifyLoginCode(req.body?.email, req.body?.code, req);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.json({ user: publicUser(user) });
  }),
);

app.post(
  '/api/auth/demo',
  wrap(async (req, res) => {
    const user = findOrCreateUser('demo@kyllbot.studio', { name: 'Alex Démo', provider: 'demo' });
    const { token } = createSession(user.id, req);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.json({ user: publicUser(user) });
  }),
);

app.get('/api/auth/google', (req, res) => {
  if (!googleConfigured) {
    return res.redirect('/login?google=unconfigured');
  }
  const state = crypto.randomBytes(16).toString('base64url');
  const secure = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === '1';
  res.setHeader(
    'Set-Cookie',
    `kyll_oauth=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure ? '; Secure' : ''}`,
  );
  res.redirect(googleAuthUrl(req, state));
});

app.get(
  '/api/auth/google/callback',
  wrap(async (req, res) => {
    const state = parseCookies(req.headers.cookie || '').kyll_oauth;
    if (!googleConfigured || !state || state !== req.query.state) {
      return res.redirect('/login?google=error');
    }
    if (req.query.error) return res.redirect('/login?google=cancelled');
    try {
      const profile = await exchangeGoogleCode(req, String(req.query.code || ''));
      const user = findOrCreateUser(profile.email, {
        name: profile.name,
        avatar: profile.avatar,
        googleId: profile.googleId,
        provider: 'google',
      });
      const { token } = createSession(user.id, req);
      res.setHeader('Set-Cookie', [sessionCookie(token), 'kyll_oauth=; Path=/; Max-Age=0']);
      res.redirect('/app');
    } catch (error) {
      console.error('Google OAuth:', error.message);
      res.redirect('/login?google=error');
    }
  }),
);

app.post('/api/auth/logout', (req, res) => {
  destroySession(req);
  res.setHeader('Set-Cookie', clearCookie());
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* accès propriétaire                                                  */
/* ------------------------------------------------------------------ */

function requireAppOwner(req) {
  if (!isAppOwner(req.user)) {
    throw Object.assign(new Error('Accès propriétaire réservé.'), { status: 403 });
  }
}

app.get(
  '/api/owner/access',
  requireAuth,
  wrap(async (req, res) => {
    requireAppOwner(req);
    res.json({ access: ownerAccessStatus(), limits: OWNER_LIMITS });
  }),
);

app.post(
  '/api/owner/access-code',
  requireAuth,
  wrap(async (req, res) => {
    requireAppOwner(req);
    const code = generateOwnerCode();
    setOwnerCode(code);
    persist();
    res.json({ code, access: ownerAccessStatus() });
  }),
);

app.delete(
  '/api/owner/access-code',
  requireAuth,
  wrap(async (req, res) => {
    requireAppOwner(req);
    revokeOwnerCode();
    persist();
    res.json({ access: ownerAccessStatus() });
  }),
);

app.post(
  '/api/owner/unlock',
  wrap(async (req, res) => {
    if (!canAttemptOwnerUnlock(req.ip)) {
      throw Object.assign(new Error('Trop de tentatives. Réessayez dans quelques minutes.'), { status: 429 });
    }
    const user = ownerUser();
    if (!user || !verifyOwnerCode(req.body?.code)) {
      throw Object.assign(new Error('Code propriétaire invalide.'), { status: 401 });
    }
    persist();
    const { token } = createSession(user.id, req);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.json({ ok: true, user: publicUser(user) });
  }),
);

app.get('/api/me', (req, res) => {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Non authentifié.' });
  res.json(workspacePayload(user));
});

app.patch(
  '/api/me',
  requireAuth,
  wrap(async (req, res) => {
    const name = str(req.body?.name, 60);
    if (name.length < 2) throw bad('Le nom doit contenir au moins 2 caractères.');
    req.user.name = name;
    persist();
    res.json({ user: publicUser(req.user) });
  }),
);

/* ------------------------------------------------------------------ */
/* workspace                                                           */
/* ------------------------------------------------------------------ */

app.get('/api/workspace', requireAuth, (req, res) => {
  res.json(workspacePayload(req.user));
});

app.patch(
  '/api/settings',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const body = req.body || {};
    if (body.studioName !== undefined) ws.studioName = str(body.studioName, 60) || 'KyllBot Studio';
    if (body.timezone !== undefined) ws.settings.timezone = str(body.timezone, 60);
    if (body.language !== undefined) ws.settings.language = ['fr', 'en'].includes(body.language) ? body.language : 'fr';
    if (body.notifications && typeof body.notifications === 'object') {
      for (const key of ['email', 'product', 'weekly']) {
        if (body.notifications[key] !== undefined) ws.settings.notifications[key] = Boolean(body.notifications[key]);
      }
    }
    if (body.branding) ws.settings.branding.accent = pickColors(body.branding.accent);
    if (body.plan !== undefined && PLAN_NAMES.includes(body.plan)) {
      const nextPlan = normalizePlanName(body.plan);
      if (nextPlan !== ws.plan) {
        const target = publicPlans(ws).find((entry) => entry.id === nextPlan);
        if (target && target.price > 0) {
          throw bad('Les plans payants s’activent avec des crédits depuis la boutique de facturation.');
        }
        const previousPlan = ws.plan;
        ws.plan = nextPlan;
        pushActivity(ws, 'team', `Le plan du studio est passé de ${previousPlan} à ${nextPlan}`);
        recordEvent(ws, 'plan.change', { from: previousPlan, to: nextPlan });
      }
    }
    persist();
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* bots & commands                                                     */
/* ------------------------------------------------------------------ */

app.post(
  '/api/bots',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const name = str(req.body?.name, 60);
    if (name.length < 2) throw bad('Le nom du bot doit contenir au moins 2 caractères.');
    assertLimit(ws, 'bots', ws.bots.length, req.user);
    const bot = {
      id: newId(),
      name,
      description: str(req.body?.description, 240),
      prefix: str(req.body?.prefix, 4) || '!',
      status: 'draft',
      color: pickColors(req.body?.color),
      tags: Array.isArray(req.body?.tags) ? req.body.tags.slice(0, 5).map((t) => str(t, 24)) : [],
      discord: defaultDiscordServer({ name, tags: Array.isArray(req.body?.tags) ? req.body.tags : [] }),
      tokenHint: '••••••••',
      tokenHash: null,
      tokenEnc: null,
      tokenNeedsReconnect: false,
      tokenUpdatedAt: null,
      discordAccount: null,
      createdAt: new Date().toISOString(),
      commands: [],
      automations: [
        { id: newId(), type: 'welcome', label: "Message d'accueil", enabled: false, config: {} },
        { id: newId(), type: 'moderation', label: 'Modération automatique', enabled: false, config: {} },
      ],
      flows: [],
      scheduledMessages: [],
      savedMessages: [],
    };
    if (req.body?.token) await applyBotToken(bot, req.body.token);
    ws.bots.unshift(bot);
    pushActivity(ws, 'bot', `Le bot « ${bot.name} » a été créé`);
    recordEvent(ws, 'bot.created', { botId: bot.id });
    persist();
    const runtime = bot.tokenEnc ? await connectBot(bot) : getBotRuntime(bot.id);
    res.status(201).json({ bot: publicBot(bot), runtime });
  }),
);

app.post(
  '/api/bots/:id/token',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    await applyBotToken(bot, req.body?.token);
    pushActivity(ws, 'bot', `Le token Discord de ${bot.name} a été mis à jour`);
    recordEvent(ws, 'bot.token', { botId: bot.id });
    persist();
    const runtime = await connectBot(bot);
    res.json({ bot: publicBot(bot), runtime });
  }),
);

app.delete(
  '/api/bots/:id/token',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    bot.tokenHash = null;
    bot.tokenEnc = null;
    bot.tokenHint = '••••••••';
    bot.tokenNeedsReconnect = false;
    bot.tokenUpdatedAt = null;
    bot.discordAccount = null;
    if (bot.status === 'online') bot.status = 'offline';
    await stopBot(bot.id);
    recordEvent(ws, 'bot.token.removed', { botId: bot.id });
    persist();
    res.json({ bot: publicBot(bot), runtime: getBotRuntime(bot.id) });
  }),
);

app.post(
  '/api/bots/:id/test',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    try {
      const result = await testBotConnection(bot.id);
      res.json(result);
    } catch (error) {
      const status = error.code === 'DISCORD_NETWORK' || (error.status && error.status >= 500) ? 502 : 400;
      throw Object.assign(new Error(error.message), { status });
    }
  }),
);

app.post(
  '/api/bots/:id/sync',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    try {
      const metadata = await syncDiscordMetadata(bot.id).catch((error) => ({ ok: false, error: error.message }));
      const result = await syncBotCommands(bot.id);
      res.json({ ...result, metadata, runtime: getBotRuntime(bot.id) });
    } catch (error) {
      const status = error.code === 'DISCORD_NETWORK' || (error.status && error.status >= 500) ? 502 : 400;
      throw Object.assign(new Error(error.message), { status });
    }
  }),
);

app.post(
  '/api/bots/:id/discord/sync',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    try {
      const metadata = await syncDiscordMetadata(bot.id);
      res.json({ ...metadata, bot: publicBot(bot), runtime: getBotRuntime(bot.id) });
    } catch (error) {
      const status = error.code === 'DISCORD_NETWORK' || (error.status && error.status >= 500) ? 502 : 400;
      throw Object.assign(new Error(error.message), { status });
    }
  }),
);

app.post(
  '/api/bots/:id/test-message',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    try {
      const result = await sendTestMessage(bot.id, req.body?.channel);
      res.json(result);
    } catch (error) {
      const status = error.code === 'DISCORD_NETWORK' || (error.status && error.status >= 500) ? 502 : 400;
      throw Object.assign(new Error(error.message), { status });
    }
  }),
);

app.post(
  '/api/bots/:id/restart',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    if (!bot.tokenEnc) throw bad('Ajoute d’abord un token Discord.');
    const runtime = await connectBot(bot);
    res.json({ runtime });
  }),
);

app.patch(
  '/api/bots/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const body = req.body || {};
    const previousStatus = bot.status;
    const previousGuildId = bot.discord?.guildId || '';
    if (body.name !== undefined) {
      const name = str(body.name, 60);
      if (name.length < 2) throw bad('Nom invalide.');
      bot.name = name;
    }
    if (body.description !== undefined) bot.description = str(body.description, 240);
    if (body.prefix !== undefined) bot.prefix = str(body.prefix, 4) || '!';
    if (body.status !== undefined) {
      bot.status = ['online', 'offline', 'draft'].includes(body.status) ? body.status : bot.status;
    }
    if (body.color !== undefined) bot.color = pickColors(body.color);
    if (body.tags !== undefined && Array.isArray(body.tags)) bot.tags = body.tags.slice(0, 5).map((t) => str(t, 24));
    if (body.discord !== undefined) bot.discord = normalizeDiscordServer(body.discord, bot);
    persist();
    if (body.status !== undefined && bot.status !== previousStatus) {
      if (bot.status === 'offline') await stopBot(bot.id);
      else if (bot.status === 'online') await connectBot(bot);
    }
    if (body.discord !== undefined && bot.tokenEnc) {
      if (bot.discord?.guildId && bot.discord.guildId !== previousGuildId) {
        await syncDiscordMetadata(bot.id).catch(() => {});
      }
      await syncBotCommands(bot.id).catch(() => {});
    }
    res.json({ bot: publicBot(bot), runtime: getBotRuntime(bot.id) });
  }),
);

app.delete(
  '/api/bots/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    await stopBot(bot.id);
    ws.bots = ws.bots.filter((b) => b.id !== bot.id);
    pushActivity(ws, 'bot', `Le bot « ${bot.name} » a été supprimé`);
    persist();
    res.json({ ok: true });
  }),
);

app.post(
  '/api/bots/:id/commands',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const name = str(req.body?.name, 40).replace(/\s+/g, '-').toLowerCase();
    if (name.length < 1) throw bad('Le nom de la commande est requis.');
    if (bot.commands.some((c) => c.name === name)) throw bad('Cette commande existe déjà sur ce bot.');
    assertLimit(ws, 'commands', bot.commands.length, req.user);
    const embed = req.body?.embed || {};
    const command = {
      id: newId(),
      name,
      description: str(req.body?.description, 160),
      response: str(req.body?.response, 1000),
      embed: {
        title: str(embed.title, 120),
        description: str(embed.description, 500),
        color: pickColors(embed.color),
        footer: str(embed.footer, 80),
      },
      enabled: req.body?.enabled !== false,
      cooldown: Math.min(600, Math.max(0, Number(req.body?.cooldown) || 3)),
      uses: 0,
    };
    bot.commands.push(command);
    pushActivity(ws, 'bot', `Commande /${command.name} ajoutée à ${bot.name}`);
    recordEvent(ws, 'command.created', { botId: bot.id, commandId: command.id });
    persist();
    if (bot.tokenEnc) await syncBotCommands(bot.id).catch(() => {});
    res.status(201).json({ command, runtime: getBotRuntime(bot.id) });
  }),
);

app.patch(
  '/api/bots/:id/commands/:commandId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const command = findOr404(bot.commands, req.params.commandId, 'Commande');
    const body = req.body || {};
    if (body.name !== undefined) {
      const name = str(body.name, 40).replace(/\s+/g, '-').toLowerCase();
      if (!name) throw bad('Nom invalide.');
      command.name = name;
    }
    if (body.description !== undefined) command.description = str(body.description, 160);
    if (body.response !== undefined) command.response = str(body.response, 1000);
    if (body.enabled !== undefined) command.enabled = Boolean(body.enabled);
    if (body.cooldown !== undefined) command.cooldown = Math.min(600, Math.max(0, Number(body.cooldown) || 0));
    if (body.embed) {
      for (const key of ['title', 'description', 'footer']) {
        if (body.embed[key] !== undefined) command.embed[key] = str(body.embed[key], key === 'description' ? 500 : 120);
      }
      if (body.embed.color !== undefined) command.embed.color = pickColors(body.embed.color);
    }
    persist();
    if (bot.tokenEnc) await syncBotCommands(bot.id).catch(() => {});
    res.json({ command, runtime: getBotRuntime(bot.id) });
  }),
);

app.post(
  '/api/bots/:id/commands/:commandId/run',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const command = findOr404(bot.commands, req.params.commandId, 'Commande');
    command.uses = (command.uses || 0) + 1;
    command.lastUsedAt = new Date().toISOString();
    recordEvent(ws, 'command.run', { botId: bot.id, commandId: command.id });
    persist();
    res.json({ command, uses: command.uses });
  }),
);

app.delete(
  '/api/bots/:id/commands/:commandId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    findOr404(bot.commands, req.params.commandId, 'Commande');
    bot.commands = bot.commands.filter((c) => c.id !== req.params.commandId);
    persist();
    if (bot.tokenEnc) await syncBotCommands(bot.id).catch(() => {});
    res.json({ ok: true, runtime: getBotRuntime(bot.id) });
  }),
);

app.post(
  '/api/bots/:id/automations',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const type = str(req.body?.type, 40);
    if (!Object.hasOwn(AUTOMATION_TYPE_LABELS, type)) throw bad('Type d’automatisation inconnu.');
    const automation = {
      id: newId(),
      type,
      label: str(req.body?.label, 80) || AUTOMATION_TYPE_LABELS[type],
      enabled: false,
      config: sanitizeAutomationConfig(req.body?.config, {}),
    };
    bot.automations.push(automation);
    pushActivity(ws, 'bot', `Automatisation « ${automation.label} » ajoutée à ${bot.name}`);
    persist();
    res.status(201).json({ automation });
  }),
);

app.delete(
  '/api/bots/:id/automations/:automationId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    findOr404(bot.automations, req.params.automationId, 'Automatisation');
    bot.automations = bot.automations.filter((entry) => entry.id !== req.params.automationId);
    persist();
    res.json({ ok: true });
  }),
);

app.patch(
  '/api/bots/:id/automations/:automationId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const automation = findOr404(bot.automations, req.params.automationId, 'Automatisation');
    if (req.body?.enabled !== undefined) automation.enabled = Boolean(req.body.enabled);
    if (req.body?.label !== undefined) automation.label = str(req.body.label, 80) || automation.label;
    if (req.body?.config && typeof req.body.config === 'object') {
      automation.config = sanitizeAutomationConfig(req.body.config, automation.config);
    }
    persist();
    res.json({ automation });
  }),
);

function validateSavedMessageInput(body) {
  if (Array.isArray(body?.buttons)) {
    for (const button of body.buttons) {
      if (button?.url && !/^https?:\/\/\S+$/i.test(String(button.url).trim())) {
        throw bad('Lien de bouton invalide : utilise une adresse qui commence par http:// ou https://.');
      }
    }
  }
}

function assertSavedMessageContent(message) {
  if (!message.content && !savedMessageHasEmbed(message) && !message.buttons.length) {
    throw bad('Écris un message, un embed ou ajoute au moins un bouton.');
  }
  if (!message.channelId && !message.channelName) throw bad('Choisis un salon Discord.');
}

app.post(
  '/api/bots/:id/messages',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    if (!Array.isArray(bot.savedMessages)) bot.savedMessages = [];
    if (bot.savedMessages.length >= 100) throw bad('Limite de 100 messages sauvegardés atteinte pour ce bot.');
    validateSavedMessageInput(req.body);
    const saved = sanitizeSavedMessage(req.body || {});
    assertSavedMessageContent(saved);
    saved.id = newId();
    bot.savedMessages.unshift(saved);
    pushActivity(ws, 'bot', `Message « ${savedMessageLabel(saved)} » sauvegardé pour ${bot.name}`);
    recordEvent(ws, 'message.saved', { botId: bot.id, messageId: saved.id });
    persist();
    res.status(201).json({ savedMessage: publicSavedMessage(saved), bot: publicBot(bot) });
  }),
);

app.patch(
  '/api/bots/:id/messages/:messageId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const saved = findOr404(bot.savedMessages || [], req.params.messageId, 'Message sauvegardé');
    validateSavedMessageInput(req.body);
    const next = sanitizeSavedMessage(req.body || {}, saved);
    assertSavedMessageContent(next);
    Object.assign(saved, next);
    persist();
    res.json({ savedMessage: publicSavedMessage(saved), bot: publicBot(bot) });
  }),
);

app.delete(
  '/api/bots/:id/messages/:messageId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    findOr404(bot.savedMessages || [], req.params.messageId, 'Message sauvegardé');
    bot.savedMessages = bot.savedMessages.filter((message) => message.id !== req.params.messageId);
    persist();
    res.json({ ok: true });
  }),
);

app.post(
  '/api/bots/:id/messages/:messageId/duplicate',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const saved = findOr404(bot.savedMessages || [], req.params.messageId, 'Message sauvegardé');
    if (bot.savedMessages.length >= 100) throw bad('Limite de 100 messages sauvegardés atteinte pour ce bot.');
    const clone = sanitizeSavedMessage({
      ...JSON.parse(JSON.stringify(saved)),
      name: `${savedMessageLabel(saved)} (copie)`,
    });
    clone.id = newId();
    clone.createdAt = new Date().toISOString();
    clone.updatedAt = clone.createdAt;
    clone.lastSentAt = null;
    bot.savedMessages.unshift(clone);
    persist();
    res.status(201).json({ savedMessage: publicSavedMessage(clone), bot: publicBot(bot) });
  }),
);

app.post(
  '/api/bots/:id/messages/:messageId/run',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const saved = findOr404(bot.savedMessages || [], req.params.messageId, 'Message sauvegardé');
    try {
      const result = await sendSavedMessageNow(bot.id, saved.id);
      res.json({ ...result, bot: publicBot(bot) });
    } catch (error) {
      const status = error.code === 'DISCORD_NETWORK' || (error.status && error.status >= 500) ? 502 : 400;
      throw Object.assign(new Error(error.message), { status });
    }
  }),
);

app.post(
  '/api/bots/:id/scheduled-messages',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    if (!Array.isArray(bot.scheduledMessages)) bot.scheduledMessages = [];
    if (bot.scheduledMessages.length >= 50) throw bad('Limite de 50 messages programmés atteinte pour ce bot.');
    const body = req.body || {};
    if (body.time !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.time))) {
      throw bad('Heure invalide : utilise le format HH:MM.');
    }
    const scheduled = sanitizeScheduledMessage(body);
    if (!scheduled.content) throw bad('Le message à envoyer est requis.');
    if (!scheduled.channelId && !scheduled.channelName) throw bad('Choisis un salon Discord.');
    if (!scheduled.label) scheduled.label = `Message de ${scheduled.time}`;
    scheduled.id = newId();
    bot.scheduledMessages.push(scheduled);
    pushActivity(ws, 'bot', `Message programmé « ${scheduled.label} » ajouté à ${bot.name}`);
    recordEvent(ws, 'scheduled.created', { botId: bot.id, scheduledId: scheduled.id });
    persist();
    res.status(201).json({
      scheduledMessage: { ...scheduled, scheduleLabel: scheduledMessageLabel(scheduled) },
      bot: publicBot(bot),
      runtime: getBotRuntime(bot.id),
    });
  }),
);

app.patch(
  '/api/bots/:id/scheduled-messages/:messageId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const scheduled = findOr404(bot.scheduledMessages || [], req.params.messageId, 'Message programmé');
    const body = req.body || {};
    if (body.time !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.time))) {
      throw bad('Heure invalide : utilise le format HH:MM.');
    }
    const next = sanitizeScheduledMessage(body, scheduled);
    if (!next.content) throw bad('Le message à envoyer est requis.');
    if (!next.channelId && !next.channelName) throw bad('Choisis un salon Discord.');
    if (!next.label) next.label = `Message de ${next.time}`;
    Object.assign(scheduled, next);
    persist();
    res.json({
      scheduledMessage: { ...scheduled, scheduleLabel: scheduledMessageLabel(scheduled) },
      bot: publicBot(bot),
      runtime: getBotRuntime(bot.id),
    });
  }),
);

app.delete(
  '/api/bots/:id/scheduled-messages/:messageId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    findOr404(bot.scheduledMessages || [], req.params.messageId, 'Message programmé');
    bot.scheduledMessages = bot.scheduledMessages.filter((message) => message.id !== req.params.messageId);
    persist();
    res.json({ ok: true, bot: publicBot(bot) });
  }),
);

app.post(
  '/api/bots/:id/scheduled-messages/:messageId/run',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const scheduled = findOr404(bot.scheduledMessages || [], req.params.messageId, 'Message programmé');
    try {
      const result = await sendScheduledMessageNow(bot.id, scheduled.id);
      res.json({ ...result, bot: publicBot(bot) });
    } catch (error) {
      const status = error.code === 'DISCORD_NETWORK' || (error.status && error.status >= 500) ? 502 : 400;
      throw Object.assign(new Error(error.message), { status });
    }
  }),
);

app.post(
  '/api/bots/:id/flows',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const flows = ensureBotFlows(bot);
    if (flows.length >= 40) throw bad('Limite de 40 flux atteinte pour ce bot.');
    const template = str(req.body?.template, 20);
    const flow = template ? flowTemplate(template, bot.name) : sanitizeFlow({ name: str(req.body?.name, 60) || 'Nouveau flux' });
    flow.name = str(req.body?.name, 60) || flow.name;
    flow.description = describeFlowTrigger(flow.trigger);
    flows.push(flow);
    pushActivity(ws, 'bot', `Le flux « ${flow.name} » a été créé sur ${bot.name}`);
    persist();
    if (bot.tokenEnc) await syncBotCommands(bot.id).catch(() => {});
    res.status(201).json({ flow, runtime: getBotRuntime(bot.id) });
  }),
);

app.patch(
  '/api/bots/:id/flows/:flowId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const flows = ensureBotFlows(bot);
    const index = flows.findIndex((flow) => flow.id === req.params.flowId);
    if (index === -1) throw Object.assign(new Error('Flux introuvable.'), { status: 404 });
    const body = req.body || {};
    const previous = flows[index];
    const next = sanitizeFlow({ ...previous, ...body }, previous);
    if (body.name === undefined) next.name = previous.name;
    if (body.trigger) next.description = describeFlowTrigger(next.trigger);
    flows[index] = next;
    persist();
    if (bot.tokenEnc) await syncBotCommands(bot.id).catch(() => {});
    res.json({ flow: next, runtime: getBotRuntime(bot.id) });
  }),
);

app.delete(
  '/api/bots/:id/flows/:flowId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const flows = ensureBotFlows(bot);
    const flow = findOr404(flows, req.params.flowId, 'Flux');
    bot.flows = flows.filter((entry) => entry.id !== flow.id);
    pushActivity(ws, 'bot', `Le flux « ${flow.name} » a été supprimé`);
    persist();
    if (bot.tokenEnc) await syncBotCommands(bot.id).catch(() => {});
    res.json({ ok: true, runtime: getBotRuntime(bot.id) });
  }),
);

app.post(
  '/api/bots/:id/flows/:flowId/run',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const flows = ensureBotFlows(bot);
    const flow = findOr404(flows, req.params.flowId, 'Flux');
    const result = runFlow(flow, { ...req.body, bot: bot.name });
    if (req.body?.live) {
      flow.runs = (flow.runs || 0) + 1;
      flow.lastRunAt = new Date().toISOString();
      recordEvent(ws, 'flow.run', { botId: bot.id, flowId: flow.id });
      persist();
    }
    res.json(result);
  }),
);

/* ------------------------------------------------------------------ */
/* courses                                                             */
/* ------------------------------------------------------------------ */

app.post(
  '/api/courses',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const title = str(req.body?.title, 100);
    if (title.length < 3) throw bad('Le titre doit contenir au moins 3 caractères.');
    assertLimit(ws, 'courses', ws.courses.length, req.user);
    const course = {
      id: newId(),
      title,
      description: str(req.body?.description, 400),
      category: str(req.body?.category, 40) || 'Général',
      level: ['Débutant', 'Intermédiaire', 'Avancé'].includes(req.body?.level) ? req.body.level : 'Débutant',
      status: 'draft',
      cover: Math.floor(Math.random() * 4),
      createdAt: new Date().toISOString(),
      modules: [{ id: newId(), title: 'Module 1 — Introduction', lessons: [] }],
      quiz: [],
    };
    ws.courses.unshift(course);
    pushActivity(ws, 'course', `La formation « ${course.title} » a été créée`);
    recordEvent(ws, 'course.created', { courseId: course.id });
    persist();
    res.status(201).json({ course });
  }),
);

app.patch(
  '/api/courses/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const course = findOr404(ws.courses, req.params.id, 'Formation');
    const body = req.body || {};
    if (body.title !== undefined) {
      const title = str(body.title, 100);
      if (title.length < 3) throw bad('Titre invalide.');
      course.title = title;
    }
    if (body.description !== undefined) course.description = str(body.description, 400);
    if (body.category !== undefined) course.category = str(body.category, 40) || 'Général';
    if (body.level !== undefined && ['Débutant', 'Intermédiaire', 'Avancé'].includes(body.level)) course.level = body.level;
    if (body.status !== undefined && ['draft', 'published'].includes(body.status)) {
      const wasPublished = course.status === 'published';
      course.status = body.status;
      if (!wasPublished && course.status === 'published') {
        recordEvent(ws, 'course.published', { courseId: course.id });
      }
    }
    persist();
    res.json({ course });
  }),
);

app.delete(
  '/api/courses/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const course = findOr404(ws.courses, req.params.id, 'Formation');
    ws.courses = ws.courses.filter((c) => c.id !== course.id);
    ws.learners = ws.learners.filter((l) => l.courseId !== course.id);
    pushActivity(ws, 'course', `La formation « ${course.title} » a été supprimée`);
    persist();
    res.json({ ok: true });
  }),
);

app.post(
  '/api/courses/:id/modules',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const course = findOr404(ws.courses, req.params.id, 'Formation');
    const title = str(req.body?.title, 100);
    if (!title) throw bad('Titre du module requis.');
    const module = { id: newId(), title, lessons: [] };
    course.modules.push(module);
    persist();
    res.status(201).json({ module });
  }),
);

app.patch(
  '/api/courses/:id/modules/:moduleId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const course = findOr404(ws.courses, req.params.id, 'Formation');
    const module = findOr404(course.modules, req.params.moduleId, 'Module');
    if (req.body?.title !== undefined) {
      const title = str(req.body.title, 100);
      if (!title) throw bad('Titre invalide.');
      module.title = title;
    }
    persist();
    res.json({ module });
  }),
);

app.delete(
  '/api/courses/:id/modules/:moduleId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const course = findOr404(ws.courses, req.params.id, 'Formation');
    findOr404(course.modules, req.params.moduleId, 'Module');
    course.modules = course.modules.filter((m) => m.id !== req.params.moduleId);
    persist();
    res.json({ ok: true });
  }),
);

app.post(
  '/api/courses/:id/modules/:moduleId/lessons',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const course = findOr404(ws.courses, req.params.id, 'Formation');
    const module = findOr404(course.modules, req.params.moduleId, 'Module');
    const title = str(req.body?.title, 100);
    if (!title) throw bad('Titre de la leçon requis.');
    const lesson = {
      id: newId(),
      title,
      type: ['video', 'text', 'quiz', 'live'].includes(req.body?.type) ? req.body.type : 'text',
      duration: Math.min(600, Math.max(1, Number(req.body?.duration) || 5)),
      content: str(req.body?.content, 2000),
    };
    module.lessons.push(lesson);
    persist();
    res.status(201).json({ lesson });
  }),
);

app.patch(
  '/api/courses/:id/modules/:moduleId/lessons/:lessonId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const course = findOr404(ws.courses, req.params.id, 'Formation');
    const module = findOr404(course.modules, req.params.moduleId, 'Module');
    const lesson = findOr404(module.lessons, req.params.lessonId, 'Leçon');
    const body = req.body || {};
    if (body.title !== undefined) {
      const title = str(body.title, 100);
      if (!title) throw bad('Titre invalide.');
      lesson.title = title;
    }
    if (body.type !== undefined && ['video', 'text', 'quiz', 'live'].includes(body.type)) lesson.type = body.type;
    if (body.duration !== undefined) lesson.duration = Math.min(600, Math.max(1, Number(body.duration) || 1));
    if (body.content !== undefined) lesson.content = str(body.content, 2000);
    persist();
    res.json({ lesson });
  }),
);

app.delete(
  '/api/courses/:id/modules/:moduleId/lessons/:lessonId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const course = findOr404(ws.courses, req.params.id, 'Formation');
    const module = findOr404(course.modules, req.params.moduleId, 'Module');
    findOr404(module.lessons, req.params.lessonId, 'Leçon');
    module.lessons = module.lessons.filter((l) => l.id !== req.params.lessonId);
    persist();
    res.json({ ok: true });
  }),
);

app.post(
  '/api/courses/:id/quiz',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const course = findOr404(ws.courses, req.params.id, 'Formation');
    const question = str(req.body?.question, 300);
    const options = Array.isArray(req.body?.options)
      ? req.body.options.map((o) => str(o, 120)).filter(Boolean).slice(0, 6)
      : [];
    if (!question) throw bad('Question requise.');
    if (options.length < 2) throw bad('Au moins deux réponses sont nécessaires.');
    const answer = Math.min(options.length - 1, Math.max(0, Number(req.body?.answer) || 0));
    const item = { id: newId(), question, options, answer, points: Math.min(10, Math.max(1, Number(req.body?.points) || 1)) };
    course.quiz.push(item);
    persist();
    res.status(201).json({ question: item });
  }),
);

app.patch(
  '/api/courses/:id/quiz/:questionId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const course = findOr404(ws.courses, req.params.id, 'Formation');
    const item = findOr404(course.quiz, req.params.questionId, 'Question');
    const body = req.body || {};
    if (body.question !== undefined) {
      const question = str(body.question, 300);
      if (!question) throw bad('Question invalide.');
      item.question = question;
    }
    if (Array.isArray(body.options)) {
      const options = body.options.map((o) => str(o, 120)).filter(Boolean).slice(0, 6);
      if (options.length >= 2) item.options = options;
    }
    if (body.answer !== undefined) item.answer = Math.min(item.options.length - 1, Math.max(0, Number(body.answer) || 0));
    if (body.points !== undefined) item.points = Math.min(10, Math.max(1, Number(body.points) || 1));
    persist();
    res.json({ question: item });
  }),
);

app.delete(
  '/api/courses/:id/quiz/:questionId',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const course = findOr404(ws.courses, req.params.id, 'Formation');
    findOr404(course.quiz, req.params.questionId, 'Question');
    course.quiz = course.quiz.filter((q) => q.id !== req.params.questionId);
    persist();
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* learners, team, api keys                                            */
/* ------------------------------------------------------------------ */

app.post(
  '/api/learners',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const name = str(req.body?.name, 80);
    const email = str(req.body?.email, 160).toLowerCase();
    if (name.length < 2) throw bad('Nom de l’apprenant requis.');
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) throw bad('Email invalide.');
    if (ws.learners.some((learner) => learner.email === email)) throw bad('Cet apprenant est déjà inscrit.');
    assertLimit(ws, 'learners', ws.learners.length, req.user);
    const course = findOr404(ws.courses, req.body?.courseId, 'Formation');
    const account = findUserByEmail(email);
    const learner = {
      id: newId(),
      name,
      email,
      courseId: course.id,
      progress: 0,
      score: 0,
      lastActive: new Date().toISOString(),
    };
    ws.learners.unshift(learner);
    pushActivity(ws, 'learner', `${name} a été inscrit à « ${course.title} »`);
    recordEvent(ws, 'learner.created', { learnerId: learner.id, courseId: course.id });
    persist();
    res.status(201).json({ learner: { ...learner, hasAccount: Boolean(account) } });
  }),
);

app.patch(
  '/api/learners/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const learner = findOr404(ws.learners, req.params.id, 'Apprenant');
    const body = req.body || {};
    if (body.name !== undefined) {
      const name = str(body.name, 80);
      if (name.length < 2) throw bad('Nom invalide.');
      learner.name = name;
    }
    if (body.progress !== undefined) learner.progress = Math.min(100, Math.max(0, Math.round(Number(body.progress) || 0)));
    if (body.score !== undefined) learner.score = Math.min(100, Math.max(0, Math.round(Number(body.score) || 0)));
    if (body.courseId !== undefined) {
      const course = findOr404(ws.courses, body.courseId, 'Formation');
      learner.courseId = course.id;
    }
    learner.lastActive = new Date().toISOString();
    recordEvent(ws, 'learner.active', { learnerId: learner.id, courseId: learner.courseId });
    persist();
    res.json({ learner: { ...learner, hasAccount: Boolean(findUserByEmail(learner.email)) } });
  }),
);

app.delete(
  '/api/learners/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    findOr404(ws.learners, req.params.id, 'Apprenant');
    ws.learners = ws.learners.filter((l) => l.id !== req.params.id);
    persist();
    res.json({ ok: true });
  }),
);

app.post(
  '/api/team',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const email = str(req.body?.email, 160).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) throw bad('Email invalide.');
    if (req.user.email.toLowerCase() === email) throw bad('Vous êtes déjà propriétaire de ce studio.');
    if (ws.team.some((m) => m.email === email)) throw bad('Ce membre fait déjà partie de l’équipe.');
    assertLimit(ws, 'members', ws.team.length + 1, req.user);
    const account = findUserByEmail(email);
    const member = {
      id: newId(),
      name: str(req.body?.name, 60) || account?.name || email.split('@')[0],
      email,
      role: ['Éditeur', 'Analyste', 'Lecteur'].includes(req.body?.role) ? req.body.role : 'Éditeur',
      status: account ? 'active' : 'invited',
      joinedAt: new Date().toISOString(),
    };
    ws.team.push(member);
    pushActivity(
      ws,
      'team',
      account ? `${member.name} a été ajouté à l’équipe` : `Invitation envoyée à ${email} (aucun compte pour l’instant)`,
    );
    recordEvent(ws, 'team.invite', { memberId: member.id, hasAccount: Boolean(account) });
    persist();
    res.status(201).json({ member: { ...member, hasAccount: Boolean(account) } });
  }),
);

app.patch(
  '/api/team/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const member = findOr404(ws.team, req.params.id, 'Membre');
    if (req.body?.role !== undefined && ['Éditeur', 'Analyste', 'Lecteur'].includes(req.body.role)) {
      member.role = req.body.role;
    }
    persist();
    res.json({ member: { ...member, hasAccount: Boolean(findUserByEmail(member.email)) } });
  }),
);

app.post(
  '/api/team/:id/check',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const member = findOr404(ws.team, req.params.id, 'Membre');
    const account = findUserByEmail(member.email);
    if (account && member.status !== 'active') {
      member.status = 'active';
      if (!member.name || member.name === member.email.split('@')[0]) member.name = account.name;
      persist();
    }
    res.json({
      exists: Boolean(account),
      member: { ...member, hasAccount: Boolean(account) },
    });
  }),
);

app.delete(
  '/api/team/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    findOr404(ws.team, req.params.id, 'Membre');
    ws.team = ws.team.filter((m) => m.id !== req.params.id);
    persist();
    res.json({ ok: true });
  }),
);

app.post(
  '/api/keys',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    assertLimit(ws, 'apiKeys', ws.apiKeys.length, req.user);
    const secret = `kyll_live_${crypto.randomBytes(20).toString('hex')}`;
    const key = {
      id: newId(),
      label: str(req.body?.label, 60) || 'Nouvelle clé',
      prefix: 'kyll_live_',
      hint: secret.slice(-4),
      createdAt: new Date().toISOString(),
      lastUsed: null,
      scopes: ['bots:read', 'courses:read'],
    };
    ws.apiKeys.unshift(key);
    pushActivity(ws, 'team', `Nouvelle clé API « ${key.label} » créée`);
    persist();
    res.status(201).json({ key, secret });
  }),
);

app.delete(
  '/api/keys/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    findOr404(ws.apiKeys, req.params.id, 'Clé');
    ws.apiKeys = ws.apiKeys.filter((k) => k.id !== req.params.id);
    persist();
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* récompense quotidienne & boutique en crédits                        */
/* ------------------------------------------------------------------ */

app.post(
  '/api/rewards/daily',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const status = dailyRewardStatus(ws);
    if (status.claimedToday) {
      return res.json({ alreadyClaimed: true, awarded: 0, credits: ws.credits, status });
    }
    ws.dailyReward = {
      lastClaimAt: new Date().toISOString(),
      streak: status.nextStreak,
      totalClaimed: (Number(ws.dailyReward?.totalClaimed) || 0) + status.amount,
    };
    ws.credits = (Number(ws.credits) || 0) + status.amount;
    recordEvent(ws, 'reward.claim', { amount: status.amount, streak: status.nextStreak });
    pushActivity(ws, 'team', `Récompense quotidienne récupérée : +${status.amount} crédits`);
    persist();
    res.json({
      alreadyClaimed: false,
      awarded: status.amount,
      credits: ws.credits,
      status: dailyRewardStatus(ws),
    });
  }),
);

app.post(
  '/api/billing/redeem',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const item = SHOP.find((entry) => entry.id === req.body?.itemId);
    if (!item) throw bad('Article inconnu.');
    if (item.owned && item.owned(ws)) throw bad('Cet avantage est déjà activé sur votre studio.');
    if (ws.purchases.some((purchase) => purchase.itemId === item.id) && item.once) {
      throw bad('Cet avantage est déjà activé sur votre studio.');
    }
    if ((Number(ws.credits) || 0) < item.credits) {
      throw bad(`Il vous manque ${item.credits - (Number(ws.credits) || 0)} crédits pour cet article.`);
    }
    ws.credits -= item.credits;
    if (item.plan) {
      ws.plan = normalizePlanName(item.plan);
      ws.planExpiresAt = new Date(Date.now() + 30 * 864e5).toISOString();
      recordEvent(ws, 'plan.change', { to: ws.plan, via: 'credits' });
    } else if (item.apply) {
      item.apply(ws);
    }
    const purchase = {
      id: newId(),
      itemId: item.id,
      label: item.label,
      credits: item.credits,
      at: new Date().toISOString(),
    };
    ws.purchases.unshift(purchase);
    ws.purchases = ws.purchases.slice(0, 100);
    pushInvoice(ws, {
      label: `${item.label} (crédits)`,
      amount: 0,
      credits: item.credits,
      status: 'Payée en crédits',
    });
    pushActivity(ws, 'team', `Achat effectué : ${item.label} (${item.credits} crédits)`);
    persist();
    res.json({ ok: true, credits: ws.credits, plan: ws.plan, purchase });
  }),
);

/* ------------------------------------------------------------------ */
/* avis & idées                                                        */
/* ------------------------------------------------------------------ */

const FEEDBACK_KINDS = new Set(['idea', 'review']);

function publicFeedback(item, user) {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    message: item.message,
    rating: item.rating || 0,
    votes: Array.isArray(item.votes) ? item.votes.length : 0,
    voted: Array.isArray(item.votes) ? item.votes.includes(user.id) : false,
    status: item.status || 'new',
    authorName: item.authorName,
    createdAt: item.createdAt,
    mine: item.authorId === user.id,
    canDelete: item.authorId === user.id || isAppOwner(user),
  };
}

app.get('/api/feedback', requireAuth, (req, res) => {
  const items = [...(db.feedback || [])].sort(
    (a, b) =>
      (b.votes?.length || 0) - (a.votes?.length || 0) ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const reviews = items.filter((item) => item.kind === 'review');
  const average = reviews.length
    ? Math.round((reviews.reduce((sum, item) => sum + (item.rating || 0), 0) / reviews.length) * 10) / 10
    : 0;
  res.json({
    feedback: items.map((item) => publicFeedback(item, req.user)),
    summary: {
      total: items.length,
      ideas: items.filter((item) => item.kind === 'idea').length,
      reviews: reviews.length,
      average,
    },
  });
});

app.post(
  '/api/feedback',
  requireAuth,
  wrap(async (req, res) => {
    const kind = FEEDBACK_KINDS.has(req.body?.kind) ? req.body.kind : 'idea';
    const title = str(req.body?.title, 80);
    const message = str(req.body?.message, 1000);
    const rating = Math.min(5, Math.max(0, Math.round(Number(req.body?.rating) || 0)));
    if (title.length < 3) throw bad('Le titre doit contenir au moins 3 caractères.');
    if (message.length < 5) throw bad('Le message doit contenir au moins 5 caractères.');
    if (kind === 'review' && (rating < 1 || rating > 5)) throw bad('Choisis une note entre 1 et 5.');

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = (db.feedback || []).filter(
      (item) => item.authorId === req.user.id && new Date(item.createdAt).getTime() > dayAgo,
    ).length;
    if (recent >= 10) throw bad('Limite de 10 contributions par jour atteinte.');

    const item = {
      id: newId(),
      kind,
      title,
      message,
      rating: kind === 'review' ? rating : 0,
      votes: [],
      status: 'new',
      authorId: req.user.id,
      authorName: req.user.name || req.user.email.split('@')[0],
      createdAt: new Date().toISOString(),
    };
    db.feedback = [item, ...(db.feedback || [])].slice(0, 500);
    persist();
    res.status(201).json({ item: publicFeedback(item, req.user) });
  }),
);

app.post(
  '/api/feedback/:id/vote',
  requireAuth,
  wrap(async (req, res) => {
    const item = (db.feedback || []).find((entry) => entry.id === req.params.id);
    if (!item) throw Object.assign(new Error('Contribution introuvable.'), { status: 404 });
    if (!Array.isArray(item.votes)) item.votes = [];
    const index = item.votes.indexOf(req.user.id);
    if (index >= 0) item.votes.splice(index, 1);
    else item.votes.push(req.user.id);
    persist();
    res.json({ item: publicFeedback(item, req.user) });
  }),
);

app.delete(
  '/api/feedback/:id',
  requireAuth,
  wrap(async (req, res) => {
    const item = (db.feedback || []).find((entry) => entry.id === req.params.id);
    if (!item) throw Object.assign(new Error('Contribution introuvable.'), { status: 404 });
    if (item.authorId !== req.user.id && !isAppOwner(req.user)) {
      throw Object.assign(new Error('Suppression réservée à l’auteur.'), { status: 403 });
    }
    db.feedback = (db.feedback || []).filter((entry) => entry.id !== item.id);
    persist();
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* pages & errors                                                      */
/* ------------------------------------------------------------------ */

const sendStudio = (req, res) => {
  if (!userFromRequest(req)) return res.redirect('/login');
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(process.cwd(), 'public/app.html'));
};

app.get('/app', sendStudio);
app.get('/studio', sendStudio);
app.get('/studio/:version', sendStudio);

app.use((req, res, next) => {
  if (['/', '/index.html', '/login'].includes(req.path)) res.set('Cache-Control', 'no-store');
  next();
});

app.get('/js/v:version/:file', (req, res, next) => {
  if (!/^\d+$/.test(req.params.version) || !/^[\w-]+\.js$/.test(req.params.file)) return next();
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(process.cwd(), 'public/js', req.params.file));
});

app.get('/css/v:version/:file', (req, res, next) => {
  if (!/^\d+$/.test(req.params.version) || !/^[\w-]+\.css$/.test(req.params.file)) return next();
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(process.cwd(), 'public/css', req.params.file));
});

app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('Service-Worker-Allowed', '/');
  res.type('application/javascript');
  res.sendFile(path.join(process.cwd(), 'public/sw.js'));
});

app.get('/manifest.webmanifest', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.type('application/manifest+json');
  res.sendFile(path.join(process.cwd(), 'public/manifest.webmanifest'));
});

app.use(
  express.static(path.join(process.cwd(), 'public'), {
    extensions: ['html'],
    maxAge: 0,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-store'),
  }),
);

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Route inconnue.' });
  res.status(404).sendFile(path.join(process.cwd(), 'public/404.html'));
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  if (res.headersSent) return next(error);
  res.status(status).json({ error: status >= 500 ? 'Une erreur interne est survenue.' : error.message });
});

let migratedAtBoot = false;
for (const workspace of Object.values(db.workspaces || {})) {
  if (migrateWorkspace(workspace)) migratedAtBoot = true;
}
if (migratedAtBoot) persist();

app.listen(PORT, '0.0.0.0', () => {
  try {
    fs.writeFileSync(PID_FILE, String(process.pid));
  } catch {
    /* le PID est optionnel */
  }
  console.log(`\n  KyllBot Studio — http://localhost:${PORT}`);
  console.log(`  Google OAuth : ${googleConfigured ? 'activé' : 'non configuré (mode démo)'}`);
  console.log(`  Envoi d'emails : ${mailMode === 'resend' ? 'Resend activé' : mailMode === 'smtp' ? 'SMTP activé' : 'mode démo (code affiché)'}`);
  autostartBots();
  console.log('');
});

function removePidFile() {
  try {
    fs.rmSync(PID_FILE, { force: true });
  } catch {
    /* rien à nettoyer */
  }
}

process.on('exit', removePidFile);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await shutdownBots();
    await flushPersistence();
    removePidFile();
    process.exit(0);
  });
}
