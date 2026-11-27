import { askAI } from './ai.js';
import { newId } from './db.js';
import { localAIResponse } from './local-ai.js';

/* ------------------------------------------------------------------ */
/* vocabulaire                                                         */
/* ------------------------------------------------------------------ */

export const TRIGGERS = {
  slash: { label: 'Commande slash' },
  keyword: { label: 'Mot-clé' },
  join: { label: 'Arrivée d’un membre' },
  leave: { label: 'Départ d’un membre' },
  reaction: { label: 'Réaction' },
  button: { label: 'Bouton' },
  schedule: { label: 'Planification' },
  dm: { label: 'Message privé reçu' },
  botJoin: { label: 'Arrivée d’un bot' },
  booster: { label: 'Boost du serveur' },
  automation: { label: 'Automatisation' },
};

export const BLOCKS = {
  message: { label: 'Envoyer un message', group: 'message' },
  embed: { label: 'Envoyer un embed', group: 'message' },
  dm: { label: 'Message privé', group: 'message' },
  button: { label: 'Boutons interactifs', group: 'message' },
  react: { label: 'Ajouter une réaction', group: 'message' },
  random: { label: 'Variante aléatoire', group: 'message' },
  role: { label: 'Rôle', group: 'gestion' },
  channel: { label: 'Créer un salon', group: 'gestion' },
  pin: { label: 'Épingler le message', group: 'gestion' },
  delete: { label: 'Supprimer des messages', group: 'gestion' },
  setvar: { label: 'Définir une variable', group: 'logique' },
  counter: { label: 'Calculer une variable', group: 'logique' },
  condition: { label: 'Condition', group: 'logique' },
  wait: { label: 'Attendre', group: 'logique' },
  timer: { label: 'Compte à rebours', group: 'logique' },
  chrono: { label: 'Chronomètre', group: 'logique' },
  serviceStart: { label: 'Service : démarrer', group: 'service' },
  serviceStop: { label: 'Service : arrêter', group: 'service' },
  servicePenalty: { label: 'Service : pénalité', group: 'service' },
  serviceLeaderboard: { label: 'Service : classement', group: 'service' },
  serviceOnline: { label: 'Service : chrono en ligne', group: 'service' },
  serviceConfig: { label: 'Service : période', group: 'service' },
  serviceReset: { label: 'Service : réinitialiser', group: 'service' },
  cooldown: { label: 'Anti-spam', group: 'logique' },
  typing: { label: 'Indicateur de saisie', group: 'technique' },
  webhook: { label: 'Requête HTTP', group: 'technique' },
  log: { label: 'Journaliser', group: 'technique' },
  note: { label: 'Note', group: 'logique' },
  reply: { label: 'Répondre', group: 'message' },
  edit: { label: 'Modifier un message', group: 'message' },
  thread: { label: 'Créer un fil', group: 'message' },
  forum: { label: 'Post forum', group: 'message' },
  forumAction: { label: 'Forum : message / fermer', group: 'message' },
  forumDelete: { label: 'Supprimer un message forum', group: 'moderation' },
  ai: { label: 'Réponse IA', group: 'message' },
  image: { label: 'Image / GIF', group: 'message' },
  poll: { label: 'Sondage', group: 'interaction' },
  select: { label: 'Menu déroulant', group: 'interaction' },
  modal: { label: 'Formulaire', group: 'interaction' },
  giveaway: { label: 'Giveaway', group: 'interaction' },
  await: { label: 'Attendre interaction', group: 'interaction' },
  accountCheck: { label: 'Vérifier le compte', group: 'moderation' },
  automationRun: { label: 'Lancer une automatisation', group: 'moderation' },
  moderation: { label: 'Modération complète', group: 'moderation' },
  timeout: { label: 'Exclure temporairement', group: 'moderation' },
  kick: { label: 'Expulser', group: 'moderation' },
  ban: { label: 'Bannir', group: 'moderation' },
  nickname: { label: 'Changer le pseudo', group: 'moderation' },
  move: { label: 'Déplacer en vocal', group: 'gestion' },
  invite: { label: 'Invitation', group: 'gestion' },
  ticket: { label: 'Gérer un ticket', group: 'gestion' },
  level: { label: 'Ajouter de l’XP', group: 'gestion' },
  randomNumber: { label: 'Nombre aléatoire', group: 'logique' },
  string: { label: 'Manipuler le texte', group: 'logique' },
  json: { label: 'Extraire du JSON', group: 'logique' },
  date: { label: 'Date / heure', group: 'logique' },
  stop: { label: 'Arrêter le flux', group: 'logique' },
  database: { label: 'Base de données', group: 'technique' },
  captcha: { label: 'Vérification', group: 'technique' },
  music: { label: 'Musique', group: 'technique' },
};

export const OPERATORS = {
  eq: 'est égal à',
  neq: 'est différent de',
  contains: 'contient',
  notContains: 'ne contient pas',
  startsWith: 'commence par',
  endsWith: 'se termine par',
  gt: 'est supérieur à',
  lt: 'est inférieur à',
  gte: 'est supérieur ou égal à',
  lte: 'est inférieur ou égal à',
  hasRole: 'possède le rôle',
  chance: 'chance (en %)',
};

const MAX_BLOCKS = 200;
const MAX_BUTTONS = 5;
const MAX_STEPS = 400;

const str = (value, max = 300) => String(value ?? '').trim().slice(0, max);

export function formatDuration(ms) {
  const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours) return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
  if (minutes) return seconds ? `${minutes} min ${seconds} s` : `${minutes} min`;
  return `${seconds} s`;
}

export function formatSignedDuration(ms) {
  const value = Math.round(Number(ms) || 0);
  return value < 0 ? `-${formatDuration(Math.abs(value))}` : formatDuration(value);
}

export function parseDurationInput(value) {
  const raw = String(value ?? '').trim().toLowerCase().replace(',', '.');
  if (!raw) return null;
  let total = 0;
  let matched = false;
  const hoursMinutes = raw.match(/^(\d+(?:\.\d+)?)\s*h(?:eures?)?\s*(\d+(?:\.\d+)?)?\s*(?:min|m)?$/);
  if (hoursMinutes) {
    total += Number(hoursMinutes[1]) * 3600e3;
    if (hoursMinutes[2]) total += Number(hoursMinutes[2]) * 60e3;
    matched = true;
  } else {
    const unitPattern = /(\d+(?:\.\d+)?)\s*(jours?|j|heures?|h|minutes?|mins?|m|secondes?|secs?|s)\b/g;
    let match;
    while ((match = unitPattern.exec(raw))) {
      const amount = Number(match[1]);
      const unit = match[2];
      if (/^j/.test(unit)) total += amount * 864e5;
      else if (/^h/.test(unit)) total += amount * 3600e3;
      else if (/^m/.test(unit)) total += amount * 60e3;
      else total += amount * 1000;
      matched = true;
    }
    if (!matched && /^\d+(?:\.\d+)?$/.test(raw)) {
      total = Number(raw) * 60e3;
      matched = true;
    }
  }
  if (!matched || !Number.isFinite(total) || total <= 0) return null;
  return Math.min(Math.round(total), 365 * 864e5);
}
const num = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const MODAL_FIELD_TYPES = new Set(['short', 'paragraph', 'select', 'checkbox', 'multi', 'role', 'user', 'info']);
const MAX_MODAL_FIELDS = 35;

function modalFieldTypeFromStyle(style) {
  const value = String(style || '').toLowerCase();
  if (/para|long/.test(value)) return 'paragraph';
  if (/multi/.test(value)) return 'multi';
  if (/role/.test(value)) return 'role';
  if (/user|membre|personne/.test(value)) return 'user';
  if (/select|liste|dropdown/.test(value)) return 'select';
  if (/check|case/.test(value)) return 'checkbox';
  if (/info|information/.test(value)) return 'info';
  return 'short';
}

function parseLegacyModalField(line, index) {
  const [rawLabel, rawStyle, rawRequired, rawPlaceholder] = String(line || '').split('|').map((part) => part.trim());
  return {
    label: rawLabel || `Champ ${index + 1}`,
    type: modalFieldTypeFromStyle(rawStyle),
    required: !/optionnel|optional|non|false/i.test(rawRequired || ''),
    placeholder: rawPlaceholder || '',
    options: '',
    value: '',
  };
}

function modalFieldOptions(value, type) {
  const raw = Array.isArray(value) ? value.join('\n') : String(value || '');
  const options = raw.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).slice(0, 25);
  if (options.length) return options;
  if (type === 'select' || type === 'multi') return ['Option 1', 'Option 2'];
  return [];
}

export function normalizeModalFields(raw) {
  const source = Array.isArray(raw)
    ? raw
    : String(raw || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_MODAL_FIELDS)
        .map(parseLegacyModalField);
  if (!source.length) source.push({ label: 'Champ', type: 'short', required: true });
  return source.slice(0, MAX_MODAL_FIELDS).map((entry, index) => {
    const field = typeof entry === 'string' ? parseLegacyModalField(entry, index) : entry || {};
    const type = MODAL_FIELD_TYPES.has(field.type) ? field.type : 'short';
    return {
      id: str(field.id, 60) || `field_${index + 1}`,
      label: str(field.label, 100) || `Champ ${index + 1}`,
      type,
      required: type === 'info' ? false : field.required !== false,
      placeholder: str(field.placeholder, 100),
      options: modalFieldOptions(field.options, type),
      value: str(field.value, 1000),
    };
  });
}

/* ------------------------------------------------------------------ */
/* normalisation des blocs                                             */
/* ------------------------------------------------------------------ */

function normalizeRule(rule) {
  return {
    id: str(rule?.id, 40) || newId(),
    left: str(rule?.left, 120),
    op: Object.prototype.hasOwnProperty.call(OPERATORS, rule?.op) ? rule.op : 'eq',
    right: str(rule?.right, 160),
  };
}

function normalizeVariant(variant) {
  return {
    id: str(variant?.id, 40) || newId(),
    text: str(variant?.text, 50000),
    weight: num(variant?.weight, 1, 100, 1),
    next: str(variant?.next, 40) || null,
  };
}

function normalizeEmbedField(field) {
  return {
    id: str(field?.id, 40) || newId(),
    name: str(field?.name, 256),
    value: str(field?.value, 1024),
    inline: Boolean(field?.inline),
  };
}

function normalizeButton(button, index) {
  return {
    id: str(button?.id, 40) || newId(),
    label: str(button?.label, 60) || `Bouton ${index + 1}`,
    value: str(button?.value, 80),
    style: ['primary', 'secondary', 'success', 'danger', 'link'].includes(button?.style) ? button.style : 'primary',
    emoji: str(button?.emoji, 8),
    disabled: Boolean(button?.disabled),
    url: str(button?.url, 500),
    target: str(button?.target, 60),
    next: str(button?.next, 40) || null,
  };
}

