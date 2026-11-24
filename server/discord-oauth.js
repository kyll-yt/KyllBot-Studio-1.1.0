import crypto from 'node:crypto';
import { db } from './db.js';
import { decryptSecret } from './secrets.js';

const DISCORD_API = 'https://discord.com/api/v10';
const MANAGE_GUILD = 1n << 5n;
const ADMINISTRATOR = 1n << 3n;
const STATE_TTL_MS = 10 * 60 * 1000;
const pending = new Map();
const results = new Map();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of pending) if (now - entry.createdAt > STATE_TTL_MS) pending.delete(key);
  for (const [key, entry] of results) if (now - entry.createdAt > STATE_TTL_MS) results.delete(key);
}

function appIdFromToken(token) {
  const first = String(token || '').split('.')[0];
  if (!first) return '';
  for (const encoding of ['base64url', 'base64']) {
    try {
      const value = Buffer.from(first, encoding).toString('utf8');
      if (/^\d{17,20}$/.test(value)) return value;
    } catch {
      /* essaie l'encodage suivant */
    }
  }
  return '';
}

function appIdFromBot(bot, token) {
  return String(bot?.discordAccount?.id || '').trim() || appIdFromToken(token);
}

function findBot(botId) {
  for (const workspace of Object.values(db.workspaces || {})) {
    const bot = (workspace.bots || []).find((entry) => entry.id === botId);
    if (bot) return bot;
  }
  return null;
}

async function discordFetch(path, token, type = 'Bearer') {
  const response = await fetch(`${DISCORD_API}${path}`, {
    headers: { Authorization: `${type} ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error_description || `Discord a répondu ${response.status}.`);
  }
  return data;
}

function canManageGuild(guild) {
  if (guild?.owner) return true;
  try {
    return (BigInt(String(guild?.permissions || '0')) & (MANAGE_GUILD | ADMINISTRATOR)) !== 0n;
  } catch {
    return false;
  }
}

function isLocalHostname(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname) || hostname.endsWith('.local');
}

export function discordOAuthRedirectUri(req) {
  const requestBase = `${req.protocol}://${req.get('host')}`;
  let base = requestBase;
  try {
    const configured = new URL(String(process.env.PUBLIC_URL || '').trim());
    if (!isLocalHostname(configured.hostname)) base = configured.origin;
  } catch {
    /* PUBLIC_URL absent ou invalide : on garde l'origine de la requête */
  }
  return `${String(base).replace(/\/$/, '')}/api/discord/oauth/callback`;
}

export function createDiscordOAuthUrl(req, bot, token, userId) {
  cleanup();
  const appId = appIdFromBot(bot, token);
  if (!appId) throw new Error('Impossible de trouver l’identifiant de l’application Discord. Vérifie le token du bot.');
  const redirectUri = discordOAuthRedirectUri(req);
  const state = crypto.randomBytes(24).toString('base64url');
  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  pending.set(state, { botId: bot.id, userId: String(userId || ''), appId, redirectUri, codeVerifier, createdAt: Date.now() });
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'identify guilds');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function completeDiscordOAuth(state, code, discordError = '') {
  cleanup();
  const entry = pending.get(state);
  if (!entry) {
    const error = new Error('Autorisation Discord expirée. Recommence depuis KyllBot Studio.');
    error.botId = '';
    throw error;
  }
  pending.delete(state);
  const bot = findBot(entry.botId);
  if (!bot) throw Object.assign(new Error('Bot introuvable.'), { botId: entry.botId });

  const baseResult = {
    botId: bot.id,
    userId: entry.userId,
    createdAt: Date.now(),
    availableGuilds: [],
    presentGuilds: [],
    user: null,
  };

  if (discordError) {
    results.set(state, { ...baseResult, error: discordError === 'access_denied' ? 'Autorisation annulée.' : 'Autorisation Discord refusée.' });
    return { botId: bot.id };
  }
  if (!code) {
    results.set(state, { ...baseResult, error: 'Code d’autorisation Discord manquant.' });
    return { botId: bot.id };
  }

  try {
    if (!bot.tokenEnc) throw new Error('Aucun token Discord enregistré pour ce bot.');
    const botToken = decryptSecret(bot.tokenEnc);
    const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: entry.appId,
        code,
        redirect_uri: entry.redirectUri,
        code_verifier: entry.codeVerifier,
      }),
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Discord a refusé l’autorisation.');
    }

    const [user, userGuilds, botGuilds] = await Promise.all([
      discordFetch('/users/@me', tokenData.access_token),
      discordFetch('/users/@me/guilds', tokenData.access_token),
      discordFetch('/users/@me/guilds', botToken, 'Bot'),
    ]);
    const botGuildIds = new Set((Array.isArray(botGuilds) ? botGuilds : []).map((guild) => guild.id));
    const manageable = (Array.isArray(userGuilds) ? userGuilds : [])
      .filter(canManageGuild)
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon || null,
        owner: Boolean(guild.owner),
        botPresent: botGuildIds.has(guild.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    results.set(state, {
      ...baseResult,
      user: { id: user.id, username: user.username, globalName: user.global_name || user.username },
      availableGuilds: manageable.filter((guild) => !guild.botPresent),
      presentGuilds: manageable.filter((guild) => guild.botPresent),
    });
    return { botId: bot.id };
  } catch (error) {
    results.set(state, { ...baseResult, error: error.message });
    return { botId: bot.id };
  }
}

export function takeDiscordOAuthResult(state, userId) {
  cleanup();
  const result = results.get(state);
  if (!result) return null;
  if (userId && result.userId && result.userId !== userId) return null;
  results.delete(state);
  return result;
}
