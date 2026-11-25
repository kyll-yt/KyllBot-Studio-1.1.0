import './env.js';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GATEWAY_PORT = Number(process.env.GATEWAY_PORT || process.env.PORT || 12000);
const APP_PORT = Number(process.env.APP_PORT || 12001);
const APP_ENTRY = path.join(ROOT, 'server/index.js');
const PID_FILE = process.env.PID_FILE || path.join(os.tmpdir(), `kyllbot-app-${APP_PORT}.pid`);
const DOWN_PAGE = path.join(ROOT, 'public/server-down.html');
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const START_TIMEOUT_MS = Number(process.env.APP_START_TIMEOUT_MS || 30000);
const RESTART_COOLDOWN_MS = 5000;
const AUTOSTART = process.env.APP_AUTOSTART !== '0';

if (!Number.isInteger(APP_PORT) || APP_PORT < 1 || APP_PORT > 65535) {
  console.error(`[gateway] APP_PORT invalide : ${process.env.APP_PORT}`);
  process.exit(1);
}

let appChild = null;
let startPromise = null;
let lastExit = null;
let lastRestartAt = 0;
let stopping = false;
let shuttingDown = false;
let restartTimer = null;
let restartDelay = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function log(message) {
  console.log(`[gateway] ${message}`);
}

function scheduleRestart() {
  if (restartTimer || stopping || shuttingDown || !AUTOSTART) return;
  const delay = restartDelay;
  restartDelay = Math.min(restartDelay * 2, 30000);
  log(`redémarrage automatique dans ${Math.round(delay / 1000)} s…`);
  restartTimer = setTimeout(async () => {
    restartTimer = null;
    if (stopping || shuttingDown) return;
    const ok = await ensureApp();
    if (ok) restartDelay = 1000;
    else scheduleRestart();
  }, delay);
}

function isAppUp(timeout = 700) {
  return new Promise((resolve) => {
    let request;
    try {
      request = http.get(`${APP_URL}/healthz`, { timeout }, (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      });
    } catch {
      resolve(false);
      return;
    }
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

function spawnApp() {
  if (appChild && appChild.exitCode === null) return appChild;
  log(`démarrage de l'application sur le port ${APP_PORT}…`);
  const child = spawn(process.execPath, [APP_ENTRY], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      PID_FILE,
      GATEWAY_MANAGED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  appChild = child;
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  child.on('error', (error) => {
    if (appChild === child) appChild = null;
    lastExit = { error: error.message, at: new Date().toISOString() };
    log(`impossible de démarrer l'application : ${error.message}`);
    scheduleRestart();
  });
  child.on('exit', (code, signal) => {
    if (appChild === child) appChild = null;
    lastExit = { code, signal, at: new Date().toISOString() };
    log(`application arrêtée (code ${code ?? 'null'}, signal ${signal ?? 'aucun'}).`);
    scheduleRestart();
  });
  return child;
}

async function ensureApp() {
  if (await isAppUp()) {
    restartDelay = 1000;
    return true;
  }
  if (!AUTOSTART) return false;
  if (startPromise) return startPromise;
  startPromise = (async () => {
    const child = spawnApp();
    if (!child) return false;
    const deadline = Date.now() + START_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (await isAppUp()) {
        restartDelay = 1000;
        log(`application prête sur le port ${APP_PORT}.`);
        return true;
      }
      if (!appChild || appChild.exitCode !== null) break;
      await sleep(400);
    }
    return false;
  })().finally(() => {
    startPromise = null;
  });
  return startPromise;
}

function readPid() {
  try {
    const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isKyllAppPid(pid) {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes('server/index.js');
  } catch {
    return true;
  }
}

async function waitFor(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await sleep(200);
  }
  return predicate();
}

async function stopApp() {
  stopping = true;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  try {
    const child = appChild;
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      if (!(await waitFor(() => child.exitCode !== null, 8000))) {
        child.kill('SIGKILL');
        await waitFor(() => child.exitCode !== null, 2000);
      }
      return;
    }
    const pid = readPid();
    if (pid && pid !== process.pid && pidAlive(pid) && isKyllAppPid(pid)) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        /* déjà arrêté */
      }
      if (!(await waitFor(() => !pidAlive(pid), 8000))) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          /* déjà arrêté */
        }
        await waitFor(() => !pidAlive(pid), 2000);
      }
    }
  } finally {
    stopping = false;
  }
}

async function restartApp() {
  await stopApp();
  appChild = null;
  try {
    fs.rmSync(PID_FILE, { force: true });
  } catch {
    /* rien à nettoyer */
  }
  return ensureApp();
}

function isApiRequest(req) {
  return String(req.url || '').startsWith('/api/');
}

