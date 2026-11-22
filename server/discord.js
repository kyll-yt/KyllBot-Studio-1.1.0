const textChannel = (name, category) => ({ id: `ch-${name}`, name, type: 'text', category });
const voiceChannel = (name, category) => ({ id: `ch-${name}`, name, type: 'voice', category });
const forumChannel = (name, category) => ({ id: `ch-${name}`, name, type: 'forum', category });
const role = (name, color) => ({ id: `role-${name}`, name, color });

const COMMUNITY_CHANNELS = [
  textChannel('bienvenue', 'Démarrage'),
  textChannel('règles', 'Démarrage'),
  textChannel('présentations', 'Démarrage'),
  textChannel('annonces', 'Démarrage'),
  textChannel('général', 'Communauté'),
  textChannel('memes', 'Communauté'),
  textChannel('suggestions', 'Communauté'),
  forumChannel('forum', 'Communauté'),
  textChannel('support', 'Support'),
  textChannel('tickets', 'Support'),
  textChannel('niveaux', 'Progression'),
  voiceChannel('Général', 'Vocaux'),
  voiceChannel('Support', 'Vocaux'),
  textChannel('logs', 'Logs'),
];

const MODERATION_CHANNELS = [
  textChannel('général', 'Communauté'),
  textChannel('annonces', 'Communauté'),
  textChannel('règles', 'Démarrage'),
  textChannel('signalements', 'Modération'),
  textChannel('sanctions', 'Modération'),
  textChannel('modération', 'Modération'),
  textChannel('logs', 'Logs'),
  voiceChannel('Staff', 'Vocaux'),
];

const LEARNING_CHANNELS = [
  textChannel('général', 'Communauté'),
  textChannel('annonces', 'Communauté'),
  textChannel('règles', 'Démarrage'),
  textChannel('cours', 'Formation'),
  textChannel('quiz', 'Formation'),
  textChannel('certificats', 'Formation'),
  textChannel('entraide', 'Formation'),
  voiceChannel('Classe', 'Vocaux'),
  textChannel('logs', 'Logs'),
];

const COMMUNITY_ROLES = [
  role('Membre', '#7c5cff'),
  role('Nouveau', '#94a3b8'),
  role('Modérateur', '#22d3ee'),
  role('Administrateur', '#f472b6'),
  role('Bot', '#a3e635'),
  role('VIP', '#fbbf24'),
  role('Créateur', '#fb7185'),
];

const MODERATION_ROLES = [
  role('Membre', '#7c5cff'),
  role('Modérateur', '#22d3ee'),
  role('Administrateur', '#f472b6'),
  role('Staff', '#fbbf24'),
  role('Bot', '#a3e635'),
  role('Muet', '#94a3b8'),
];

const LEARNING_ROLES = [
  role('Apprenant', '#7c5cff'),
  role('Formateur', '#22d3ee'),
  role('Certifié', '#a3e635'),
  role('Membre', '#94a3b8'),
  role('Bot', '#f472b6'),
];

function presetFor(bot) {
  const haystack = `${bot?.name || ''} ${(bot?.tags || []).join(' ')} ${bot?.description || ''}`.toLowerCase();
  if (/mod[ée]ration|s[ée]curit[ée]|anti-?spam/.test(haystack)) {
    return { channels: MODERATION_CHANNELS, roles: MODERATION_ROLES };
  }
  if (/formation|learning|quiz|p[ée]dagog/.test(haystack)) {
    return { channels: LEARNING_CHANNELS, roles: LEARNING_ROLES };
  }
  return { channels: COMMUNITY_CHANNELS, roles: COMMUNITY_ROLES };
}

export function defaultDiscordServer(bot = {}) {
  const preset = presetFor(bot);
  return {
    name: `Serveur ${bot.name || 'KyllBot'}`,
    guildId: '',
    guildName: '',
    privilegedIntents: true,
    logChannel: 'logs',
    channels: preset.channels.map((channel) => ({ ...channel })),
    categories: [...new Set(preset.channels.map((channel) => channel.category))],
    roles: preset.roles.map((entry) => ({ ...entry })),
  };
}

export function normalizeDiscordServer(input, bot = {}) {
  const fallback = defaultDiscordServer(bot);
  const channels = Array.isArray(input?.channels) ? input.channels : fallback.channels;
  const roles = Array.isArray(input?.roles) ? input.roles : fallback.roles;
  const cleanChannels = channels
    .map((channel, index) => ({
      id: String(channel?.id || `ch-${index}`).slice(0, 60),
      name: String(channel?.name || '').replace(/^#/, '').trim().slice(0, 60),
      type: ['text', 'voice', 'forum'].includes(channel?.type) ? channel.type : 'text',
      category: String(channel?.category || 'Général').slice(0, 60),
    }))
    .filter((channel) => channel.name);
  const categories = [...new Set([
    ...(Array.isArray(input?.categories) ? input.categories : []),
    ...cleanChannels.map((channel) => channel.category),
  ].map((category) => String(category).trim()).filter(Boolean))].slice(0, 30);
  const cleanRoles = roles
    .map((entry, index) => ({
      id: String(entry?.id || `role-${index}`).slice(0, 60),
      name: String(entry?.name || '').trim().slice(0, 60),
      color: /^#[0-9a-f]{6}$/i.test(String(entry?.color || '')) ? entry.color : '#7c5cff',
    }))
    .filter((entry) => entry.name);
  return {
    name: String(input?.name || fallback.name).slice(0, 80),
    guildId: /^\d{17,20}$/.test(String(input?.guildId || '').trim()) ? String(input.guildId).trim() : '',
    guildName: String(input?.guildName || '').trim().slice(0, 100),
    privilegedIntents: input?.privilegedIntents !== false,
    logChannel: String(input?.logChannel || 'logs').replace(/^#/, '').trim().slice(0, 60) || 'logs',
    channels: cleanChannels,
    categories: categories.length ? categories : fallback.categories,
    roles: cleanRoles,
    syncedAt: /^\d{4}-\d{2}-\d{2}T/.test(String(input?.syncedAt || '')) ? String(input.syncedAt).slice(0, 40) : '',
  };
}
