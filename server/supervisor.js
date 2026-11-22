import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GATEWAY_ENTRY = path.join(ROOT, 'server', 'gateway.js');

let gateway = null;
let stopping = false;
let restartTimer = null;
let restartDelay = 1000;
let startedAt = 0;

function log(message) {
  console.log(`[supervisor] ${message}`);
}

function startGateway() {
  if (stopping) return;
  log('démarrage du gateway…');
  startedAt = Date.now();
  gateway = spawn(process.execPath, [GATEWAY_ENTRY], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });
  gateway.on('error', (error) => {
    log(`impossible de démarrer le gateway : ${error.message}`);
    scheduleRestart();
  });
  gateway.on('exit', (code, signal) => {
    gateway = null;
    if (stopping) return;
    if (Date.now() - startedAt > 30000) restartDelay = 1000;
    log(`gateway arrêté (code ${code ?? 'null'}, signal ${signal ?? 'aucun'}).`);
    scheduleRestart();
  });
}

function scheduleRestart() {
  if (stopping || restartTimer) return;
  const delay = restartDelay;
  restartDelay = Math.min(restartDelay * 2, 30000);
  log(`redémarrage automatique dans ${Math.round(delay / 1000)} s…`);
  restartTimer = setTimeout(() => {
    restartTimer = null;
    startGateway();
  }, delay);
}

function shutdown(signal) {
  stopping = true;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  if (gateway && gateway.exitCode === null) {
    gateway.kill(signal);
    setTimeout(() => process.exit(0), 5000).unref();
  } else {
    process.exit(0);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(signal));
}

startGateway();
