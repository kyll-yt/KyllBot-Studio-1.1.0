import {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  CheckboxGroupBuilder,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  Partials,
  PermissionsBitField,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from 'discord.js';
import { Readable } from 'node:stream';
import ffmpegPath from 'ffmpeg-static';
import { db, persist } from './db.js';
import { recordEvent } from './activity.js';
import { formatDuration, formatSignedDuration, normalizeModalFields, parseDurationInput, runFlow } from './flows.js';
import { aiHistoryKey, readAIHistory, rememberAIMessage } from './ai.js';
import { decryptSecret } from './secrets.js';
import { safeFetch } from './url-safety.js';
import { activeDiscordServer, itemMatchesGuild, resolveDiscordServer, scopedServerId, upsertDiscordServer } from './discord.js';
import { savedMessageHasEmbed } from './messages.js';
import { scheduledMessageDue } from './scheduled.js';
import { addServicePenalty, applyServiceTokens, applyServiceTokensDeep, ensureServiceState, safeTimezone, serviceDisplayName, serviceEntry, servicePeriodLabel, serviceResetLabel, serviceTokens, serviceTotals } from './service.js';

if (ffmpegPath) process.env.FFMPEG_PATH = ffmpegPath;

const DISCORD_API = 'https://discord.com/api/v10';
const runtimes = new Map();
const cooldowns = new Map();
const spamBuckets = new Map();
const repeatBuckets = new Map();
const guardPunished = new Map();
const flowCooldowns = new Map();
const activeFlowRuns = new Set();
const pendingSelects = new Map();
const pendingModals = new Map();
const pendingAwaits = new Map();
const pendingCaptchas = new Map();
const pendingButtons = new Map();
const musicSessions = new Map();
const chronos = new Map();
const servicePanels = new Map();
const pendingServicePenalties = new Map();
const ticketMeta = new Map();
const dmBlockNotified = new Set();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DISCORD_CONTENT_LIMIT = 2000;

function splitDiscordContent(value, limit = DISCORD_CONTENT_LIMIT) {
  const text = String(value ?? '');
  if (text.length <= limit) return [text];
  const chunks = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = limit;
    const window = rest.slice(0, limit);
    const newline = window.lastIndexOf('\n');
    const space = window.lastIndexOf(' ');
    if (newline >= limit * 0.6) cut = newline + 1;
    else if (space >= limit * 0.6) cut = space + 1;
    if (cut < rest.length && /[\uD800-\uDBFF]/.test(rest[cut - 1])) cut -= 1;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\s+/, '');
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function chunkPayload(payload, content, index) {
  const next = { ...payload, content };
  if (index > 0) {
    for (const key of ['reply', 'tts', 'embeds', 'components', 'files', 'attachments', 'sticker', 'flags']) delete next[key];
  }
  return next;
}

async function sendInChunks(send, payload) {
  if (!payload || payload.content == null) return send(payload);
  const chunks = splitDiscordContent(payload.content);
  let last = null;
  for (let index = 0; index < chunks.length; index += 1) {
    last = await send(chunkPayload(payload, chunks[index], index));
  }
  return last;
}

async function replyInteractionInChunks(interaction, payload, { ephemeral = false, mode = 'reply' } = {}) {
  if (!payload) return null;
  if (payload.content == null) {
    if (ephemeral) payload = { ...payload, ephemeral: true };
    if (mode === 'edit') return interaction.editReply(payload);
    if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
    return interaction.reply(payload);
  }
  const chunks = splitDiscordContent(payload.content);
  let last = null;
  for (let index = 0; index < chunks.length; index += 1) {
    const next = chunkPayload(payload, chunks[index], index);
    if (ephemeral) next.ephemeral = true;
    if (index === 0 && mode === 'edit') last = await interaction.editReply(next);
    else if (index === 0 && mode === 'reply' && !interaction.replied && !interaction.deferred) last = await interaction.reply(next);
    else last = await interaction.followUp(next);
  }
  return last;
}

async function replyMessageInChunks(message, payload) {
  if (!payload || payload.content == null) return message.reply(payload);
  const chunks = splitDiscordContent(payload.content);
  let last = null;
  for (let index = 0; index < chunks.length; index += 1) {
    const next = chunkPayload(payload, chunks[index], index);
    last = index === 0 ? await message.reply(next) : await message.channel.send(next);
  }
  return last;
}

function getBotContext(botId) {
  for (const ws of Object.values(db.workspaces || {})) {
    const bot = (ws.bots || []).find((entry) => entry.id === botId);
    if (bot) return { ws, bot };
  }
  return null;
}

function buildServicePenaltyModal(flow, block) {
  return new ModalBuilder()
    .setCustomId(`kfservicepenaltysubmit:${flow.id}:${block.id}`)
    .setTitle(String(block?.title || 'Pénalité de service').slice(0, 45))
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Membre concerné')
        .setUserSelectMenuComponent(
          new UserSelectMenuBuilder()
            .setCustomId('member')
            .setPlaceholder('Choisir le membre…')
            .setMinValues(1)
            .setMaxValues(1)
            .setRequired(true),
        ),
      new LabelBuilder()
        .setLabel('Durée de la pénalité')
        .setDescription('Ex : 30 min, 1 h 30, 90 min, 2 jours')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('duration')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('30 min')
            .setMinLength(1)
            .setMaxLength(40)
            .setRequired(true),
        ),
    );
}

function ensureRuntime(botId) {
  let runtime = runtimes.get(botId);
  if (!runtime) {
    runtime = {
      botId,
      status: 'offline',
      client: null,
      tag: null,
      userId: null,
      guilds: [],
      mode: null,
      intents: [],
      lastError: null,
      warning: null,
      lastSyncAt: null,
      commandCount: 0,
      lastMetadataSyncAt: null,
      metadata: null,
      startedAt: null,
      logs: [],
      snapshots: new Map(),
      deletions: new Map(),
      joins: new Map(),
      ticketPanelsSent: new Set(),
      raidLockUntil: 0,
      lastRepairAt: null,
    };
    runtimes.set(botId, runtime);
  }
  return runtime;
}

function log(runtime, level, message) {
  const entry = { at: new Date().toISOString(), level, message: String(message).slice(0, 300) };
  runtime.logs.unshift(entry);
  runtime.logs = runtime.logs.slice(0, 30);
  const prefix = `[Discord ${runtime.botId.slice(0, 8)}]`;
  if (level === 'error') console.error(prefix, message);
  else if (level === 'warn') console.warn(prefix, message);
  else console.log(prefix, message);
}

export function getBotRuntime(botId) {
  const runtime = runtimes.get(botId);
  if (!runtime) {
    return {
      status: 'offline',
      tag: null,
      guilds: [],
      mode: null,
      intents: [],
      lastError: null,
      warning: null,
      lastSyncAt: null,
      commandCount: 0,
      lastMetadataSyncAt: null,
      metadata: null,
      startedAt: null,
      logs: [],
    };
  }
  const { client, snapshots: _snapshots, deletions: _deletions, joins: _joins, ...rest } = runtime;
  return { ...rest, logs: rest.logs.slice(0, 12) };
}

async function discordRequest(token, pathName, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${DISCORD_API}${pathName}`, {
      method,
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    const wrapped = new Error(`Impossible de joindre Discord : ${error.message}`);
    wrapped.code = 'DISCORD_NETWORK';
    throw wrapped;
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  if (!response.ok) {
    const error = new Error(data?.message || `Discord a refusé la requête (${response.status}).`);
    error.status = response.status;
    error.discord = data;
    if (response.status === 401) error.code = 'DISCORD_UNAUTHORIZED';
    if (response.status === 403) error.code = 'DISCORD_FORBIDDEN';
    throw error;
  }
  return data;
}

export async function validateDiscordToken(token) {
  const me = await discordRequest(token, '/users/@me');
  const guilds = await discordRequest(token, '/users/@me/guilds');
  return {
    id: me.id,
    username: me.username,
    globalName: me.global_name || me.username,
    avatar: me.avatar || null,
    guilds: (Array.isArray(guilds) ? guilds : []).map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon || null,
      owner: Boolean(guild.owner),
    })),
  };
}

const CHANNEL_TYPES = {
  0: 'text',
  2: 'voice',
  5: 'text',
  13: 'voice',
  15: 'forum',
  16: 'forum',
};

function roleColor(value) {
  const color = Number(value) || 0;
  return color ? `#${color.toString(16).padStart(6, '0')}` : '#94a3b8';
}

export async function listBotGuilds(botId) {
  const context = getBotContext(botId);
  if (!context) throw new Error('Bot introuvable.');
  const { bot } = context;
  if (!bot.tokenEnc) throw new Error('Aucun token Discord enregistré.');
  const token = decryptSecret(bot.tokenEnc);
  const guilds = await discordRequest(token, '/users/@me/guilds');
  const configured = new Set((bot.discord?.servers || []).map((server) => String(server.guildId || server.id)));
  return (Array.isArray(guilds) ? guilds : [])
    .map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon || null,
      owner: Boolean(guild.owner),
      configured: configured.has(String(guild.id)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function syncDiscordMetadata(botId, requestedGuildId = '') {
  const context = getBotContext(botId);
  if (!context) throw new Error('Bot introuvable.');
  const { bot } = context;
  if (!bot.tokenEnc) throw new Error('Aucun token Discord enregistré.');
  const token = decryptSecret(bot.tokenEnc);
  const requested = String(requestedGuildId || '').trim();
  const active = String(bot.discord?.activeGuildId || bot.discord?.guildId || '').trim();
  let guildId = /^\d{17,20}$/.test(requested) ? requested : '';
  if (!guildId && /^\d{17,20}$/.test(active)) guildId = active;
  if (!guildId) {
    const guilds = await discordRequest(token, '/users/@me/guilds');
    guildId = String(guilds?.[0]?.id || '');
  }
  if (!guildId) throw new Error('Aucun serveur Discord disponible. Ajoute le bot à un serveur.');

  const [guild, rawChannels, rawRoles] = await Promise.all([
    discordRequest(token, `/guilds/${guildId}`),
    discordRequest(token, `/guilds/${guildId}/channels`),
    discordRequest(token, `/guilds/${guildId}/roles`),
  ]);

  const channelList = Array.isArray(rawChannels) ? rawChannels : [];
  const categoryChannels = channelList.filter((channel) => channel.type === 4);
  const categoryById = new Map(categoryChannels.map((channel) => [channel.id, channel.name]));
  const categoryPosition = new Map(categoryChannels.map((channel) => [channel.id, Number(channel.position) || 0]));
  const channels = channelList
    .filter((channel) => CHANNEL_TYPES[channel.type])
    .map((channel) => ({
      id: channel.id,
      name: String(channel.name || '').trim(),
      type: CHANNEL_TYPES[channel.type],
      category: categoryById.get(channel.parent_id) || 'Sans catégorie',
      position: Number(channel.position) || 0,
      categoryPosition: categoryPosition.get(channel.parent_id) ?? 9999,
    }))
    .filter((channel) => channel.name)
    .sort((a, b) => a.categoryPosition - b.categoryPosition || a.position - b.position)
    .map(({ position, categoryPosition: _categoryPosition, ...channel }) => channel);
  if (!channels.length) throw new Error('Aucun salon accessible sur ce serveur. Vérifie les permissions du bot.');

  const categories = categoryChannels
    .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
    .map((channel) => String(channel.name || '').trim())
    .filter(Boolean);
  if (channels.some((channel) => channel.category === 'Sans catégorie')) categories.push('Sans catégorie');

  const roles = (Array.isArray(rawRoles) ? rawRoles : [])
    .filter((role) => role.id !== guildId && !role.managed && role.name)
    .sort((a, b) => (Number(b.position) || 0) - (Number(a.position) || 0))
    .map((role) => ({ id: role.id, name: role.name, color: roleColor(role.color) }));

  const current = activeDiscordServer(bot.discord) || {};
  bot.discord = upsertDiscordServer(
    bot.discord,
    {
      ...current,
      id: guildId,
      name: guild?.name || current.name || `Serveur ${bot.name}`,
      guildId,
      guildName: guild?.name || current.guildName || '',
      channels,
      categories,
      roles,
      syncedAt: new Date().toISOString(),
    },
    bot,
  );
  persist();

  const runtime = ensureRuntime(botId);
  runtime.lastMetadataSyncAt = bot.discord.syncedAt;
  runtime.metadata = { channels: channels.length, categories: categories.length, roles: roles.length, servers: bot.discord.servers?.length || 1 };
  runtime.lastError = null;
  return {
    ok: true,
    guildId,
    guildName: bot.discord.guildName,
    channels: channels.length,
    categories: categories.length,
    roles: roles.length,
    servers: bot.discord.servers?.length || 1,
    syncedAt: bot.discord.syncedAt,
  };
}

function safeIntents() {
  return [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
  ];
}

function fullIntents() {
  return [...safeIntents(), GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent];
}

function intentNames(mode) {
  return mode === 'full'
    ? ['Guilds', 'GuildMessages', 'DirectMessages', 'GuildMessageReactions', 'GuildMembers', 'MessageContent']
    : ['Guilds', 'GuildMessages', 'DirectMessages', 'GuildMessageReactions'];
}

function isDisallowedIntents(error) {
  return /disallowed intents|4014/i.test(String(error?.message || ''));
}

function resolveChannel(guild, ref) {
  if (!guild) return null;
  const raw = String(ref || '').trim().replace(/^#/, '');
  if (!raw) return null;
  if (/^\d{17,20}$/.test(raw)) return guild.channels.cache.get(raw) || null;
  const lower = raw.toLowerCase();
  return (
    guild.channels.cache.find((channel) => channel.name?.toLowerCase() === lower && typeof channel.send === 'function') ||
    guild.channels.cache.find((channel) => channel.name?.toLowerCase() === lower) ||
    null
  );
}

function resolveForumPost(guild, ref, channelRef, currentChannel, lastChannel) {
  const threadTypes = new Set([ChannelType.PublicThread, ChannelType.PrivateThread]);
  const isThread = (entry) => entry && threadTypes.has(entry.type);
  const raw = String(ref || '').trim().replace(/^#/, '');
  if (raw) {
    const id = raw.replace(/\D/g, '');
    const byId = id ? guild?.channels?.cache?.get(id) : null;
    if (isThread(byId)) return byId;
    const parent = resolveChannel(guild, channelRef);
    const candidates = [...(guild?.channels?.cache?.values() || [])].filter(isThread);
    const lower = raw.toLowerCase();
    return (
      candidates.find((entry) => entry.name?.toLowerCase() === lower && (!parent || entry.parentId === parent.id)) ||
      candidates.find((entry) => entry.name?.toLowerCase().includes(lower) && (!parent || entry.parentId === parent.id)) ||
      null
    );
  }
  if (isThread(currentChannel)) return currentChannel;
  if (isThread(lastChannel)) return lastChannel;
  return null;
}

function stopMusicSession(guildId) {
  const session = musicSessions.get(guildId);
  if (!session) return false;
  session.stopped = true;
  try { session.player.stop(true); } catch {}
  try { session.connection.destroy(); } catch {}
  musicSessions.delete(guildId);
  return true;
}

function resolveCategory(guild, ref) {
  if (!guild) return null;
  const raw = String(ref || '').trim().replace(/^#/, '');
  if (!raw) return null;
  if (/^\d{17,20}$/.test(raw)) {
    const channel = guild.channels.cache.get(raw);
    return channel?.type === ChannelType.GuildCategory ? channel : null;
  }
  const lower = raw.toLowerCase();
  return guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name?.toLowerCase() === lower) || null;
}

function resolveRole(guild, ref) {
  if (!guild) return null;
  const raw = String(ref || '').trim().replace(/^@/, '');
  if (!raw || raw.toLowerCase() === 'everyone') return null;
  if (/^\d{17,20}$/.test(raw)) return guild.roles.cache.get(raw) || null;
  const lower = raw.toLowerCase();
  return guild.roles.cache.find((role) => role.name?.toLowerCase() === lower && !role.managed) || null;
}

function memberHasAnyRole(member, refs) {
  const list = Array.isArray(refs) ? refs : String(refs || '').split(',');
  const wanted = new Set(
    list
      .map((role) => String(role || '').trim().replace(/^@/, '').toLowerCase())
      .filter((role) => role && role !== 'everyone'),
  );
  if (!wanted.size) return false;
  for (const role of member?.roles?.cache?.values?.() || []) {
    if (wanted.has(role.id) || wanted.has(String(role.name || '').toLowerCase())) return true;
  }
  return false;
}

function ticketOwnerId(topic) {
  return String(topic || '').match(/\((\d{17,20})\)/)?.[1] || '';
}

function ticketLogChannel(bot, meta = {}) {
  return meta.logChannel || bot?.discord?.logChannel || 'logs';
}

async function createTicketChannel({ bot, guild, member, user, config = {}, source = 'flux' }) {
  if (!guild) return { ok: false, error: 'Ticket uniquement disponible dans un serveur.' };
  const owner = user || member?.user;
  if (!owner?.id) return { ok: false, error: 'Membre introuvable pour ouvrir le ticket.' };

  const limit = Math.min(10, Math.max(1, Number(config.maxOpen) || 1));
  const openTickets = guild.channels.cache.filter(
    (entry) => entry.type === ChannelType.GuildText && ticketOwnerId(entry.topic) === owner.id,
  );
  if (openTickets.size >= limit) {
    const existing = openTickets.first();
    return {
      ok: false,
      channel: existing,
      error: limit === 1
        ? `Tu as déjà un ticket ouvert : <#${existing.id}>.`
        : `Tu as déjà ${openTickets.size} ticket(s) ouvert(s), la limite est de ${limit}.`,
    };
  }

  const parent = resolveCategory(guild, config.category);
  const staffRole = resolveRole(guild, config.staffRole);
  const prefix = String(config.namePrefix || 'ticket')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20) || 'ticket';
  const safeName = String(owner.username || 'membre')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
  const reason = String(config.reason || 'Demande de support').slice(0, 300);

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    {
      id: owner.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
      ],
    },
    {
      id: ensureRuntime(bot.id).client?.user?.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels,
      ],
    },
  ];
  if (staffRole) {
    overwrites.push({
      id: staffRole.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.ManageChannels,
      ],
    });
  }

  const ticketChannel = await guild.channels.create({
    name: `${prefix}-${safeName || 'membre'}`.slice(0, 100),
    type: ChannelType.GuildText,
    parent: parent?.id || undefined,
    topic: `Ticket de ${owner.tag || owner.username || 'membre'} (${owner.id}) — ${reason}`.slice(0, 1024),
    permissionOverwrites: overwrites.filter((entry) => entry.id),
  });

  ticketMeta.set(ticketChannel.id, {
    ownerId: owner.id,
    staffRole: config.staffRole || '',
    logChannel: config.logChannel || '',
    automationId: config.automationId || '',
    source,
  });

  const welcome = String(
    config.welcomeMessage || 'Ton ticket est ouvert. Décris ton problème, un membre du staff arrive.',
  ).slice(0, 1000);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`kfticket:claim:${ticketChannel.id}`)
      .setLabel('Réclamer')
      .setEmoji('🙋')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`kfticket:close:${ticketChannel.id}`)
      .setLabel('Fermer')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
  );
  await ticketChannel.send({
    content: `${owner ? `<@${owner.id}>` : ''} ${welcome}\nRaison : **${reason}**`,
    components: [row],
    allowedMentions: { users: [owner.id] },
  }).catch(() => {});

  await sendLog(
    guild,
    bot,
    `🎫 Ticket ouvert par ${owner.tag || owner.username || owner.id} · <#${ticketChannel.id}> · ${reason}`,
    config.logChannel || '',
  );
  return { ok: true, channel: ticketChannel };
}

async function sendTicketPanel(bot, guild, automation) {
  if (!guild || !automation) return false;
  const config = automation.config || {};
  const channel = resolveChannel(guild, config.channel);
  if (!channel?.send) return false;
  const embed = new EmbedBuilder()
    .setTitle(String(config.panelTitle || '🎫 Support').slice(0, 256))
    .setDescription(String(config.panelMessage || 'Besoin d’aide ? Ouvre un ticket privé avec le staff.').slice(0, 4096))
    .setColor(0x7c5cff)
    .setFooter({ text: 'KyllBot Studio' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`kfticket:open:${automation.id}`.slice(0, 100))
      .setLabel(String(config.buttonLabel || 'Ouvrir un ticket').slice(0, 80))
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary),
  );
  const sent = await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
  return Boolean(sent);
}

