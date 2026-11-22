import { formatDuration, formatSignedDuration } from './flows.js';

export const SERVICE_DEFAULT_CONFIG = { period: 'week', resetDay: 1, resetHour: 0, timezone: 'Europe/Paris' };
const SERVICE_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SERVICE_DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const SERVICE_MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function safeTimezone(value) {
  const timezone = String(value || '').trim() || SERVICE_DEFAULT_CONFIG.timezone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return SERVICE_DEFAULT_CONFIG.timezone;
  }
}

export function serviceZonedParts(now, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const parts = {};
  for (const part of formatter.formatToParts(new Date(now))) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    weekday: parts.weekday,
  };
}

export function serviceDateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function servicePeriodKey(config, now = Date.now()) {
  const settings = { ...SERVICE_DEFAULT_CONFIG, ...(config || {}) };
  const timezone = safeTimezone(settings.timezone);
  const resetHour = Math.min(23, Math.max(0, Number(settings.resetHour) || 0));
  const parts = serviceZonedParts(now, timezone);
  if (settings.period === 'month') {
    let year = parts.year;
    let month = parts.month;
    if (parts.day === 1 && parts.hour < resetHour) {
      month -= 1;
      if (month < 1) { month = 12; year -= 1; }
    }
    return `M:${year}-${String(month).padStart(2, '0')}`;
  }
  const resetDay = Math.min(7, Math.max(1, Number(settings.resetDay) || 1));
  const weekdayIndex = Math.max(0, SERVICE_WEEKDAYS.indexOf(parts.weekday));
  let delta = (weekdayIndex - (resetDay - 1) + 7) % 7;
  if (delta === 0 && parts.hour < resetHour) delta = 7;
  const start = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  start.setUTCDate(start.getUTCDate() - delta);
  return `W:${serviceDateKey(start)}`;
}

export function servicePeriodLabel(state) {
  const config = { ...SERVICE_DEFAULT_CONFIG, ...(state?.config || {}) };
  const key = state?.periodKey || servicePeriodKey(config);
  if (key.startsWith('M:')) {
    const [year, month] = key.slice(2).split('-').map(Number);
    const name = SERVICE_MONTH_NAMES[month - 1] || String(month);
    return `Mois ${/^[aeiouéèê]/.test(name) ? "d’" : 'de '}${name} ${year}`;
  }
  const start = new Date(`${key.slice(2)}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const format = (date) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(date);
  return `Semaine du ${format(start)} au ${format(end)}`;
}

export function serviceResetLabel(config) {
  const settings = { ...SERVICE_DEFAULT_CONFIG, ...(config || {}) };
  const hour = Math.min(23, Math.max(0, Number(settings.resetHour) || 0));
  if (settings.period === 'month') return `le 1er à ${hour} h`;
  const day = SERVICE_DAY_NAMES[Math.min(7, Math.max(1, Number(settings.resetDay) || 1)) - 1];
  return `${day} à ${hour} h`;
}

export function ensureServiceState(bot, guildId, now = Date.now()) {
  if (!bot.service || typeof bot.service !== 'object' || Array.isArray(bot.service)) bot.service = { guilds: {} };
  if (!bot.service.guilds || typeof bot.service.guilds !== 'object' || Array.isArray(bot.service.guilds)) bot.service.guilds = {};
  const key = String(guildId || 'dm');
  let state = bot.service.guilds[key];
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    state = { config: { ...SERVICE_DEFAULT_CONFIG }, periodKey: null, members: {} };
    bot.service.guilds[key] = state;
  }
  const config = state.config && typeof state.config === 'object' ? state.config : {};
  state.config = {
    period: config.period === 'month' ? 'month' : 'week',
    resetDay: Math.min(7, Math.max(1, Number(config.resetDay) || 1)),
    resetHour: Math.min(23, Math.max(0, Number(config.resetHour) || 0)),
    timezone: safeTimezone(config.timezone),
  };
  if (!state.members || typeof state.members !== 'object' || Array.isArray(state.members)) state.members = {};
  const periodKey = servicePeriodKey(state.config, now);
  if (state.periodKey !== periodKey) {
    // A shift that is still running crosses the reset: keep it active in the new period.
    const active = Object.fromEntries(
      Object.entries(state.members)
        .filter(([, entry]) => entry && typeof entry === 'object' && entry.startedAt)
        .map(([id, entry]) => [id, { ...entry, serviceMs: 0, penaltyMs: 0, startedAt: now }]),
    );
    state.periodKey = periodKey;
    state.members = active;
  }
  return state;
}

export function serviceEntry(state, userId, name) {
  const id = String(userId || 'inconnu');
  let entry = state.members[id];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    entry = { id, name: String(name || id), serviceMs: 0, penaltyMs: 0, startedAt: null };
    state.members[id] = entry;
  }
  entry.id = id;
  if (name) entry.name = String(name);
  entry.serviceMs = Math.max(0, Number(entry.serviceMs) || 0);
  entry.penaltyMs = Math.max(0, Number(entry.penaltyMs) || 0);
  entry.startedAt = entry.startedAt ? Number(entry.startedAt) : null;
  return entry;
}

export function serviceTotals(entry, now = Date.now()) {
  const liveMs = entry?.startedAt ? Math.max(0, now - Number(entry.startedAt)) : 0;
  const serviceMs = Math.max(0, Number(entry?.serviceMs) || 0) + liveMs;
  const penaltyMs = Math.max(0, Number(entry?.penaltyMs) || 0);
  return { serviceMs, penaltyMs, totalMs: serviceMs - penaltyMs, liveMs };
}

export function serviceTokens(state, entry, extra = {}) {
  const totals = serviceTotals(entry, extra.now || Date.now());
  const mention = entry?.id && entry.id !== 'inconnu' ? `<@${entry.id}>` : entry?.name || 'Membre';
  return {
    member: mention,
    member_name: entry?.name || 'Membre',
    member_mention: mention,
    service: formatDuration(totals.serviceMs),
    penalty: formatDuration(totals.penaltyMs),
    total: formatSignedDuration(totals.totalMs),
    duration: formatDuration(extra.durationMs || 0),
    penalty_added: formatDuration(extra.penaltyMs || 0),
    since: formatDuration(extra.sinceMs || 0),
    period: servicePeriodLabel(state),
    reset: serviceResetLabel(state?.config),
  };
}

export function applyServiceTokens(template, tokens) {
  return String(template || '').replace(/{{\s*([\w.]+)\s*}}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : match
  ));
}

export function applyServiceTokensDeep(value, tokens) {
  if (typeof value === 'string') return applyServiceTokens(value, tokens);
  if (Array.isArray(value)) return value.map((entry) => applyServiceTokensDeep(entry, tokens));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, applyServiceTokensDeep(entry, tokens)]));
  }
  return value;
}

export function serviceDisplayName(member, user) {
  return member?.displayName || user?.globalName || user?.username || 'Membre';
}

export function addServicePenalty(bot, guildId, user, penaltyMs) {
  const state = ensureServiceState(bot, guildId);
  const entry = serviceEntry(state, user?.id, user?.name);
  const amount = Math.max(0, Math.round(Number(penaltyMs) || 0));
  entry.penaltyMs = Math.max(0, Number(entry.penaltyMs) || 0) + amount;
  if (user?.name) entry.name = user.name;
  return { state, entry, tokens: serviceTokens(state, entry, { penaltyMs: amount }) };
}
