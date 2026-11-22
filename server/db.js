import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadRemoteState, remoteStoreEnabled, saveRemoteState } from './supabase-store.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function emptyState() {
  return {
    users: [],
    sessions: [],
    codes: [],
    ownerAccess: { codeHash: null, createdAt: null, lastUsedAt: null },
    feedback: [],
    workspaces: {},
    createdAt: new Date().toISOString(),
  };
}

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

const localState = load();
let initialState = localState;
let remoteWritesEnabled = remoteStoreEnabled;

if (remoteStoreEnabled) {
  try {
    const remoteState = await loadRemoteState();
    initialState = remoteState ? { ...emptyState(), ...remoteState } : emptyState();
    console.log(`[db] stockage Supabase activé (${remoteState ? 'état chargé' : 'nouvel état'})`);
  } catch (error) {
    remoteWritesEnabled = false;
    console.error(`[db] Supabase indisponible : ${error.message}`);
    console.error('[db] démarrage avec le fichier local ; écritures Supabase désactivées.');
  }
}

export const db = initialState;

let timer = null;
let remoteQueue = Promise.resolve();

async function saveRemoteWithRetry(snapshot) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await saveRemoteState(snapshot);
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

function queueRemoteSave() {
  if (!remoteWritesEnabled) return;
  const snapshot = structuredClone(db);
  remoteQueue = remoteQueue
    .then(() => saveRemoteWithRetry(snapshot))
    .catch((error) => console.error(`[db] échec de sauvegarde Supabase : ${error.message}`));
}

function writeLocalState() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function persist() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    writeLocalState();
    queueRemoteSave();
  }, 60);
}

export async function flushPersistence() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
    writeLocalState();
    queueRemoteSave();
  }
  await remoteQueue;
}

export function newId() {
  return crypto.randomUUID();
}

export function findUserByEmail(email) {
  return db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

export function findUserById(id) {
  return db.users.find((u) => u.id === id);
}
