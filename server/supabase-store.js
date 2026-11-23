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

export async function loadRemoteState() {
  if (!remoteStoreEnabled) {
    if (configError) throw new Error(configError);
    return null;
  }
  assertServiceKey();

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(STATE_ID)}&select=data`,
    {
      headers: headers(),
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!response.ok) throw new Error(await errorMessage(response));
  const rows = await response.json();
  const data = rows[0]?.data ?? null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      throw new Error('La colonne data Supabase contient un JSON invalide.');
    }
  }
  return data;
}

export async function saveRemoteState(data) {
  if (!remoteStoreEnabled) return;
  assertServiceKey();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=id`, {
    method: 'POST',
    headers: headers({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify([{ id: STATE_ID, data, updated_at: new Date().toISOString() }]),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(await errorMessage(response));
}