function normalizeBlock(block) {
  const type = Object.prototype.hasOwnProperty.call(BLOCKS, block?.type) ? block.type : 'message';
  const base = {
    id: str(block?.id, 40) || newId(),
    type,
    x: Math.round(num(block?.x, -20000, 20000, 0)),
    y: Math.round(num(block?.y, -20000, 20000, 0)),
    next: str(block?.next, 40) || null,
    customName: str(block?.customName, 40),
  };

  switch (type) {
    case 'message':
      return {
        ...base,
        channel: str(block?.channel, 60),
        text: str(block?.text, 50000),
        variantMode: Boolean(block?.variantMode),
        variants: Array.isArray(block?.variants)
          ? block.variants.map(normalizeVariant)
          : [],
        buttons: Array.isArray(block?.buttons) ? block.buttons.slice(0, MAX_BUTTONS).map(normalizeButton) : [],
        ephemeral: Boolean(block?.ephemeral),
        dm: Boolean(block?.dm),
        reply: Boolean(block?.reply),
        tts: Boolean(block?.tts),
        silent: Boolean(block?.silent),
        suppressEmbeds: Boolean(block?.suppressEmbeds),
        deleteAfter: num(block?.deleteAfter, 0, 300, 0),
      };
    case 'embed':
      return {
        ...base,
        channel: str(block?.channel, 60),
        title: str(block?.title, 120),
        url: str(block?.url, 500),
        description: str(block?.description, 1800),
        ephemeral: Boolean(block?.ephemeral),
        dm: Boolean(block?.dm),
        silent: Boolean(block?.silent),
        deleteAfter: num(block?.deleteAfter, 0, 300, 0),
        color: /^#[0-9a-f]{6}$/i.test(String(block?.color || '')) ? block.color : '#7c5cff',
        footer: str(block?.footer, 80),
        author: str(block?.author, 100),
        authorIcon: str(block?.authorIcon, 500),
        image: str(block?.image, 500),
        thumbnail: str(block?.thumbnail, 500),
        footerIcon: str(block?.footerIcon, 500),
        timestamp: Boolean(block?.timestamp),
        fields: Array.isArray(block?.fields) ? block.fields.slice(0, 5).map(normalizeEmbedField) : [],
      };
    case 'dm':
      return {
        ...base,
        text: str(block?.text, 50000),
        target: str(block?.target, 80),
        embed: Boolean(block?.embed),
        title: str(block?.title, 120),
        description: str(block?.description, 1800),
        color: /^#[0-9a-f]{6}$/i.test(String(block?.color || '')) ? block.color : '#7c5cff',
      };
    case 'button': {
      const source = Array.isArray(block?.buttons) && block.buttons.length
        ? block.buttons
        : [{ label: block?.label, style: block?.style, emoji: block?.emoji, disabled: block?.disabled, url: block?.url, target: block?.target }];
      return {
        ...base,
        channel: str(block?.channel, 60),
        buttons: source.slice(0, MAX_BUTTONS).map(normalizeButton),
      };
    }
    case 'react':
      return { ...base, emoji: str(block?.emoji, 8) || '👍' };
    case 'random': {
      const variants = Array.isArray(block?.variants) && block.variants.length
        ? block.variants.map(normalizeVariant)
        : [normalizeVariant({ text: '' }), normalizeVariant({ text: '' })];
      return {
        ...base,
        channel: str(block?.channel, 60),
        ephemeral: Boolean(block?.ephemeral),
        dm: Boolean(block?.dm),
        silent: Boolean(block?.silent),
        reply: Boolean(block?.reply),
        tts: Boolean(block?.tts),
        suppressEmbeds: Boolean(block?.suppressEmbeds),
        deleteAfter: num(block?.deleteAfter, 0, 300, 0),
        embed: Boolean(block?.embed),
        title: str(block?.title, 120),
        url: str(block?.url, 500),
        description: str(block?.description, 1800),
        color: /^#[0-9a-f]{6}$/i.test(String(block?.color || '')) ? block.color : '#7c5cff',
        footer: str(block?.footer, 80),
        author: str(block?.author, 100),
        authorIcon: str(block?.authorIcon, 500),
        image: str(block?.image, 500),
        thumbnail: str(block?.thumbnail, 500),
        footerIcon: str(block?.footerIcon, 500),
        timestamp: Boolean(block?.timestamp),
        fields: Array.isArray(block?.fields) ? block.fields.slice(0, 5).map(normalizeEmbedField) : [],
        variants,
      };
    }
    case 'role':
      return {
        ...base,
        action: block?.action === 'remove' ? 'remove' : 'add',
        role: str(block?.role, 60),
        duration: num(block?.duration, 0, 525600, 0),
        durationUnit: ['minutes', 'hours', 'days'].includes(block?.durationUnit) ? block.durationUnit : 'minutes',
        reason: str(block?.reason, 200),
      };
    case 'channel':
      return {
        ...base,
        name: str(block?.name, 60).replace(/[^\w\s-]/g, '') || 'nouveau-salon',
        kind: ['text', 'voice', 'forum'].includes(block?.kind) ? block.kind : 'text',
        category: str(block?.category, 60),
        topic: str(block?.topic, 200),
        nsfw: Boolean(block?.nsfw),
        slowmode: num(block?.slowmode, 0, 21600, 0),
      };
    case 'pin':
      return { ...base, unpin: Boolean(block?.unpin) };
    case 'delete':
      return { ...base, count: num(block?.count, 1, 100, 1), channel: str(block?.channel, 60) };
    case 'setvar':
      return { ...base, name: str(block?.name, 40).replace(/[^\w.-]/g, ''), value: str(block?.value, 300) };
    case 'counter':
      return {
        ...base,
        name: str(block?.name, 40).replace(/[^\w.-]/g, '') || 'compteur',
        op: ['add', 'sub', 'mul', 'set'].includes(block?.op) ? block.op : 'add',
        value: str(block?.value, 40) || '1',
      };
    case 'condition':
      return {
        ...base,
        mode: block?.mode === 'any' ? 'any' : 'all',
        rules: Array.isArray(block?.rules) ? block.rules.slice(0, 10).map(normalizeRule) : [],
        thenId: str(block?.thenId, 40) || null,
        elseId: str(block?.elseId, 40) || null,
      };
    case 'wait':
      return { ...base, seconds: num(block?.seconds, 1, 30, 3) };
    case 'timer': {
      if (['start', 'stop'].includes(block?.action)) {
        return normalizeBlock({ ...block, type: 'chrono' });
      }
      const unit = ['seconds', 'minutes', 'hours'].includes(block?.unit) ? block.unit : 'minutes';
      const max = unit === 'hours' ? 24 : unit === 'minutes' ? 1440 : 86400;
      return {
        ...base,
        action: 'countdown',
        channel: str(block?.channel, 60),
        duration: num(block?.duration, 1, max, 5),
        unit,
        startText: str(block?.startText, 1000),
        endText: str(block?.endText, 1000),
        wait: Boolean(block?.wait),
        ephemeral: Boolean(block?.ephemeral),
        dm: Boolean(block?.dm),
        silent: Boolean(block?.silent),
      };
    }
    case 'chrono':
      return {
        ...base,
        action: ['start', 'stop', 'service'].includes(block?.action) ? block.action : 'start',
        channel: str(block?.channel, 60),
        variable: str(block?.variable, 40).replace(/[^\w.-]/g, '') || 'chrono_start',
        startText: str(block?.startText, 1000),
        stopText: str(block?.stopText, 1000),
        serviceText: str(block?.serviceText, 1000),
        emptyServiceText: str(block?.emptyServiceText, 1000),
        ephemeral: Boolean(block?.ephemeral),
        dm: Boolean(block?.dm),
        silent: Boolean(block?.silent),
      };
    case 'serviceStart':
      return {
        ...base,
        channel: str(block?.channel, 60),
        startText: str(block?.startText, 1000),
        alreadyText: str(block?.alreadyText, 1000),
        ephemeral: Boolean(block?.ephemeral),
        dm: Boolean(block?.dm),
        silent: Boolean(block?.silent),
      };
    case 'serviceStop':
      return {
        ...base,
        channel: str(block?.channel, 60),
        stopText: str(block?.stopText, 1000),
        emptyText: str(block?.emptyText, 1000),
        ephemeral: Boolean(block?.ephemeral),
        dm: Boolean(block?.dm),
        silent: Boolean(block?.silent),
      };
    case 'servicePenalty':
      return {
        ...base,
        channel: str(block?.channel, 60),
        title: str(block?.title, 45) || 'Pénalité de service',
        penaltyText: str(block?.penaltyText, 1000),
      };
    case 'serviceLeaderboard':
      return {
        ...base,
        channel: str(block?.channel, 60),
        title: str(block?.title, 80) || 'Classement du service',
        top: num(block?.top, 1, 25, 10),
        ephemeral: Boolean(block?.ephemeral),
        dm: Boolean(block?.dm),
      };
    case 'serviceOnline':
      return {
        ...base,
        channel: str(block?.channel, 60),
        title: str(block?.title, 80) || '🟢 Chrono en ligne',
        emptyText: str(block?.emptyText, 500) || 'Personne n’est en service pour le moment.',
        interval: Number(block?.interval) === 30 ? 30 : 60,
        maxEntries: num(block?.maxEntries, 1, 50, 25),
      };
    case 'serviceConfig':
      return {
        ...base,
        channel: str(block?.channel, 60),
        period: block?.period === 'month' ? 'month' : 'week',
        resetDay: num(block?.resetDay, 1, 7, 1),
        resetHour: num(block?.resetHour, 0, 23, 0),
        timezone: str(block?.timezone, 60) || 'Europe/Paris',
        message: str(block?.message, 1000),
        ephemeral: Boolean(block?.ephemeral),
        dm: Boolean(block?.dm),
        silent: Boolean(block?.silent),
      };
    case 'serviceReset':
      return {
        ...base,
        channel: str(block?.channel, 60),
        message: str(block?.message, 1000),
        ephemeral: Boolean(block?.ephemeral),
        dm: Boolean(block?.dm),
        silent: Boolean(block?.silent),
      };
    case 'cooldown':
      return {
        ...base,
        seconds: num(block?.seconds, 1, 3600, 10),
        scope: block?.scope === 'channel' ? 'channel' : 'member',
      };
    case 'typing':
      return { ...base, seconds: num(block?.seconds, 1, 15, 2) };
    case 'webhook':
      return {
        ...base,
        method: ['POST', 'GET', 'PATCH'].includes(block?.method) ? block.method : 'POST',
        url: str(block?.url, 300),
        body: str(block?.body, 600),
      };
    case 'log':
      return { ...base, text: str(block?.text, 300) };
    case 'note':
      return { ...base, title: str(block?.title, 80) || 'Note', text: str(block?.text, 4000) };
    case 'reply':
      return {
        ...base,
        channel: str(block?.channel, 60),
        text: str(block?.text, 50000),
        ping: block?.ping === undefined ? true : Boolean(block.ping),
        ephemeral: Boolean(block?.ephemeral),
        dm: Boolean(block?.dm),
        deleteAfter: num(block?.deleteAfter, 0, 300, 0),
      };
    case 'edit':
      return {
        ...base,
        messageRef: str(block?.messageRef, 60) || 'dernier',
        text: str(block?.text, 50000),
        embed: Boolean(block?.embed),
        title: str(block?.title, 120),
        description: str(block?.description, 1800),
        color: /^#[0-9a-f]{6}$/i.test(String(block?.color || '')) ? block.color : '#7c5cff',
      };
    case 'thread':
      return {
        ...base,
        name: str(block?.name, 80) || 'discussion',
        archive: ['60', '1440', '4320', '10080'].includes(String(block?.archive)) ? String(block.archive) : '1440',
        private: Boolean(block?.private),
      };
    case 'forum':
      return {
        ...base,
        channel: str(block?.channel, 60),
        title: str(block?.title, 120) || 'Nouveau post',
        content: str(block?.content, 1800),
        tags: str(block?.tags, 200),
      };
    case 'forumAction':
      return {
        ...base,
        action: ['message', 'close'].includes(block?.action) ? block.action : 'message',
        channel: str(block?.channel, 60),
        post: str(block?.post, 120),
        content: str(block?.content, 1800),
        reason: str(block?.reason, 200),
      };
    case 'forumDelete':
      return {
        ...base,
        channel: str(block?.channel, 60),
        post: str(block?.post, 120),
        message: str(block?.message, 120) || 'last',
      };
    case 'ai':
      return {
        ...base,
        channel: str(block?.channel, 60),
        prompt: str(block?.prompt, 1200),
        provider: ['auto', 'openai', 'local'].includes(block?.provider) ? block.provider : 'auto',
        model: ['gpt-4o-mini', 'gpt-4o'].includes(block?.model) ? block.model : 'gpt-4o-mini',
        maxTokens: num(block?.maxTokens, 50, 4000, 300),
        variable: str(block?.variable, 40).replace(/[^\w.-]/g, '') || 'ia',
      };
    case 'image':
      return { ...base, channel: str(block?.channel, 60), url: str(block?.url, 500), alt: str(block?.alt, 200) };
    case 'music':
      return {
        ...base,
        action: ['play', 'stop'].includes(block?.action) ? block.action : 'play',
        mode: ['voice', 'personal'].includes(block?.mode) ? block.mode : 'voice',
        channel: str(block?.channel, 60),
        url: str(block?.url, 500),
        title: str(block?.title, 120),
        volume: num(block?.volume, 0, 200, 80),
        loop: Boolean(block?.loop),
      };
    case 'poll':
      return {
        ...base,
        channel: str(block?.channel, 60),
        question: str(block?.question, 200) || 'Votre avis ?',
        options: str(block?.options, 800),
        duration: num(block?.duration, 1, 168, 24),
        multiple: Boolean(block?.multiple),
      };
    case 'select':
      return {
        ...base,
        channel: str(block?.channel, 60),
        placeholder: str(block?.placeholder, 80) || 'Choisissez…',
        options: str(block?.options, 800),
        min: num(block?.min, 1, 25, 1),
        max: num(block?.max, 1, 25, 1),
      };
    case 'modal':
      return {
        ...base,
        channel: str(block?.channel, 60),
        title: str(block?.title, 80) || 'Formulaire',
        fields: normalizeModalFields(block?.fields),
        submitLabel: str(block?.submitLabel, 40) || 'Envoyer',
      };
    case 'giveaway':
      return {
        ...base,
        channel: str(block?.channel, 60),
        prize: str(block?.prize, 120) || 'Un mois de Nitro',
        duration: num(block?.duration, 1, 720, 24),
        winners: num(block?.winners, 1, 50, 1),
        emoji: str(block?.emoji, 8) || '🎉',
      };
    case 'await':
      return {
        ...base,
        kind: ['button', 'reaction', 'message'].includes(block?.kind) ? block.kind : 'button',
        timeout: num(block?.timeout, 5, 3600, 60),
      };
    case 'automationRun':
      return {
        ...base,
        automationType: str(block?.automationType, 40) || 'autoMod',
        notify: block?.notify === undefined ? true : Boolean(block.notify),
      };
    case 'accountCheck':
      return {
        ...base,
        minAgeDays: num(block?.minAgeDays, 0, 365, 7),
        requireAvatar: Boolean(block?.requireAvatar),
        blockBots: block?.blockBots !== false,
        failAction: block?.failAction === 'continue' ? 'continue' : 'stop',
        failMessage: str(block?.failMessage, 1000),
        variable: str(block?.variable, 40).replace(/[^\w.-]/g, '') || 'account_ok',
        channel: str(block?.channel, 60),
      };
    case 'moderation': {
      const actions = [
        'warn', 'timeout', 'kick', 'ban', 'softban', 'unban', 'purge', 'slowmode',
        'lock', 'unlock', 'roleAdd', 'roleRemove', 'nickname', 'voiceMute', 'voiceUnmute',
        'voiceDeafen', 'voiceUndeafen', 'voiceMove', 'dm', 'log',
      ];
      return {
        ...base,
        action: actions.includes(block?.action) ? block.action : 'warn',
        target: str(block?.target, 80),
        duration: num(block?.duration, 1, 10080, 10),
        durationUnit: ['minutes', 'hours', 'days'].includes(block?.durationUnit) ? block.durationUnit : 'minutes',
        reason: str(block?.reason, 200),
        deleteDays: num(block?.deleteDays, 0, 7, 0),
        deleteMessages: Boolean(block?.deleteMessages),
        amount: num(block?.amount, 1, 100, 10),
        seconds: num(block?.seconds, 0, 21600, 10),
        role: str(block?.role, 60),
        channel: str(block?.channel, 60),
        nickname: str(block?.nickname, 32),
        notify: block?.notify === undefined ? true : Boolean(block.notify),
        notifyMessage: str(block?.notifyMessage, 1000),
        logChannel: str(block?.logChannel, 60),
        evidence: str(block?.evidence, 300),
      };
    }
    case 'timeout':
      return {
        ...base,
        duration: num(block?.duration, 1, 10080, 10),
        reason: str(block?.reason, 200),
      };
    case 'kick':
      return { ...base, reason: str(block?.reason, 200) };
    case 'ban':
      return { ...base, reason: str(block?.reason, 200), deleteDays: num(block?.deleteDays, 0, 7, 0) };
    case 'nickname':
      return { ...base, nickname: str(block?.nickname, 32) };
    case 'move':
      return { ...base, channel: str(block?.channel, 60) };
    case 'invite':
      return {
        ...base,
        action: ['create', 'view'].includes(block?.action) ? block.action : 'create',
        channel: str(block?.channel, 60),
        invite: str(block?.invite, 200),
        maxUses: num(block?.maxUses, 0, 100, 0),
        maxAge: num(block?.maxAge, 0, 720, 24),
        temporary: Boolean(block?.temporary),
        delivery: ['channel', 'dm', 'none'].includes(block?.delivery) ? block.delivery : 'channel',
        message: str(block?.message, 500) || 'Invitation : {{invite}}',
        variable: str(block?.variable, 40).replace(/[^\w.-]/g, '') || 'invite',
      };
    case 'ticket':
      return {
        ...base,
        action: ['open', 'claim', 'close'].includes(block?.action) ? block.action : 'open',
        category: str(block?.category, 60),
        reason: str(block?.reason, 200),
        staffRole: str(block?.staffRole, 60),
        logChannel: str(block?.logChannel, 60),
        welcomeMessage: str(block?.welcomeMessage, 1000),
        maxOpen: num(block?.maxOpen, 1, 10, 1),
        namePrefix: str(block?.namePrefix, 20) || 'ticket',
        buttons: (Array.isArray(block?.buttons) ? block.buttons : []).slice(0, MAX_BUTTONS).map(normalizeButton),
      };
    case 'level':
      return { ...base, amount: num(block?.amount, -10000, 10000, 10), variable: str(block?.variable, 40).replace(/[^\w.-]/g, '') || 'xp' };
    case 'randomNumber':
      return {
        ...base,
        min: num(block?.min, -100000, 100000, 1),
        max: num(block?.max, -100000, 100000, 100),
        variable: str(block?.variable, 40).replace(/[^\w.-]/g, '') || 'nombre',
      };
    case 'string':
      return {
        ...base,
        operation: ['upper', 'lower', 'trim', 'reverse', 'length', 'replace'].includes(block?.operation) ? block.operation : 'upper',
        source: str(block?.source, 500),
        search: str(block?.search, 200),
        replace: str(block?.replace, 200),
        variable: str(block?.variable, 40).replace(/[^\w.-]/g, '') || 'texte',
      };
    case 'json':
      return {
        ...base,
        source: str(block?.source, 2000),
        path: str(block?.path, 200),
        variable: str(block?.variable, 40).replace(/[^\w.-]/g, '') || 'valeur',
      };
    case 'date':
      return {
        ...base,
        format: str(block?.format, 60) || 'dd/MM/yyyy HH:mm',
        variable: str(block?.variable, 40).replace(/[^\w.-]/g, '') || 'date',
      };
    case 'stop':
      return { ...base, reason: str(block?.reason, 200) };
    case 'database':
      return {
        ...base,
        action: block?.action === 'get' ? 'get' : 'set',
        key: str(block?.key, 60).replace(/[^\w.-]/g, '') || 'cle',
        value: str(block?.value, 500),
        variable: str(block?.variable, 40).replace(/[^\w.-]/g, '') || 'valeur',
      };
    case 'captcha':
      return {
        ...base,
        kind: ['button', 'modal'].includes(block?.kind) ? block.kind : 'button',
        timeout: num(block?.timeout, 10, 3600, 120),
        role: str(block?.role, 60),
      };
    default:
      return { ...base, text: '' };
  }
}

