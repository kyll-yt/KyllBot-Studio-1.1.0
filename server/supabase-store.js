import { gzipSync, gunzipSync } from 'node:zlib';

const PACK_FORMAT = 'gzip-base64-v1';

function firstEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

const RAW_URL = firstEnv('SUPABASE_URL', 'supabaseUrl', 'SUPABASE_PROJECT_URL', 'supabaseProjectUrl').replace(/\/+$/, '');
const SUPABASE_URL = RAW_URL.replace(/\/rest\/v1$/i, '');
const SUPABASE_KEY = firstEnv(
  'SUPABASE_SERVICE_ROLE_KEY',
  'supabaseServiseRolKey',
  'supabaseServiceRoleKey',
  'SUPABASE_SERVISE_ROL_KEY',
  'SUPABASE_SERVICE_KEY',
);
const TABLE = (firstEnv('SUPABASE_STATE_TABLE', 'supabaseStateTable') || 'kyll_state').replace(/^public\./i, '');
const STATE_ID = firstEnv('SUPABASE_STATE_ID', 'supabaseStateId') || 'default';

function jwtRole(key) {
  if (!key) return 'missing';
  if (key.startsWith('sb_secret_')) return 'service_role';
  if (key.startsWith('sb_publishable_')) return 'anon';
  const parts = key.split('.');
  if (parts.length !== 3) return 'unknown';
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return String(payload.role || 'unknown');
  } catch {
    return 'unknown';
  }
}

const KEY_ROLE = jwtRole(SUPABASE_KEY);
const TABLE_VALID = /^[a-z_][a-z0-9_]*$/i.test(TABLE);
let configError = '';

if (!TABLE_VALID) configError = `Nom de table Supabase invalide : « ${TABLE} ».`;
if (SUPABASE_URL) {
  try {
    new URL(SUPABASE_URL);
  } catch {
    configError = configError || 'SUPABASE_URL est invalide.';
  }
}

export const remoteStoreEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY && TABLE_VALID && !configError);
export const remoteStoreInfo = Object.freeze({
  enabled: remoteStoreEnabled,
  urlConfigured: Boolean(SUPABASE_URL),
  keyConfigured: Boolean(SUPABASE_KEY),
  keyRole: KEY_ROLE,
  table: TABLE,
  stateId: STATE_ID,
  configError: configError || null,
  host: (() => {
    try {
      return new URL(SUPABASE_URL).host;
    } catch {
      return '';
    }
  })(),
});

function assertServiceKey() {
  if (['anon', 'authenticated'].includes(KEY_ROLE)) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY contient une clé publique/anon. Utilise la clé service_role dans Render, sinon Supabase refuse les écritures.',
    );
  }
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra,
  };
}

async function errorMessage(response) {
  const text = await response.text().catch(() => '');
  return `Supabase ${response.status}${text ? ` : ${text.slice(0, 300)}` : ''}`;
}

function packState(data) {
  return {
    __format: PACK_FORMAT,
    payload: gzipSync(Buffer.from(JSON.stringify(data), 'utf8'), { level: 9 }).toString('base64'),
  };
}

function unpackState(data) {
  if (data && data.__format === PACK_FORMAT && typeof data.payload === 'string') {
    try {
      return JSON.parse(gunzipSync(Buffer.from(data.payload, 'base64')).toString('utf8'));
    } catch {
      throw new Error('La sauvegarde Supabase compressée est illisible.');
    }
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      throw new Error('La colonne data Supabase contient un JSON invalide.');
    }
  }
  return data;
}

export async function loadRemoteRecord() {
  if (!remoteStoreEnabled) {
    if (configError) throw new Error(configError);
    return { state: null, updatedAt: null, exists: false };
  }
  assertServiceKey();

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(STATE_ID)}&select=data,updated_at`,
    {
      headers: headers(),
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!response.ok) throw new Error(await errorMessage(response));
  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  return {
    state: row ? unpackState(row.data) : null,
    updatedAt: row?.updated_at || null,
    exists: Boolean(row),
  };
}

export async function loadRemoteState() {
  return (await loadRemoteRecord()).state;
}

function conflictError() {
  const error = new Error('Une autre instance a modifié la sauvegarde Supabase. Fusion en cours…');
  error.code = 'REMOTE_CONFLICT';
  return error;
}

export async function saveRemoteState(data, expectedUpdatedAt = null, expectExists = false) {
  if (!remoteStoreEnabled) return null;
  assertServiceKey();

  const packed = packState(data);
  const updatedAt = new Date().toISOString();
  let response;

  if (expectedUpdatedAt || expectExists) {
    const filter = expectedUpdatedAt
      ? `updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`
      : 'updated_at=is.null';
    response = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(STATE_ID)}&${filter}`,
      {
        method: 'PATCH',
        headers: headers({
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        }),
        body: JSON.stringify({ data: packed, updated_at: updatedAt }),
        signal: AbortSignal.timeout(15000),
      },
    );
  } else {
    response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=id`, {
      method: 'POST',
      headers: headers({
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=representation',
      }),
      body: JSON.stringify([{ id: STATE_ID, data: packed, updated_at: updatedAt }]),
      signal: AbortSignal.timeout(15000),
    });
  }

  if (!response.ok) throw new Error(await errorMessage(response));
  const rows = await response.json().catch(() => []);
  if (!Array.isArray(rows) || !rows.length) throw conflictError();
  return rows[0]?.updated_at || updatedAt;
}