function wantsHtml(req) {
  if (req.method !== 'GET') return false;
  const url = String(req.url || '');
  if (isApiRequest(req) || /^\/(assets|css|js)\//.test(url)) return false;
  return String(req.headers.accept || '').includes('text/html')
    || url === '/'
    || url.startsWith('/app')
    || url.startsWith('/login');
}

function sendApiDown(res) {
  res.writeHead(503, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Retry-After': '5',
  });
  res.end(JSON.stringify({
    error: 'Le site/application est déconnecté. Clique sur « Redémarrer le site/application ».',
    restartable: true,
  }));
}

function sendDownPage(res, status = 503) {
  let html = '<!doctype html><meta charset="utf-8"><title>Site/application déconnecté</title><h1>Le site/application est déconnecté.</h1>';
  try {
    html = fs.readFileSync(DOWN_PAGE, 'utf8');
  } catch {
    /* page de secours minimale */
  }
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Retry-After': '5',
  });
  res.end(html);
}

function proxyRequest(req, res) {
  const forwardedProto = req.headers['x-forwarded-proto']
    || (req.socket.encrypted ? 'https' : 'http');
  const headers = {
    ...req.headers,
    host: req.headers.host,
    'x-forwarded-for': [req.headers['x-forwarded-for'], req.socket.remoteAddress].filter(Boolean).join(', '),
    'x-forwarded-host': req.headers.host,
    'x-forwarded-port': req.headers['x-forwarded-port'] || String(GATEWAY_PORT),
    'x-forwarded-proto': forwardedProto,
  };

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: APP_PORT,
      method: req.method,
      path: req.url,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (error) => {
    log(`erreur de proxy : ${error.message}`);
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (isApiRequest(req)) sendApiDown(res);
    else if (wantsHtml(req)) sendDownPage(res);
    else {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Site/application déconnecté.');
    }
  });

  req.on('aborted', () => proxyReq.destroy());
  req.pipe(proxyReq);
}

async function handleRestart(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Origine non autorisée.' }));
        return;
      }
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Origine invalide.' }));
      return;
    }
  }

  const now = Date.now();
  if (now - lastRestartAt < RESTART_COOLDOWN_MS) {
    res.writeHead(429, {
      'Content-Type': 'application/json; charset=utf-8',
      'Retry-After': '3',
    });
    res.end(JSON.stringify({ ok: false, error: 'Patiente quelques secondes avant de redémarrer.' }));
    return;
  }
  lastRestartAt = now;

  log('redémarrage demandé.');
  const ok = await restartApp();
  res.writeHead(ok ? 200 : 503, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(ok
    ? { ok: true }
    : { ok: false, error: 'Le redémarrage a échoué. Réessaie dans quelques secondes.' }));
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/__gateway/health') {
    const up = await isAppUp(500);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify({
      gateway: 'up',
      app: up ? 'up' : 'down',
      appPort: APP_PORT,
      pid: appChild?.pid || readPid() || null,
      lastExit,
    }));
    return;
  }

  if (url.pathname === '/__restart' && req.method === 'POST') {
    await handleRestart(req, res);
    return;
  }

  if (url.pathname === '/server-down.html') {
    sendDownPage(res, 200);
    return;
  }

  if (!(await ensureApp())) {
    if (isApiRequest(req)) sendApiDown(res);
    else if (wantsHtml(req)) sendDownPage(res);
    else {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Site/application déconnecté.');
    }
    return;
  }

  proxyRequest(req, res);
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    log(`erreur inattendue : ${error.stack || error.message}`);
    if (!res.headersSent) sendDownPage(res);
    else res.destroy();
  });
});

server.listen(GATEWAY_PORT, '0.0.0.0', async () => {
  log(`en écoute sur http://localhost:${GATEWAY_PORT} (application sur ${APP_PORT}).`);
  try {
    const up = await ensureApp();
    log(up ? 'application disponible.' : 'application indisponible : la page de redémarrage sera affichée.');
  } catch (error) {
    log(`démarrage initial impossible : ${error.message}`);
  }
});

let healthCheckRunning = false;
setInterval(async () => {
  if (!AUTOSTART || shuttingDown || stopping || startPromise || healthCheckRunning) return;
  healthCheckRunning = true;
  try {
    if (!(await isAppUp(1500))) {
      log('application ne répond plus, redémarrage automatique…');
      await stopApp();
      if (!shuttingDown) await ensureApp();
    }
  } finally {
    healthCheckRunning = false;
  }
}, 15000).unref();

async function shutdown() {
  shuttingDown = true;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  log('arrêt du gateway…');
  await stopApp();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, shutdown);
}
