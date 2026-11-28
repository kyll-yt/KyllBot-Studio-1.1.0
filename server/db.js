import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadRemoteRecord, remoteStoreEnabled, remoteStoreInfo, saveRemoteState } from './supabase-store.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_FILE = path.join(DATA_DIR, 'db.last-good.json');

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

function readJsonFile(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

function stateHasData(state) {
  return Boolean(state && ((state.users || []).length || Object.keys(state.workspaces || {}).length));
}

function writeBackup(state) {
  if (!stateHasData(state)) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${BACKUP_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, BACKUP_FILE);
  } catch (error) {
    console.error(`[db] sauvegarde de secours impossible : ${error.message}`);
  }
}

function botTimestamp(bot) {
  return Date.parse(bot?.updatedAt || bot?.createdAt || '') || 0;
}

function mergeWorkspace(remoteWs, localWs) {
  if (!remoteWs || !localWs) return false;
  let changed = false;
  if (!Array.isArray(localWs.bots)) {
    localWs.bots = [];
    changed = true;
  }
  const tombstones = new Map();
  for (const entry of [...(localWs.deletedBots || []), ...(remoteWs.deletedBots || [])]) {
    const id = String(entry?.id || '');
    const at = Date.parse(entry?.deletedAt || '') || 0;
    if (id && at > (tombstones.get(id) || 0)) tombstones.set(id, at);
  }

  const localBots = new Map(localWs.bots.map((bot) => [bot.id, bot]));
  for (const remoteBot of remoteWs.bots || []) {
    const localBot = localBots.get(remoteBot.id);
    if (!localBot) {
      if (!tombstones.has(remoteBot.id)) {
        localWs.bots.push(remoteBot);
        changed = true;
      }
    } else if (botTimestamp(remoteBot) > botTimestamp(localBot)) {
      const index = localWs.bots.findIndex((bot) => bot.id === remoteBot.id);
      if (index >= 0) {
        localWs.bots[index] = remoteBot;
        changed = true;
      }
    }
  }

  const before = localWs.bots.length;
  localWs.bots = localWs.bots.filter((bot) => {
    const deletedAt = tombstones.get(bot.id) || 0;
    return !deletedAt || deletedAt < botTimestamp(bot);
  });
  if (localWs.bots.length !== before) changed = true;

  const mergedTombstones = [...tombstones.entries()]
    .map(([id, at]) => ({ id, deletedAt: new Date(at || Date.now()).toISOString() }))
    .sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt))
    .slice(0, 30);
  if (JSON.stringify(mergedTombstones) !== JSON.stringify(localWs.deletedBots || [])) {
    localWs.deletedBots = mergedTombstones;
    changed = true;
  }
  return changed;
}

function mergeRemoteRecord(remote) {
  if (!remote?.state) return false;
  let changed = false;
  const users = new Map((db.users || []).map((user) => [user.id || user.email, user]));
  for (const user of remote.state.users || []) {
    const key = user.id || user.email;
    if (key && !users.has(key)) {
      db.users.push(user);
      changed = true;
    }
  }

  db.workspaces = db.workspaces || {};
  for (const [userId, remoteWs] of Object.entries(remote.state.workspaces || {})) {
    if (!db.workspaces[userId]) {
      db.workspaces[userId] = remoteWs;
      changed = true;
    } else if (mergeWorkspace(remoteWs, db.workspaces[userId])) {
      changed = true;
    }
  }

  for (const key of ['sessions', 'codes', 'feedback']) {
    if (!Array.isArray(db[key])) db[key] = [];
    const known = new Set(db[key].map((entry) => entry?.id || entry?.hash || entry?.email).filter(Boolean));
    for (const entry of remote.state[key] || []) {
      const id = entry?.id || entry?.hash || entry?.email;
      if (id && !known.has(id)) {
        db[key].push(entry);
        known.add(id);
        changed = true;
      }
    }
  }
  return changed;
}

const localState = readJsonFile(DB_FILE);
const backupState = readJsonFile(BACKUP_FILE);
let initialState = localState;
let remoteWritesEnabled = remoteStoreEnabled;
let remoteExists = false;
let remoteUpdatedAt = null;
let remoteHadData = false;
let needsRemoteSeed = false;
let lastRemoteSaveAt = null;
let remotePending = 0;
export let storageError = null;
if (!remoteStoreEnabled && remoteStoreInfo.configError) storageError = remoteStoreInfo.configError;