async function handleTicketButton(bot, interaction, guild, member) {
  const [, action, targetId] = String(interaction.customId || '').split(':');
  if (!guild) {
    await interaction.reply({ content: 'Les tickets ne sont disponibles que dans un serveur.', ephemeral: true }).catch(() => {});
    return;
  }

  if (action === 'open') {
    const automation = (bot.automations || []).find(
      (entry) => entry.id === targetId && entry.enabled && entry.type === 'ticketPanel',
    );
    if (!automation) {
      await interaction.reply({ content: 'Ce panneau de tickets n’est plus actif.', ephemeral: true }).catch(() => {});
      return;
    }
    const result = await createTicketChannel({
      bot,
      guild,
      member,
      user: interaction.user,
      config: { ...(automation.config || {}), automationId: automation.id },
      source: 'panneau',
    }).catch((error) => ({ ok: false, error: `Impossible de créer le ticket : ${error.message}` }));
    await interaction.reply({
      content: result.ok ? `Ton ticket est ouvert : <#${result.channel.id}>` : result.error,
      ephemeral: true,
    }).catch(() => {});
    return;
  }

  const channel = guild.channels.cache.get(targetId);
  if (!channel) {
    await interaction.reply({ content: 'Ce ticket n’existe plus.', ephemeral: true }).catch(() => {});
    return;
  }
  const meta = ticketMeta.get(channel.id) || {};
  const ownerId = meta.ownerId || ticketOwnerId(channel.topic);
  const isStaff =
    Boolean(member?.permissions?.has?.(PermissionsBitField.Flags.ManageChannels)) ||
    memberHasAnyRole(member, String(meta.staffRole || '').split(',')) ||
    Boolean(member && channel.permissionsFor?.(member)?.has?.(PermissionsBitField.Flags.ManageChannels));

  if (action === 'claim') {
    if (!isStaff) {
      await interaction.reply({ content: 'Seul le staff peut réclamer ce ticket.', ephemeral: true }).catch(() => {});
      return;
    }
    if (channel.setTopic) {
      await channel
        .setTopic(`${channel.topic || ''} · Réclamé par ${interaction.user.tag || interaction.user.username}`.slice(0, 1024))
        .catch(() => {});
    }
    await channel.send({ content: `✅ Ticket réclamé par <@${interaction.user.id}>.` }).catch(() => {});
    await interaction.reply({ content: 'Ticket réclamé.', ephemeral: true }).catch(() => {});
    return;
  }

  if (action === 'close') {
    if (!isStaff && ownerId !== interaction.user.id) {
      await interaction.reply({ content: 'Seul le staff ou l’auteur du ticket peut le fermer.', ephemeral: true }).catch(() => {});
      return;
    }
    await interaction.reply({ content: 'Ticket fermé. Suppression dans 3 secondes…', ephemeral: true }).catch(() => {});
    await channel.send({ content: `🔒 Ticket fermé par <@${interaction.user.id}>.` }).catch(() => {});
    await sendLog(
      guild,
      bot,
      `🔒 Ticket fermé par ${interaction.user.tag || interaction.user.username} · #${channel.name}`,
      ticketLogChannel(bot, meta),
    );
    ticketMeta.delete(channel.id);
    const closing = channel;
    const timer = setTimeout(() => {
      if (closing?.delete) closing.delete('Ticket fermé — KyllBot Studio').catch(() => {});
    }, 3000);
    timer.unref?.();
  }
}

async function resolveMember(guild, ref) {
  if (!guild) return null;
  const raw = String(ref || '').trim();
  const id = raw.match(/\d{17,20}/)?.[0];
  if (id) return guild.members.cache.get(id) || (await guild.members.fetch(id).catch(() => null));
  const needle = raw.replace(/^@/, '').trim().toLowerCase();
  if (!needle) return null;
  return (
    guild.members.cache.find(
      (entry) =>
        entry.user?.username?.toLowerCase() === needle ||
        entry.user?.tag?.toLowerCase() === needle ||
        entry.displayName?.toLowerCase() === needle,
    ) || null
  );
}

function toEmbed(input = {}) {
  const embed = new EmbedBuilder();
  if (input.title) embed.setTitle(String(input.title).slice(0, 256));
  if (input.url) embed.setURL(String(input.url).slice(0, 2048));
  if (input.description) embed.setDescription(String(input.description).slice(0, 4096));
  if (/^#[0-9a-f]{6}$/i.test(String(input.color || ''))) embed.setColor(Number.parseInt(input.color.slice(1), 16));
  if (input.footer) embed.setFooter({ text: String(input.footer).slice(0, 2048) });
  if (input.author) embed.setAuthor({ name: String(input.author).slice(0, 256), iconURL: input.authorIcon || undefined });
  if (input.image) embed.setImage(input.image);
  if (input.thumbnail) embed.setThumbnail(input.thumbnail);
  if (input.timestamp) embed.setTimestamp(new Date());
  const fields = (input.fields || []).filter((field) => field.name && field.value).slice(0, 25);
  if (fields.length) {
    embed.addFields(
      fields.map((field) => ({
        name: String(field.name).slice(0, 256),
        value: String(field.value).slice(0, 1024),
        inline: Boolean(field.inline),
      })),
    );
  }
  return embed;
}

function serviceOnlineEmbed({ state, title, emptyText, interval, maxEntries }) {
  const now = Date.now();
  const entries = Object.values(state?.members || {})
    .filter((entry) => entry && entry.startedAt)
    .map((entry) => ({
      id: String(entry.id || ''),
      name: String(entry.name || entry.id || 'Membre').replace(/@/g, '@\u200b'),
      liveMs: Math.max(0, now - Number(entry.startedAt || now)),
    }))
    .sort((a, b) => b.liveMs - a.liveMs || a.name.localeCompare(b.name, 'fr'));
  const max = Math.max(1, Math.min(50, Number(maxEntries) || 25));
  const lines = entries.slice(0, max).map((entry, index) => `**${index + 1}.** ${entry.name} — ${formatDuration(entry.liveMs)}`);
  if (entries.length > max) lines.push(`… et ${entries.length - max} autre(s)`);
  const secondes = Number(interval) === 30 ? 30 : 60;
  return new EmbedBuilder()
    .setTitle(String(title || '🟢 Chrono en ligne').slice(0, 256))
    .setDescription((lines.length ? lines.join('\n') : String(emptyText || 'Personne n’est en service pour le moment.')).slice(0, 4096))
    .setColor(0x2b2d31)
    .setFooter({ text: `Actualisé toutes les ${secondes} s` });
}

function startServicePanel({ bot, guildId, channel, message, config, key }) {
  const panel = { message, channel, config, key, timer: null, refresh: null };
  panel.refresh = async () => {
    try {
      const state = ensureServiceState(bot, guildId);
      await message.edit({ embeds: [serviceOnlineEmbed({ state, ...config })] });
    } catch {
      if (panel.timer) clearInterval(panel.timer);
      panel.timer = null;
      servicePanels.delete(key);
    }
  };
  const previous = servicePanels.get(key);
  if (previous?.timer) clearInterval(previous.timer);
  const seconds = Number(config.interval) === 30 ? 30 : 60;
  panel.timer = setInterval(() => { panel.refresh().catch(() => {}); }, seconds * 1000);
  panel.timer.unref?.();
  servicePanels.set(key, panel);
  return panel;
}

function rememberServicePanel(bot, meta) {
  if (!Array.isArray(bot.servicePanels)) bot.servicePanels = [];
  const index = bot.servicePanels.findIndex((entry) => entry?.key === meta.key);
  if (index >= 0) bot.servicePanels[index] = meta;
  else bot.servicePanels.push(meta);
  if (bot.servicePanels.length > 50) bot.servicePanels.splice(0, bot.servicePanels.length - 50);
  persist();
}

function refreshServicePanels(bot, guildId) {
  const prefix = `${bot.id}:${String(guildId || 'dm')}:`;
  for (const [key, panel] of servicePanels) {
    if (!key.startsWith(prefix)) continue;
    panel.refresh?.().catch(() => {});
  }
}

async function restoreServicePanels(botId, client) {
  const context = getBotContext(botId);
  const bot = context?.bot;
  if (!bot || !Array.isArray(bot.servicePanels) || !bot.servicePanels.length) return;
  const kept = [];
  for (const meta of bot.servicePanels) {
    if (!meta?.key || !meta.channelId || !meta.messageId) continue;
    const guild = client.guilds?.cache?.get(String(meta.guildId || ''));
    const channel =
      guild?.channels?.cache?.get(String(meta.channelId)) ||
      client.channels?.cache?.get(String(meta.channelId));
    if (!channel?.messages?.fetch) continue;
    try {
      const message = await channel.messages.fetch(String(meta.messageId));
      const panel = startServicePanel({ bot, guildId: meta.guildId, channel, message, config: meta, key: meta.key });
      panel.refresh().catch(() => {});
      kept.push(meta);
    } catch {
      // Le message a été supprimé ou le salon n’est plus accessible.
    }
  }
  bot.servicePanels = kept;
  persist();
}

function renderTemplate(text, { guild, member, interaction, client }) {
  const user = member?.user || interaction?.user;
  const display = member?.displayName || user?.globalName || user?.username || 'membre';
  return String(text || '')
    .replace(/\{user\}/g, user ? `<@${user.id}>` : display)
    .replace(/\{user\.name\}/g, display)
    .replace(/\{member\}/g, display)
    .replace(/\{server\}/g, guild?.name || 'Discord')
    .replace(/\{server\.name\}/g, guild?.name || 'Discord')
    .replace(/\{channel\}/g, interaction?.channel?.name ? `#${interaction.channel.name}` : '')
    .replace(/\{latency\}/g, String(client?.ws?.ping ?? 0))
    .replace(/\{level\}/g, '1')
    .replace(/\{xp\}/g, '0');
}

function commandResponseText(command) {
  const variants = Array.isArray(command.variants) ? command.variants.filter((variant) => variant?.text) : [];
  if (!command.variantMode || !variants.length) return command.response;
  const total = variants.reduce((sum, variant) => sum + Math.max(1, Number(variant.weight) || 1), 0);
  let roll = Math.random() * total;
  for (const variant of variants) {
    roll -= Math.max(1, Number(variant.weight) || 1);
    if (roll <= 0) return variant.text;
  }
  return variants[variants.length - 1].text;
}

function commandPayload(command, context) {
  const content = renderTemplate(commandResponseText(command), context);
  const embed = command.embed || {};
  const hasEmbed = Boolean(embed.title || embed.description || embed.footer);
  const payload = {};
  if (content) payload.content = content;
  if (hasEmbed) payload.embeds = [toEmbed(embed)];
  if (!payload.content && !payload.embeds) payload.content = 'Commande exécutée.';
  return payload;
}

function cooldownRemaining(botId, userId, name, seconds) {
  const key = `${botId}:${userId}:${name}`;
  const now = Date.now();
  const until = cooldowns.get(key) || 0;
  if (until > now) return Math.ceil((until - now) / 1000);
  cooldowns.set(key, now + Math.max(0, Number(seconds) || 0) * 1000);
  if (cooldowns.size > 5000) {
    for (const [entry, value] of cooldowns) if (value < now) cooldowns.delete(entry);
  }
  return 0;
}

function bumpCommand(ws, bot, command, source, user) {
  command.uses = (command.uses || 0) + 1;
  command.lastUsedAt = new Date().toISOString();
  recordEvent(ws, 'command.run', { botId: bot.id, commandId: command.id, source, userId: user?.id || null });
  persist();
}

function bumpFlow(ws, bot, flow, source, user) {
  flow.runs = (flow.runs || 0) + 1;
  flow.lastRunAt = new Date().toISOString();
  recordEvent(ws, 'flow.run', { botId: bot.id, flowId: flow.id, source, userId: user?.id || null });
  persist();
}

function setPresence(client, bot) {
  if (!client.user) return;
  const result = client.user.setPresence({
    status: bot.status === 'draft' ? 'idle' : 'online',
    activities: [{ name: bot.description || 'KyllBot Studio', type: ActivityType.Watching }],
  });
  if (result && typeof result.catch === 'function') result.catch(() => {});
}

function formVarKey(label, index) {
  return String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `champ_${index + 1}`;
}

function parseModalFields(block) {
  return normalizeModalFields(block?.fields).map((field, index) => ({
    ...field,
    index,
    customId: `field_${index}`,
    key: formVarKey(field.label, index),
  }));
}

const MODAL_PAGE_SIZE = 5;

function modalPage(block, page = 0) {
  const all = parseModalFields(block);
  const pages = Math.max(1, Math.ceil(all.length / MODAL_PAGE_SIZE));
  const current = Math.min(Math.max(0, Number(page) || 0), pages - 1);
  return {
    all,
    fields: all.slice(current * MODAL_PAGE_SIZE, current * MODAL_PAGE_SIZE + MODAL_PAGE_SIZE),
    page: current,
    pages,
  };
}

function buildModal(flow, block, page = 0) {
  const { fields, page: current, pages } = modalPage(block, page);
  const suffix = pages > 1 ? ` (${current + 1}/${pages})` : '';
  const modal = new ModalBuilder()
    .setCustomId(`kfmodalsubmit:${flow.id}:${block.id}:${current}`)
    .setTitle(`${String(block?.title || 'Formulaire').slice(0, 45 - suffix.length)}${suffix}`);
  for (const field of fields) {
    const rawLabel = String(field.label || 'Champ').trim();
    const label = new LabelBuilder().setLabel(rawLabel.slice(0, 45));
    const extra = [rawLabel.slice(45), field.placeholder].filter(Boolean).join(' · ');
    if (extra) label.setDescription(extra.slice(0, 100));
    if (field.type === 'role') {
      const select = new RoleSelectMenuBuilder()
        .setCustomId(field.customId)
        .setPlaceholder(field.placeholder || 'Choisissez un rôle…')
        .setMinValues(field.required ? 1 : 0)
        .setMaxValues(1)
        .setRequired(field.required);
      label.setRoleSelectMenuComponent(select);
    } else if (field.type === 'user') {
      const select = new UserSelectMenuBuilder()
        .setCustomId(field.customId)
        .setPlaceholder(field.placeholder || 'Choisissez une personne…')
        .setMinValues(field.required ? 1 : 0)
        .setMaxValues(1)
        .setRequired(field.required);
      label.setUserSelectMenuComponent(select);
    } else if (field.type === 'select') {
      const select = new StringSelectMenuBuilder()
        .setCustomId(field.customId)
        .setPlaceholder(field.placeholder || 'Choisissez…')
        .setMinValues(field.required ? 1 : 0)
        .setMaxValues(1)
        .setRequired(field.required)
        .addOptions(field.options.slice(0, 25).map((option) => ({ label: option.slice(0, 100), value: option.slice(0, 100) })));
      label.setStringSelectMenuComponent(select);
    } else if (field.type === 'checkbox') {
      const group = new CheckboxGroupBuilder()
        .setCustomId(field.customId)
        .setMinValues(field.required ? 1 : 0)
        .setMaxValues(1)
        .setRequired(field.required)
        .addOptions({ label: (field.placeholder || 'Oui').slice(0, 100), value: 'oui' });
      label.setCheckboxGroupComponent(group);
    } else if (field.type === 'multi') {
      const group = new CheckboxGroupBuilder()
        .setCustomId(field.customId)
        .setMinValues(field.required ? 1 : 0)
        .setMaxValues(Math.max(1, Math.min(25, field.options.length)))
        .setRequired(field.required)
        .addOptions(field.options.slice(0, 25).map((option) => ({ label: option.slice(0, 100), value: option.slice(0, 100) })));
      label.setCheckboxGroupComponent(group);
    } else if (field.type === 'info') {
      const input = new TextInputBuilder()
        .setCustomId(field.customId)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);
      if (field.value) input.setValue(field.value.slice(0, 4000));
      if (field.placeholder) input.setPlaceholder(field.placeholder.slice(0, 100));
      label.setTextInputComponent(input);
    } else {
      const input = new TextInputBuilder()
        .setCustomId(field.customId)
        .setStyle(field.type === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(field.required);
      if (field.placeholder) input.setPlaceholder(field.placeholder.slice(0, 100));
      label.setTextInputComponent(input);
    }
    modal.addLabelComponents(label);
  }
  return { modal, fields, page: current, pages };
}

function buildCaptchaModal(flow, block) {
  return new ModalBuilder()
    .setCustomId(`kfcaptchasubmit:${flow.id}:${block.id}`)
    .setTitle('Vérification')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('captcha')
          .setLabel('Écris OK pour confirmer')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(20),
      ),
    );
}

function pendingKey(flowId, blockId, userId) {
  return `${flowId}:${blockId}:${userId || 'anon'}`;
}

function rememberPending(map, key, value, ttlSeconds) {
  map.set(key, { ...value, expiresAt: Date.now() + Math.max(10, Number(ttlSeconds) || 900) * 1000 });
  if (map.size > 1000) {
    const now = Date.now();
    for (const [entry, item] of map) if (item.expiresAt < now) map.delete(entry);
  }
}

function takePending(map, key) {
  const item = map.get(key);
  if (!item) return null;
  map.delete(key);
  if (item.expiresAt && item.expiresAt < Date.now()) return null;
  return item;
}

function peekPending(map, key) {
  const item = map.get(key);
  if (!item) return null;
  if (item.expiresAt && item.expiresAt < Date.now()) {
    map.delete(key);
    return null;
  }
  return item;
}

function takePendingAwait({ botId, flowId, blockId, userId, channelId, messageId, kind }) {
  const now = Date.now();
  for (const [key, item] of pendingAwaits) {
    if (item.expiresAt < now) {
      pendingAwaits.delete(key);
      continue;
    }
    if (botId && item.botId !== botId) continue;
    if (flowId && item.flowId !== flowId) continue;
    if (blockId && item.blockId !== blockId) continue;
    if (userId && item.userId !== userId) continue;
    if (channelId && item.channelId !== channelId) continue;
    if (messageId && item.messageId && item.messageId !== messageId) continue;
    if (kind && item.kind !== kind) continue;
    pendingAwaits.delete(key);
    return item;
  }
  return null;
}

function scheduleGiveaway({ message, channel, prize, winners, emoji, duration }) {
  const delay = Math.min(Math.max(Number(duration) || 24, 1) * 3600000, 2147483647);
  const timer = setTimeout(async () => {
    try {
      const fetched = await message.fetch().catch(() => message);
      const reaction = fetched.reactions?.cache?.get(emoji) || fetched.reactions?.cache?.first();
      const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
      const participants = users ? [...users.values()].filter((user) => !user.bot) : [];
      participants.sort(() => Math.random() - 0.5);
      const selected = participants.slice(0, Math.max(1, Number(winners) || 1));
      const text = selected.length
        ? `🎉 **Giveaway terminé !**\nLot : **${prize}**\nGagnant(s) : ${selected.map((user) => `<@${user.id}>`).join(', ')}`
        : `🎉 **Giveaway terminé !**\nLot : **${prize}**\nAucun participant valide.`;
      await channel.send({ content: text, allowedMentions: { users: selected.map((user) => user.id) } });
    } catch {
      // The giveaway message may have been deleted before the draw.
    }
  }, delay);
  timer.unref?.();
}


async function deliverFlowPayload({ output, target, payload, member, interaction, interactionUsed }) {
  if (output.dm) {
    if (!member?.send) return { sent: false, interactionUsed };
    const dmPayload = { ...payload };
    delete dmPayload.ephemeral;
    delete dmPayload.reply;
    const sentMessage = await sendInChunks((chunk) => member.send(chunk).catch(() => null), dmPayload);
    return { sent: Boolean(sentMessage), message: sentMessage, interactionUsed };
  }
  if (output.ephemeral && interaction) {
    const ephemeralPayload = { ...payload, ephemeral: true };
    delete ephemeralPayload.reply;
    if (interaction.deferred && !interactionUsed) {
      const sentMessage = await replyInteractionInChunks(interaction, ephemeralPayload, { ephemeral: true, mode: 'edit' });
      return { sent: true, message: sentMessage, interactionUsed: true };
    }
    if (interaction.replied || interactionUsed) {
      const sentMessage = await replyInteractionInChunks(interaction, ephemeralPayload, { ephemeral: true, mode: 'followUp' });
      return { sent: true, message: sentMessage, interactionUsed: true };
    }
    const sentMessage = await replyInteractionInChunks(interaction, ephemeralPayload, { ephemeral: true });
    return { sent: true, message: sentMessage, interactionUsed: true };
  }
  if (!target?.send) return { sent: false, interactionUsed };
  const sentMessage = await sendInChunks((chunk) => target.send(chunk).catch(() => null), payload);
  return { sent: Boolean(sentMessage), message: sentMessage, channel: target, interactionUsed };
}

function interactionInputText(interaction) {
  const options = [...(interaction?.options?.data || [])];
  while (options.length) {
    const option = options.shift();
    if (Array.isArray(option.options)) options.push(...option.options);
    if (typeof option.value === 'string' && option.value.trim()) return option.value.trim();
  }
  for (const field of interaction?.fields?.fields?.values?.() || []) {
    if (typeof field.value === 'string' && field.value.trim()) return field.value.trim();
  }
  return '';
}

