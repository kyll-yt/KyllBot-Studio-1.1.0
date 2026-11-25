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

const str = (value, max) => String(value ?? '').trim().slice(0, max);

function normalizeChannel(channel, index) {
  return {
    id: String(channel?.id || `ch-${index}`).slice(0, 60),
    name: String(channel?.name || '').replace(/^#/, '').trim().slice(0, 60),
    type: ['text', 'voice', 'forum'].includes(channel?.type) ? channel.type : 'text',
    category: String(channel?.category || 'Général').slice(0, 60),
  };
}

function normalizeRole(entry, index) {
  return {
    id: String(entry?.id || `role-${index}`).slice(0, 60),
    name: String(entry?.name || '').trim().slice(0, 60),
    color: /^#[0-9a-f]{6}$/i.test(String(entry?.color || '')) ? entry.color : '#7c5cff',
  };
}

function normalizeServerEntry(input, bot, fallback, index = 0) {
  const preset = fallback || presetFor(bot);
  const channels = Array.isArray(input?.channels) ? input.channels : preset.channels;
  const roles = Array.isArray(input?.roles) ? input.roles : preset.roles;
  const cleanChannels = channels.map(normalizeChannel).filter((channel) => channel.name);
  const categories = [...new Set([
    ...(Array.isArray(input?.categories) ? input.categories : []),
    ...cleanChannels.map((channel) => channel.category),
  ].map((category) => String(category).trim()).filter(Boolean))].slice(0, 30);
  const cleanRoles = roles.map(normalizeRole).filter((entry) => entry.name);
  const guildId = /^\d{17,20}$/.test(String(input?.guildId || '').trim()) ? String(input.guildId).trim() : '';
  return {
    id: guildId || str(input?.id, 60) || `local-${index + 1}`,
    name: str(input?.name, 80) || `Serveur ${bot?.name || 'KyllBot'}`,
    guildId,
    guildName: str(input?.guildName, 100),
    privilegedIntents: input?.privilegedIntents !== false,
    logChannel: String(input?.logChannel || 'logs').replace(/^#/, '').trim().slice(0, 60) || 'logs',
    channels: cleanChannels,
    categories: categories.length ? categories : preset.categories,
    roles: cleanRoles,
    syncedAt: /^\d{4}-\d{2}-\d{2}T/.test(String(input?.syncedAt || '')) ? String(input.syncedAt).slice(0, 40) : '',
  };
}

export function defaultDiscordServer(bot = {}) {
  const preset = presetFor(bot);
  const server = normalizeServerEntry(
    {
      name: `Serveur ${bot.name || 'KyllBot'}`,
      guildId: '',
      guildName: '',
      privilegedIntents: true,
      logChannel: 'logs',
      channels: preset.channels,
      categories: [...new Set(preset.channels.map((channel) => channel.category))],
      roles: preset.roles,
    },
    bot,
    preset,
  );
  return { ...server, servers: [server], activeGuildId: server.id };
}

export function normalizeDiscordServer(input, bot = {}) {
  const fallback = defaultDiscordServer(bot);
  const rawServers = Array.isArray(input?.servers) ? input.servers : null;
  const servers = (rawServers || [input])
    .map((entry, index) => normalizeServerEntry(entry, bot, fallback, index))
    .filter((entry) => entry.name);
  if (!servers.length) servers.push(normalizeServerEntry({}, bot, fallback));
  const activeKey = String(input?.activeGuildId || input?.guildId || '').trim();
  const active = servers.find((entry) => entry.id === activeKey || entry.guildId === activeKey) || servers[0];
  return { ...active, servers, activeGuildId: active.id };
}

export function activeDiscordServer(discord) {
  const servers = Array.isArray(discord?.servers) ? discord.servers : [];
  if (!servers.length) return discord || null;
  const key = String(discord?.activeGuildId || discord?.guildId || '').trim();
  return servers.find((entry) => entry.id === key || entry.guildId === key) || servers[0];
}

export function upsertDiscordServer(discord, serverInput, bot = {}) {
  const current = normalizeDiscordServer(discord, bot);
  const server = normalizeServerEntry(serverInput, bot, current);
  const servers = current.servers.filter((entry) => {
    if (server.guildId && !entry.guildId && String(entry.id).startsWith('local-')) return false;
    return entry.id !== server.id && entry.guildId !== server.guildId;
  });
  servers.unshift(server);
  return { ...server, servers, activeGuildId: server.id };
}

export function selectDiscordServer(discord, key, bot = {}) {
  const current = normalizeDiscordServer(discord, bot);
  const target = current.servers.find((entry) => entry.id === String(key) || entry.guildId === String(key));
  if (!target) return current;
  return { ...target, servers: current.servers, activeGuildId: target.id };
}

export function resolveDiscordServer(discord, key) {
  const servers = Array.isArray(discord?.servers) ? discord.servers : [];
  const needle = String(key || '').trim();
  if (needle) {
    const found = servers.find((entry) => entry.id === needle || entry.guildId === needle);
    if (found) return found;
  }
  return activeDiscordServer(discord);
}

export function scopedServerId(bot, item) {
  const key = String(item?.serverId || '').trim();
  if (!key) return activeDiscordServer(bot?.discord)?.id || '';
  const servers = Array.isArray(bot?.discord?.servers) ? bot.discord.servers : [];
  const found = servers.find((server) => server.id === key || server.guildId === key);
  return found?.id || '';
}

export function itemMatchesGuild(bot, item, guildId) {
  const serverId = scopedServerId(bot, item);
  if (!serverId) return false;
  const server = resolveDiscordServer(bot?.discord, serverId);
  const target = String(guildId || '').trim();
  if (!server || !target) return false;
  return String(server.id) === target || String(server.guildId) === target;
}
