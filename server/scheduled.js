import { safeTimezone } from './service.js';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Europe/Paris';
const DEFAULT_GRACE_MINUTES = 10;

export function normalizeScheduledDays(input) {
  const values = Array.isArray(input) ? input : String(input || '').split(',');
  const days = [...new Set(values.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
  return days.length ? days.sort((a, b) => a - b) : [...ALL_DAYS];
}

export function sanitizeScheduledMessage(input = {}, previous = null) {
  const next = previous
    ? { ...previous }
    : {
        label: '',
        channelId: '',
        channelName: '',
        content: '',
        time: '09:00',
        days: [...ALL_DAYS],
        timezone: safeTimezone(DEFAULT_TIMEZONE),
        enabled: true,
        lastSentKey: null,
        lastSentAt: null,
        lastAttemptKey: null,
        lastAttemptAt: null,
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  if (typeof input.label === 'string') next.label = input.label.trim().slice(0, 80);
  if (typeof input.channelId === 'string') next.channelId = input.channelId.trim().slice(0, 60);
  if (typeof input.channelName === 'string') next.channelName = input.channelName.trim().replace(/^#/, '').slice(0, 60);
  if (typeof input.content === 'string') next.content = input.content.trim().slice(0, 2000);
  if (typeof input.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) next.time = input.time;
  if (input.days !== undefined) next.days = normalizeScheduledDays(input.days);
  if (typeof input.timezone === 'string') next.timezone = safeTimezone(input.timezone);
  if (input.enabled !== undefined) next.enabled = Boolean(input.enabled);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function scheduledMessageLabel(message = {}) {
  const days = normalizeScheduledDays(message.days);
  const time = message.time || '09:00';
  if (days.length === 7) return `Tous les jours à ${time}`;
  if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) {
    return `Du lundi au vendredi à ${time}`;
  }
  if (days.length === 2 && days.includes(0) && days.includes(6)) return `Le week-end à ${time}`;
  return `${days.map((day) => DAY_SHORT[day]).join(', ')} à ${time}`;
}

export function zonedParts(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimezone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
  };
}

export function scheduledMessageDue(message = {}, now = new Date()) {
  if (!message.enabled) return null;
  const timezone = safeTimezone(message.timezone || DEFAULT_TIMEZONE);
  const parts = zonedParts(now, timezone);
  if (!normalizeScheduledDays(message.days).includes(parts.weekday)) return null;

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(message.time || ''));
  if (!match) return null;
  const targetMinutes = Number(match[1]) * 60 + Number(match[2]);
  const currentMinutes = parts.hour * 60 + parts.minute;
  const lateMinutes = currentMinutes - targetMinutes;
  const graceMinutes = Number.isFinite(Number(message.graceMinutes))
    ? Math.max(0, Math.min(120, Number(message.graceMinutes)))
    : DEFAULT_GRACE_MINUTES;
  if (lateMinutes < 0 || lateMinutes > graceMinutes) return null;

  const pad = (value) => String(value).padStart(2, '0');
  const key = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${match[1]}:${match[2]}`;
  if (message.lastSentKey === key) return null;
  return { key, lateMinutes, timezone };
}

export { ALL_DAYS, DAY_SHORT, DEFAULT_TIMEZONE };