async function executeFlow({ bot, ws, flow, guild, member, channel, message, interaction, startBlock, vars = {} }) {
  const runtime = ensureRuntime(bot.id);
  const user = member?.user || interaction?.user || message?.author;
  const roles = member?.roles?.cache ? member.roles.cache.map((role) => role.name) : [];
  if (!bot.flowDatabase || typeof bot.flowDatabase !== 'object') bot.flowDatabase = {};
  const persistedVars = Object.fromEntries(
    Object.entries(bot.flowDatabase).map(([key, value]) => [`db:${key}`, value]),
  );
  const historyKey = aiHistoryKey({ bot, guild, channel, member, interaction });
  const aiHistory = [...readAIHistory(historyKey)];
  const historyStart = aiHistory.length;
  const result = await runFlow(flow, {
    user: {
      name: member?.displayName || user?.globalName || user?.username || 'Membre',
      id: user?.id || '',
      mention: user ? `<@${user.id}>` : '',
      roles,
      createdTimestamp: user?.createdTimestamp || 0,
      bot: Boolean(user?.bot),
      hasAvatar: Boolean(user?.avatar),
    },
    server: guild?.name || 'Message privé',
    channel: channel?.name ? `#${channel.name}` : '',
    message: message?.content || interactionInputText(interaction),
    bot: bot.name,
    startBlock,
    vars: { ...persistedVars, ...vars },
    aiHistory,
  });
  for (const entry of aiHistory.slice(historyStart)) {
    rememberAIMessage(historyKey, entry.role, entry.content);
  }
  let lastMessage = null;
  let lastChannel = channel || null;
  let stopped = false;
  let sent = false;
  let interactionUsed = false;

  const serviceVarsNow = () => {
    try {
      const state = ensureServiceState(bot, guild?.id || 'dm');
      const id = String(user?.id || 'inconnu');
      const entry = state.members?.[id] || { id, name: serviceDisplayName(member, user), serviceMs: 0, penaltyMs: 0, startedAt: null };
      const now = Date.now();
      return serviceTokens(state, entry, { now, sinceMs: entry.startedAt ? Math.max(0, now - entry.startedAt) : 0 });
    } catch {
      return {};
    }
  };

  for (const rawOutput of result.outputs) {
    const liveService = serviceVarsNow();
    const outputVars = { ...liveService, ...result.variables };
    if (liveService.chrono !== undefined) {
      outputVars.chrono = liveService.chrono;
      outputVars.current_service = liveService.current_service;
    }
    const output = String(rawOutput.kind || '').startsWith('service')
      ? rawOutput
      : applyServiceTokensDeep(rawOutput, outputVars);
    try {
      switch (output.kind) {
        case 'message':
        case 'reply': {
          const target = resolveChannel(guild, output.channel) || channel;
          const payload = { content: output.text || ' ', allowedMentions: { parse: output.ping === false ? [] : ['users', 'roles'] } };
          if (output.tts) payload.tts = true;
          if (output.silent || output.suppressEmbeds) {
            payload.flags =
              (output.silent ? MessageFlags.SuppressNotifications : 0) |
              (output.suppressEmbeds ? MessageFlags.SuppressEmbeds : 0);
          }
          if (output.reply && message?.id) payload.reply = { messageReference: message.id, failIfNotExists: false };
          const delivered = await deliverFlowPayload({ output, target, payload, member, interaction, interactionUsed });
          interactionUsed = delivered.interactionUsed;
          if (delivered.message) {
            lastMessage = delivered.message;
            lastChannel = delivered.channel;
          }
          sent = delivered.sent;
          if (output.deleteAfter > 0 && delivered.message) {
            setTimeout(() => delivered.message.delete().catch(() => {}), Math.min(Number(output.deleteAfter) * 1000, 300000)).unref?.();
          }
          break;
        }
        case 'embed': {
          const target = resolveChannel(guild, output.channel) || channel;
          const payload = { embeds: [toEmbed(output.embed)] };
          if (output.silent || output.suppressEmbeds) {
            payload.flags =
              (output.silent ? MessageFlags.SuppressNotifications : 0) |
              (output.suppressEmbeds ? MessageFlags.SuppressEmbeds : 0);
          }
          const delivered = await deliverFlowPayload({ output, target, payload, member, interaction, interactionUsed });
          interactionUsed = delivered.interactionUsed;
          if (delivered.message) {
            lastMessage = delivered.message;
            lastChannel = delivered.channel;
          }
          sent = delivered.sent;
          if (output.deleteAfter > 0 && delivered.message) {
            setTimeout(() => delivered.message.delete().catch(() => {}), Math.min(Number(output.deleteAfter) * 1000, 300000)).unref?.();
          }
          break;
        }
        case 'dm': {
          const dmTarget = output.target ? (await resolveMember(guild, output.target)) || member : member;
          if (dmTarget) {
            const payload = output.embed
              ? { embeds: [toEmbed(output.embed)] }
              : { content: String(output.text || '') };
            await sendInChunks((chunk) => dmTarget.send(chunk), payload);
            sent = true;
          }
          break;
        }
        case 'buttons': {
          const target = resolveChannel(guild, output.channel) || channel;
          if (!target) break;
          const row = new ActionRowBuilder();
          output.buttons.slice(0, 5).forEach((entry, index) => {
            const button = new ButtonBuilder().setLabel(String(entry.label || 'Bouton').slice(0, 80));
            if (entry.emoji) button.setEmoji(entry.emoji);
            if (entry.disabled) button.setDisabled(true);
            if (entry.url) {
              button.setStyle(ButtonStyle.Link).setURL(entry.url);
            } else {
              const style =
                entry.style === 'success'
                  ? ButtonStyle.Success
                  : entry.style === 'danger'
                    ? ButtonStyle.Danger
                    : entry.style === 'secondary'
                      ? ButtonStyle.Secondary
                      : ButtonStyle.Primary;
              button.setStyle(style).setCustomId(`kf:${flow.id}:${output.blockId}:${index}`.slice(0, 100));
            }
            row.addComponents(button);
          });
          lastMessage = await target.send({ components: [row] });
          lastChannel = target;
          rememberPending(
            pendingButtons,
            pendingKey(flow.id, output.blockId, user?.id),
            { vars: result.variables },
            3600,
          );
          sent = true;
          break;
        }
        case 'react': {
          const target = lastMessage || message;
          if (target) await target.react(output.emoji || '✅');
          break;
        }
        case 'role': {
          const role = resolveRole(guild, output.role);
          if (role && member) {
            if (output.action === 'remove') await member.roles.remove(role, 'KyllBot Studio');
            else await member.roles.add(role, 'KyllBot Studio');
            if (Number(output.duration) > 0) {
              const unit = output.durationUnit === 'hours' ? 3600000 : output.durationUnit === 'minutes' ? 60000 : 1000;
              setTimeout(
                () => member.roles.remove(role, 'KyllBot Studio — durée écoulée').catch(() => {}),
                Math.min(Number(output.duration) * unit, 7 * 864e5),
              ).unref?.();
            }
          }
          break;
        }
        case 'pin': {
          const target = lastMessage || message;
          if (target) await (output.unpin ? target.unpin() : target.pin()).catch(() => {});
          break;
        }
        case 'delete': {
          const target = resolveChannel(guild, output.channel) || channel;
          const count = Math.min(Math.max(Number(output.count) || 1, 1), 100);
          if (count > 1 && target?.bulkDelete) {
            const messages = await target.messages.fetch({ limit: count }).catch(() => null);
            if (messages?.size) await target.bulkDelete(messages, true).catch(() => {});
          } else if (lastMessage) {
            await lastMessage.delete().catch(() => {});
          } else if (message) {
            await message.delete().catch(() => {});
          }
          break;
        }
        case 'cooldown': {
          const key = `${bot.id}:${flow.id}:${output.scope === 'channel' ? channel?.id || 'channel' : user?.id || 'user'}`;
          const now = Date.now();
          const until = flowCooldowns.get(key) || 0;
          if (until > now) {
            const remaining = Math.ceil((until - now) / 1000);
            if (interaction && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: `Patiente encore ${remaining}s avant de relancer ce flux.`, ephemeral: true }).catch(() => {});
              interactionUsed = true;
            } else if (channel?.send) {
              await channel.send({ content: `Patiente encore ${remaining}s avant de relancer ce flux.` }).catch(() => {});
            }
            stopped = true;
            break;
          }
          flowCooldowns.set(key, now + Math.max(1, Number(output.seconds) || 1) * 1000);
          if (flowCooldowns.size > 5000) {
            for (const [entry, value] of flowCooldowns) if (value < now) flowCooldowns.delete(entry);
          }
          break;
        }
        case 'wait':
          await sleep(Math.min(Number(output.seconds) || 0, 30) * 1000);
          break;
        case 'timer': {
          const target = resolveChannel(guild, output.channel) || channel;
          const delivered = await deliverFlowPayload({
            output,
            target,
            payload: { content: String(output.text || ' ') },
            member,
            interaction,
            interactionUsed,
          });
          interactionUsed = delivered.interactionUsed;
          const timerMessage = delivered.message;
          if (timerMessage) {
            lastMessage = timerMessage;
            lastChannel = delivered.channel;
          }
          sent = delivered.sent;
          const finish = async () => {
            const text = String(output.endText || '⏰ Temps écoulé !');
            await deliverFlowPayload({
              output,
              target,
              payload: { content: text },
              member,
              interaction,
              interactionUsed,
            });
          };
          const durationMs = Math.max(1000, Number(output.durationMs) || 1000);
          if (output.wait) {
            await sleep(Math.min(durationMs, 86400000));
            await finish();
          } else {
            const timer = setTimeout(() => { finish().catch(() => {}); }, Math.min(durationMs, 2147483647));
            timer.unref?.();
          }
          break;
        }
        case 'chrono': {
          const target = resolveChannel(guild, output.channel) || channel;
          if (output.action === 'service') {
            const state = ensureServiceState(bot, guild?.id || 'dm');
            const id = String(user?.id || 'inconnu');
            const entry = state.members?.[id] || { id, name: serviceDisplayName(member, user), serviceMs: 0, penaltyMs: 0, startedAt: null };
            const now = Date.now();
            const sinceMs = entry.startedAt ? Math.max(0, now - entry.startedAt) : 0;
            const tokens = { ...serviceTokens(state, entry, { now, sinceMs }), elapsed: formatDuration(sinceMs) };
            const template = entry.startedAt
              ? output.serviceText || '⏱️ {{member}} est en service depuis {{elapsed}}.'
              : output.emptyServiceText || '⚠️ Aucun service en cours pour {{member}}.';
            const delivered = await deliverFlowPayload({
              output,
              target,
              payload: { content: applyServiceTokens(template, tokens) },
              member,
              interaction,
              interactionUsed,
            });
            interactionUsed = delivered.interactionUsed;
            if (delivered.message) {
              lastMessage = delivered.message;
              lastChannel = delivered.channel;
            }
            sent = delivered.sent;
            break;
          }
          const variable = output.variable || 'chrono_start';
          const key = `${bot.id}:${guild.id}:${variable}`;
          if (output.action === 'start') {
            chronos.set(key, Date.now());
            const text = String(output.startText || '').trim();
            if (text) {
              const delivered = await deliverFlowPayload({
                output,
                target,
                payload: { content: text },
                member,
                interaction,
                interactionUsed,
              });
              interactionUsed = delivered.interactionUsed;
              if (delivered.message) {
                lastMessage = delivered.message;
                lastChannel = delivered.channel;
              }
              sent = delivered.sent;
            }
            break;
          }
          const started = chronos.get(key);
          if (!started) {
            await deliverFlowPayload({
              output,
              target,
              payload: { content: 'Aucun chronomètre démarré avec cette variable. Lance d’abord le bloc « Démarrer le chronomètre ».' },
              member,
              interaction,
              interactionUsed,
            });
            break;
          }
          chronos.delete(key);
          const elapsed = formatDuration(Date.now() - started);
          const template = String(output.stopText || '⏱️ Temps écoulé : __ELAPSED__');
          const text = template.replaceAll('__ELAPSED__', elapsed);
          {
            const delivered = await deliverFlowPayload({
              output,
              target,
              payload: { content: text },
              member,
              interaction,
              interactionUsed,
            });
            interactionUsed = delivered.interactionUsed;
            if (delivered.message) {
              lastMessage = delivered.message;
              lastChannel = delivered.channel;
            }
            sent = delivered.sent;
          }
          break;
        }
        case 'serviceStart': {
          const target = resolveChannel(guild, output.channel) || channel;
          const state = ensureServiceState(bot, guild?.id || 'dm');
          const entry = serviceEntry(state, user?.id, serviceDisplayName(member, user));
          const now = Date.now();
          let text;
          if (entry.startedAt) {
            Object.assign(result.variables, serviceTokens(state, entry, { now, sinceMs: now - entry.startedAt }));
            refreshServicePanels(bot, guild?.id || 'dm');
            text = applyServiceTokens(
              output.alreadyText || '⚠️ Service déjà en cours depuis {{since}}.',
              serviceTokens(state, entry, { now, sinceMs: now - entry.startedAt }),
            );
          } else {
            entry.startedAt = now;
            entry.name = serviceDisplayName(member, user);
            Object.assign(result.variables, serviceTokens(state, entry, { now }));
            persist();
            refreshServicePanels(bot, guild?.id || 'dm');
            text = applyServiceTokens(
              output.text || '▶️ Service démarré pour {{member}}.',
              serviceTokens(state, entry, { now }),
            );
          }
          if (text) {
            const delivered = await deliverFlowPayload({
              output,
              target,
              payload: { content: text },
              member,
              interaction,
              interactionUsed,
            });
            interactionUsed = delivered.interactionUsed;
            if (delivered.message) {
              lastMessage = delivered.message;
              lastChannel = delivered.channel;
            }
            sent = delivered.sent;
          }
          break;
        }
        case 'serviceStop': {
          const target = resolveChannel(guild, output.channel) || channel;
          const state = ensureServiceState(bot, guild?.id || 'dm');
          const userId = String(user?.id || 'inconnu');
          const existing = state.members[userId];
          const entry = existing || {
            id: userId,
            name: serviceDisplayName(member, user),
            serviceMs: 0,
            penaltyMs: 0,
            startedAt: null,
          };
          const now = Date.now();
          let text;
          let durationMs = 0;
          if (entry.startedAt) {
            durationMs = Math.max(0, now - Number(entry.startedAt));
            entry.serviceMs = Math.max(0, Number(entry.serviceMs) || 0) + durationMs;
            entry.startedAt = null;
            entry.name = serviceDisplayName(member, user);
            Object.assign(result.variables, serviceTokens(state, entry, { now, durationMs }));
            persist();
            refreshServicePanels(bot, guild?.id || 'dm');
            text = applyServiceTokens(
              output.text || '⏹️ Service terminé : {{duration}} ajoutées.',
              serviceTokens(state, entry, { now, durationMs }),
            );
          } else {
            Object.assign(result.variables, serviceTokens(state, entry, { now }));
            text = applyServiceTokens(
              output.emptyText || '⚠️ Aucun service en cours pour {{member}}.',
              serviceTokens(state, entry, { now }),
            );
          }
          if (text) {
            const delivered = await deliverFlowPayload({
              output,
              target,
              payload: { content: text },
              member,
              interaction,
              interactionUsed,
            });
            interactionUsed = delivered.interactionUsed;
            if (delivered.message) {
              lastMessage = delivered.message;
              lastChannel = delivered.channel;
            }
            sent = delivered.sent;
          }
          break;
        }
        case 'servicePenalty': {
          const target = resolveChannel(guild, output.channel) || channel;
          const pending = {
            flowId: flow.id,
            blockId: output.blockId,
            next: output.next,
            vars: result.variables,
            botId: bot.id,
            userId: user?.id,
            channelId: channel?.id,
          };
          rememberPending(
            pendingServicePenalties,
            pendingKey(flow.id, output.blockId, user?.id),
            pending,
            900,
          );
          if (interaction && !interaction.replied && !interaction.deferred) {
            try {
              await interaction.showModal(buildServicePenaltyModal(flow, { id: output.blockId, title: output.title }));
              interactionUsed = true;
              sent = true;
              break;
            } catch (error) {
              log(runtime, 'warn', `Formulaire de pénalité direct impossible : ${error.message}. Repli sur un bouton.`);
            }
          }
          if (!target?.send) break;
          const openButton = new ButtonBuilder()
            .setCustomId(`kfservicepenalty:${flow.id}:${output.blockId}`)
            .setLabel('Ouvrir la pénalité')
            .setStyle(ButtonStyle.Primary);
          lastMessage = await target.send({
            content: `**${String(output.title || 'Pénalité de service').slice(0, 200)}**`,
            components: [new ActionRowBuilder().addComponents(openButton)],
          }).catch(() => null);
          if (lastMessage) {
            lastChannel = target;
            sent = true;
          }
          break;
        }
        case 'serviceLeaderboard': {
          const target = resolveChannel(guild, output.channel) || channel;
          const state = ensureServiceState(bot, guild?.id || 'dm');
          const now = Date.now();
          const entries = Object.values(state.members)
            .map((entry) => ({ ...serviceTotals(entry, now), name: entry.name || entry.id || 'Membre', id: entry.id, startedAt: entry.startedAt }))
            .filter((entry) => entry.serviceMs > 0 || entry.penaltyMs > 0 || entry.liveMs > 0 || entry.startedAt)
            .sort((a, b) => b.totalMs - a.totalMs || b.serviceMs - a.serviceMs || a.name.localeCompare(b.name, 'fr'));
          const top = Math.max(1, Math.min(25, Number(output.top) || 10));
          const lines = entries.slice(0, top).map((entry, index) => {
            const name = String(entry.name || 'Membre').replace(/@/g, '@\u200b');
            return `**${index + 1}.** ${name} — Service : ${formatDuration(entry.serviceMs)} · Pénalité : ${formatDuration(entry.penaltyMs)} · Total : ${formatSignedDuration(entry.totalMs)}${entry.liveMs > 0 ? ' · en service' : ''}`;
          });
          const period = servicePeriodLabel(state);
          const reset = serviceResetLabel(state.config);
          Object.assign(result.variables, { period, reset });
          const title = applyServiceTokens(output.title || 'Classement du service', result.variables);
          const embed = new EmbedBuilder()
            .setTitle(String(title).slice(0, 256))
            .setDescription((lines.length ? lines.join('\n') : 'Aucun temps de service enregistré pour cette période.').slice(0, 4096))
            .setColor(0x7c5cff)
            .setFooter({ text: `${period} · remise à zéro ${reset}` });
          {
            const delivered = await deliverFlowPayload({
              output,
              target,
              payload: { embeds: [embed] },
              member,
              interaction,
              interactionUsed,
            });
            interactionUsed = delivered.interactionUsed;
            if (delivered.message) {
              lastMessage = delivered.message;
              lastChannel = delivered.channel;
            }
            sent = delivered.sent;
          }
          break;
        }
        case 'serviceOnline': {
          const target = resolveChannel(guild, output.channel) || channel;
          if (!target?.send) break;
          const guildId = guild?.id || 'dm';
          const interval = Number(output.interval) === 30 ? 30 : 60;
          const key = `${bot.id}:${guildId}:${target.id}:${flow.id}:${output.blockId}`;
          const previous = servicePanels.get(key);
          const config = {
            title: output.title,
            emptyText: output.emptyText,
            interval,
            maxEntries: output.maxEntries,
          };
          const state = ensureServiceState(bot, guildId);
          const embed = serviceOnlineEmbed({ state, ...config });
          let panelMessage = previous?.message
            ? await previous.message.edit({ embeds: [embed] }).catch(() => null)
            : null;
          if (!panelMessage) {
            const delivered = await deliverFlowPayload({
              output,
              target,
              payload: { embeds: [embed] },
              member,
              interaction,
              interactionUsed,
            });
            interactionUsed = delivered.interactionUsed;
            panelMessage = delivered.message || null;
            if (delivered.message) {
              lastMessage = delivered.message;
              lastChannel = delivered.channel;
            }
            sent = delivered.sent;
          }
          if (!panelMessage) break;
          startServicePanel({ bot, guildId, channel: target, message: panelMessage, config, key });
          rememberServicePanel(bot, {
            key,
            guildId,
            channelId: target.id,
            messageId: panelMessage.id,
            flowId: flow.id,
            blockId: output.blockId,
            ...config,
          });
          lastMessage = panelMessage;
          lastChannel = target;
          sent = true;
          break;
        }
        case 'serviceConfig': {
          const target = resolveChannel(guild, output.channel) || channel;
          const state = ensureServiceState(bot, guild?.id || 'dm');
          const nextConfig = {
            period: output.period === 'month' ? 'month' : 'week',
            resetDay: Math.min(7, Math.max(1, Number(output.resetDay) || 1)),
            resetHour: Math.min(23, Math.max(0, Number(output.resetHour) || 0)),
            timezone: safeTimezone(output.timezone),
          };
          const configChanged = JSON.stringify(state.config) !== JSON.stringify(nextConfig);
          state.config = nextConfig;
          if (configChanged) {
            state.periodKey = null;
            state.members = {};
          }
          ensureServiceState(bot, guild?.id || 'dm');
          persist();
          refreshServicePanels(bot, guild?.id || 'dm');
          const tokens = {
            ...result.variables,
            period: servicePeriodLabel(state),
            reset: serviceResetLabel(state.config),
          };
          Object.assign(result.variables, tokens);
          const text = applyServiceTokens(
            output.message || '✅ Période du service : {{period}} (reset {{reset}}).',
            tokens,
          );
          if (text) {
            const delivered = await deliverFlowPayload({
              output,
              target,
              payload: { content: text },
              member,
              interaction,
              interactionUsed,
            });
            interactionUsed = delivered.interactionUsed;
            if (delivered.message) {
              lastMessage = delivered.message;
              lastChannel = delivered.channel;
            }
            sent = delivered.sent;
          }
          break;
        }
        case 'serviceReset': {
          const target = resolveChannel(guild, output.channel) || channel;
          const state = ensureServiceState(bot, guild?.id || 'dm');
          state.members = {};
          persist();
          refreshServicePanels(bot, guild?.id || 'dm');
          const tokens = { ...result.variables, period: servicePeriodLabel(state), reset: serviceResetLabel(state.config) };
          Object.assign(result.variables, tokens);
          const text = applyServiceTokens(
            output.message || '🧹 Les compteurs du service ont été réinitialisés.',
            tokens,
          );
          if (text) {
            const delivered = await deliverFlowPayload({
              output,
              target,
              payload: { content: text },
              member,
              interaction,
              interactionUsed,
            });
            interactionUsed = delivered.interactionUsed;
            if (delivered.message) {
              lastMessage = delivered.message;
              lastChannel = delivered.channel;
            }
            sent = delivered.sent;
          }
          break;
        }
        case 'typing': {
          const target = lastChannel || channel;
          if (target?.sendTyping) await target.sendTyping();
          break;
        }
        case 'webhook': {
          if (output.url) {
            const method = String(output.method || 'POST').toUpperCase();
            const request = { method };
            if (method !== 'GET') {
              request.headers = { 'Content-Type': 'application/json' };
              request.body = output.body || '{}';
            }
            await safeFetch(output.url, request);
          }
          break;
        }
        case 'log': {
          const logChannel = resolveChannel(guild, bot.discord?.logChannel || 'logs');
          if (logChannel) await sendInChunks((chunk) => logChannel.send(chunk), { content: String(output.text || '') });
          break;
        }
        case 'thread': {
          const target = lastMessage || message;
          if (target?.startThread) {
            await target.startThread({
              name: String(output.name || 'Discussion').slice(0, 100),
              autoArchiveDuration: [60, 1440, 4320, 10080].includes(Number(output.archive)) ? Number(output.archive) : 1440,
              reason: 'KyllBot Studio',
            });
          }
          break;
        }
        case 'edit': {
          const target = lastMessage || message;
          if (target?.edit) {
            if (output.embed) {
              await target.edit({
                content: null,
                embeds: [
                  toEmbed({
                    title: output.title,
                    description: output.description || output.text,
                    color: output.color,
                  }),
                ],
              });
            } else {
              await target.edit({ content: String(output.text || ' ').slice(0, 2000) });
            }
            lastMessage = target;
          }
          break;
        }
        case 'forum': {
          const target = resolveChannel(guild, output.channel) || channel;
          if (target?.threads?.create) {
            const availableTags = target.availableTags || [];
            const wantedTags = String(output.tags || '')
              .split(',')
              .map((tag) => tag.trim().toLowerCase())
              .filter(Boolean);
            const appliedTags = availableTags
              .filter((tag) => wantedTags.includes(String(tag.name || '').toLowerCase()))
              .slice(0, 5)
              .map((tag) => tag.id);
            const threadOptions = {
              name: String(output.title || 'Nouveau post').slice(0, 100),
              message: { content: String(output.content || '').slice(0, 2000) || ' ' },
              reason: 'KyllBot Studio',
            };
            if (target.type === ChannelType.GuildForum && appliedTags.length) threadOptions.appliedTags = appliedTags;
            const thread = await target.threads.create(threadOptions);
            lastChannel = thread;
            lastMessage = await thread.fetchStarterMessage().catch(() => null);
            sent = true;
          } else if (target?.send) {
            lastMessage = await target.send({
              content: `**${String(output.title || 'Nouveau post').slice(0, 200)}**\n${String(output.content || '').slice(0, 1800)}`,
            });
            lastChannel = target;
            sent = true;
          }
          break;
        }
        case 'forumAction': {
          const target = resolveForumPost(guild, output.post, output.channel, channel, lastChannel);
          if (!target?.send) {
            if (channel?.send) await channel.send({ content: 'Aucun post de forum trouvé. Vérifie le nom du post ou utilise ce bloc dans un post.' }).catch(() => {});
            break;
          }
          if (output.action === 'close') {
            const reason = String(output.reason || 'Post fermé par le staff.').slice(0, 200);
            await sendInChunks((chunk) => target.send(chunk), { content: String(output.content || '🔒 Post fermé.') }).catch(() => {});
            if (target.setLocked) await target.setLocked(true, reason).catch(() => {});
            if (target.setArchived) await target.setArchived(true, reason).catch(() => {});
          } else {
            lastMessage = await sendInChunks((chunk) => target.send(chunk), { content: String(output.content || ' ') });
            lastChannel = target;
            sent = true;
          }
          break;
        }
        case 'forumDelete': {
          const target = resolveForumPost(guild, output.post, output.channel, channel, lastChannel);
          if (!target?.messages) {
            log(runtime, 'warn', 'Bloc suppression forum : post introuvable.');
            break;
          }
          const ref = String(output.message || '').trim();
          let targetMessage = null;
          if (!ref || ref.toLowerCase() === 'last' || ref.toLowerCase() === 'dernier') {
            if (lastMessage?.channelId === target.id) targetMessage = lastMessage;
            if (!targetMessage) {
              const recent = await target.messages.fetch({ limit: 1 }).catch(() => null);
              targetMessage = recent?.first() || null;
            }
          } else if (/^\d{17,20}$/.test(ref)) {
            targetMessage = await target.messages.fetch(ref).catch(() => null);
          } else {
            const recent = await target.messages.fetch({ limit: 50 }).catch(() => null);
            targetMessage = recent?.find((entry) => String(entry.content || '').toLowerCase().includes(ref.toLowerCase())) || null;
          }
          if (!targetMessage) {
            log(runtime, 'warn', `Bloc suppression forum : message « ${ref || 'dernier'} » introuvable.`);
            break;
          }
          await targetMessage.delete().catch((error) => log(runtime, 'warn', `Bloc suppression forum : ${error.message}`));
          break;
        }
        case 'ai': {
          const target = resolveChannel(guild, output.channel) || channel;
          if (!target) break;
          const text = output.text || 'Je n’ai pas pu générer de réponse.';
          lastMessage = await sendInChunks((chunk) => target.send(chunk), { content: String(text), allowedMentions: { parse: [] } });
          lastChannel = target;
          sent = true;
          break;
        }
        case 'image': {
          const target = resolveChannel(guild, output.channel) || channel;
          if (target && output.url) {
            lastMessage = await target.send({ content: output.url });
            lastChannel = target;
            sent = true;
          }
          break;
        }
        case 'music': {
          if (!guild) break;
          if (output.action === 'stop') {
            const stoppedMusic = stopMusicSession(guild.id);
            if (interaction && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: stoppedMusic ? 'Musique arrêtée.' : 'Aucune musique en cours.', ephemeral: true }).catch(() => {});
              interactionUsed = true;
            } else if (channel?.send) {
              await channel.send({ content: stoppedMusic ? 'Musique arrêtée.' : 'Aucune musique en cours.' }).catch(() => {});
            }
            break;
          }
          const url = String(output.url || '').trim();
          if (!url) {
            if (interaction && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: 'Ajoute une URL audio directe au bloc Musique.', ephemeral: true }).catch(() => {});
              interactionUsed = true;
            } else if (channel?.send) {
              await channel.send({ content: 'Ajoute une URL audio directe au bloc Musique.' }).catch(() => {});
            }
            break;
          }
          if (output.mode === 'personal') {
            const content = `🎵 ${output.title ? `**${String(output.title).slice(0, 100)}** — ` : ''}${url}`;
            if (interaction && !interaction.replied && !interaction.deferred) {
              await replyInteractionInChunks(interaction, { content }, { ephemeral: true }).catch(() => {});
              interactionUsed = true;
            } else if (user?.send) {
              await user.send({ content }).catch(() => {});
            } else if (channel?.send) {
              await channel.send({ content: user ? `<@${user.id}> ${content}` : content }).catch(() => {});
            }
            break;
          }
          const voiceChannel = resolveChannel(guild, output.channel) || member?.voice?.channel;
          if (!voiceChannel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(voiceChannel.type)) {
            if (interaction && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: 'Rejoins d’abord un salon vocal, ou choisis un salon vocal dans le bloc.', ephemeral: true }).catch(() => {});
              interactionUsed = true;
            } else if (channel?.send) {
              await channel.send({ content: 'Rejoins d’abord un salon vocal, ou choisis un salon vocal dans le bloc.' }).catch(() => {});
            }
            break;
          }
          try {
            const voice = await import('@discordjs/voice');
            stopMusicSession(guild.id);
            const connection = voice.joinVoiceChannel({
              channelId: voiceChannel.id,
              guildId: guild.id,
              adapterCreator: guild.voiceAdapterCreator,
              selfDeaf: true,
            });
            const player = voice.createAudioPlayer();
            const volumePct = Number(output.volume);
            const volume = Math.min(2, Math.max(0, (Number.isFinite(volumePct) ? volumePct : 80) / 100));
            const makeResource = async () => {
              const response = await safeFetch(url);
              if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
              const resource = voice.createAudioResource(Readable.fromWeb(response.body), { inlineVolume: true, inputType: voice.StreamType.Arbitrary });
              resource.volume?.setVolume(volume);
              return resource;
            };
            const session = { player, connection, stopped: false, loop: Boolean(output.loop), url, volume };
            musicSessions.set(guild.id, session);
            connection.subscribe(player);
            player.play(await makeResource());
            player.on(voice.AudioPlayerStatus.Idle, () => {
              if (session.stopped) return;
              if (session.loop) {
                makeResource().then((resource) => player.play(resource)).catch(() => stopMusicSession(guild.id));
              } else {
                stopMusicSession(guild.id);
              }
            });
            player.on('error', () => stopMusicSession(guild.id));
            const notice = `🎶 **${String(output.title || 'Musique').slice(0, 100)}** en lecture dans ${voiceChannel}.`;
            if (interaction && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: notice, ephemeral: true }).catch(() => {});
              interactionUsed = true;
            } else if (channel?.send) {
              lastMessage = await channel.send({ content: notice }).catch(() => null);
              sent = Boolean(lastMessage);
            }
          } catch (error) {
            stopMusicSession(guild.id);
            log(runtime, 'warn', `Bloc musique : ${error.message}`);
            if (interaction && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: `Impossible de lancer la musique : ${error.message}`, ephemeral: true }).catch(() => {});
              interactionUsed = true;
            } else if (channel?.send) {
              await channel.send({ content: `Impossible de lancer la musique : ${error.message}` }).catch(() => {});
            }
          }
          break;
        }
        case 'poll': {
          const target = resolveChannel(guild, output.channel) || channel;
          const options = [...new Set((output.options || []).map((option) => String(option).trim()).filter(Boolean))].slice(0, 10);
          if (!target || !options.length) break;
          if (options.length >= 2) {
            try {
              lastMessage = await target.send({
                poll: {
                  question: { text: String(output.question || 'Sondage').slice(0, 300) },
                  answers: options.map((option) => ({ text: String(option).slice(0, 55) })),
                  duration: Math.min(Math.max(Number(output.duration) || 24, 1), 768),
                  allowMultiselect: Boolean(output.multiple),
                },
              });
              lastChannel = target;
              sent = true;
              break;
            } catch (error) {
              log(runtime, 'warn', `Sondage natif indisponible : ${error.message}. Repli sur les réactions.`);
            }
          }
          const text = `**${output.question || 'Sondage'}**\n${options.map((option, index) => `${index + 1}. ${option}`).join('\n')}`;
          lastMessage = await sendInChunks((chunk) => target.send(chunk), { content: text });
          for (let index = 0; index < Math.min(options.length, 9); index += 1) {
            await lastMessage.react(`${index + 1}\u20e3`).catch(() => {});
          }
          lastChannel = target;
          sent = true;
          break;
        }
        case 'select': {
          const target = resolveChannel(guild, output.channel) || channel;
          const options = [...new Set((output.options || []).map((option) => String(option).trim()).filter(Boolean))].slice(0, 25);
          if (!target || !options.length) break;
          const min = Math.min(Math.max(Number(output.min) || 1, 1), options.length);
          const max = Math.min(Math.max(Number(output.max) || 1, min), options.length);
          const menu = new StringSelectMenuBuilder()
            .setCustomId(`kfsel:${flow.id}:${output.blockId}`)
            .setPlaceholder(String(output.placeholder || 'Choisissez…').slice(0, 150))
            .setMinValues(min)
            .setMaxValues(max)
            .addOptions(
              options.map((option) =>
                new StringSelectMenuOptionBuilder().setLabel(String(option).slice(0, 100)).setValue(String(option).slice(0, 100)),
              ),
            );
          rememberPending(
            pendingSelects,
            pendingKey(flow.id, output.blockId, user?.id),
            {
              flowId: flow.id,
              blockId: output.blockId,
              next: output.next,
              vars: result.variables,
              botId: bot.id,
              userId: user?.id,
              channelId: channel?.id,
            },
            900,
          );
          lastMessage = await target.send({ components: [new ActionRowBuilder().addComponents(menu)] });
          lastChannel = target;
          sent = true;
          break;
        }
        case 'modal': {
          const target = resolveChannel(guild, output.channel) || channel;
          const sourceBlock = (flow.blocks || []).find((entry) => entry.id === output.blockId) || {};
          const modalBlock = {
            id: output.blockId,
            title: output.title || sourceBlock.title,
            fields: sourceBlock.fields || output.fields || [],
          };
          const { modal } = buildModal(flow, modalBlock, 0);
          rememberPending(
            pendingModals,
            pendingKey(flow.id, output.blockId, user?.id),
            {
              flowId: flow.id,
              blockId: output.blockId,
              next: output.next,
              vars: result.variables,
              values: {},
              page: 0,
              botId: bot.id,
              userId: user?.id,
              channelId: channel?.id,
            },
            900,
          );
          if (interaction && !interaction.replied && !interaction.deferred) {
            try {
              await interaction.showModal(modal);
              interactionUsed = true;
              sent = true;
              break;
            } catch (error) {
              log(runtime, 'warn', `Formulaire direct impossible : ${error.message}. Repli sur un bouton.`);
            }
          }
          if (!target) break;
          const openButton = new ButtonBuilder()
            .setCustomId(`kfmodal:${flow.id}:${output.blockId}`)
            .setLabel('Ouvrir le formulaire')
            .setStyle(ButtonStyle.Primary);
          lastMessage = await target.send({
            content: `**${String(output.title || 'Formulaire').slice(0, 200)}**`,
            components: [new ActionRowBuilder().addComponents(openButton)],
          });
          lastChannel = target;
          sent = true;
          break;
        }
        case 'giveaway': {
          const target = resolveChannel(guild, output.channel) || channel;
          if (!target) break;
          const duration = Math.min(Math.max(Number(output.duration) || 24, 1), 720);
          const endsAt = Math.floor(Date.now() / 1000) + duration * 3600;
          const emoji = String(output.emoji || '🎉');
          const embed = new EmbedBuilder()
            .setTitle(`🎉 Giveaway — ${String(output.prize || 'Lot à gagner').slice(0, 200)}`)
            .setDescription(
              `Réagis avec ${emoji} pour participer !\nFin : <t:${endsAt}:R>\nGagnant(s) : **${Number(output.winners) || 1}**`,
            )
            .setColor(0x7c5cff)
            .setTimestamp();
          lastMessage = await target.send({ embeds: [embed] });
          await lastMessage.react(emoji).catch(() => {});
          scheduleGiveaway({
            message: lastMessage,
            channel: target,
            prize: output.prize,
            winners: output.winners,
            emoji,
            duration,
          });
          lastChannel = target;
          sent = true;
          break;
        }
        case 'await': {
          const target = lastMessage || message;
          const timeout = Math.min(Math.max(Number(output.timeout) || 60, 5), 3600);
          rememberPending(
            pendingAwaits,
            pendingKey(flow.id, output.blockId, user?.id),
            {
              flowId: flow.id,
              blockId: output.blockId,
              next: output.next,
              vars: result.variables,
              botId: bot.id,
              userId: user?.id,
              channelId: channel?.id,
              messageId: target?.id || null,
              kind: output.interaction,
            },
            timeout,
          );
          if (output.interaction === 'button') {
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`kfawait:${flow.id}:${output.blockId}`)
                .setLabel('Continuer')
                .setStyle(ButtonStyle.Primary),
            );
            lastMessage = await channel.send({ content: 'Clique sur **Continuer** pour poursuivre le flux.', components: [row] });
            lastChannel = channel;
            sent = true;
          } else if (output.interaction === 'reaction') {
            if (!target) {
              lastMessage = await channel.send({ content: 'Réagis avec ✅ pour poursuivre le flux.' });
              lastChannel = channel;
            }
            const reactionTarget = lastMessage || target;
            if (reactionTarget) await reactionTarget.react('✅').catch(() => {});
            sent = sent || Boolean(reactionTarget);
          } else {
            lastMessage = await channel.send({ content: 'Envoie un message pour poursuivre le flux.' });
            lastChannel = channel;
            sent = true;
          }
          break;
        }
        case 'captcha': {
          const target = resolveChannel(guild, output.channel) || channel;
          if (!target) break;
          const timeout = Math.min(Math.max(Number(output.timeout) || 120, 10), 3600);
          rememberPending(
            pendingCaptchas,
            pendingKey(flow.id, output.blockId, user?.id),
            {
              flowId: flow.id,
              blockId: output.blockId,
              next: output.next,
              vars: result.variables,
              botId: bot.id,
              userId: user?.id,
              channelId: channel?.id,
              role: output.role,
            },
            timeout,
          );
          if (output.mode === 'modal' && interaction && !interaction.replied && !interaction.deferred) {
            try {
              await interaction.showModal(buildCaptchaModal(flow, { id: output.blockId }));
              interactionUsed = true;
              sent = true;
              break;
            } catch (error) {
              log(runtime, 'warn', `Vérification modale impossible : ${error.message}. Repli sur un bouton.`);
            }
          }
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(output.mode === 'modal' ? `kfcaptchamodal:${flow.id}:${output.blockId}` : `kfcaptcha:${flow.id}:${output.blockId}`)
              .setLabel(output.mode === 'modal' ? 'Ouvrir la vérification' : 'Je ne suis pas un robot')
              .setEmoji('✅')
              .setStyle(ButtonStyle.Success),
          );
          lastMessage = await target.send({
            content: `**Vérification**\n${output.mode === 'modal' ? 'Ouvre le formulaire et écris **OK** pour confirmer.' : 'Clique sur le bouton ci-dessous pour confirmer que tu es humain.'} Tu as ${timeout} secondes.`,
            components: [row],
          });
          lastChannel = target;
          sent = true;
          break;
        }
        case 'ticket': {
          if (!guild) break;
          if (output.action === 'open') {
            const created = await createTicketChannel({
              bot,
              guild,
              member,
              user,
              config: {
                category: output.category,
                reason: output.reason,
                staffRole: output.staffRole,
                logChannel: output.logChannel,
                welcomeMessage: output.welcomeMessage,
                maxOpen: output.maxOpen,
                namePrefix: output.namePrefix,
              },
              source: 'flux',
            }).catch((error) => ({ ok: false, error: `Impossible de créer le ticket : ${error.message}` }));
            if (created.ok) {
              lastChannel = created.channel;
              lastMessage = null;
              sent = true;
            } else if (interaction && !interaction.replied && !interaction.deferred) {
              await interaction.reply({ content: created.error, ephemeral: true }).catch(() => {});
              interactionUsed = true;
            } else {
              await channel?.send?.({ content: created.error }).catch(() => {});
            }
          } else if (output.action === 'claim') {
            if (channel?.setTopic) {
              await channel.setTopic(`Ticket réclamé par ${user?.tag || user?.username || 'staff'}`).catch(() => {});
            }
            await channel?.send?.({ content: `✅ Ticket réclamé par ${user ? `<@${user.id}>` : 'le staff'}.` }).catch(() => {});
          } else if (output.action === 'close') {
            const meta = ticketMeta.get(channel?.id) || {};
            await channel?.send?.({ content: `🔒 Ticket fermé par ${user ? `<@${user.id}>` : 'le staff'}. Suppression dans 3 secondes…` }).catch(() => {});
            await sendLog(
              guild,
              bot,
              `🔒 Ticket fermé par ${user?.tag || user?.username || 'staff'} · #${channel?.name || 'ticket'}`,
              ticketLogChannel(bot, meta),
            );
            if (channel?.id) ticketMeta.delete(channel.id);
            const closing = channel;
            const timer = setTimeout(() => {
              if (closing?.delete) closing.delete('Ticket fermé — KyllBot Studio').catch(() => {});
            }, 3000);
            timer.unref?.();
          }
          break;
        }
        case 'var':
          if (output.databaseAction === 'set' && output.databaseKey) {
            bot.flowDatabase[output.databaseKey] = output.value;
            persist();
          }
          break;
        case 'automationRun': {
          const automationType = String(output.automationType || '').trim();
          if (!automationType) break;
          const count = await runTriggeredFlows({
            bot,
            ws,
            type: 'automation',
            guild,
            member,
            channel,
            message,
            interaction: null,
            match: automationType,
            vars: { automation: automationType, automationLabel: automationType },
          });
          if (output.notify !== false) log(runtime, 'info', `Automatisation « ${automationType} » déclenchée par un flux (${count} réaction(s)).`);
          break;
        }
        case 'accountCheck': {
          if (!output.pass) {
            const target = resolveChannel(guild, output.channel) || channel;
            const content = String(output.text || '🚫 Ton compte ne remplit pas les conditions.');
            if (interaction && !interaction.replied && !interaction.deferred) {
              await replyInteractionInChunks(interaction, { content }, { ephemeral: true }).catch(() => {});
              interactionUsed = true;
            } else if (target?.send) {
              await sendInChunks((chunk) => target.send(chunk), { content, allowedMentions: { users: user?.id ? [user.id] : [] } }).catch(() => {});
            }
            if (output.stop) stopped = true;
          }
          break;
        }
        case 'moderation': {
          const action = output.action || 'warn';
          const targetMember = output.target ? await resolveMember(guild, output.target) : member;
          const targetChannel = resolveChannel(guild, output.channel) || channel;
          const reason = String(output.reason || 'KyllBot Studio').slice(0, 500);
          const unitMs = output.durationUnit === 'days' ? 86400000 : output.durationUnit === 'hours' ? 3600000 : 60000;
          const durationMs = Math.min(Math.max(1, Number(output.duration) || 10) * unitMs, 28 * 86400000);
          let detail = '';
          try {
            switch (action) {
              case 'warn':
                detail = 'avertissement envoyé';
                break;
              case 'timeout':
                if (!targetMember) throw new Error('membre introuvable');
                await targetMember.timeout(durationMs, reason);
                detail = `exclusion de ${formatDuration(durationMs)}`;
                break;
              case 'kick':
                if (!targetMember) throw new Error('membre introuvable');
                await targetMember.kick(reason);
                detail = 'membre expulsé';
                break;
              case 'ban':
                if (!targetMember) throw new Error('membre introuvable');
                await targetMember.ban({ reason, deleteMessageSeconds: Math.min((Number(output.deleteDays) || 0) * 86400, 604800) });
                detail = 'membre banni';
                break;
              case 'softban':
                if (!targetMember) throw new Error('membre introuvable');
                await targetMember.ban({ reason, deleteMessageSeconds: 604800 });
                await guild.members.unban(targetMember.id, reason).catch(() => {});
                detail = 'softban appliqué';
                break;
              case 'unban': {
                let id = String(output.target || '').match(/\d{17,20}/)?.[0];
                if (!id) {
                  const needle = String(output.target || '').replace(/^@/, '').trim().toLowerCase();
                  const bans = await guild.bans.fetch().catch(() => null);
                  const found = bans?.find(
                    (entry) => entry.user.username.toLowerCase() === needle || entry.user.tag.toLowerCase() === needle,
                  );
                  id = found?.user.id;
                }
                if (!id) throw new Error('identifiant introuvable');
                await guild.members.unban(id, reason);
                detail = 'membre débanni';
                break;
              }
              case 'purge': {
                if (!targetChannel?.bulkDelete) throw new Error('salon introuvable');
                const messages = await targetChannel.messages.fetch({ limit: Math.min(100, Math.max(1, Number(output.amount) || 10)) });
                await targetChannel.bulkDelete(messages, true);
                detail = `${messages.size} message(s) supprimé(s)`;
                break;
              }
              case 'slowmode':
                if (!targetChannel?.setRateLimitPerUser) throw new Error('salon introuvable');
                await targetChannel.setRateLimitPerUser(Math.min(21600, Math.max(0, Number(output.seconds) || 0)), reason);
                detail = `ralenti à ${Number(output.seconds) || 0} s`;
                break;
              case 'lock':
              case 'unlock':
                if (!targetChannel?.permissionOverwrites) throw new Error('salon introuvable');
                await targetChannel.permissionOverwrites.edit(guild.roles.everyone, {
                  SendMessages: action === 'unlock' ? null : false,
                });
                detail = action === 'lock' ? 'salon verrouillé' : 'salon déverrouillé';
                break;
              case 'roleAdd':
              case 'roleRemove': {
                const role = resolveRole(guild, output.role);
                if (!role || !targetMember) throw new Error('rôle ou membre introuvable');
                if (action === 'roleAdd') await targetMember.roles.add(role, reason);
                else await targetMember.roles.remove(role, reason);
                detail = `rôle ${role.name} ${action === 'roleAdd' ? 'ajouté' : 'retiré'}`;
                break;
              }
              case 'nickname':
                if (!targetMember) throw new Error('membre introuvable');
                await targetMember.setNickname(String(output.nickname || '').slice(0, 32), reason);
                detail = 'pseudo modifié';
                break;
              case 'voiceMute':
              case 'voiceUnmute':
              case 'voiceDeafen':
              case 'voiceUndeafen':
                if (!targetMember?.voice) throw new Error('membre introuvable');
                if (action === 'voiceMute') await targetMember.voice.setMute(true, reason);
                if (action === 'voiceUnmute') await targetMember.voice.setMute(false, reason);
                if (action === 'voiceDeafen') await targetMember.voice.setDeaf(true, reason);
                if (action === 'voiceUndeafen') await targetMember.voice.setDeaf(false, reason);
                detail = 'état vocal modifié';
                break;
              case 'voiceMove': {
                const voiceChannel = resolveChannel(guild, output.channel);
                if (!targetMember?.voice || !voiceChannel) throw new Error('salon vocal introuvable');
                await targetMember.voice.setChannel(voiceChannel);
                detail = 'membre déplacé';
                break;
              }
              case 'dm':
                if (!targetMember) throw new Error('membre introuvable');
                await sendInChunks((chunk) => targetMember.send(chunk), { content: String(output.notifyMessage || output.reason || 'Message du staff') }).catch(() => {});
                detail = 'message privé envoyé';
                break;
              case 'log':
                detail = String(output.evidence || reason).slice(0, 500);
                break;
              default:
                detail = action;
            }
            if (output.notify !== false && targetMember && ['warn', 'timeout', 'kick', 'ban', 'softban'].includes(action)) {
              const notify = String(output.notifyMessage || 'Tu as reçu une sanction : {{reason}}').replaceAll('{{reason}}', reason);
              await sendInChunks((chunk) => targetMember.send(chunk), { content: notify }).catch(() => {});
            }
            await sendLog(guild, bot, `🛡️ **${action}** · ${targetMember?.user?.tag || output.target || user?.tag || 'membre'} · ${detail}${reason ? ` · raison : ${reason}` : ''}`, output.logChannel);
            if (action !== 'log' && output.logChannel && targetChannel?.send) {
              await targetChannel.send({ content: `🛡️ ${action} : ${detail}` }).catch(() => {});
            }
            result.variables.moderation_ok = true;
            result.variables.moderation_action = action;
          } catch (error) {
            result.variables.moderation_ok = false;
            result.variables.moderation_error = error.message;
            if (targetChannel?.send) await targetChannel.send({ content: `⚠️ Modération impossible : ${error.message}` }).catch(() => {});
          }
          break;
        }
        case 'timeout':
          if (member && Number(output.duration) > 0) {
            await member.timeout(Math.min(Number(output.duration), 40320) * 60000, output.reason || 'KyllBot Studio');
          }
          break;
        case 'kick':
          if (member) await member.kick(output.reason || 'KyllBot Studio');
          break;
        case 'ban':
          if (member) {
            await member.ban({
              reason: output.reason || 'KyllBot Studio',
              deleteMessageSeconds: Math.min((Number(output.deleteDays) || 0) * 86400, 604800),
            });
          }
          break;
        case 'nickname':
          if (member && output.nickname) await member.setNickname(String(output.nickname).slice(0, 32), 'KyllBot Studio');
          break;
        case 'move': {
          const target = resolveChannel(guild, output.channel);
          if (member?.voice && target) await member.voice.setChannel(target);
          break;
        }
        case 'invite': {
          let url = '';
          if (output.action === 'view') {
            const raw = String(output.invite || '').trim();
            if (!raw) break;
            url = /^https?:\/\//i.test(raw) ? raw : `https://discord.gg/${raw.replace(/^\/+/, '')}`;
          } else {
            const target = resolveChannel(guild, output.channel) || channel;
            if (!target?.createInvite) break;
            const invite = await target.createInvite({
              maxUses: Number(output.maxUses) || 0,
              maxAge: (Number(output.maxAge) || 0) * 3600,
              temporary: Boolean(output.temporary),
              reason: 'KyllBot Studio',
            });
            url = invite.url;
          }
          if (output.variable) result.variables[output.variable] = url;
          const message = String(output.message || 'Invitation : {{invite}}').replace(/\{\{invite\}\}/g, url);
          if (output.delivery === 'dm') {
            if (member) await sendInChunks((chunk) => member.send(chunk), { content: message }).catch(() => {});
          } else if (output.delivery !== 'none') {
            const sendTarget = resolveChannel(guild, output.channel) || channel;
            if (sendTarget?.send) await sendInChunks((chunk) => sendTarget.send(chunk), { content: message });
          }
          sent = true;
          break;
        }
        case 'channel':
          if (guild) {
            const parent = resolveCategory(guild, output.category);
            lastChannel = await guild.channels.create({
              name: String(output.name || 'salon').slice(0, 90),
              type:
                output.channelKind === 'voice'
                  ? ChannelType.GuildVoice
                  : output.channelKind === 'forum'
                    ? ChannelType.GuildForum
                    : ChannelType.GuildText,
              parent: parent?.id || undefined,
              topic: output.topic || undefined,
              nsfw: Boolean(output.nsfw),
              rateLimitPerUser: Number(output.slowmode) || 0,
            });
          }
          break;
        case 'stop':
          stopped = true;
          break;
        default:
          log(runtime, 'warn', `Bloc « ${output.kind} » non exécuté en mode réel.`);
      }
    } catch (error) {
      log(runtime, 'error', `Bloc « ${output.kind} » : ${error.message}`);
    }
    if (stopped) break;
  }
  return { outputs: result.outputs, trace: result.trace, sent, interactionUsed };
}

