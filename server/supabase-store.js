const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const TABLE = String(process.env.SUPABASE_STATE_TABLE || 'kyll_state');
const STATE_ID = String(process.env.SUPABASE_STATE_ID || 'default');

export const remoteStoreEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

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
  if (!remoteStoreEnabled) return null;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(STATE_ID)}&select=data`,
    {
      headers: headers(),
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!response.ok) throw new Error(await errorMessage(response));
  const rows = await response.json();
  return rows[0]?.data ?? null;
}

export async function saveRemoteState(data) {
  if (!remoteStoreEnabled) return;

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