async function loadRemoteWithRetry() {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await loadRemoteRecord();
    } catch (error) {
      if (attempt === 2) throw error;
      console.warn(`[db] Supabase tentative ${attempt}/2 échouée : ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return { state: null, updatedAt: null, exists: false };
}

if (remoteStoreEnabled) {
  try {
    console.log(`[db] Supabase cible ${remoteStoreInfo.host}/${remoteStoreInfo.table} (clé ${remoteStoreInfo.keyRole})`);
    const remote = await loadRemoteWithRetry();
    remoteExists = remote.exists;
    remoteUpdatedAt = remote.updatedAt;
    if (stateHasData(remote.state)) {
      initialState = { ...emptyState(), ...remote.state };
      remoteHadData = true;
      writeBackup(initialState);
      console.log('[db] stockage Supabase activé (état chargé)');
    } else {
      const fallback = stateHasData(backupState) ? backupState : stateHasData(localState) ? localState : null;
      if (fallback) {
        initialState = { ...emptyState(), ...fallback };
        needsRemoteSeed = true;
        console.warn('[db] Supabase vide : restauration depuis la sauvegarde locale.');
      } else {
        initialState = emptyState();
      }
      console.log('[db] stockage Supabase activé (nouvel état)');
    }
  } catch (error) {
    remoteWritesEnabled = false;
    storageError = error.message;
    initialState = { ...emptyState(), ...(stateHasData(backupState) ? backupState : localState) };
    console.error(`[db] Supabase indisponible : ${error.message}`);
    console.error('[db] démarrage avec la dernière sauvegarde locale ; écritures Supabase en attente.');
  }
}

export const db = initialState;
export let storageMode = remoteWritesEnabled ? 'supabase' : 'local';

let timer = null;
let remoteQueue = Promise.resolve();

async function saveRemoteWithRetry(snapshot) {
  let current = snapshot;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      remoteUpdatedAt = await saveRemoteState(current, remoteUpdatedAt, remoteExists);
      remoteExists = true;
      remoteHadData = stateHasData(current);
      writeBackup(current);
      return;
    } catch (error) {
      if (error.code === 'REMOTE_CONFLICT' && attempt < 4) {
        const remote = await loadRemoteRecord();
        remoteExists = remote.exists;
        remoteUpdatedAt = remote.updatedAt;
        mergeRemoteRecord(remote);
        current = structuredClone(db);
        storageError = 'Fusion avec une autre instance en cours…';
        continue;
      }
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

function queueRemoteSave() {
  if (!remoteWritesEnabled) return;
  if (!stateHasData(db) && remoteHadData) {
    storageError = 'Sauvegarde bloquée : l’état local est vide alors que Supabase contient des données.';
    console.error('[db] sauvegarde Supabase bloquée : état vide détecté.');
    return;
  }
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

if (needsRemoteSeed) {
  queueRemoteSave();
}
if (stateHasData(db)) saveLocalSafely();

if (remoteStoreEnabled && !remoteWritesEnabled) {
  const retry = setInterval(async () => {
    if (remoteWritesEnabled) {
      clearInterval(retry);
      return;
    }
    try {
      const remote = await loadRemoteRecord();
      remoteExists = remote.exists;
      remoteUpdatedAt = remote.updatedAt;
      mergeRemoteRecord(remote);
      remoteWritesEnabled = true;
      storageMode = 'supabase';
      storageError = null;
      console.log('[db] Supabase rétabli : sauvegarde réactivée.');
      if (stateHasData(db)) queueRemoteSave();
      clearInterval(retry);
    } catch (error) {
      storageError = error.message;
    }
  }, 10000);
  retry.unref?.();
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
    remote: remoteStoreEnabled,
    error: storageError,
    lastSaveAt: lastRemoteSaveAt,
    updatedAt: remoteUpdatedAt,
    pending: remotePending,
    backup: fs.existsSync(BACKUP_FILE),
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