function matchKeyword(trigger, content) {
  const keyword = String(trigger?.keyword || '').trim();
  if (!keyword) return false;
  const haystack = String(content || '').toLowerCase();
  const needle = keyword.toLowerCase();
  if (trigger.match === 'exact') return haystack.trim() === needle;
  if (trigger.match === 'startsWith') return haystack.startsWith(needle);
  return haystack.includes(needle);
}

function matchReaction(trigger, emoji) {
  const expected = String(trigger?.emoji || '').trim();
  if (!expected) return false;
  return String(emoji || '').toLowerCase() === expected.toLowerCase();
}

async function runTriggeredFlows({ bot, ws, type, guild, member, channel, message, interaction, match, vars = {} }) {
  const guildId = String(guild?.id || '').trim();
  const flows = (bot.flows || []).filter(
    (flow) =>
      flow.enabled !== false &&
      flow.trigger?.type === type &&
      (!guildId || itemMatchesGuild(bot, flow, guildId)),
  );
  let count = 0;
  for (const flow of flows) {
    if (type === 'keyword' && !matchKeyword(flow.trigger, message?.content || '')) continue;
    if (type === 'reaction' && !matchReaction(flow.trigger, match)) continue;
    if (type === 'automation' && flow.trigger?.automationType && flow.trigger.automationType !== match) continue;
    const runKey = flow.id || flow.name;
    if (runKey && activeFlowRuns.has(runKey)) continue;
    if (runKey) activeFlowRuns.add(runKey);
    try {
      await executeFlow({ bot, ws, flow, guild, member, channel, message, interaction, vars });
      bumpFlow(ws, bot, flow, `discord:${type}`, member?.user || interaction?.user);
      count += 1;
    } finally {
      if (runKey) activeFlowRuns.delete(runKey);
    }
  }
  return count;
}