/* ------------------------------------------------------------------ */
/* arbre (ancien format) -> graphe                                     */
/* ------------------------------------------------------------------ */

function treeToGraph(items) {
  const blocks = [];

  const link = (tail, targetId) => {
    if (!tail) return;
    if (tail.type === 'condition') {
      if (!tail.thenId) tail.thenId = targetId;
      if (!tail.elseId) tail.elseId = targetId;
      return;
    }
    tail.next = targetId;
  };

  const walk = (list) => {
    let first = null;
    let tails = [];

    for (const item of list || []) {
      const node = normalizeBlock(item);
      if (first) tails.forEach((tail) => link(tail, node.id));
      else first = node.id;

      if (node.type === 'condition' && (Array.isArray(item?.then) || Array.isArray(item?.else))) {
        const thenBranch = walk(item.then || []);
        const elseBranch = walk(item.else || []);
        node.thenId = thenBranch.first;
        node.elseId = elseBranch.first;
        blocks.push(node);
        tails = [
          ...(thenBranch.first ? thenBranch.tails : [node]),
          ...(elseBranch.first ? elseBranch.tails : [node]),
        ];
      } else {
        blocks.push(node);
        tails = [node];
      }
    }

    return { first, tails };
  };

  const result = walk(items);
  return { blocks, start: result.first };
}

