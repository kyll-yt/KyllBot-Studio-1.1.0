import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadRemoteState, remoteStoreEnabled, remoteStoreInfo, saveRemoteState } from './supabase-store.js';

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
let lastRemoteSaveAt = null;
let remotePending = 0;
export let storageError = null;
if (!remoteStoreEnabled && remoteStoreInfo.configError) storageError = remoteStoreInfo.configError;

async function loadRemoteWithRetry() {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await loadRemoteState();
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`[db] Supabase tentative ${attempt}/3 échouée : ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  return null;
}

if (remoteStoreEnabled) {
  try {
    console.log(`[db] Supabase cible ${remoteStoreInfo.host}/${remoteStoreInfo.table} (clé ${remoteStoreInfo.keyRole})`);
    const remoteState = await loadRemoteWithRetry();
    initialState = remoteState ? { ...emptyState(), ...remoteState } : emptyState();
    console.log(`[db] stockage Supabase activé (${remoteState ? 'état chargé' : 'nouvel état'})`);
  } catch (error) {
    remoteWritesEnabled = false;
    storageError = error.message;
    console.error(`[db] Supabase indisponible : ${error.message}`);
    console.error('[db] démarrage avec le fichier local ; écritures Supabase désactivées.');
  }
}

export const db = initialState;
export const storageMode = remoteWritesEnabled ? 'supabase' : 'local';

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
  remotePending += 1;
  remoteQueue = remoteQueue
    .then(() => saveRemoteWithRetry(snapshot))
    .then(() => {
      storageError = null;
      lastRemoteSaveAt = new Date().toISOString();
    })
    .catch((error) => {
      storageError = error.message;
      console.error(`[db] échec de sauvegarde Supabase : ${error.message}`);
    })
    .finally(() => {
      remotePending = Math.max(0, remotePending - 1);
    });
}

function writeLocalState() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function saveLocalSafely() {
  try {
    writeLocalState();
  } catch (error) {
    console.error(`[db] écriture locale impossible : ${error.message}`);
  }
}

export function persist() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    saveLocalSafely();
    queueRemoteSave();
  }, 60);
}

export async function flushPersistence() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
    saveLocalSafely();
    queueRemoteSave();
  }
  await remoteQueue;
}

export function storageStatus() {
  return {
    mode: storageMode,
    error: storageError,
    lastSaveAt: lastRemoteSaveAt,
    pending: remotePending,
  };
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