export async function runAutomationTrigger(botId, automationType, extraVars = {}, automation = null) {
  const context = getBotContext(botId);
  if (!context) return { count: 0 };
  const { ws, bot } = context;
  const runtime = ensureRuntime(botId);
  const server = automation ? resolveDiscordServer(bot.discord, automation.serverId) : activeDiscordServer(bot.discord);
  const guild =
    runtime.client?.guilds?.cache?.get(server?.guildId || bot.discord?.guildId) ||
    runtime.client?.guilds?.cache?.first() ||
    null;
  if (automationType === 'ticketPanel' && automation) {
    const sent = await sendTicketPanel(bot, guild, automation);
    return { count: sent ? 1 : 0 };
  }
  const count = await runTriggeredFlows({
    bot,
    ws,
    type: 'automation',
    guild,
    member: null,
    channel: guild?.systemChannel || null,
    message: null,
    interaction: null,
    match: automationType,
    vars: { automation: automationType, ...extraVars },
  });
  return { count };
}

async function memberFromInteraction(interaction) {
  if (interaction.member?.roles?.cache) return interaction.member;
  if (!interaction.guild) return null;
  return interaction.guild.members.cache.get(interaction.user.id) || (await interaction.guild.members.fetch(interaction.user.id).catch(() => null));
}

async function handleInteraction(botId, interaction) {
  const context = getBotContext(botId);
  if (!context) return;
  const { ws, bot } = context;
  const member = await memberFromInteraction(interaction);
  const channel = interaction.channel;
  const guild = interaction.guild;

  if (interaction.isButton() && interaction.customId.startsWith('kfticket:')) {
    await handleTicketButton(bot, interaction, guild, member);
    return;
  }

  if (interaction.isChatInputCommand()) {
    const commandName = normalizeCommandName(interaction.commandName);
    const command = (bot.commands || []).find(
      (entry) =>
        normalizeCommandName(entry.name) === commandName &&
        entry.enabled !== false &&
        itemMatchesGuild(bot, entry, interaction.guildId),
    );
    const slashFlows = (bot.flows || []).filter(
      (flow) =>
        flow.enabled !== false &&
        flow.trigger?.type === 'slash' &&
        normalizeCommandName(flow.trigger?.command) === commandName &&
        itemMatchesGuild(bot, flow, interaction.guildId),
    );
    if (!command && !slashFlows.length) {
      await interaction.reply({ content: 'Cette commande n’est pas active sur ce serveur.', ephemeral: true });
      return;
    }
    if (command) {
      const remaining = cooldownRemaining(bot.id, interaction.user.id, command.name, command.cooldown);
      if (remaining > 0) {
        await interaction.reply({ content: `Patiente encore ${remaining}s avant de réutiliser /${command.name}.`, ephemeral: true });
        return;
      }
      await replyInteractionInChunks(interaction, commandPayload(command, { guild, member, interaction, client: ensureRuntime(botId).client }));
      bumpCommand(ws, bot, command, 'discord:slash', interaction.user);
    }
    let flowUsedInteraction = false;
    for (const flow of slashFlows) {
      const result = await executeFlow({ bot, ws, flow, guild, member, channel, message: null, interaction });
      if (result?.interactionUsed) flowUsedInteraction = true;
      bumpFlow(ws, bot, flow, 'discord:slash', interaction.user);
    }
    if (!command && slashFlows.length && !flowUsedInteraction && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Flux exécuté.', ephemeral: true }).catch(() => {});
    }
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('kfsel:')) {
    const [, flowId, blockId] = interaction.customId.split(':');
    const flow = (bot.flows || []).find((entry) => entry.id === flowId);
    if (!flow) {
      await interaction.reply({ content: 'Ce menu n’est plus relié à un flux actif.', ephemeral: true });
      return;
    }
    const block = (flow.blocks || []).find((entry) => entry.id === blockId);
    const pending = takePending(pendingSelects, pendingKey(flowId, blockId, interaction.user.id));
    const values = Array.isArray(interaction.values) ? interaction.values : [];
    const vars = {
      ...(pending?.vars || {}),
      selection: values.join(', '),
      select: values[0] || '',
      interaction: 'select',
    };
    const nextBlock = pending?.next || block?.next;
    if (!nextBlock) {
      await interaction.reply({ content: `Choix enregistré : **${values.join(', ')}**`, ephemeral: true }).catch(() => {});
      return;
    }
    const result = await executeFlow({
      bot,
      ws,
      flow,
      guild,
      member,
      channel,
      message: null,
      interaction,
      startBlock: nextBlock,
      vars,
    });
    bumpFlow(ws, bot, flow, 'discord:select', interaction.user);
    if (!result.interactionUsed && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: `Choix enregistré : **${values.join(', ')}**`, ephemeral: true }).catch(() => {});
    }
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('kfmodalsubmit:')) {
    const [, flowId, blockId, rawPage] = interaction.customId.split(':');
    const flow = (bot.flows || []).find((entry) => entry.id === flowId);
    const block = flow?.blocks?.find((entry) => entry.id === blockId);
    if (!flow || !block) {
      await interaction.reply({ content: 'Ce formulaire n’est plus relié à un flux actif.', ephemeral: true });
      return;
    }
    const pending = takePending(pendingModals, pendingKey(flowId, blockId, interaction.user.id));
    if (!pending) {
      await interaction.reply({ content: 'Ce formulaire a expiré. Relance le flux pour recommencer.', ephemeral: true });
      return;
    }
    const { fields, page, pages } = modalPage(block, rawPage);
    const values = { ...(pending.values || {}) };
    for (const field of fields) {
      let value = '';
      let idValue = '';
      let nameValue = '';
      if (field.type === 'select') {
        value = (interaction.fields.getStringSelectValues(field.customId) || []).join(', ');
      } else if (field.type === 'multi') {
        value = (interaction.fields.getCheckboxGroup(field.customId) || []).join(', ');
      } else if (field.type === 'checkbox') {
        value = (interaction.fields.getCheckboxGroup(field.customId) || []).length ? 'Oui' : 'Non';
      } else if (field.type === 'role') {
        const selected = interaction.fields.getSelectedRoles(field.customId);
        const roles = selected ? [...selected.values()] : [];
        value = roles.map((role) => `<@&${role.id}>`).join(', ');
        idValue = roles.map((role) => role.id).join(', ');
        nameValue = roles.map((role) => role.name).join(', ');
      } else if (field.type === 'user') {
        const selected = interaction.fields.getSelectedUsers(field.customId);
        const users = selected ? [...selected.values()] : [];
        value = users.map((user) => `<@${user.id}>`).join(', ');
        idValue = users.map((user) => user.id).join(', ');
        nameValue = users.map((user) => user.globalName || user.username).join(', ');
      } else {
        value = interaction.fields.getTextInputValue(field.customId) || '';
      }
      values[field.key] = value;
      values[`form.${field.key}`] = value;
      if (field.type === 'role' || field.type === 'user') {
        values[`${field.key}_id`] = idValue;
        values[`${field.key}_name`] = nameValue;
        values[`form.${field.key}_id`] = idValue;
        values[`form.${field.key}_name`] = nameValue;
      }
    }
    if (page + 1 < pages) {
      const nextPage = page + 1;
      rememberPending(
        pendingModals,
        pendingKey(flowId, blockId, interaction.user.id),
        {
          ...pending,
          values,
          page: nextPage,
          botId: bot.id,
          userId: interaction.user.id,
          channelId: interaction.channelId,
        },
        900,
      );
      const button = new ButtonBuilder()
        .setCustomId(`kfmodalnext:${flowId}:${blockId}:${nextPage}`)
        .setLabel(`Continuer (${nextPage + 1}/${pages})`)
        .setStyle(ButtonStyle.Primary);
      await interaction.reply({
        content: `Formulaire ${nextPage + 1}/${pages} : clique pour compléter la suite.`,
        components: [new ActionRowBuilder().addComponents(button)],
        ephemeral: true,
      }).catch(() => {});
      return;
    }
    const vars = {
      ...(pending.vars || {}),
      ...values,
      interaction: 'form',
      form_title: block.title || 'Formulaire',
    };
    const nextBlock = pending.next || block.next;
    if (!nextBlock) {
      await interaction.reply({ content: 'Formulaire reçu ✅', ephemeral: true }).catch(() => {});
      return;
    }
    const result = await executeFlow({
      bot,
      ws,
      flow,
      guild,
      member,
      channel,
      message: null,
      interaction,
      startBlock: nextBlock,
      vars,
    });
    bumpFlow(ws, bot, flow, 'discord:modal', interaction.user);
    if (!result.interactionUsed && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Formulaire reçu ✅', ephemeral: true }).catch(() => {});
    }
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('kfservicepenaltysubmit:')) {
    const [, flowId, blockId] = interaction.customId.split(':');
    const flow = (bot.flows || []).find((entry) => entry.id === flowId);
    const block = flow?.blocks?.find((entry) => entry.id === blockId);
    if (!flow || !block) {
      await interaction.reply({ content: 'Ce formulaire de pénalité n’est plus relié à un flux actif.', ephemeral: true });
      return;
    }
    const pending = takePending(pendingServicePenalties, pendingKey(flowId, blockId, interaction.user.id));
    const selected = interaction.fields.getSelectedUsers('member');
    const targetUser = selected ? [...selected.values()][0] : null;
    const penaltyMs = parseDurationInput(interaction.fields.getTextInputValue('duration'));
    if (!targetUser || !penaltyMs) {
      await interaction.reply({
        content: 'Durée invalide. Utilise par exemple `30`, `30 min`, `1 h 30`, `90 min` ou `2 jours`.',
        ephemeral: true,
      });
      return;
    }
    const { tokens } = addServicePenalty(
      bot,
      interaction.guild?.id || interaction.guildId || 'dm',
      { id: targetUser.id, name: targetUser.globalName || targetUser.username },
      penaltyMs,
    );
    persist();
    const nextBlock = pending?.next || block.next;
    if (!nextBlock) {
      const text = applyServiceTokens(
        block.penaltyText || '✅ Pénalité de {{penalty_added}} ajoutée à {{member}}.',
        tokens,
      );
      await replyInteractionInChunks(interaction, { content: text }, { ephemeral: true }).catch(() => {});
      return;
    }
    const vars = {
      ...(pending?.vars || {}),
      member: tokens.member,
      member_id: targetUser.id,
      member_name: tokens.member_name,
      member_mention: tokens.member_mention,
      service: tokens.service,
      penalty: tokens.penalty,
      total: tokens.total,
      penalty_added: tokens.penalty_added,
      period: tokens.period,
      reset: tokens.reset,
    };
    const result = await executeFlow({
      bot,
      ws,
      flow,
      guild: interaction.guild,
      member,
      channel,
      message: null,
      interaction,
      startBlock: nextBlock,
      vars,
    });
    bumpFlow(ws, bot, flow, 'discord:service-penalty', interaction.user);
    if (!result.interactionUsed && !interaction.replied && !interaction.deferred) {
      const text = applyServiceTokens(
        block.penaltyText || '✅ Pénalité de {{penalty_added}} ajoutée à {{member}}.',
        tokens,
      );
      await replyInteractionInChunks(interaction, { content: text }, { ephemeral: true }).catch(() => {});
    }
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('kfcaptchasubmit:')) {
    const [, flowId, blockId] = interaction.customId.split(':');
    const flow = (bot.flows || []).find((entry) => entry.id === flowId);
    if (!flow) {
      await interaction.reply({ content: 'Cette vérification n’est plus reliée à un flux actif.', ephemeral: true });
      return;
    }
    const pending = takePending(pendingCaptchas, pendingKey(flowId, blockId, interaction.user.id));
    if (!pending) {
      await interaction.reply({ content: 'Cette vérification a expiré. Relance le flux.', ephemeral: true });
      return;
    }
    if (pending.role && guild && member) {
      const role = resolveRole(guild, pending.role);
      if (role) await member.roles.add(role, 'KyllBot Studio — vérification').catch(() => {});
    }
    const vars = {
      ...(pending.vars || {}),
      verified: 'oui',
      captcha: interaction.fields.getTextInputValue('captcha'),
    };
    if (!pending.next) {
      await interaction.reply({ content: 'Vérification réussie ✅', ephemeral: true }).catch(() => {});
      return;
    }
    const result = await executeFlow({
      bot,
      ws,
      flow,
      guild,
      member,
      channel,
      message: null,
      interaction,
      startBlock: pending.next,
      vars,
    });
    bumpFlow(ws, bot, flow, 'discord:captcha', interaction.user);
    if (!result.interactionUsed && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Vérification réussie ✅', ephemeral: true }).catch(() => {});
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('km:')) {
    const [, messageId, rawIndex] = interaction.customId.split(':');
    const saved = (bot.savedMessages || []).find((entry) => entry.id === messageId);
    const button = saved?.buttons?.[Number(rawIndex)];
    if (!saved || !button) {
      await interaction.reply({ content: 'Ce bouton n’est plus disponible.', ephemeral: true });
      return;
    }
    await replyInteractionInChunks(
      interaction,
      { content: String(button.response || 'Merci !') },
      { ephemeral: button.ephemeral !== false },
    ).catch(() => {});
    recordEvent(ws, 'message.button', {
      botId: bot.id,
      messageId: saved.id,
      buttonIndex: Number(rawIndex),
      userId: interaction.user?.id || null,
    });
    persist();
    return;
  }

  if (interaction.isButton()) {
    const [prefix, flowId, blockId, rawIndex] = interaction.customId.split(':');
    const flow = (bot.flows || []).find((entry) => entry.id === flowId);
    if (!flow) {
      await interaction.reply({ content: 'Ce bouton n’est plus relié à un flux actif.', ephemeral: true });
      return;
    }

    if (prefix === 'kfmodal' || prefix === 'kfmodalnext') {
      const block = (flow.blocks || []).find((entry) => entry.id === blockId);
      if (!block) {
        await interaction.reply({ content: 'Ce formulaire n’est plus disponible.', ephemeral: true });
        return;
      }
      const pending = takePending(pendingModals, pendingKey(flowId, blockId, interaction.user.id));
      if (!pending && prefix === 'kfmodalnext') {
        await interaction.reply({ content: 'Ce formulaire a expiré. Relance le flux pour recommencer.', ephemeral: true });
        return;
      }
      const state = pending || { next: block.next, vars: {}, values: {}, page: 0 };
      const page = prefix === 'kfmodalnext' ? Number(rawIndex) || 0 : Number(state.page) || 0;
      rememberPending(
        pendingModals,
        pendingKey(flowId, blockId, interaction.user.id),
        {
          ...state,
          flowId,
          blockId,
          next: state.next || block.next,
          vars: state.vars || {},
          values: state.values || {},
          page,
          botId: bot.id,
          userId: interaction.user.id,
          channelId: interaction.channelId,
        },
        900,
      );
      const { modal } = buildModal(flow, block, page);
      await interaction.showModal(modal);
      return;
    }

    if (prefix === 'kfservicepenalty') {
      const block = (flow.blocks || []).find((entry) => entry.id === blockId);
      if (!block) {
        await interaction.reply({ content: 'Ce formulaire de pénalité n’est plus disponible.', ephemeral: true });
        return;
      }
      const pending = takePending(pendingServicePenalties, pendingKey(flowId, blockId, interaction.user.id));
      rememberPending(
        pendingServicePenalties,
        pendingKey(flowId, blockId, interaction.user.id),
        {
          flowId,
          blockId,
          next: pending?.next || block.next,
          vars: pending?.vars || {},
          botId: bot.id,
          userId: interaction.user.id,
          channelId: interaction.channelId,
        },
        900,
      );
      try {
        await interaction.showModal(buildServicePenaltyModal(flow, block));
      } catch (error) {
        await interaction.reply({ content: `Formulaire indisponible : ${error.message}`, ephemeral: true }).catch(() => {});
      }
      return;
    }

    if (prefix === 'kfawait') {
      const pending = takePendingAwait({
        botId: bot.id,
        flowId,
        blockId,
        userId: interaction.user.id,
        channelId: interaction.channelId,
        kind: 'button',
      });
      if (!pending) {
        await interaction.reply({ content: 'Cette attente a expiré. Relance le flux.', ephemeral: true });
        return;
      }
      if (!pending.next) {
        await interaction.reply({ content: 'Interaction reçue ✅', ephemeral: true }).catch(() => {});
        return;
      }
      const awaitClicker = member?.displayName || interaction.user?.globalName || interaction.user?.username || '';
      const result = await executeFlow({
        bot,
        ws,
        flow,
        guild,
        member,
        channel,
        message: null,
        interaction,
        startBlock: pending.next,
        vars: {
          ...(pending.vars || {}),
          interaction: 'await_button',
          button: 'Continuer',
          button_label: 'Continuer',
          button_value: 'Continuer',
          button_index: '1',
          clicker: awaitClicker,
          clicker_id: interaction.user?.id || '',
          clicker_mention: interaction.user?.id ? `<@${interaction.user.id}>` : '',
        },
      });
      bumpFlow(ws, bot, flow, 'discord:await', interaction.user);
      if (!result.interactionUsed && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Interaction reçue ✅', ephemeral: true }).catch(() => {});
      }
      return;
    }

    if (prefix === 'kfcaptchamodal') {
      const block = (flow.blocks || []).find((entry) => entry.id === blockId);
      if (!block) {
        await interaction.reply({ content: 'Cette vérification n’est plus disponible.', ephemeral: true });
        return;
      }
      await interaction.showModal(buildCaptchaModal(flow, block));
      return;
    }

    if (prefix === 'kfcaptcha') {
      const pending = takePending(pendingCaptchas, pendingKey(flowId, blockId, interaction.user.id));
      if (!pending) {
        await interaction.reply({ content: 'Cette vérification a expiré. Relance le flux.', ephemeral: true });
        return;
      }
      if (pending.role && guild && member) {
        const role = resolveRole(guild, pending.role);
        if (role) await member.roles.add(role, 'KyllBot Studio — vérification').catch(() => {});
      }
      if (!pending.next) {
        await interaction.reply({ content: 'Vérification réussie ✅', ephemeral: true }).catch(() => {});
        return;
      }
      const result = await executeFlow({
        bot,
        ws,
        flow,
        guild,
        member,
        channel,
        message: null,
        interaction,
        startBlock: pending.next,
        vars: pending.vars || {},
      });
      bumpFlow(ws, bot, flow, 'discord:captcha', interaction.user);
      if (!result.interactionUsed && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Vérification réussie ✅', ephemeral: true }).catch(() => {});
      }
      return;
    }

    if (prefix !== 'kf') return;
    const block = (flow.blocks || []).find((entry) => entry.id === blockId);
    const button = block?.buttons?.[Number(rawIndex)];
    if (!block || !button) {
      await interaction.reply({ content: 'Ce bouton n’est plus disponible.', ephemeral: true });
      return;
    }
    const targetFlow = button.target
      ? (bot.flows || []).find(
          (entry) => entry.id === button.target || String(entry.name || '').toLowerCase() === String(button.target).toLowerCase(),
        )
      : null;
    const nextBlock = button.next || block.next;
    if (!targetFlow && !nextBlock) {
      await interaction.reply({ content: 'Ce bouton n’a pas encore d’action configurée.', ephemeral: true });
      return;
    }
    const executedFlow = targetFlow || flow;
    const clicker = member?.displayName || interaction.user?.globalName || interaction.user?.username || '';
    const buttonContext = peekPending(pendingButtons, pendingKey(flowId, blockId, interaction.user?.id));
    const buttonVars = {
      ...(buttonContext?.vars || {}),
      button: button.label || '',
      button_label: button.label || '',
      button_value: button.value || button.label || '',
      button_index: String(Number(rawIndex) + 1),
      interaction: 'button',
      clicker,
      clicker_id: interaction.user?.id || '',
      clicker_mention: interaction.user?.id ? `<@${interaction.user.id}>` : '',
    };
    const result = await executeFlow({
      bot,
      ws,
      flow: executedFlow,
      guild,
      member,
      channel,
      message: null,
      interaction,
      startBlock: targetFlow ? undefined : nextBlock,
      vars: buttonVars,
    });
    bumpFlow(ws, bot, executedFlow, targetFlow ? 'discord:button-flow' : 'discord:button', interaction.user);
    if (!result.interactionUsed && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Action exécutée ✅', ephemeral: true }).catch(() => {});
    }
  }
}