/* ------------------------------------------------------------------ */
/* disposition automatique                                             */
/* ------------------------------------------------------------------ */

const COLUMN = 340;
const ROW = 240;

function autoLayout(blocks, start) {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const levels = new Map();
  const queue = [];
  if (start && byId.has(start)) {
    levels.set(start, 0);
    queue.push(start);
  }

  while (queue.length) {
    const id = queue.shift();
    const block = byId.get(id);
    if (!block) continue;
    const targets = block.type === 'condition' ? [block.thenId, block.elseId] : [block.next];
    for (const target of targets) {
      if (target && byId.has(target) && !levels.has(target)) {
        levels.set(target, levels.get(id) + 1);
        queue.push(target);
      }
    }
  }

  let maxLevel = 0;
  for (const level of levels.values()) maxLevel = Math.max(maxLevel, level);
  const used = new Map();
  const orphans = [];

  for (const block of blocks) {
    if (!levels.has(block.id)) {
      orphans.push(block);
      continue;
    }
    const level = levels.get(block.id);
    const index = used.get(level) || 0;
    used.set(level, index + 1);
    block.x = 80 + level * COLUMN;
    block.y = 80 + index * ROW;
  }

  orphans.forEach((block, index) => {
    block.x = 80 + (index % 3) * COLUMN;
    block.y = 80 + (maxLevel + 2) * ROW + Math.floor(index / 3) * ROW;
  });
}

/* ------------------------------------------------------------------ */
/* graphe : validation des liens                                       */
/* ------------------------------------------------------------------ */

function normalizeGraph(rawBlocks, rawStart) {
  const source = Array.isArray(rawBlocks) ? rawBlocks : [];
  const hasBranches = source.some((block) => Array.isArray(block?.then) || Array.isArray(block?.else));
  const hasGraphKeys = source.some(
    (block) => block && ('next' in block || 'thenId' in block || 'elseId' in block),
  );
  const isTree = hasBranches || (!hasGraphKeys && source.length > 1);
  const graph = isTree
    ? treeToGraph(source)
    : { blocks: source.slice(0, MAX_BLOCKS).map(normalizeBlock), start: rawStart };
  const ids = new Set(graph.blocks.map((block) => block.id));

  for (const block of graph.blocks) {
    if (block.type === 'condition') {
      block.thenId = ids.has(block.thenId) ? block.thenId : null;
      block.elseId = ids.has(block.elseId) ? block.elseId : null;
      delete block.next;
    } else {
      block.next = ids.has(block.next) ? block.next : null;
      delete block.thenId;
      delete block.elseId;
    }
    if (block.next === block.id || block.thenId === block.id || block.elseId === block.id) {
      block.next = null;
      block.thenId = null;
      block.elseId = null;
    }
    for (const button of block.buttons || []) {
      button.next = ids.has(button.next) && button.next !== block.id ? button.next : null;
    }
    for (const variant of block.variants || []) {
      variant.next = ids.has(variant.next) && variant.next !== block.id ? variant.next : null;
    }
  }

  let start = ids.has(graph.start) ? graph.start : null;
  if (!start && graph.blocks.length) {
    const incoming = new Set(
      graph.blocks.flatMap((block) => [
        block.next,
        block.thenId,
        block.elseId,
        ...(block.buttons || []).map((button) => button.next),
        ...(block.variants || []).map((variant) => variant.next),
      ]).filter(Boolean),
    );
    start = (graph.blocks.find((block) => !incoming.has(block.id)) || graph.blocks[0]).id;
  }

  return { blocks: graph.blocks, start };
}

function normalizeTrigger(trigger) {
  return {
    type: Object.prototype.hasOwnProperty.call(TRIGGERS, trigger?.type) ? trigger.type : 'slash',
    command: str(trigger?.command, 40).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '') || 'mon-flux',
    keyword: str(trigger?.keyword, 120),
    match: ['contains', 'exact', 'startsWith'].includes(trigger?.match) ? trigger.match : 'contains',
    channel: str(trigger?.channel, 60),
    category: str(trigger?.category, 60),
    schedule: str(trigger?.schedule, 60),
    emoji: str(trigger?.emoji, 8),
    botName: str(trigger?.botName, 60),
    automationType: str(trigger?.automationType, 40),
  };
}

function normalizeVariable(variable) {
  return {
    id: str(variable?.id, 40) || newId(),
    name: str(variable?.name, 40).replace(/[^\w.-]/g, ''),
    value: str(variable?.value, 300),
  };
}

export function describeTrigger(trigger) {
  switch (trigger.type) {
    case 'slash':
      return `Déclenché par /${trigger.command || 'commande'}`;
    case 'keyword':
      return `Déclenché quand un message ${
        trigger.match === 'exact' ? 'est exactement' : trigger.match === 'startsWith' ? 'commence par' : 'contient'
      } « ${trigger.keyword || '…'} »`;
    case 'join':
      return 'Déclenché à l’arrivée d’un membre';
    case 'leave':
      return 'Déclenché au départ d’un membre';
    case 'reaction':
      return `Déclenché par la réaction ${trigger.emoji || '…'}`;
    case 'button':
      return 'Déclenché par un bouton';
    case 'schedule':
      return `Planifié : ${trigger.schedule || 'à définir'}`;
    case 'dm':
      return 'Déclenché par un message privé';
    case 'botJoin':
      return trigger.botName ? `Déclenché à l’arrivée du bot « ${trigger.botName} »` : 'Déclenché à l’arrivée d’un bot';
    case 'booster':
      return 'Déclenché quand un membre booste le serveur';
    case 'automation':
      return trigger.automationType
        ? `Déclenché par l’automatisation « ${trigger.automationType} »`
        : 'Déclenché par une automatisation';
    default:
      return 'Déclencheur à définir';
  }
}

export function sanitizeFlow(input = {}, previous = null) {
  const { blocks, start } = normalizeGraph(
    Array.isArray(input.blocks) ? input.blocks : previous?.blocks,
    input.start ?? previous?.start,
  );

  if (blocks.some((block) => !block.x && !block.y)) autoLayout(blocks, start);

  const flow = {
    id: previous?.id || str(input.id, 40) || newId(),
    serverId: str(input.serverId, 60) || previous?.serverId || '',
    name: str(input.name, 60) || previous?.name || 'Nouveau flux',
    description: str(input.description, 200),
    enabled: input.enabled === undefined ? previous?.enabled ?? true : Boolean(input.enabled),
    trigger: normalizeTrigger(input.trigger ?? previous?.trigger),
    canvasStyle: ['dots', 'grid', 'aurora', 'plain'].includes(input.canvasStyle)
      ? input.canvasStyle
      : ['dots', 'grid', 'aurora', 'plain'].includes(previous?.canvasStyle)
        ? previous.canvasStyle
        : 'dots',
    variables: (Array.isArray(input.variables) ? input.variables : previous?.variables || [])
      .slice(0, 20)
      .map(normalizeVariable)
      .filter((variable) => variable.name),
    blocks,
    start,
    runs: previous?.runs || 0,
    lastRunAt: previous?.lastRunAt || null,
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!flow.description) flow.description = describeTrigger(flow.trigger);
  return flow;
}

/* ------------------------------------------------------------------ */
/* gabarits                                                            */
/* ------------------------------------------------------------------ */

