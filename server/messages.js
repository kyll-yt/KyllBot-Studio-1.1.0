const DEFAULT_COLOR = '#7c5cff';
const BUTTON_STYLES = new Set(['primary', 'secondary', 'success', 'danger']);

function text(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function url(value) {
  const candidate = text(value, 512);
  return /^https?:\/\/\S+$/i.test(candidate) ? candidate : '';
}

function color(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : DEFAULT_COLOR;
}

function sanitizeEmbed(input = {}, previous = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const base = previous && typeof previous === 'object' ? previous : {};
  return {
    title: source.title !== undefined ? text(source.title, 256) : text(base.title, 256),
    description: source.description !== undefined ? text(source.description, 4096) : text(base.description, 4096),
    color: source.color !== undefined ? color(source.color) : color(base.color),
    footer: source.footer !== undefined ? text(source.footer, 2048) : text(base.footer, 2048),
    image: source.image !== undefined ? url(source.image) : url(base.image),
    thumbnail: source.thumbnail !== undefined ? url(source.thumbnail) : url(base.thumbnail),
  };
}

function sanitizeButton(input = {}) {
  const label = text(input.label, 80);
  if (!label) return null;
  const link = url(input.url);
  const style = BUTTON_STYLES.has(String(input.style || '')) ? String(input.style) : 'primary';
  return {
    label,
    emoji: text(input.emoji, 32),
    style,
    url: link,
    response: link ? '' : text(input.response, 1000) || 'Merci !',
    ephemeral: input.ephemeral === undefined ? true : Boolean(input.ephemeral),
  };
}

export function sanitizeSavedMessage(input = {}, previous = null) {
  const base = previous ? { ...previous } : {
    id: '',
    name: '',
    channelId: '',
    channelName: '',
    content: '',
    embed: sanitizeEmbed({}),
    buttons: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSentAt: null,
  };

  if (input.name !== undefined) base.name = text(input.name, 80);
  if (input.channelId !== undefined) base.channelId = text(input.channelId, 60);
  if (input.channelName !== undefined) base.channelName = text(input.channelName, 60).replace(/^#/, '');
  if (input.content !== undefined) base.content = text(input.content, 50000);
  if (input.embed !== undefined) base.embed = sanitizeEmbed(input.embed, base.embed);
  if (input.buttons !== undefined) {
    base.buttons = (Array.isArray(input.buttons) ? input.buttons : [])
      .slice(0, 5)
      .map(sanitizeButton)
      .filter(Boolean);
  }
  if (!base.name) base.name = text(base.content, 60) || 'Message sauvegardé';
  base.updatedAt = new Date().toISOString();
  return base;
}

export function savedMessageHasEmbed(message = {}) {
  const embed = message.embed || {};
  return Boolean(embed.title || embed.description || embed.footer || embed.image || embed.thumbnail);
}

export function savedMessageLabel(message = {}) {
  return text(message.name, 80) || text(message.content, 60) || 'Message sauvegardé';
}

export function savedMessagePreview(message = {}) {
  const content = text(message.content, 120);
  if (content) return content;
  const embed = message.embed || {};
  return text(embed.title || embed.description, 120) || 'Message avec composants Discord';
}