async function sendLog(guild, bot, text, channelName = '') {
  const channel = resolveChannel(guild, channelName || bot.discord?.logChannel || 'logs');
  if (channel) await sendInChunks((chunk) => channel.send(chunk), { content: String(text) }).catch(() => {});
}


function enabledAutomation(bot, type, guild = null) {
  return (
    (bot.automations || []).find(
      (entry) => entry.enabled && entry.type === type && (!guild || itemMatchesGuild(bot, entry, guild.id)),
    ) || null
  );
}

function channelSnapshot(channel) {
  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parentId: channel.parentId || null,
    position: Number(channel.rawPosition) || 0,
    topic: channel.topic || '',
    nsfw: Boolean(channel.nsfw),
    rateLimitPerUser: Number(channel.rateLimitPerUser) || 0,
    permissionOverwrites: channel.permissionOverwrites?.cache
      ? [...channel.permissionOverwrites.cache.values()].map((overwrite) => ({
          id: overwrite.id,
          type: overwrite.type,
          allow: overwrite.allow.bitfield.toString(),
          deny: overwrite.deny.bitfield.toString(),
        }))
      : [],
  };
}

async function captureGuildSnapshot(guild, client, { messages = true } = {}) {
  const snapshot = {
    at: Date.now(),
    channels: [...guild.channels.cache.values()].map(channelSnapshot),
    roles: [...guild.roles.cache.values()]
      .filter((role) => role.id !== guild.id && !role.managed)
      .map((role) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: role.permissions.bitfield.toString(),
        position: Number(role.rawPosition) || 0,
      })),
    messages: [],
  };
  if (messages) {
    const textChannels = [...guild.channels.cache.values()].filter((channel) => channel.isTextBased?.() && channel.viewable);
    for (const channel of textChannels.slice(0, 12)) {
      if (!channel.messages?.fetch) continue;
      const fetched = await channel.messages.fetch({ limit: 8 }).catch(() => null);
      if (!fetched) continue;
      for (const message of fetched.values()) {
        if (message.author?.id !== client.user?.id) continue;
        if (!message.content && !message.embeds?.length && !message.components?.length) continue;
        snapshot.messages.push({
          channelId: channel.id,
          content: message.content || '',
          embeds: message.embeds?.map((embed) => embed.toJSON()) || [],
          components: message.components?.map((component) => component.toJSON()) || [],
        });
        if (snapshot.messages.length >= 60) break;
      }
      if (snapshot.messages.length >= 60) break;
    }
  }
  return snapshot;
}

async function captureBotSnapshots(botId, client, { messages = true } = {}) {
  const context = getBotContext(botId);
  if (!context) return;
  const runtime = ensureRuntime(botId);
  for (const guild of client.guilds.cache.values()) {
    const snapshot = await captureGuildSnapshot(guild, client, { messages });
    runtime.snapshots.set(guild.id, snapshot);
  }
  log(runtime, 'info', `Sauvegarde anti-raid prête pour ${runtime.snapshots.size} serveur(s).`);
}

export async function refreshBotSnapshots(botId, { messages = true } = {}) {
  const runtime = ensureRuntime(botId);
  if (!runtime.client?.guilds?.cache?.size) return { ok: false, reason: 'Bot non connecté.' };
  await captureBotSnapshots(botId, runtime.client, { messages });
  return { ok: true, servers: runtime.snapshots.size };
}

async function repairGuild(guild, bot, runtime, { channels = true, roles = true, messages = true } = {}) {
  const snapshot = runtime.snapshots.get(guild.id);
  if (!snapshot) return { channels: 0, roles: 0, messages: 0, reason: 'Aucune sauvegarde disponible.' };
  const roleIdMap = new Map();
  const channelIdMap = new Map();
  let createdRoles = 0;
  let createdChannels = 0;
  let restoredMessages = 0;

  if (roles) {
    for (const entry of snapshot.roles) {
      if (guild.roles.cache.has(entry.id)) {
        roleIdMap.set(entry.id, entry.id);
        continue;
      }
      const created = await guild.roles
        .create({
          name: entry.name,
          color: entry.color,
          hoist: entry.hoist,
          mentionable: entry.mentionable,
          permissions: BigInt(entry.permissions || '0'),
          position: entry.position,
          reason: 'KyllBot Studio — réparation anti-raid',
        })
        .catch(() => null);
      if (created) {
        createdRoles += 1;
        roleIdMap.set(entry.id, created.id);
      }
    }
  }

  const overwritePayload = (entry) =>
    entry.permissionOverwrites
      .map((overwrite) => ({
        id: roleIdMap.get(overwrite.id) || overwrite.id,
        type: overwrite.type,
        allow: BigInt(overwrite.allow || '0'),
        deny: BigInt(overwrite.deny || '0'),
      }))
      .filter((overwrite) => overwrite.id);

  const categories = snapshot.channels.filter((entry) => entry.type === ChannelType.GuildCategory);
  for (const entry of categories) {
    if (guild.channels.cache.has(entry.id)) {
      channelIdMap.set(entry.id, entry.id);
      continue;
    }
    const created = await guild.channels
      .create({
        name: entry.name,
        type: ChannelType.GuildCategory,
        position: entry.position,
        permissionOverwrites: overwritePayload(entry),
        reason: 'KyllBot Studio — réparation anti-raid',
      })
      .catch(() => null);
    if (created) {
      createdChannels += 1;
      channelIdMap.set(entry.id, created.id);
    }
  }

  const restorableTypes = new Set([ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildForum, ChannelType.GuildAnnouncement]);
  for (const entry of snapshot.channels.filter((item) => restorableTypes.has(item.type))) {
    if (guild.channels.cache.has(entry.id)) {
      channelIdMap.set(entry.id, entry.id);
      continue;
    }
    const created = await guild.channels
      .create({
        name: entry.name,
        type: entry.type,
        parent: entry.parentId ? channelIdMap.get(entry.parentId) || null : null,
        topic: entry.topic || undefined,
        nsfw: entry.nsfw || undefined,
        rateLimitPerUser: entry.rateLimitPerUser || undefined,
        position: entry.position,
        permissionOverwrites: overwritePayload(entry),
        reason: 'KyllBot Studio — réparation anti-raid',
      })
      .catch(() => null);
    if (created) {
      createdChannels += 1;
      channelIdMap.set(entry.id, created.id);
    }
  }

  if (messages && snapshot.messages?.length) {
    for (const entry of snapshot.messages.slice(0, 60)) {
      const targetId = channelIdMap.get(entry.channelId) || entry.channelId;
      const channel = guild.channels.cache.get(targetId);
      if (!channel?.send) continue;
      const sent = await channel
        .send({
          content: entry.content || undefined,
          embeds: entry.embeds?.length ? entry.embeds : undefined,
          components: entry.components?.length ? entry.components : undefined,
          allowedMentions: { parse: [] },
        })
        .catch(() => null);
      if (sent) restoredMessages += 1;
    }
  }

  const fresh = await captureGuildSnapshot(guild, runtime.client, { messages: false });
  runtime.snapshots.set(guild.id, { ...fresh, messages: snapshot.messages || [] });
  runtime.lastRepairAt = new Date().toISOString();
  return { channels: createdChannels, roles: createdRoles, messages: restoredMessages };
}

function noteDeletion(runtime, guildId, kind, config = {}) {
  const key = `${guildId}:${kind}`;
  const now = Date.now();
  const windowMs = Math.max(10, Number(config.windowSeconds) || 60) * 1000;
  const bucket = (runtime.deletions.get(key) || []).filter((time) => now - time < windowMs);
  bucket.push(now);
  runtime.deletions.set(key, bucket);
  return bucket.length;
}

async function handleChannelDelete(botId, channel) {
  const guild = channel?.guild;
  if (!guild) return;
  const context = getBotContext(botId);
  if (!context) return;
  const { bot } = context;
  const repair = enabledAutomation(bot, 'repair', guild);
  if (!repair || repair.config?.repairChannels === false) return;
  const runtime = ensureRuntime(botId);
  const count = noteDeletion(runtime, guild.id, 'channels', repair.config);
  const threshold = Math.max(1, Number(repair.config?.channelDeleteThreshold) || 3);
  if (count < threshold) return;
  runtime.deletions.set(`${guild.id}:channels`, []);
  const result = await repairGuild(guild, bot, runtime, {
    channels: true,
    roles: repair.config?.repairRoles !== false,
    messages: repair.config?.restoreMessages !== false,
  });
  log(runtime, 'warn', `Anti-raid salons : ${count} suppression(s). ${result.channels} salon(s), ${result.roles} rôle(s), ${result.messages} message(s) restauré(s).`);
  await sendLog(guild, bot, `🛡️ Anti-raid : ${count} salons supprimés en moins d'une minute. ${result.channels} salon(s), ${result.roles} rôle(s) et ${result.messages} message(s) restauré(s).`, repair.config?.logChannel);
  await runTriggeredFlows({ bot, ws: context.ws, type: 'automation', guild, member: null, channel: guild.systemChannel, message: null, interaction: null, match: 'repair', vars: { automation: 'repair', deletedChannels: count } });
}

async function handleRoleDelete(botId, role) {
  const guild = role?.guild;
  if (!guild) return;
  const context = getBotContext(botId);
  if (!context) return;
  const { bot } = context;
  const repair = enabledAutomation(bot, 'repair', guild);
  if (!repair || repair.config?.repairRoles === false) return;
  const runtime = ensureRuntime(botId);
  const count = noteDeletion(runtime, guild.id, 'roles', repair.config);
  const threshold = Math.max(1, Number(repair.config?.roleDeleteThreshold) || 2);
  if (count < threshold) return;
  runtime.deletions.set(`${guild.id}:roles`, []);
  const result = await repairGuild(guild, bot, runtime, {
    channels: repair.config?.repairChannels !== false,
    roles: true,
    messages: repair.config?.restoreMessages !== false,
  });
  log(runtime, 'warn', `Anti-raid rôles : ${count} suppression(s). ${result.channels} salon(s), ${result.roles} rôle(s), ${result.messages} message(s) restauré(s).`);
  await sendLog(guild, bot, `🛡️ Anti-raid : ${count} rôles supprimés en moins d'une minute. ${result.channels} salon(s), ${result.roles} rôle(s) et ${result.messages} message(s) restauré(s).`, repair.config?.logChannel);
  await runTriggeredFlows({ bot, ws: context.ws, type: 'automation', guild, member: null, channel: guild.systemChannel, message: null, interaction: null, match: 'repair', vars: { automation: 'repair', deletedRoles: count } });
}

async function handleRaidJoin(botId, member) {
  const context = getBotContext(botId);
  if (!context) return false;
  const { ws, bot } = context;
  const antiRaid = enabledAutomation(bot, 'antiRaid', member.guild);
  if (!antiRaid) return false;
  const runtime = ensureRuntime(botId);
  const now = Date.now();
  const config = antiRaid.config || {};
  const windowMs = Math.max(5, Number(config.joinWindow) || 10) * 1000;
  const key = `joins:${member.guild.id}`;
  const bucket = (runtime.joins.get(key) || []).filter((entry) => now - entry.at < windowMs);
  bucket.push({ at: now, memberId: member.id });
  runtime.joins.set(key, bucket);
  const threshold = Math.max(2, Number(config.joinThreshold) || 10);
  if (bucket.length < threshold) return false;
  if (now < runtime.raidLockUntil) return true;
  runtime.raidLockUntil = now + 60_000;
  runtime.joins.set(key, []);

  const minAgeDays = config.minAccountAgeDays === undefined
    ? 7
    : Math.max(0, Number(config.minAccountAgeDays) || 0);
  const action = ['kick', 'ban', 'timeout'].includes(config.action) ? config.action : 'kick';
  const targets = [];
  for (const entry of bucket) {
    const target = member.guild.members.cache.get(entry.memberId) || (await member.guild.members.fetch(entry.memberId).catch(() => null));
    if (!target) continue;
    const ageDays = (Date.now() - target.user.createdTimestamp) / 86_400_000;
    if (minAgeDays > 0 && ageDays >= minAgeDays) continue;
    targets.push(target);
  }
  let punished = 0;
  for (const target of targets.slice(0, 25)) {
    if (!target.moderatable) continue;
    if (action === 'ban') {
      await target.ban({ reason: 'Anti-raid KyllBot Studio' }).catch(() => {});
    } else if (action === 'timeout') {
      await target.timeout(10 * 60_000, 'Anti-raid KyllBot Studio').catch(() => {});
    } else {
      await target.kick('Anti-raid KyllBot Studio').catch(() => {});
    }
    punished += 1;
  }
  if (config.lockdown) await member.guild.setVerificationLevel(4).catch(() => {});
  log(runtime, 'warn', `Anti-raid : ${bucket.length} arrivées en ${Math.round(windowMs / 1000)} s. ${punished} membre(s) sanctionné(s).`);
  await sendLog(member.guild, bot, `🛡️ Anti-raid déclenché : ${bucket.length} arrivées en ${Math.round(windowMs / 1000)} s. ${punished} membre(s) sanctionné(s)${config.lockdown ? ' · niveau de vérification renforcé' : ''}.`, config.logChannel);
  await runTriggeredFlows({ bot, ws, type: 'automation', guild: member.guild, member, channel: member.guild.systemChannel, message: null, interaction: null, match: 'antiRaid', vars: { automation: 'antiRaid', raidJoins: bucket.length } });
  return true;
}