export function flowTemplate(template, botName = 'KyllBot') {
  const base = { name: 'Nouveau flux', description: '', enabled: true, variables: [], blocks: [] };

  if (template === 'welcome') {
    return sanitizeFlow({
      ...base,
      name: 'Bienvenue',
      trigger: { type: 'join' },
      blocks: [
        { type: 'typing', seconds: 2 },
        { type: 'message', channel: '#bienvenue', text: 'Bienvenue {{user.mention}} sur **{{server.name}}** !' },
        {
          type: 'condition',
          mode: 'all',
          rules: [{ left: '{{user.roles}}', op: 'contains', right: 'Invité' }],
          then: [
            { type: 'message', channel: '#bienvenue', text: 'Pense à passer te présenter dans #présentations.' },
            { type: 'role', action: 'add', role: 'Membre' },
            { type: 'dm', text: 'Salut {{user.name}}, bienvenue sur {{server.name}} !' },
          ],
          else: [{ type: 'message', channel: '#bienvenue', text: 'Bon retour parmi nous !' }],
        },
        { type: 'react', emoji: '👋' },
      ],
    });
  }

  if (template === 'ticket') {
    return sanitizeFlow({
      ...base,
      name: 'Ouverture de ticket',
      trigger: { type: 'slash', command: 'ticket' },
      blocks: [
        { type: 'message', text: 'Je crée ton ticket privé, {{user.name}}…', ephemeral: true },
        {
          type: 'ticket',
          action: 'open',
          category: 'Support',
          reason: 'Demande de support',
          staffRole: 'Support',
          logChannel: '#logs',
          welcomeMessage: 'Ton ticket est ouvert. Décris ton problème, un membre du staff arrive.',
          maxOpen: 1,
          namePrefix: 'ticket',
        },
      ],
    });
  }

  if (template === 'servicechrono') {
    return sanitizeFlow({
      ...base,
      name: 'Chrono du service actuel',
      trigger: { type: 'slash', command: 'chrono' },
      blocks: [
        {
          type: 'chrono',
          action: 'service',
          serviceText: '⏱️ {{member}} est en service depuis {{elapsed}}.',
          emptyServiceText: '⚠️ Aucun service en cours pour {{member}}.',
        },
      ],
    });
  }

  if (template === 'serviceonline') {
    return sanitizeFlow({
      ...base,
      name: 'Chrono en ligne',
      trigger: { type: 'slash', command: 'chrono-en-ligne' },
      blocks: [
        {
          type: 'serviceOnline',
          title: '🟢 Chrono en ligne',
          emptyText: 'Personne n’est en service pour le moment.',
          interval: 60,
          maxEntries: 25,
        },
      ],
    });
  }

  if (template === 'quiz') {
    return sanitizeFlow({
      ...base,
      name: 'Quiz éclair',
      trigger: { type: 'keyword', keyword: 'quiz', match: 'exact' },
      variables: [{ name: 'score', value: '0' }],
      blocks: [
        {
          type: 'random',
          variants: [
            { text: 'Question : quelle commande affiche ton niveau ?', weight: 1 },
            { text: 'Question : quel rôle obtient-on à 10 messages ?', weight: 1 },
            { text: 'Question : combien de modules dans la formation Discord ?', weight: 1 },
          ],
        },
        { type: 'wait', seconds: 3 },
        {
          type: 'condition',
          mode: 'all',
          rules: [{ left: '{{message}}', op: 'contains', right: 'rank' }],
          then: [
            { type: 'counter', name: 'score', op: 'add', value: '1' },
            { type: 'message', text: 'Bonne réponse ! Score : {{score}}/1' },
          ],
          else: [{ type: 'message', text: 'Raté, la réponse était `/rank`.' }],
        },
      ],
    });
  }

  if (template === 'moderation') {
    return sanitizeFlow({
      ...base,
      name: 'Filtre anti-spam',
      trigger: { type: 'keyword', keyword: 'http', match: 'contains' },
      blocks: [
        { type: 'cooldown', seconds: 15, scope: 'member' },
        {
          type: 'condition',
          mode: 'any',
          rules: [
            { left: '{{message}}', op: 'contains', right: 'discord.gg' },
            { left: '{{message}}', op: 'contains', right: 'http' },
          ],
          then: [
            { type: 'delete', count: 1 },
            { type: 'message', text: '{{user.mention}}, les liens ne sont pas autorisés ici.', ephemeral: true },
            { type: 'role', action: 'remove', role: 'Membre' },
            { type: 'log', text: 'Lien supprimé pour {{user.name}}' },
          ],
          else: [],
        },
      ],
    });
  }

  if (template === 'support') {
    return sanitizeFlow({
      ...base,
      name: 'Relance support',
      trigger: { type: 'schedule', schedule: 'tous les jours 09:00' },
      blocks: [
        { type: 'webhook', method: 'POST', url: 'https://api.exemple.com/relances', body: '{"membre":"{{user.name}}"}' },
        { type: 'dm', text: 'Petit rappel : ton ticket est toujours ouvert, {{user.name}}.' },
        { type: 'wait', seconds: 5 },
        { type: 'pin', unpin: false },
      ],
    });
  }

  if (template === 'botjoin') {
    return sanitizeFlow({
      ...base,
      name: 'Arrivée d’un bot',
      trigger: { type: 'botJoin' },
      blocks: [
        { type: 'message', channel: '#logs', text: 'Le bot **{{bot.name}}** vient de rejoindre **{{server.name}}**.' },
        { type: 'role', action: 'add', role: 'Bots' },
        { type: 'log', text: 'Bot {{bot.name}} ajouté au serveur' },
      ],
    });
  }

  if (template === 'verification') {
    return sanitizeFlow({
      ...base,
      name: 'Vérification des membres',
      trigger: { type: 'join' },
      blocks: [
        { type: 'message', channel: '#bienvenue', text: 'Bienvenue {{user.mention}} ! Clique sur **Se vérifier** pour accéder au serveur.' },
        { type: 'button', label: 'Se vérifier', style: 'success', target: 'verification' },
        { type: 'await', kind: 'button', timeout: 120 },
        { type: 'modal', title: 'Vérification', fields: 'Âge | court | requis\nPays | court | requis', submitLabel: 'Valider' },
        { type: 'role', action: 'add', role: 'Vérifié' },
        { type: 'log', text: '{{user.name}} vérifié' },
      ],
    });
  }

  if (template === 'booster') {
    return sanitizeFlow({
      ...base,
      name: 'Remerciement boost',
      trigger: { type: 'booster' },
      blocks: [
        { type: 'message', channel: '#général', text: 'Merci {{user.mention}} pour ton boost sur **{{server.name}}** ! 💜' },
      ],
    });
  }

  if (template === 'botguard') {
    return sanitizeFlow({
      ...base,
      name: 'Bouclier anti-bots',
      description: 'Vérifie chaque arrivée et isole les comptes suspects.',
      trigger: { type: 'join' },
      blocks: [
        {
          type: 'accountCheck',
          minAgeDays: 3,
          requireAvatar: true,
          blockBots: true,
          failAction: 'continue',
          failMessage: '🚫 Ton compte est trop récent ou suspect. Contacte le staff.',
          variable: 'account_ok',
          channel: '#logs',
        },
        {
          type: 'condition',
          mode: 'all',
          rules: [{ left: '{{account_ok}}', op: 'eq', right: 'non' }],
          then: [
            { type: 'moderation', action: 'timeout', duration: 60, durationUnit: 'minutes', reason: 'Compte suspect — bouclier anti-bots', logChannel: '#logs' },
            { type: 'log', text: 'Bouclier anti-bots : {{user.name}} isolé ({{account_reasons}}).' },
          ],
          else: [
            { type: 'message', channel: '#bienvenue', text: 'Bienvenue {{user.mention}} ! Ton compte est vérifié. 🎉' },
          ],
        },
      ],
    });
  }

  if (template === 'automation') {
    return sanitizeFlow({
      ...base,
      name: 'Réaction automatisation',
      trigger: { type: 'automation', automationType: 'antiRaid' },
      blocks: [
        { type: 'log', text: 'Automatisation {{automation}} déclenchée.' },
        { type: 'message', channel: '#logs', text: '🛡️ Automatisation **{{automation}}** déclenchée sur {{server.name}}.' },
      ],
    });
  }

  if (template === 'giveaway') {
    return sanitizeFlow({
      ...base,
      name: 'Giveaway',
      trigger: { type: 'slash', command: 'giveaway' },
      blocks: [
        { type: 'giveaway', prize: 'Un mois de Nitro', duration: 24, winners: 1, emoji: '🎉' },
        { type: 'poll', question: 'Participer ?', options: 'Oui\nNon', duration: 24 },
        { type: 'await', kind: 'reaction', timeout: 300 },
        { type: 'message', text: 'Le tirage aura lieu dans 24 h, {{user.mention}} !' },
      ],
    });
  }

  return sanitizeFlow({ ...base, trigger: { type: 'slash', command: 'mon-flux' } });
}

/* ------------------------------------------------------------------ */
/* exécution                                                           */
/* ------------------------------------------------------------------ */

const VAR_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g;

function resolvePath(expr, ctx, vars) {
  if (expr === 'user.name') return ctx.user.name;
  if (expr === 'user.id') return ctx.user.id;
  if (expr === 'user.mention') return ctx.user.mention || `<@${ctx.user.id || ctx.user.name}>`;
  if (expr === 'user.roles') return ctx.user.roles.join(', ');
  if (expr === 'server.name' || expr === 'server') return ctx.server;
  if (expr === 'channel' || expr === 'channel.name') return ctx.channel;
  if (expr === 'message') return ctx.message;
  if (expr === 'bot.name' || expr === 'bot') return ctx.bot;
  if (Object.prototype.hasOwnProperty.call(vars, expr)) return vars[expr];
  return `{{${expr}}}`;
}

function interpolate(text, ctx, vars) {
  return String(text ?? '').replace(VAR_PATTERN, (_, expr) => resolvePath(expr, ctx, vars));
}

function resolveOperand(value, ctx, vars) {
  const raw = String(value ?? '').trim();
  const single = raw.match(/^\{\{\s*([\w.-]+)\s*\}\}$/);
  return single ? resolvePath(single[1], ctx, vars) : interpolate(raw, ctx, vars);
}

function evaluateRule(rule, ctx, vars) {
  const left = resolveOperand(rule.left, ctx, vars);
  const right = resolveOperand(rule.right, ctx, vars);
  const a = String(left).toLowerCase();
  const b = String(right).toLowerCase();
  const numA = Number(a.replace(',', '.'));
  const numB = Number(b.replace(',', '.'));

  let pass = false;
  switch (rule.op) {
    case 'eq': pass = a === b; break;
    case 'neq': pass = a !== b; break;
    case 'contains': pass = a.includes(b); break;
    case 'notContains': pass = !a.includes(b); break;
    case 'startsWith': pass = a.startsWith(b); break;
    case 'endsWith': pass = a.endsWith(b); break;
    case 'gt': pass = Number.isFinite(numA) && Number.isFinite(numB) && numA > numB; break;
    case 'lt': pass = Number.isFinite(numA) && Number.isFinite(numB) && numA < numB; break;
    case 'gte': pass = Number.isFinite(numA) && Number.isFinite(numB) && numA >= numB; break;
    case 'lte': pass = Number.isFinite(numA) && Number.isFinite(numB) && numA <= numB; break;
    case 'hasRole': pass = ctx.user.roles.some((role) => role.toLowerCase() === b); break;
    case 'chance': pass = Math.random() * 100 < (Number.isFinite(numB) ? numB : 50); break;
    default: pass = false;
  }

  return { pass, left: String(left), op: rule.op, right: String(right) };
}

function pickVariant(variants) {
  const total = variants.reduce((sum, variant) => sum + variant.weight, 0);
  let roll = Math.random() * total;
  for (const variant of variants) {
    roll -= variant.weight;
    if (roll <= 0) return variant;
  }
  return variants[variants.length - 1];
}

