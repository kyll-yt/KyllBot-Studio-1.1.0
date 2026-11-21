import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import { db, findUserById, newId, persist } from './db.js';
import {
  clearCookie,
  createSession,
  destroySession,
  exchangeGoogleCode,
  findOrCreateUser,
  googleAuthUrl,
  googleConfigured,
  mailConfigured,
  parseCookies,
  publicUser,
  requireAuth,
  requestLoginCode,
  sessionCookie,
  userFromRequest,
  verifyLoginCode,
} from './auth.js';
import { seedWorkspace } from './seed.js';

const app = express();
const PORT = Number(process.env.PORT || 12000);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

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

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const str = (value, max = 200) => String(value ?? '').trim().slice(0, max);

function getWorkspace(userId) {
  if (!db.workspaces[userId]) {
    const user = findUserById(userId);
    db.workspaces[userId] = seedWorkspace(user);
    persist();
  }
  return db.workspaces[userId];
}

function pushActivity(ws, type, message) {
  ws.activity.unshift({ id: newId(), type, message, at: new Date().toISOString() });
  ws.activity = ws.activity.slice(0, 40);
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

function computeStats(ws) {
  const commands = ws.bots.flatMap((b) => b.commands);
  const executions = commands.reduce((sum, c) => sum + (c.uses || 0), 0);
  const published = ws.courses.filter((c) => c.status === 'published').length;
  const avgProgress = ws.learners.length
    ? Math.round(ws.learners.reduce((s, l) => s + l.progress, 0) / ws.learners.length)
    : 0;
  const certificates = ws.learners.filter((l) => l.progress === 100).length;
  const modules = ws.courses.reduce((s, c) => s + c.modules.length, 0);
  const lessons = ws.courses.reduce((s, c) => s + c.modules.reduce((n, m) => n + m.lessons.length, 0), 0);

  const seed = crypto.createHash('sha256').update(ws.ownerId).digest();
  const series = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.now() - (13 - i) * 864e5);
    const base = 220 + seed[i % seed.length] * 2 + Math.round(Math.sin(i / 1.7) * 60);
    return {
      date: day.toISOString().slice(0, 10),
      commands: base,
      learners: Math.max(3, Math.round(base / 28) + (seed[(i + 5) % seed.length] % 7)),
    };
  });

  return {
    bots: ws.bots.length,
    botsOnline: ws.bots.filter((b) => b.status === 'online').length,
    commands: commands.length,
    executions,
    courses: ws.courses.length,
    published,
    modules,
    lessons,
    learners: ws.learners.length,
    avgProgress,
    certificates,
    team: ws.team.length + 1,
    series,
    perBot: ws.bots.map((b) => ({
      id: b.id,
      name: b.name,
      color: b.color,
      uses: b.commands.reduce((s, c) => s + (c.uses || 0), 0),
    })),
  };
}

function workspacePayload(user) {
  const ws = getWorkspace(user.id);
  return {
    user: publicUser(user),
    workspace: ws,
    stats: computeStats(ws),
    config: { google: googleConfigured, mail: mailConfigured },
  };
}

/* ------------------------------------------------------------------ */
/* authentication                                                      */
/* ------------------------------------------------------------------ */

app.get('/api/auth/config', (req, res) => {
  res.json({ google: googleConfigured, mail: mailConfigured, demo: true });
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
    if (body.plan !== undefined && ['Starter', 'Pro', 'Studio'].includes(body.plan)) {
      ws.plan = body.plan;
      pushActivity(ws, 'team', `Le plan du studio est passé à ${body.plan}`);
    }
    persist();
    res.json({ workspace: ws });
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
    if (ws.bots.length >= 25) throw bad('Limite de 25 bots atteinte pour ce plan.');
    const bot = {
      id: newId(),
      name,
      description: str(req.body?.description, 240),
      prefix: str(req.body?.prefix, 4) || '!',
      status: 'draft',
      color: pickColors(req.body?.color),
      tags: Array.isArray(req.body?.tags) ? req.body.tags.slice(0, 5).map((t) => str(t, 24)) : [],
      tokenHint: str(req.body?.tokenHint, 8) || '••••••••',
      createdAt: new Date().toISOString(),
      commands: [],
      automations: [
        { id: newId(), type: 'welcome', label: "Message d'accueil", enabled: false, config: {} },
        { id: newId(), type: 'moderation', label: 'Modération automatique', enabled: false, config: {} },
      ],
    };
    ws.bots.unshift(bot);
    pushActivity(ws, 'bot', `Le bot « ${bot.name} » a été créé`);
    persist();
    res.status(201).json({ bot });
  }),
);

app.patch(
  '/api/bots/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
    const body = req.body || {};
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
    persist();
    res.json({ bot });
  }),
);

app.delete(
  '/api/bots/:id',
  requireAuth,
  wrap(async (req, res) => {
    const ws = getWorkspace(req.user.id);
    const bot = findOr404(ws.bots, req.params.id, 'Bot');
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
    if (bot.commands.length >= 100) throw bad('Limite de 100 commandes par bot.');
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
    persist();
    res.status(201).json({ command });
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
    res.json({ command });
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
    if (req.body?.config && typeof req.body.config === 'object') {
      automation.config = { ...automation.config, ...req.body.config };
    }
    persist();
    res.json({ automation });
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
    if (body.status !== undefined && ['draft', 'published'].includes(body.status)) course.status = body.status;
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
    const course = findOr404(ws.courses, req.body?.courseId, 'Formation');
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
    persist();
    res.status(201).json({ learner });
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
    persist();
    res.json({ learner });
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
    if (ws.team.some((m) => m.email === email)) throw bad('Ce membre fait déjà partie de l’équipe.');
    const member = {
      id: newId(),
      name: str(req.body?.name, 60) || email.split('@')[0],
      email,
      role: ['Éditeur', 'Analyste', 'Lecteur'].includes(req.body?.role) ? req.body.role : 'Éditeur',
      status: 'invited',
      joinedAt: new Date().toISOString(),
    };
    ws.team.push(member);
    pushActivity(ws, 'team', `Invitation envoyée à ${email}`);
    persist();
    res.status(201).json({ member });
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
    res.json({ member });
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
    if (ws.apiKeys.length >= 10) throw bad('Limite de 10 clés API atteinte.');
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
/* pages & errors                                                      */
/* ------------------------------------------------------------------ */

app.get('/app', (req, res) => {
  if (!userFromRequest(req)) return res.redirect('/login');
  res.sendFile(path.join(process.cwd(), 'public/app.html'));
});

app.use(express.static(path.join(process.cwd(), 'public'), { extensions: ['html'], maxAge: 0 }));

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  KyllBot Studio — http://localhost:${PORT}`);
  console.log(`  Google OAuth : ${googleConfigured ? 'activé' : 'non configuré (mode démo)'}`);
  console.log(`  Envoi d'emails : ${mailConfigured ? 'Resend activé' : 'mode démo (code affiché)'}\n`);
});