async function handleMemberUpdate(botId, oldMember, newMember) {
  if (!oldMember?.premiumSince && newMember?.premiumSince) {
    const context = getBotContext(botId);
    if (!context) return;
    const { ws, bot } = context;
    await runTriggeredFlows({
      bot,
      ws,
      type: 'booster',
      guild: newMember.guild,
      member: newMember,
      channel: newMember.guild.systemChannel,
      message: null,
      interaction: null,
      vars: { boost: 'true', booster: newMember.user?.username || '' },
    });
  }
}

const SUSPICIOUS_NAME = /(nitro|free.?gift|steam.?gift|airdrop|scam|spam|hack|cheat|casino|crypto|giveaway|self.?bot|token.?grab|account.?gen)/i;
const SUSPICIOUS_SHORT_NAME = /(^|[_\-.\s])(bot|admin|mod|support)([_\-.\s]|$)/i;
const INVITE_PATTERN = /(discord\.(gg|me)\/|discord\.com\/invite\/)/i;
const NITRO_SCAM_PATTERN = /(free\s*nitro|nitro\s*gift|steam\s*gift|gift\s*card|airdrop|claim\s+(your|now)|nitro\s+for\s+free|t\.me\/|onlyfans|casino|crypto\s*giveaway)/i;
const LINK_PATTERN = /(https?:\/\/|www\.)/i;

function parseWordList(value) {
  return String(value || '')
    .split(/[\n,;]+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length >= 3)
    .slice(0, 100);
}

function mentionsCount(message) {
  const mentions = message?.mentions;
  if (!mentions) return 0;
  return (mentions.users?.size || 0) + (mentions.roles?.size || 0) + (mentions.channels?.size || 0);
}

function capsRatio(text) {
  const letters = String(text || '').replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 12) return 0;
  const caps = (letters.match(/[A-ZÀ-Þ]/g) || []).length;
  return caps / letters.length;
}

function zalgoCount(text) {
  return (String(text || '').match(/[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g) || []).length;
}

function emojiCount(text) {
  return (String(text || '').match(/[\p{Extended_Pictographic}]/gu) || []).length;
}

function repeatCount(botId, guildId, userId, content, windowSeconds) {
  const key = `${botId}:${guildId}:${userId}`;
  const now = Date.now();
  const windowMs = Math.max(5, Number(windowSeconds) || 15) * 1000;
  const normalized = String(content || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 240);
  const bucket = (repeatBuckets.get(key) || []).filter((entry) => now - entry.at < windowMs);
  bucket.push({ at: now, content: normalized });
  repeatBuckets.set(key, bucket);
  if (repeatBuckets.size > 5000) {
    for (const [mapKey, entries] of repeatBuckets) {
      if (!entries.some((entry) => now - entry.at < windowMs)) repeatBuckets.delete(mapKey);
    }
  }
  return bucket.filter((entry) => entry.content === normalized).length;
}

function autoModViolation(config, message, botId = 'bot') {
  const content = String(message?.content || '');
  if (!content.trim()) return null;
  if (config.blockInvites && INVITE_PATTERN.test(content)) return 'invitation Discord';
  if (config.blockNitro && NITRO_SCAM_PATTERN.test(content)) return 'faux cadeau / arnaque Nitro';
  if (config.blockLinks && LINK_PATTERN.test(content)) return 'lien non autorisé';
  if (config.blockBadWords) {
    const lowered = content.toLowerCase();
    const found = parseWordList(config.badWords).find((word) =>
      word.includes(' ') ? lowered.includes(word) : new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lowered),
    );
    if (found) return `mot interdit « ${found} »`;
  }
  if (config.blockMentions && mentionsCount(message) > Math.max(2, Number(config.maxMentions) || 5)) {
    return 'trop de mentions';
  }
  if (config.blockCaps && capsRatio(content) >= Math.max(50, Number(config.capsThreshold) || 75) / 100) {
    return 'abus de majuscules';
  }
  if (config.blockZalgo && zalgoCount(content) > 10) return 'texte zalgo';
  if (config.blockEmojiSpam && emojiCount(content) > 10) return 'rafale d’emojis';
  if (config.blockRepeat && message?.guildId && message?.author?.id) {
    const repeats = repeatCount(botId, message.guildId, message.author.id, content, config.repeatWindow);
    if (repeats >= 3) return 'message répété';
  }
  return null;
}

function assessAccountRisk(member, config = {}) {
  const user = member?.user || {};
  const reasons = [];
  let score = 0;
  const created = Number(user.createdTimestamp) || 0;
  const ageDays = created ? (Date.now() - created) / 86400000 : 999;
  const minAge = Math.max(0, Number(config.minAccountAgeDays) || 0);
  if (minAge > 0 && created && ageDays < minAge) {
    score += ageDays < 1 ? 4 : 2;
    reasons.push(`compte récent (${Math.max(0, Math.floor(ageDays))} j)`);
  }
  if (config.requireAvatar && !user.avatar) {
    score += 1;
    reasons.push('aucun avatar');
  }
  const username = String(user.username || '');
  if (config.suspiciousNames && (SUSPICIOUS_NAME.test(username) || SUSPICIOUS_SHORT_NAME.test(username))) {
    score += 3;
    reasons.push('pseudo suspect');
  }
  if (/\d{6,}/.test(username)) {
    score += 1;
    reasons.push('pseudo avec beaucoup de chiffres');
  }
  if (config.blockBotAccounts && user.bot) {
    score += 6;
    reasons.push('compte bot');
  }
  return { score: Math.min(score, 10), reasons };
}

function assessMessageRisk(message, config = {}) {
  const content = String(message?.content || '');
  const reasons = [];
  let score = 0;
  if (NITRO_SCAM_PATTERN.test(content) || INVITE_PATTERN.test(content)) {
    score += 4;
    reasons.push('contenu de type arnaque');
  } else if (LINK_PATTERN.test(content)) {
    score += 2;
    reasons.push('lien externe');
  }
  if (mentionsCount(message) > 8) {
    score += 2;
    reasons.push('mentions massives');
  }
  if (capsRatio(content) > 0.85) {
    score += 1;
    reasons.push('majuscules anormales');
  }
  if (zalgoCount(content) > 10) {
    score += 1;
    reasons.push('texte zalgo');
  }
  if (emojiCount(content) > 12) {
    score += 1;
    reasons.push('rafale d’emojis');
  }
  if (message?.guildId && message?.author?.id) {
    const repeats = repeatCount(message.client?.user?.id || 'bot', message.guildId, message.author.id, content, 30);
    if (repeats >= 3) {
      score += 2;
      reasons.push('message répété');
    }
  }
  return { score: Math.min(score, 10), reasons };
}

async function applyAutoModAction({ bot, ws, guild, member, message, channel, config, reason }) {
  const action = ['delete', 'timeout', 'kick', 'ban'].includes(config.action) ? config.action : 'delete';
  const reasonText = `AutoMod — ${reason}`.slice(0, 500);
  let detail = 'message supprimé';
  await message.delete().catch(() => {});
  try {
    if (action === 'timeout' && member?.moderatable) {
      const minutes = Math.min(Math.max(1, Number(config.timeoutMinutes) || 10), 10080);
      await member.timeout(minutes * 60000, reasonText);
      detail = `exclusion ${minutes} min`;
    } else if (action === 'kick' && member?.kickable) {
      await member.kick(reasonText);
      detail = 'membre expulsé';
    } else if (action === 'ban' && member?.bannable) {
      await member.ban({ reason: reasonText, deleteMessageSeconds: 3600 });
      detail = 'membre banni';
    }
  } catch (error) {
    detail = `action impossible (${error.message})`;
  }
  const warn = String(config.warnMessage || 'Ce message ne respecte pas les règles du serveur.').slice(0, 500);
  await channel?.send?.({ content: `${message.author}, ${warn}`, allowedMentions: { parse: [] } }).catch(() => {});
  await sendLog(guild, bot, `🛡️ AutoMod · ${reason} · ${message.author.tag || message.author.username} · ${detail}`, config.logChannel);
  await runTriggeredFlows({
    bot,
    ws,
    type: 'automation',
    guild,
    member,
    channel,
    message,
    interaction: null,
    match: 'autoMod',
    vars: { automation: 'autoMod', reason },
  });
}

async function applyBotGuardAction({ bot, ws, guild, member, channel, config, reasons, score }) {
  const action = ['timeout', 'quarantine', 'kick', 'ban', 'alert'].includes(config.action) ? config.action : 'timeout';
  const reason = `Bouclier anti-bots — score ${score}/10 · ${reasons.join(', ')}`.slice(0, 500);
  let detail = 'alerte envoyée au staff';
  try {
    if (action === 'timeout' && member?.moderatable) {
      const minutes = Math.min(Math.max(1, Number(config.timeoutMinutes) || 60), 10080);
      await member.timeout(minutes * 60000, reason);
      detail = `exclusion ${minutes} min`;
    } else if (action === 'quarantine' && member?.manageable) {
      const role = resolveRole(guild, config.quarantineRole);
      if (role) {
        await member.roles.set([role], reason);
        detail = `quarantaine via @${role.name}`;
      } else {
        await member.timeout(24 * 3600e3, reason);
        detail = 'quarantaine 24 h (aucun rôle configuré)';
      }
    } else if (action === 'kick' && member?.kickable) {
      await member.kick(reason);
      detail = 'membre expulsé';
    } else if (action === 'ban' && member?.bannable) {
      await member.ban({ reason, deleteMessageSeconds: 3600 });
      detail = 'membre banni';
    }
  } catch (error) {
    detail = `action impossible (${error.message})`;
  }
  await sendLog(guild, bot, `🤖 Bouclier anti-bots · ${member.user?.tag || member.user?.username || 'membre'} · score ${score}/10 · ${reasons.join(', ')} · ${detail}`, config.logChannel);
  await runTriggeredFlows({
    bot,
    ws,
    type: 'automation',
    guild,
    member,
    channel: channel || guild.systemChannel,
    message: null,
    interaction: null,
    match: 'botGuard',
    vars: { automation: 'botGuard', reasons: reasons.join(', '), score: String(score) },
  });
}

async function runBotGuard(bot, ws, guild, member, message, channel, config = {}) {
  const key = `${bot.id}:${guild?.id || ''}:${member?.id || ''}`;
  if (Date.now() - (guardPunished.get(key) || 0) < 10 * 60e3) return false;
  const account = assessAccountRisk(member, config);
  const content = message && config.scanMessages !== false ? assessMessageRisk(message, config) : { score: 0, reasons: [] };
  const score = Math.min(10, account.score + content.score);
  const threshold = Math.min(Math.max(Number(config.scoreThreshold) || 5, 2), 10);
  if (score < threshold) return false;
  guardPunished.set(key, Date.now());
  if (guardPunished.size > 3000) {
    const cutoff = Date.now() - 10 * 60e3;
    for (const [mapKey, at] of guardPunished) if (at < cutoff) guardPunished.delete(mapKey);
  }
  await applyBotGuardAction({
    bot,
    ws,
    guild,
    member,
    channel,
    config,
    reasons: [...account.reasons, ...content.reasons],
    score,
  });
  return config.action !== 'alert';
}

async function handleMessage(botId, message) {
  if (!message || message.author?.bot) return;
  const context = getBotContext(botId);
  if (!context) return;
  const { ws, bot } = context;
  const member = message.member || (message.guild ? await message.guild.members.fetch(message.author.id).catch(() => null) : null);
  const guild = message.guild;
  const channel = message.channel;
  const runtime = ensureRuntime(botId);

  const pendingMessageAwait = takePendingAwait({
    botId: bot.id,
    userId: message.author.id,
    channelId: channel.id,
    kind: 'message',
  });
  if (pendingMessageAwait) {
    const flow = (bot.flows || []).find((entry) => entry.id === pendingMessageAwait.flowId);
    if (flow) {
      if (!pendingMessageAwait.next) return;
      await executeFlow({
        bot,
        ws,
        flow,
        guild,
        member,
        channel,
        message,
        interaction: null,
        startBlock: pendingMessageAwait.next,
        vars: { ...(pendingMessageAwait.vars || {}), response: message.content, interaction: 'message' },
      });
      bumpFlow(ws, bot, flow, 'discord:await', message.author);
      return;
    }
  }

  if (!guild) {
    const dmGuard = (bot.automations || []).find(
      (entry) => entry.enabled && entry.type === 'autoMod' && entry.config?.blockDm,
    );
    if (dmGuard) {
      const notifyKey = `${bot.id}:${message.author.id}`;
      if (!dmBlockNotified.has(notifyKey)) {
        if (dmBlockNotified.size > 5000) dmBlockNotified.clear();
        dmBlockNotified.add(notifyKey);
        const reply = String(
          dmGuard.config?.dmReply || 'Les messages privés sont désactivés pour ce bot. Utilise le serveur ou ouvre un ticket.',
        ).slice(0, 500);
        await message.reply({ content: reply, allowedMentions: { parse: [] } }).catch(() => {});
      }
      return;
    }
    await runTriggeredFlows({ bot, ws, type: 'dm', guild: null, member: null, channel, message, interaction: null });
    return;
  }

  const prefix = String(bot.prefix || '!');
  if (message.content.startsWith(prefix)) {
    const [rawName] = message.content.slice(prefix.length).trim().split(/\s+/);
    const command = (bot.commands || []).find(
      (entry) =>
        entry.name === String(rawName || '').toLowerCase() &&
        entry.enabled !== false &&
        itemMatchesGuild(bot, entry, message.guildId),
    );
    if (command) {
      const remaining = cooldownRemaining(bot.id, message.author.id, command.name, command.cooldown);
      if (remaining > 0) {
        await message.reply({ content: `Patiente encore ${remaining}s avant de réutiliser ${prefix}${command.name}.` }).catch(() => {});
        return;
      }
      await replyMessageInChunks(
        message,
        commandPayload(command, { guild, member, interaction: null, client: runtime.client }),
      ).catch((error) => log(runtime, 'error', `Réponse commande : ${error.message}`));
      bumpCommand(ws, bot, command, 'discord:prefix', message.author);
      return;
    }
  }

  const autoMod = enabledAutomation(bot, 'autoMod', guild);
  if (autoMod && !memberHasAnyRole(member, autoMod.config?.exemptRoles)) {
    const reason = autoModViolation(autoMod.config || {}, message, bot.id);
    if (reason) {
      await applyAutoModAction({ bot, ws, guild, member, message, channel, config: autoMod.config || {}, reason });
      return;
    }
  }

  const botGuard = enabledAutomation(bot, 'botGuard', guild);
  if (botGuard && (await runBotGuard(bot, ws, guild, member, message, channel, botGuard.config || {}))) return;

  const antiSpam = (bot.automations || []).find(
    (entry) =>
      entry.enabled &&
      (entry.type === 'antiSpam' || (entry.type === 'moderation' && entry.config?.antiSpam)) &&
      itemMatchesGuild(bot, entry, guild.id),
  );
  if (antiSpam) {
    const key = `${bot.id}:${message.author.id}`;
    const now = Date.now();
    const bucket = (spamBuckets.get(key) || []).filter((time) => now - time < 10000);
    bucket.push(now);
    spamBuckets.set(key, bucket);
    const threshold = Math.max(2, Number(antiSpam.config?.threshold) || 5);
    if (bucket.length >= threshold) {
      spamBuckets.delete(key);
      await message.delete().catch(() => {});
      if (member?.moderatable) await member.timeout(60000, 'Spam détecté par KyllBot Studio').catch(() => {});
      await channel.send({ content: `${message.author}, le spam n’est pas autorisé.` }).catch(() => {});
      await sendLog(guild, bot, `Spam détecté pour ${message.author.tag}`);
      await runTriggeredFlows({ bot, ws, type: 'automation', guild, member, channel, message, interaction: null, match: 'antiSpam', vars: { automation: 'antiSpam' } });
      return;
    }
  }

  await runTriggeredFlows({ bot, ws, type: 'keyword', guild, member, channel, message, interaction: null });
}

async function handleMemberAdd(botId, member) {
  const context = getBotContext(botId);
  if (!context) return;
  const { ws, bot } = context;
  const guild = member.guild;
  const raided = await handleRaidJoin(botId, member);
  if (raided) return;
  const botGuard = enabledAutomation(bot, 'botGuard', guild);
  if (botGuard && (await runBotGuard(bot, ws, guild, member, null, guild.systemChannel, botGuard.config || {}))) return;
  const welcome = enabledAutomation(bot, 'welcome', guild);
  if (welcome) {
    const channel = resolveChannel(guild, welcome.config?.channel) || guild.systemChannel;
    if (channel) {
      const text = renderTemplate(welcome.config?.message || 'Bienvenue {user} sur **{server}** !', {
        guild,
        member,
        client: ensureRuntime(botId).client,
      });
      await sendInChunks(
        (chunk) => channel.send(chunk),
        { content: text, allowedMentions: { parse: ['users'] } },
      ).catch((error) => log(ensureRuntime(botId), 'error', `Message d’accueil : ${error.message}`));
      await runTriggeredFlows({ bot, ws, type: 'automation', guild, member, channel, message: null, interaction: null, match: 'welcome', vars: { automation: 'welcome' } });
    }
  }
  const autorole = enabledAutomation(bot, 'autorole', guild);
  if (autorole) {
    const configuredRoles = Array.isArray(autorole.config?.roles)
      ? autorole.config.roles
      : [autorole.config?.role];
    const roles = [...new Set(configuredRoles.map((entry) => String(entry || '').trim()).filter(Boolean))]
      .map((entry) => resolveRole(guild, entry))
      .filter(Boolean);
    if (roles.length) {
      await member.roles
        .add(roles, 'KyllBot Studio — autorole')
        .catch((error) => log(ensureRuntime(botId), 'error', `Autorole : ${error.message}`));
      const roleNames = roles.map((role) => role.name).join(', ');
      await runTriggeredFlows({ bot, ws, type: 'automation', guild, member, channel: guild.systemChannel, message: null, interaction: null, match: 'autorole', vars: { automation: 'autorole', role: roleNames, roles: roleNames } });
    }
  }
  await runTriggeredFlows({
    bot,
    ws,
    type: member.user?.bot ? 'botJoin' : 'join',
    guild,
    member,
    channel: guild.systemChannel,
    message: null,
    interaction: null,
  });
}

async function handleMemberRemove(botId, member) {
  const context = getBotContext(botId);
  if (!context) return;
  const { ws, bot } = context;
  await runTriggeredFlows({
    bot,
    ws,
    type: 'leave',
    guild: member.guild,
    member,
    channel: member.guild.systemChannel,
    message: null,
    interaction: null,
  });
}

async function handleReaction(botId, reaction, user) {
  if (!reaction || user?.bot) return;
  const context = getBotContext(botId);
  if (!context) return;
  const { ws, bot } = context;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  const message = reaction.message;
  if (!message?.guild) return;
  const member = message.guild.members.cache.get(user.id) || (await message.guild.members.fetch(user.id).catch(() => null));
  const pendingReactionAwait = takePendingAwait({
    botId: bot.id,
    userId: user.id,
    channelId: message.channel.id,
    messageId: message.id,
    kind: 'reaction',
  });
  if (pendingReactionAwait) {
    const flow = (bot.flows || []).find((entry) => entry.id === pendingReactionAwait.flowId);
    if (flow) {
      if (!pendingReactionAwait.next) return;
      await executeFlow({
        bot,
        ws,
        flow,
        guild: message.guild,
        member,
        channel: message.channel,
        message,
        interaction: null,
        startBlock: pendingReactionAwait.next,
        vars: {
          ...(pendingReactionAwait.vars || {}),
          reaction: reaction.emoji?.name || reaction.emoji?.toString() || '',
          interaction: 'reaction',
        },
      });
      bumpFlow(ws, bot, flow, 'discord:await', user);
      return;
    }
  }
  await runTriggeredFlows({
    bot,
    ws,
    type: 'reaction',
    guild: message.guild,
    member,
    channel: message.channel,
    message,
    interaction: null,
    match: reaction.emoji?.name || reaction.emoji?.toString(),
  });
}