export async function runFlow(flow, input = {}) {
  const aiHistory = Array.isArray(input.aiHistory) ? input.aiHistory : [];
  const ctx = {
    user: {
      name: str(input.user?.name, 40) || 'Alex',
      id: str(input.user?.id, 40),
      mention: str(input.user?.mention, 60),
      roles: Array.isArray(input.user?.roles) ? input.user.roles.map((role) => str(role, 40)).filter(Boolean) : ['Membre'],
      createdTimestamp: Number(input.user?.createdTimestamp) || 0,
      bot: Boolean(input.user?.bot),
      hasAvatar: Boolean(input.user?.hasAvatar),
    },
    server: str(input.server, 60) || 'Mon serveur',
    channel: str(input.channel, 60) || '#général',
    message: str(input.message, 300),
    bot: str(input.bot, 60) || 'KyllBot',
  };

  const vars = {};
  for (const variable of flow.variables || []) vars[variable.name] = variable.value;
  if (input.vars && typeof input.vars === 'object') {
    for (const [key, value] of Object.entries(input.vars)) vars[str(key, 40)] = str(value, 300);
  }

  const trace = [];
  const outputs = [];
  const byId = new Map((flow.blocks || []).map((block) => [block.id, block]));
  let current = input.startBlock && byId.has(input.startBlock) ? input.startBlock : flow.start && byId.has(flow.start) ? flow.start : null;
  let steps = 0;
  const started = Date.now();
  const visited = new Map();

  while (current && steps < MAX_STEPS) {
    const block = byId.get(current);
    if (!block) break;
    steps += 1;
    visited.set(current, (visited.get(current) || 0) + 1);
    if (visited.get(current) > 12) {
      trace.push({
        id: current,
        type: 'loop',
        status: 'error',
        title: 'Boucle arrêtée',
        detail: 'Ce bloc a été exécuté plus de 12 fois, le flux est interrompu.',
      });
      break;
    }

    const entry = {
      id: block.id,
      type: block.type,
      status: 'ok',
      title: BLOCKS[block.type]?.label || block.type,
      detail: '',
    };
    let next = block.type === 'condition' ? null : block.next;

    switch (block.type) {
      case 'message': {
        const variant = block.variantMode && block.variants?.length ? pickVariant(block.variants) : null;
        const text = interpolate(variant?.text || block.text, ctx, vars);
        const buttons = (Array.isArray(block.buttons) ? block.buttons : []).slice(0, MAX_BUTTONS).map((button) => ({
          ...button,
          label: interpolate(button.label, ctx, vars),
          value: interpolate(button.value, ctx, vars),
          url: interpolate(button.url, ctx, vars),
          target: interpolate(button.target, ctx, vars),
        }));
        outputs.push({
          kind: 'message',
          channel: block.channel || ctx.channel,
          text,
          buttons,
          blockId: block.id,
          ephemeral: block.ephemeral,
          dm: block.dm,
          reply: block.reply,
          tts: block.tts,
          silent: block.silent,
          suppressEmbeds: block.suppressEmbeds,
          deleteAfter: block.deleteAfter,
          variant: variant?.id,
        });
        if (buttons.some((button) => !button.url)) next = null;
        entry.detail = `${block.channel || ctx.channel} · ${text.slice(0, 90)}${buttons.length ? ` · ${buttons.length} bouton(s)` : ''}`;
        break;
      }
      case 'embed': {
        const embed = {
          title: interpolate(block.title, ctx, vars),
          url: interpolate(block.url, ctx, vars),
          description: interpolate(block.description, ctx, vars),
          color: block.color,
          footer: interpolate(block.footer, ctx, vars),
          author: interpolate(block.author, ctx, vars),
          authorIcon: block.authorIcon,
          image: block.image,
          thumbnail: block.thumbnail,
          footerIcon: block.footerIcon,
          timestamp: block.timestamp,
          fields: (block.fields || []).map((field) => ({
            ...field,
            name: interpolate(field.name, ctx, vars),
            value: interpolate(field.value, ctx, vars),
          })),
        };
        outputs.push({
          kind: 'embed',
          channel: block.channel || ctx.channel,
          embed,
          ephemeral: block.ephemeral,
          dm: block.dm,
          silent: block.silent,
          suppressEmbeds: block.suppressEmbeds,
          deleteAfter: block.deleteAfter,
        });
        entry.detail = embed.title || String(embed.description || '').slice(0, 80);
        break;
      }
      case 'dm': {
        const text = interpolate(block.text, ctx, vars);
        const target = interpolate(block.target, ctx, vars);
        const embed = block.embed
          ? {
              title: interpolate(block.title, ctx, vars),
              description: interpolate(block.description || block.text, ctx, vars),
              color: block.color,
            }
          : null;
        outputs.push({ kind: 'dm', to: target || ctx.user.name, text, embed, target });
        entry.detail = `message privé à ${target || ctx.user.name} · ${text.slice(0, 80)}`;
        break;
      }
      case 'button': {
        const source = Array.isArray(block.buttons) && block.buttons.length
          ? block.buttons
          : [{ label: block.label, style: block.style, emoji: block.emoji, disabled: block.disabled, url: block.url, target: block.target }];
        const buttons = source.map((button) => ({
          ...button,
          label: interpolate(button.label, ctx, vars),
          target: interpolate(button.target, ctx, vars),
        }));
        outputs.push({ kind: 'buttons', channel: block.channel || ctx.channel, buttons, blockId: block.id });
        next = null;
        entry.detail = `${buttons.length} bouton(s) · en attente d’un clic · ${buttons.map((button) => button.label).join(', ')}`;
        break;
      }
      case 'react': {
        outputs.push({ kind: 'react', emoji: block.emoji });
        entry.detail = block.emoji;
        break;
      }
      case 'random': {
        const variant = pickVariant(block.variants);
        const text = interpolate(variant.text, ctx, vars);
        if (block.embed) {
          outputs.push({
            kind: 'embed',
            channel: block.channel || ctx.channel,
            embed: {
              title: interpolate(block.title, ctx, vars),
              url: interpolate(block.url, ctx, vars),
              description: interpolate(block.description || variant.text, ctx, vars),
              color: block.color,
              footer: interpolate(block.footer, ctx, vars),
              author: interpolate(block.author, ctx, vars),
              authorIcon: block.authorIcon,
              image: block.image,
              thumbnail: block.thumbnail,
              footerIcon: block.footerIcon,
              timestamp: block.timestamp,
              fields: (block.fields || []).map((field) => ({
                ...field,
                name: interpolate(field.name, ctx, vars),
                value: interpolate(field.value, ctx, vars),
              })),
            },
            ephemeral: block.ephemeral,
            dm: block.dm,
            silent: block.silent,
            reply: block.reply,
            tts: block.tts,
            suppressEmbeds: block.suppressEmbeds,
            deleteAfter: block.deleteAfter,
            variant: variant.id,
          });
        } else {
          outputs.push({
            kind: 'message',
            channel: block.channel || ctx.channel,
            text,
            ephemeral: block.ephemeral,
            dm: block.dm,
            silent: block.silent,
            reply: block.reply,
            tts: block.tts,
            suppressEmbeds: block.suppressEmbeds,
            deleteAfter: block.deleteAfter,
            variant: variant.id,
          });
        }
        if (variant.next) next = variant.next;
        entry.detail = `variante choisie · ${text.slice(0, 80)}`;
        break;
      }
      case 'role': {
        outputs.push({
          kind: 'role',
          action: block.action,
          role: block.role,
          user: ctx.user.name,
          duration: block.duration,
          durationUnit: block.durationUnit,
          temporary: block.duration > 0,
          reason: interpolate(block.reason, ctx, vars),
        });
        const duration = block.duration > 0 ? ` · ${block.duration} ${block.durationUnit}` : ' · permanent';
        entry.detail = `${block.action === 'remove' ? 'Retire' : 'Ajoute'} le rôle ${block.role || '—'} à ${ctx.user.name}${duration}`;
        break;
      }
      case 'channel': {
        outputs.push({
          kind: 'channel',
          name: block.name,
          channelKind: block.kind,
          category: block.category,
          topic: block.topic,
          nsfw: block.nsfw,
          slowmode: block.slowmode,
        });
        entry.detail = `salon ${block.kind === 'voice' ? 'vocal' : block.kind === 'forum' ? 'forum' : 'textuel'} « ${block.name} »${block.category ? ` · ${block.category}` : ''}`;
        break;
      }
      case 'pin': {
        outputs.push({ kind: 'pin', unpin: block.unpin });
        entry.detail = block.unpin ? 'Désépingle le message' : 'Épingle le message';
        break;
      }
      case 'delete': {
        outputs.push({ kind: 'delete', count: block.count, channel: block.channel || ctx.channel });
        entry.detail = `${block.count} message(s) supprimé(s)${block.channel ? ` dans ${block.channel}` : ''}`;
        break;
      }
      case 'setvar': {
        const value = interpolate(block.value, ctx, vars);
        vars[block.name] = value;
        outputs.push({ kind: 'var', name: block.name, value });
        entry.detail = `${block.name} = ${value}`;
        break;
      }
      case 'counter': {
        const raw = interpolate(block.value, ctx, vars);
        const currentValue = Number(String(vars[block.name] ?? '0').replace(',', '.')) || 0;
        const delta = Number(String(raw).replace(',', '.')) || 0;
        const result =
          block.op === 'sub'
            ? currentValue - delta
            : block.op === 'mul'
              ? currentValue * delta
              : block.op === 'set'
                ? delta
                : currentValue + delta;
        vars[block.name] = String(result);
        outputs.push({ kind: 'var', name: block.name, value: String(result) });
        entry.detail = `${block.name} : ${currentValue} ${block.op === 'sub' ? '−' : block.op === 'mul' ? '×' : block.op === 'set' ? '→' : '+'} ${delta} = ${result}`;
        break;
      }
      case 'condition': {
        const results = (block.rules || []).map((rule) => ({ ...rule, ...evaluateRule(rule, ctx, vars) }));
        const pass = block.mode === 'any' ? results.some((result) => result.pass) : results.every((result) => result.pass);
        entry.status = pass ? 'ok' : 'skipped';
        entry.branch = pass ? 'then' : 'else';
        entry.rules = results;
        entry.detail = results.length
          ? results.map((result) => `${result.left} ${OPERATORS[result.op]} ${result.right} → ${result.pass ? 'vrai' : 'faux'}`).join(' · ')
          : 'Aucune règle : branche « sinon »';
        next = pass ? block.thenId : block.elseId;
        break;
      }
      case 'wait': {
        outputs.push({ kind: 'wait', seconds: block.seconds });
        entry.detail = `${block.seconds} s`;
        break;
      }
      case 'timer': {
        const unitMs = block.unit === 'hours' ? 3600000 : block.unit === 'minutes' ? 60000 : 1000;
        const durationMs = Math.max(1000, block.duration * unitMs);
        const end = Date.now() + durationMs;
        vars.time = `<t:${Math.floor(end / 1000)}:R>`;
        vars.timestamp = `<t:${Math.floor(end / 1000)}:F>`;
        vars.duration = formatDuration(durationMs);
        outputs.push({
          kind: 'timer',
          action: 'countdown',
          channel: block.channel || ctx.channel,
          text: interpolate(block.startText, ctx, vars) || `⏳ Fin ${vars.time}`,
          endText: interpolate(block.endText, ctx, vars) || '⏰ Temps écoulé !',
          durationMs,
          end,
          wait: block.wait,
          ephemeral: block.ephemeral,
          dm: block.dm,
          silent: block.silent,
        });
        entry.detail = `compte à rebours ${vars.duration}${block.wait ? ' · attend la fin' : ''}`;
        break;
      }
      case 'chrono': {
        const variable = block.variable || 'chrono_start';
        if (block.action === 'service') {
          outputs.push({
            kind: 'chrono',
            action: 'service',
            channel: block.channel || ctx.channel,
            serviceText: interpolate(block.serviceText, ctx, vars),
            emptyServiceText: interpolate(block.emptyServiceText, ctx, vars),
            ephemeral: block.ephemeral,
            dm: block.dm,
            silent: block.silent,
          });
          entry.detail = 'chrono du service actuel';
        } else if (block.action === 'stop') {
          const started = Number(vars[variable] || 0);
          const elapsed = formatDuration(started ? Date.now() - started : 0);
          vars.elapsed = elapsed;
          const stopTemplate = String(block.stopText || '⏱️ Temps écoulé : {{elapsed}}')
            .replace(/{{\s*elapsed\s*}}/gi, '__ELAPSED__')
            .replace(/{{\s*duration\s*}}/gi, '__ELAPSED__');
          outputs.push({
            kind: 'chrono',
            action: 'stop',
            channel: block.channel || ctx.channel,
            variable,
            text: interpolate(block.stopText, ctx, vars) || `⏱️ Temps écoulé : ${elapsed}`,
            stopText: interpolate(stopTemplate, ctx, vars),
            ephemeral: block.ephemeral,
            dm: block.dm,
            silent: block.silent,
          });
          entry.detail = `chronomètre arrêté · ${elapsed}`;
        } else {
          vars[variable] = String(Date.now());
          outputs.push({
            kind: 'chrono',
            action: 'start',
            channel: block.channel || ctx.channel,
            variable,
            startText: interpolate(block.startText, ctx, vars) || '⏱️ Chronomètre démarré.',
            ephemeral: block.ephemeral,
            dm: block.dm,
            silent: block.silent,
          });
          entry.detail = `chronomètre démarré · ${variable}`;
        }
        break;
      }
      case 'serviceStart': {
        outputs.push({
          kind: 'serviceStart',
          channel: block.channel || ctx.channel,
          blockId: block.id,
          text: interpolate(block.startText, ctx, vars),
          alreadyText: interpolate(block.alreadyText, ctx, vars),
          ephemeral: block.ephemeral,
          dm: block.dm,
          silent: block.silent,
        });
        entry.detail = 'service démarré';
        break;
      }
      case 'serviceStop': {
        outputs.push({
          kind: 'serviceStop',
          channel: block.channel || ctx.channel,
          blockId: block.id,
          text: interpolate(block.stopText, ctx, vars),
          emptyText: interpolate(block.emptyText, ctx, vars),
          ephemeral: block.ephemeral,
          dm: block.dm,
          silent: block.silent,
        });
        entry.detail = 'service arrêté';
        break;
      }
      case 'servicePenalty': {
        outputs.push({
          kind: 'servicePenalty',
          channel: block.channel || ctx.channel,
          blockId: block.id,
          title: interpolate(block.title, ctx, vars),
          penaltyText: interpolate(block.penaltyText, ctx, vars),
          next: block.next,
        });
        next = null;
        entry.detail = 'attend la durée de la pénalité';
        break;
      }
      case 'serviceLeaderboard': {
        outputs.push({
          kind: 'serviceLeaderboard',
          channel: block.channel || ctx.channel,
          title: interpolate(block.title, ctx, vars),
          top: block.top,
          ephemeral: block.ephemeral,
          dm: block.dm,
        });
        entry.detail = `classement · top ${block.top}`;
        break;
      }
      case 'serviceOnline': {
        outputs.push({
          kind: 'serviceOnline',
          channel: block.channel || ctx.channel,
          blockId: block.id,
          title: interpolate(block.title, ctx, vars),
          emptyText: interpolate(block.emptyText, ctx, vars),
          interval: block.interval,
          maxEntries: block.maxEntries,
        });
        entry.detail = `chrono en ligne · actualisation ${block.interval} s`;
        break;
      }
      case 'serviceConfig': {
        outputs.push({
          kind: 'serviceConfig',
          channel: block.channel || ctx.channel,
          period: block.period,
          resetDay: block.resetDay,
          resetHour: block.resetHour,
          timezone: block.timezone,
          message: interpolate(block.message, ctx, vars),
          ephemeral: block.ephemeral,
          dm: block.dm,
          silent: block.silent,
        });
        entry.detail = `${block.period === 'month' ? 'mois' : 'semaine'} · reset ${block.resetDay} ${block.resetHour} h`;
        break;
      }
      case 'serviceReset': {
        outputs.push({
          kind: 'serviceReset',
          channel: block.channel || ctx.channel,
          message: interpolate(block.message, ctx, vars),
          ephemeral: block.ephemeral,
          dm: block.dm,
          silent: block.silent,
        });
        entry.detail = 'compteurs du service réinitialisés';
        break;
      }
      case 'cooldown': {
        outputs.push({ kind: 'cooldown', seconds: block.seconds, scope: block.scope });
        entry.detail = `${block.seconds} s par ${block.scope === 'channel' ? 'salon' : 'membre'} · vérifié`;
        break;
      }
      case 'typing': {
        outputs.push({ kind: 'typing', seconds: block.seconds });
        entry.detail = `saisie pendant ${block.seconds} s`;
        break;
      }
      case 'webhook': {
        outputs.push({
          kind: 'webhook',
          method: block.method,
          url: block.url,
          body: interpolate(block.body, ctx, vars),
          status: 200,
          simulated: true,
        });
        entry.detail = `${block.method} ${block.url || '(url vide)'} → 200 (simulé)`;
        break;
      }
      case 'log': {
        const text = interpolate(block.text, ctx, vars);
        outputs.push({ kind: 'log', text });
        entry.detail = text;
        break;
      }
      case 'automationRun': {
        outputs.push({
          kind: 'automationRun',
          automationType: block.automationType || 'autoMod',
          notify: block.notify !== false,
        });
        entry.detail = `automatisation ${block.automationType || 'autoMod'}`;
        break;
      }
      case 'note': {
        entry.detail = block.text ? `${block.title} · ${block.text.slice(0, 80)}` : block.title;
        break;
      }
      case 'reply': {
        const text = interpolate(block.text, ctx, vars);
        outputs.push({
          kind: 'message',
          channel: block.channel || ctx.channel,
          text,
          ephemeral: block.ephemeral,
          dm: block.dm,
          reply: true,
          ping: block.ping,
          deleteAfter: block.deleteAfter,
        });
        entry.detail = `réponse${block.ping ? ' avec mention' : ''} · ${text.slice(0, 80)}`;
        break;
      }
      case 'edit': {
        outputs.push({
          kind: 'edit',
          ref: block.messageRef,
          text: interpolate(block.text, ctx, vars),
          embed: block.embed,
          title: interpolate(block.title, ctx, vars),
          description: interpolate(block.description, ctx, vars),
          color: block.color,
        });
        entry.detail = `message « ${block.messageRef} » modifié`;
        break;
      }
      case 'thread': {
        outputs.push({ kind: 'thread', name: interpolate(block.name, ctx, vars), archive: block.archive, private: block.private });
        entry.detail = `fil « ${block.name} » · archivage ${block.archive} min`;
        break;
      }
      case 'forum': {
        outputs.push({
          kind: 'forum',
          channel: block.channel || ctx.channel,
          title: interpolate(block.title, ctx, vars),
          content: interpolate(block.content, ctx, vars),
          tags: block.tags,
        });
        entry.detail = `post forum « ${block.title} »`;
        break;
      }
      case 'forumAction': {
        outputs.push({
          kind: 'forumAction',
          action: block.action,
          channel: block.channel || ctx.channel,
          post: interpolate(block.post, ctx, vars),
          content: interpolate(block.content, ctx, vars),
          reason: interpolate(block.reason, ctx, vars),
        });
        entry.detail = `${block.action === 'close' ? 'fermeture' : 'message'} forum · ${block.post || 'post actuel'}`;
        break;
      }
      case 'forumDelete': {
        outputs.push({
          kind: 'forumDelete',
          channel: block.channel || ctx.channel,
          post: interpolate(block.post, ctx, vars),
          message: interpolate(block.message, ctx, vars),
        });
        entry.detail = `suppression forum · ${block.post || 'post actuel'} · ${block.message || 'dernier message'}`;
        break;
      }
      case 'ai': {
        const prompt = interpolate(block.prompt, ctx, vars);
        let text = '';
        try {
          text = await askAI({ model: block.model, prompt, maxTokens: block.maxTokens, provider: block.provider, history: aiHistory });
        } catch {
          text = localAIResponse(prompt);
        }
        if (!text) text = localAIResponse(prompt);
        aiHistory.push({ role: 'user', content: prompt });
        aiHistory.push({ role: 'assistant', content: text });
        vars[block.variable] = text;
        outputs.push({
          kind: 'ai',
          channel: block.channel || ctx.channel,
          model: block.model,
          provider: block.provider,
          prompt,
          text,
          variable: block.variable,
          maxTokens: block.maxTokens,
          simulated: false,
        });
        entry.detail = `${block.provider || 'auto'} · ${block.model} · ${text.slice(0, 80)}`;
        break;
      }
      case 'image': {
        outputs.push({ kind: 'image', channel: block.channel || ctx.channel, url: block.url, alt: interpolate(block.alt, ctx, vars) });
        entry.detail = block.url || 'image sans URL';
        break;
      }
      case 'music': {
        const url = interpolate(block.url, ctx, vars);
        outputs.push({
          kind: 'music',
          action: block.action,
          mode: block.mode,
          channel: block.channel || ctx.channel,
          url,
          title: interpolate(block.title, ctx, vars),
          volume: block.volume,
          loop: block.loop,
        });
        entry.detail = block.action === 'stop' ? 'musique arrêtée' : `${block.mode === 'personal' ? 'privé' : 'vocal'} · ${url || 'aucune URL'}`;
        break;
      }
      case 'poll': {
        const options = block.options.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 10);
        outputs.push({ kind: 'poll', channel: block.channel || ctx.channel, question: interpolate(block.question, ctx, vars), options, duration: block.duration, multiple: block.multiple });
        entry.detail = `sondage · ${options.length} option(s)`;
        break;
      }
      case 'select': {
        const options = block.options.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 25);
        outputs.push({
          kind: 'select',
          channel: block.channel || ctx.channel,
          placeholder: block.placeholder,
          options,
          min: block.min,
          max: block.max,
          blockId: block.id,
          next: block.next,
        });
        next = null;
        entry.detail = `menu · ${options.length} option(s) · en attente du choix`;
        break;
      }
      case 'modal': {
        const fields = normalizeModalFields(block.fields);
        outputs.push({
          kind: 'modal',
          channel: block.channel || ctx.channel,
          title: block.title,
          fields: fields.map((field) => field.label),
          submitLabel: block.submitLabel,
          blockId: block.id,
          next: block.next,
        });
        next = null;
        entry.detail = `formulaire · ${fields.length} champ(s) · en attente de validation`;
        break;
      }
      case 'giveaway': {
        outputs.push({
          kind: 'giveaway',
          channel: block.channel || ctx.channel,
          prize: interpolate(block.prize, ctx, vars),
          duration: block.duration,
          winners: block.winners,
          emoji: block.emoji,
        });
        entry.detail = `${block.winners} gagnant(s) · ${block.duration} h`;
        break;
      }
      case 'await': {
        outputs.push({
          kind: 'await',
          interaction: block.kind,
          timeout: block.timeout,
          blockId: block.id,
          next: block.next,
        });
        next = null;
        entry.detail = `${block.kind} · en attente pendant ${block.timeout} s`;
        break;
      }
      case 'accountCheck': {
        const reasons = [];
        const ageDays = ctx.user.createdTimestamp ? (Date.now() - ctx.user.createdTimestamp) / 86400000 : 0;
        if (block.blockBots && ctx.user.bot) reasons.push('compte bot');
        if (block.minAgeDays > 0 && ctx.user.createdTimestamp && ageDays < block.minAgeDays) {
          reasons.push(`compte trop récent (${Math.max(0, Math.floor(ageDays))} j)`);
        }
        if (block.requireAvatar && !ctx.user.hasAvatar) reasons.push('aucun avatar');
        const pass = reasons.length === 0;
        vars[block.variable] = pass ? 'oui' : 'non';
        vars.account_ok = pass ? 'oui' : 'non';
        vars.account_reasons = reasons.join(', ');
        const text = pass ? '' : interpolate(block.failMessage, ctx, vars);
        outputs.push({
          kind: 'accountCheck',
          pass,
          reasons,
          text,
          channel: block.channel || ctx.channel,
          stop: !pass && block.failAction !== 'continue',
        });
        entry.status = pass ? 'ok' : 'skipped';
        entry.detail = pass ? 'compte valide' : reasons.join(' · ');
        if (!pass && block.failAction !== 'continue') next = null;
        break;
      }
      case 'moderation': {
        const target = interpolate(block.target, ctx, vars) || ctx.user.name;
        const reason = interpolate(block.reason, ctx, vars);
        const notifyMessage = interpolate(block.notifyMessage, ctx, vars);
        const evidence = interpolate(block.evidence, ctx, vars);
        outputs.push({
          kind: 'moderation',
          action: block.action,
          target,
          duration: block.duration,
          durationUnit: block.durationUnit,
          reason,
          deleteDays: block.deleteDays,
          deleteMessages: block.deleteMessages,
          amount: block.amount,
          seconds: block.seconds,
          role: block.role,
          channel: block.channel || ctx.channel,
          nickname: interpolate(block.nickname, ctx, vars),
          notify: block.notify,
          notifyMessage,
          logChannel: block.logChannel,
          evidence,
        });
        entry.detail = `${block.action} · ${target}${reason ? ` · ${reason}` : ''}`;
        break;
      }
      case 'timeout': {
        outputs.push({ kind: 'timeout', user: ctx.user.name, duration: block.duration, reason: interpolate(block.reason, ctx, vars) });
        entry.detail = `${ctx.user.name} exclu ${block.duration} min`;
        break;
      }
      case 'kick': {
        outputs.push({ kind: 'kick', user: ctx.user.name, reason: interpolate(block.reason, ctx, vars) });
        entry.detail = `${ctx.user.name} expulsé`;
        break;
      }
      case 'ban': {
        outputs.push({ kind: 'ban', user: ctx.user.name, reason: interpolate(block.reason, ctx, vars), deleteDays: block.deleteDays });
        entry.detail = `${ctx.user.name} banni`;
        break;
      }
      case 'nickname': {
        const nickname = interpolate(block.nickname, ctx, vars);
        outputs.push({ kind: 'nickname', user: ctx.user.name, nickname });
        entry.detail = `pseudo → ${nickname}`;
        break;
      }
      case 'move': {
        outputs.push({ kind: 'move', user: ctx.user.name, channel: block.channel });
        entry.detail = `${ctx.user.name} déplacé vers ${block.channel}`;
        break;
      }
      case 'invite': {
        const action = block.action === 'view' ? 'view' : 'create';
        outputs.push({
          kind: 'invite',
          action,
          channel: block.channel,
          invite: interpolate(block.invite, ctx, vars),
          maxUses: block.maxUses,
          maxAge: block.maxAge,
          temporary: block.temporary,
          delivery: block.delivery,
          message: interpolate(block.message, ctx, vars),
          variable: block.variable,
        });
        entry.detail = action === 'view'
          ? `voir le lien ${block.invite || '—'} · ${block.delivery === 'dm' ? 'message privé' : block.delivery === 'none' ? 'sans envoi' : 'dans le salon'}`
          : `invitation ${block.channel} · ${block.maxAge} h · ${block.delivery === 'dm' ? 'message privé' : block.delivery === 'none' ? 'sans envoi' : 'dans le salon'}`;
        break;
      }
      case 'ticket': {
        const buttons = (block.buttons || []).map((button) => ({
          ...button,
          label: interpolate(button.label, ctx, vars),
          value: interpolate(button.value, ctx, vars),
          target: interpolate(button.target, ctx, vars),
        }));
        outputs.push({
          kind: 'ticket',
          action: block.action,
          category: block.category,
          reason: interpolate(block.reason, ctx, vars),
          staffRole: block.staffRole,
          logChannel: block.logChannel,
          welcomeMessage: interpolate(block.welcomeMessage, ctx, vars),
          maxOpen: block.maxOpen,
          namePrefix: block.namePrefix,
          buttons,
          flowId: flow.id,
          blockId: block.id,
        });
        if (block.action === 'open' && buttons.length) next = null;
        entry.detail = `ticket ${block.action}${block.category ? ` · ${block.category}` : ''}${buttons.length ? ` · ${buttons.length} bouton(s)` : ''}`;
        break;
      }
      case 'level': {
        const current = Number(String(vars[block.variable] ?? '0').replace(',', '.')) || 0;
        const result = current + block.amount;
        vars[block.variable] = String(result);
        outputs.push({ kind: 'var', name: block.variable, value: String(result) });
        entry.detail = `${block.variable} : ${current} ${block.amount >= 0 ? '+' : '−'} ${Math.abs(block.amount)} = ${result}`;
        break;
      }
      case 'randomNumber': {
        const min = Math.min(block.min, block.max);
        const max = Math.max(block.min, block.max);
        const value = String(Math.floor(Math.random() * (max - min + 1)) + min);
        vars[block.variable] = value;
        outputs.push({ kind: 'var', name: block.variable, value });
        entry.detail = `${block.variable} = ${value} (${min}–${max})`;
        break;
      }
      case 'string': {
        const source = interpolate(block.source, ctx, vars);
        let value = source;
        if (block.operation === 'upper') value = source.toUpperCase();
        else if (block.operation === 'lower') value = source.toLowerCase();
        else if (block.operation === 'trim') value = source.trim();
        else if (block.operation === 'reverse') value = [...source].reverse().join('');
        else if (block.operation === 'length') value = String(source.length);
        else if (block.operation === 'replace') value = source.split(block.search).join(block.replace);
        vars[block.variable] = value;
        outputs.push({ kind: 'var', name: block.variable, value });
        entry.detail = `${block.operation} · ${value.slice(0, 80)}`;
        break;
      }
      case 'json': {
        try {
          const parsed = JSON.parse(interpolate(block.source, ctx, vars));
          const value = block.path.split('.').filter(Boolean).reduce((acc, key) => (acc == null ? acc : acc[key]), parsed);
          const result = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
          vars[block.variable] = result;
          outputs.push({ kind: 'var', name: block.variable, value: result });
          entry.detail = `${block.path} = ${result.slice(0, 80)}`;
        } catch {
          entry.status = 'error';
          entry.detail = 'JSON invalide ou chemin introuvable';
        }
        break;
      }
      case 'date': {
        const now = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        const value = block.format
          .replace(/yyyy/g, String(now.getFullYear()))
          .replace(/MM/g, pad(now.getMonth() + 1))
          .replace(/dd/g, pad(now.getDate()))
          .replace(/HH/g, pad(now.getHours()))
          .replace(/mm/g, pad(now.getMinutes()))
          .replace(/ss/g, pad(now.getSeconds()));
        vars[block.variable] = value;
        outputs.push({ kind: 'var', name: block.variable, value });
        entry.detail = `${block.variable} = ${value}`;
        break;
      }
      case 'stop': {
        outputs.push({ kind: 'stop', reason: interpolate(block.reason, ctx, vars) });
        entry.detail = interpolate(block.reason, ctx, vars) || 'Flux arrêté';
        next = null;
        break;
      }
      case 'database': {
        const key = `db:${block.key}`;
        if (block.action === 'get') {
          const value = vars[key] ?? '';
          vars[block.variable] = value;
          outputs.push({ kind: 'var', name: block.variable, value, databaseKey: block.key, databaseAction: 'get' });
          entry.detail = `lecture ${block.key} = ${value}`;
        } else {
          const value = interpolate(block.value, ctx, vars);
          vars[key] = value;
          vars[block.variable] = value;
          outputs.push({ kind: 'var', name: block.variable, value, databaseKey: block.key, databaseAction: 'set' });
          entry.detail = `écriture ${block.key} = ${value}`;
        }
        break;
      }
      case 'captcha': {
        outputs.push({
          kind: 'captcha',
          user: ctx.user.name,
          mode: block.kind,
          timeout: block.timeout,
          role: block.role,
          blockId: block.id,
          next: block.next,
        });
        next = null;
        entry.detail = `vérification ${block.kind} · en attente pendant ${block.timeout} s`;
        break;
      }
      default:
        entry.status = 'error';
        entry.detail = 'Type de bloc inconnu';
    }

    trace.push(entry);
    if (entry.status === 'error') break;
    current = next || null;
  }

  return { trace, outputs, variables: vars, steps, durationMs: Date.now() - started };
}

export function ensureBotFlows(bot) {
  if (!Array.isArray(bot.flows)) bot.flows = [];
  return bot.flows;
}