function attachHandlers(client, botId) {
  const runtime = ensureRuntime(botId);
  const safe = (handler, label) => (...args) =>
    Promise.resolve(handler(...args)).catch((error) => {
      runtime.lastError = error.message;
      log(runtime, 'error', `${label} : ${error.message}`);
    });

  client.on(Events.ClientReady, async () => {
    const context = getBotContext(botId);
    if (!context) {
      await client.destroy().catch(() => {});
      return;
    }
    runtime.status = 'online';
    runtime.tag = client.user.tag;
    runtime.userId = client.user.id;
    runtime.startedAt = new Date().toISOString();
    runtime.lastError = null;
    runtime.guilds = client.guilds.cache.map((guild) => ({ id: guild.id, name: guild.name }));
    runtime.warning = null;
    setPresence(client, context.bot);
    log(runtime, 'info', `Connecté en tant que ${client.user.tag} (${client.guilds.cache.size} serveur(s)).`);
    try {
      const metadata = await syncDiscordMetadata(botId);
      log(
        runtime,
        'info',
        `${metadata.channels} salon(s), ${metadata.categories} catégorie(s) et ${metadata.roles} rôle(s) synchronisés depuis ${metadata.guildName || 'Discord'}.`,
      );
    } catch (error) {
      runtime.warning = `Connexion OK, mais synchronisation des salons/rôles impossible : ${error.message}`;
      log(runtime, 'warn', runtime.warning);
    }
    try {
      for (const guild of client.guilds.cache.values()) {
        for (const automation of context.bot.automations || []) {
          if (!automation.enabled || automation.type !== 'ticketPanel') continue;
          if (!itemMatchesGuild(context.bot, automation, guild.id)) continue;
          const key = `${guild.id}:${automation.id}`;
          if (runtime.ticketPanelsSent.has(key)) continue;
          if (await sendTicketPanel(context.bot, guild, automation)) runtime.ticketPanelsSent.add(key);
        }
      }
    } catch (error) {
      log(runtime, 'warn', `Panneau de tickets impossible : ${error.message}`);
    }
    try {
      await restoreServicePanels(botId, client);
    } catch (error) {
      log(runtime, 'warn', `Chrono en ligne non restauré : ${error.message}`);
    }
    try {
      await captureBotSnapshots(botId, client, { messages: Boolean(enabledAutomation(context.bot, 'repair')) });
    } catch (error) {
      log(runtime, 'warn', `Sauvegarde anti-raid impossible : ${error.message}`);
    }
    try {
      const result = await syncBotCommands(botId);
      log(
        runtime,
        'info',
        `${result.count} commande(s) synchronisée(s) sur ${result.servers?.length || 1} serveur(s).`,
      );
    } catch (error) {
      runtime.warning = `Connexion OK, mais synchronisation des commandes impossible : ${error.message}`;
      log(runtime, 'warn', runtime.warning);
    }
  });
  client.on(Events.ShardDisconnect, (event) => {
    runtime.status = 'error';
    runtime.lastError = `Déconnecté de Discord (code ${event?.code || 'inconnu'}).`;
    log(runtime, 'warn', runtime.lastError);
  });
  client.on(Events.ShardReconnecting, () => {
    runtime.status = 'starting';
    runtime.warning = 'Reconnexion à Discord…';
  });
  client.on(Events.ShardResume, () => {
    runtime.status = 'online';
    runtime.warning = null;
    log(runtime, 'info', 'Connexion Discord rétablie.');
  });
  client.on(Events.Error, (error) => {
    runtime.lastError = error.message;
    log(runtime, 'error', error.message);
  });
  client.on(Events.Warn, (message) => log(runtime, 'warn', message));
  client.on(Events.ChannelDelete, (channel) => ticketMeta.delete(channel.id));
  client.on(Events.InteractionCreate, safe((interaction) => handleInteraction(botId, interaction), 'Interaction'));
  client.on(Events.MessageCreate, safe((message) => handleMessage(botId, message), 'Message'));
  client.on(Events.GuildMemberAdd, safe((member) => handleMemberAdd(botId, member), 'Arrivée membre'));
  client.on(Events.GuildMemberRemove, safe((member) => handleMemberRemove(botId, member), 'Départ membre'));
  client.on(Events.GuildMemberUpdate, safe((oldMember, newMember) => handleMemberUpdate(botId, oldMember, newMember), 'Membre modifié'));
  client.on(Events.ChannelDelete, safe((channel) => handleChannelDelete(botId, channel), 'Salon supprimé'));
  client.on(Events.GuildRoleDelete, safe((role) => handleRoleDelete(botId, role), 'Rôle supprimé'));
  client.on(Events.MessageReactionAdd, safe((reaction, user) => handleReaction(botId, reaction, user), 'Réaction'));
}

export async function stopBot(botId) {
  const runtime = runtimes.get(botId);
  if (!runtime) return;
  runtime.status = 'stopping';
  if (runtime.client) {
    runtime.client.removeAllListeners();
    await runtime.client.destroy().catch(() => {});
  }
  runtime.client = null;
  runtime.status = 'offline';
  runtime.tag = null;
  runtime.userId = null;
  runtime.guilds = [];
  runtime.mode = null;
  runtime.intents = [];
  runtime.startedAt = null;
  for (const key of chronos.keys()) if (key.startsWith(`${botId}:`)) chronos.delete(key);
  for (const [key, panel] of servicePanels) {
    if (!key.startsWith(`${botId}:`)) continue;
    if (panel.timer) clearInterval(panel.timer);
    servicePanels.delete(key);
  }
  log(runtime, 'info', 'Bot déconnecté.');
}

export async function startBot(botId, { force = false } = {}) {
  const context = getBotContext(botId);
  if (!context) return null;
  const { bot } = context;
  const runtime = ensureRuntime(botId);
  if (!bot.tokenEnc) {
    runtime.status = 'offline';
    runtime.lastError = 'Aucun token Discord enregistré.';
    return getBotRuntime(botId);
  }
  if (!force && (runtime.status === 'online' || runtime.status === 'starting')) return getBotRuntime(botId);
  if (runtime.client) await stopBot(botId);

  let token;
  try {
    token = decryptSecret(bot.tokenEnc);
  } catch (error) {
    runtime.status = 'error';
    runtime.lastError = `Token illisible : ${error.message}. Réenregistre le token.`;
    log(runtime, 'error', runtime.lastError);
    return getBotRuntime(botId);
  }

  runtime.status = 'starting';
  runtime.lastError = null;
  runtime.warning = null;
  runtime.logs = [];
  log(runtime, 'info', 'Connexion à Discord…');

  const preferred =
    bot.discord?.privilegedIntents === false || process.env.DISCORD_PRIVILEGED_INTENTS === '0' ? ['safe'] : ['full', 'safe'];
  for (const mode of preferred) {
    const client = new Client({
      intents: mode === 'full' ? fullIntents() : safeIntents(),
      partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember, Partials.User],
    });
    runtime.client = client;
    runtime.mode = mode;
    runtime.intents = intentNames(mode);
    attachHandlers(client, botId);
    try {
      await client.login(token);
      runtime.status = runtime.status === 'starting' ? 'online' : runtime.status;
      if (mode === 'safe' && preferred[0] === 'full') {
        runtime.warning =
          'Intents privilégiés non activés sur le portail Discord : les commandes fonctionnent, mais l’accueil et la lecture des messages peuvent être limités.';
      }
      return getBotRuntime(botId);
    } catch (error) {
      client.removeAllListeners();
      await client.destroy().catch(() => {});
      runtime.client = null;
      if (mode === 'full' && isDisallowedIntents(error)) {
        log(runtime, 'warn', 'Intents privilégiés refusés par Discord, nouvelle tentative en mode sûr.');
        continue;
      }
      runtime.status = 'error';
      runtime.lastError = error.message;
      log(runtime, 'error', `Connexion impossible : ${error.message}`);
      return getBotRuntime(botId);
    }
  }
  return getBotRuntime(botId);
}

export async function restartBot(botId) {
  await stopBot(botId);
  return startBot(botId, { force: true });
}

function normalizeCommandName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
}

function commandList(bot, serverId) {
  const commands = new Map();
  for (const command of bot.commands || []) {
    if (command.enabled === false || scopedServerId(bot, command) !== serverId) continue;
    const name = normalizeCommandName(command.name);
    if (!name) continue;
    commands.set(name, { name, description: String(command.description || 'Commande KyllBot').slice(0, 100) });
  }
  for (const flow of bot.flows || []) {
    if (flow.enabled === false || flow.trigger?.type !== 'slash') continue;
    if (scopedServerId(bot, flow) !== serverId) continue;
    const name = normalizeCommandName(flow.trigger?.command);
    if (!name || commands.has(name)) continue;
    commands.set(name, { name, description: String(flow.description || flow.name || 'Flux KyllBot').slice(0, 100) });
  }
  return [...commands.values()];
}

export async function syncBotCommands(botId) {
  const context = getBotContext(botId);
  if (!context) throw new Error('Bot introuvable.');
  const { bot } = context;
  if (!bot.tokenEnc) throw new Error('Aucun token Discord enregistré.');
  const token = decryptSecret(bot.tokenEnc);
  const appId = bot.discordAccount?.id || (await discordRequest(token, '/users/@me')).id;
  const configured = (bot.discord?.servers || []).filter((server) => /^\d{17,20}$/.test(String(server.guildId || '')));
  const fallbackGuildId = String(bot.discord?.guildId || '').trim();
  if (!configured.length && /^\d{17,20}$/.test(fallbackGuildId)) {
    configured.push({ id: fallbackGuildId, guildId: fallbackGuildId, name: bot.discord.guildName || 'Serveur Discord' });
  }
  if (!configured.length) {
    throw new Error('Aucun serveur Discord configuré. Choisis un serveur avant de synchroniser les commandes.');
  }

  const warnings = [];
  let globalCleared = false;
  try {
    await discordRequest(token, `/applications/${appId}/commands`, { method: 'PUT', body: [] });
    globalCleared = true;
  } catch (error) {
    warnings.push(`Anciennes commandes globales non supprimées : ${error.message}`);
  }

  const results = [];
  let total = 0;
  let firstError = null;
  for (const server of configured) {
    const commands = commandList(bot, server.id);
    try {
      const data = await discordRequest(token, `/applications/${appId}/guilds/${server.guildId}/commands`, {
        method: 'PUT',
        body: commands,
      });
      const count = Array.isArray(data) ? data.length : commands.length;
      total += count;
      results.push({
        id: server.id,
        guildId: server.guildId,
        name: server.guildName || server.name || 'Serveur Discord',
        count,
        ok: true,
      });
    } catch (error) {
      firstError ||= error;
      results.push({
        id: server.id,
        guildId: server.guildId,
        name: server.guildName || server.name || 'Serveur Discord',
        count: 0,
        ok: false,
        error: error.message,
      });
    }
  }

  const runtime = ensureRuntime(botId);
  runtime.lastSyncAt = new Date().toISOString();
  runtime.commandCount = total;
  runtime.commandsByServer = results;
  const failed = results.filter((entry) => !entry.ok);
  runtime.lastError = failed.length === results.length ? firstError?.message || 'Aucun serveur accessible.' : null;
  if (failed.length === results.length) {
    throw new Error(`Synchronisation impossible : ${firstError?.message || 'aucun serveur accessible'}.`);
  }
  for (const entry of failed) warnings.push(`${entry.name} : ${entry.error}`);
  if (warnings.length) runtime.warning = warnings.join(' ');
  else if (runtime.warning?.startsWith('Commandes enregistrées globalement') || runtime.warning?.startsWith('Anciennes commandes')) {
    runtime.warning = null;
  }
  return {
    ok: true,
    count: total,
    guildId: activeDiscordServer(bot.discord)?.guildId || configured[0].guildId,
    global: false,
    globalCleared,
    servers: results,
    warning: warnings.join(' ') || null,
  };
}

export async function testBotConnection(botId) {
  const context = getBotContext(botId);
  if (!context) throw new Error('Bot introuvable.');
  const { bot } = context;
  if (!bot.tokenEnc) throw new Error('Aucun token Discord enregistré.');
  const token = decryptSecret(bot.tokenEnc);
  const account = await validateDiscordToken(token);
  bot.discordAccount = account;
  if (!bot.discord?.guildId && account.guilds.length) {
    bot.discord = { ...(bot.discord || {}), guildId: account.guilds[0].id, guildName: account.guilds[0].name };
  }
  persist();
  let metadata = null;
  try {
    metadata = await syncDiscordMetadata(botId);
  } catch (error) {
    ensureRuntime(botId).warning = `Connexion OK, mais synchronisation des salons/rôles impossible : ${error.message}`;
  }
  return { ok: true, account, guilds: account.guilds, metadata, runtime: getBotRuntime(botId) };
}

export async function sendTestMessage(botId, channelRef) {
  const context = getBotContext(botId);
  if (!context) throw new Error('Bot introuvable.');
  const { bot } = context;
  if (!bot.tokenEnc) throw new Error('Aucun token Discord enregistré.');
  const guildId = String(bot.discord?.guildId || '').trim();
  if (!guildId) throw new Error('Renseigne d’abord l’ID du serveur Discord dans les paramètres du bot.');
  const token = decryptSecret(bot.tokenEnc);
  const channels = await discordRequest(token, `/guilds/${guildId}/channels`);
  const wanted = String(channelRef || '').trim().replace(/^#/, '').toLowerCase();
  const channel = wanted
    ? channels.find((entry) => entry.id === wanted || entry.name?.toLowerCase() === wanted)
    : channels.find((entry) => entry.type === ChannelType.GuildText) || channels.find((entry) => entry.type === ChannelType.GuildAnnouncement);
  if (!channel) throw new Error('Aucun salon textuel accessible sur ce serveur.');
  const message = await discordRequest(token, `/channels/${channel.id}/messages`, {
    method: 'POST',
    body: { content: '✅ **KyllBot Studio** est bien connecté à Discord. Ceci est un message de test réel.' },
  });
  return { ok: true, channel: { id: channel.id, name: channel.name }, messageId: message?.id || null };
}

async function resolveTargetChannel(bot, target, token) {
  const idRef = String(target.channelId || '').trim();
  const nameRef = String(target.channelName || '').trim();
  const ref = /^\d{17,20}$/.test(idRef) ? idRef : nameRef || idRef;
  if (!ref) throw new Error('Aucun salon configuré pour ce message.');
  if (/^\d{17,20}$/.test(ref)) return { id: ref, name: target.channelName || ref };

  const server = resolveDiscordServer(bot.discord, target.serverId);
  const guildId = String(server?.guildId || bot.discord?.guildId || '').trim();
  if (!guildId) throw new Error('Renseigne l’ID du serveur Discord dans les paramètres du bot.');
  const wanted = ref.replace(/^#/, '').toLowerCase();
  const known = (server?.channels?.length ? server.channels : bot.discord?.channels || []).find(
    (channel) => channel.id === ref || String(channel.name || '').toLowerCase() === wanted,
  );
  if (known && /^\d{17,20}$/.test(known.id)) return { id: known.id, name: known.name };

  const channels = await discordRequest(token, `/guilds/${guildId}/channels`);
  const channel = channels.find(
    (entry) => entry.id === ref || String(entry.name || '').toLowerCase() === wanted,
  );
  if (!channel) throw new Error(`Salon Discord introuvable : ${ref}`);
  return { id: channel.id, name: channel.name };
}

async function sendDiscordRestContent(token, channelId, body) {
  const content = body?.content == null ? null : String(body.content);
  if (content == null || content.length <= DISCORD_CONTENT_LIMIT) {
    return discordRequest(token, `/channels/${channelId}/messages`, { method: 'POST', body });
  }
  const base = { ...body };
  delete base.content;
  const chunks = splitDiscordContent(content);
  let last = null;
  for (let index = 0; index < chunks.length; index += 1) {
    const next = { ...base, content: chunks[index] };
    if (index > 0) {
      delete next.embeds;
      delete next.components;
    }
    last = await discordRequest(token, `/channels/${channelId}/messages`, { method: 'POST', body: next });
  }
  return last;
}

async function sendScheduledMessage(bot, scheduled) {
  if (!bot.tokenEnc) throw new Error('Aucun token Discord enregistré.');
  if (!scheduled.content) throw new Error('Le message programmé est vide.');
  const token = decryptSecret(bot.tokenEnc);
  const channel = await resolveTargetChannel(bot, scheduled, token);
  const message = await sendDiscordRestContent(token, channel.id, {
    content: scheduled.content,
    allowed_mentions: { parse: [] },
  });
  return { channel, messageId: message?.id || null };
}

export async function sendScheduledMessageNow(botId, scheduledId) {
  const context = getBotContext(botId);
  if (!context) throw new Error('Bot introuvable.');
  const scheduled = (context.bot.scheduledMessages || []).find((entry) => entry.id === scheduledId);
  if (!scheduled) throw new Error('Message programmé introuvable.');
  const result = await sendScheduledMessage(context.bot, scheduled);
  const due = scheduledMessageDue(scheduled, new Date());
  scheduled.lastSentAt = new Date().toISOString();
  if (due) scheduled.lastSentKey = due.key;
  scheduled.lastError = null;
  persist();
  recordEvent(context.ws, 'scheduled.run', {
    botId,
    scheduledId: scheduled.id,
    channelId: result.channel.id,
  });
  log(ensureRuntime(botId), 'info', `Message programmé « ${scheduled.label} » envoyé manuellement dans #${result.channel.name}.`);
  return { ok: true, channel: result.channel, messageId: result.messageId };
}

function savedMessagePayload(saved) {
  const payload = { allowed_mentions: { parse: [] } };
  if (saved.content) payload.content = String(saved.content);
  if (savedMessageHasEmbed(saved)) payload.embeds = [toEmbed(saved.embed).toJSON()];
  const buttons = (saved.buttons || []).slice(0, 5);
  if (buttons.length) {
    const row = new ActionRowBuilder();
    buttons.forEach((entry, index) => {
      const button = new ButtonBuilder().setLabel(String(entry.label || 'Bouton').slice(0, 80));
      if (entry.emoji) button.setEmoji(entry.emoji);
      if (entry.url) {
        button.setStyle(ButtonStyle.Link).setURL(entry.url);
      } else {
        const style =
          entry.style === 'secondary'
            ? ButtonStyle.Secondary
            : entry.style === 'success'
              ? ButtonStyle.Success
              : entry.style === 'danger'
                ? ButtonStyle.Danger
                : ButtonStyle.Primary;
        button.setStyle(style).setCustomId(`km:${saved.id}:${index}`.slice(0, 100));
      }
      row.addComponents(button);
    });
    payload.components = [row.toJSON()];
  }
  if (!payload.content && !payload.embeds && !payload.components) {
    throw new Error('Ce message sauvegardé est vide.');
  }
  return payload;
}

async function sendSavedMessage(bot, saved) {
  if (!bot.tokenEnc) throw new Error('Aucun token Discord enregistré.');
  const token = decryptSecret(bot.tokenEnc);
  const channel = await resolveTargetChannel(bot, saved, token);
  const message = await sendDiscordRestContent(token, channel.id, savedMessagePayload(saved));
  return { channel, messageId: message?.id || null };
}

export async function sendSavedMessageNow(botId, messageId) {
  const context = getBotContext(botId);
  if (!context) throw new Error('Bot introuvable.');
  const saved = (context.bot.savedMessages || []).find((entry) => entry.id === messageId);
  if (!saved) throw new Error('Message sauvegardé introuvable.');
  const result = await sendSavedMessage(context.bot, saved);
  saved.lastSentAt = new Date().toISOString();
  persist();
  recordEvent(context.ws, 'message.sent', {
    botId,
    messageId: saved.id,
    channelId: result.channel.id,
  });
  log(ensureRuntime(botId), 'info', `Message « ${saved.name || 'sans nom'} » envoyé dans #${result.channel.name}.`);
  return { ok: true, channel: result.channel, messageId: result.messageId };
}

let scheduledTickRunning = false;

async function processScheduledMessages() {
  if (scheduledTickRunning) return;
  scheduledTickRunning = true;
  try {
    for (const [botId, runtime] of runtimes) {
      if (runtime.status !== 'online' || !runtime.client) continue;
      const context = getBotContext(botId);
      if (!context) continue;
      const { bot, ws } = context;
      for (const scheduled of bot.scheduledMessages || []) {
        const due = scheduledMessageDue(scheduled, new Date());
        if (!due) continue;
        const attemptAt = new Date().toISOString();
        if (
          scheduled.lastAttemptKey === due.key &&
          scheduled.lastAttemptAt &&
          Date.now() - new Date(scheduled.lastAttemptAt).getTime() < 120000
        ) {
          continue;
        }
        scheduled.lastAttemptKey = due.key;
        scheduled.lastAttemptAt = attemptAt;
        try {
          const result = await sendScheduledMessage(bot, scheduled);
          scheduled.lastSentKey = due.key;
          scheduled.lastSentAt = attemptAt;
          scheduled.lastError = null;
          persist();
          recordEvent(ws, 'scheduled.sent', {
            botId,
            scheduledId: scheduled.id,
            channelId: result.channel.id,
          });
          log(runtime, 'info', `Message programmé « ${scheduled.label} » envoyé dans #${result.channel.name}.`);
        } catch (error) {
          scheduled.lastError = String(error.message || error).slice(0, 240);
          persist();
          log(runtime, 'error', `Message programmé « ${scheduled.label} » : ${scheduled.lastError}`);
        }
      }
    }
  } finally {
    scheduledTickRunning = false;
  }
}

setInterval(() => {
  processScheduledMessages().catch((error) => console.error('[scheduler]', error.message));
}, 20000).unref();

export function autostartBots() {
  if (process.env.DISCORD_AUTOSTART === '0') return;
  const bots = [];
  for (const ws of Object.values(db.workspaces || {})) {
    for (const bot of ws.bots || []) {
      if (bot.tokenEnc && bot.status !== 'offline') bots.push(bot);
    }
  }
  for (const bot of bots) startBot(bot.id).catch((error) => console.error(`[Discord ${bot.id.slice(0, 8)}]`, error.message));
  if (bots.length) console.log(`  Discord : ${bots.length} bot(s) en cours de connexion.`);
}

export async function shutdownBots() {
  await Promise.allSettled([...runtimes.keys()].map((botId) => stopBot(botId)));
}

export { getBotContext };

export { buildModal, buildServicePenaltyModal, parseModalFields, executeFlow };
