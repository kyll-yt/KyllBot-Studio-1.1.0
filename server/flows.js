import { newId } from './db.js';

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
  cooldown: { label: 'Anti-spam', group: 'logique' },
  typing: { label: 'Indicateur de saisie', group: 'technique' },
  webhook: { label: 'Requête HTTP', group: 'technique' },
  log: { label: 'Journaliser', group: 'technique' },
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
const MAX_VARIANTS = 20;
const MAX_STEPS = 400;

const str = (value, max = 300) => String(value ?? '').trim().slice(0, max);
const num = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

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
    text: str(variant?.text, 1200),
    weight: num(variant?.weight, 1, 100, 1),
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
  };

  switch (type) {
    case 'message':
      return {
        ...base,
        channel: str(block?.channel, 60),
        text: str(block?.text, 2000),
        ephemeral: Boolean(block?.ephemeral),
      };
    case 'embed':
      return {
        ...base,
        title: str(block?.title, 120),
        description: str(block?.description, 1800),
        color: /^#[0-9a-f]{6}$/i.test(String(block?.color || '')) ? block.color : '#7c5cff',
        footer: str(block?.footer, 80),
      };
    case 'dm':
      return { ...base, text: str(block?.text, 1200) };
    case 'button':
      return {
        ...base,
        label: str(block?.label, 60) || 'Cliquez ici',
        style: ['primary', 'secondary', 'success', 'danger'].includes(block?.style) ? block.style : 'primary',
        target: str(block?.target, 60),
      };
    case 'react':
      return { ...base, emoji: str(block?.emoji, 8) || '👍' };
    case 'random': {
      const variants = Array.isArray(block?.variants) && block.variants.length
        ? block.variants.slice(0, MAX_VARIANTS).map(normalizeVariant)
        : [normalizeVariant({ text: '' }), normalizeVariant({ text: '' })];
      return { ...base, variants };
    }
    case 'role':
      return { ...base, action: block?.action === 'remove' ? 'remove' : 'add', role: str(block?.role, 60) };
    case 'channel':
      return {
        ...base,
        name: str(block?.name, 60).replace(/[^\w\s-]/g, '') || 'nouveau-salon',
        kind: ['text', 'voice', 'forum'].includes(block?.kind) ? block.kind : 'text',
      };
    case 'pin':
      return { ...base, unpin: Boolean(block?.unpin) };
    case 'delete':
      return { ...base, count: num(block?.count, 1, 100, 1) };
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
  }

  let start = ids.has(graph.start) ? graph.start : null;
  if (!start && graph.blocks.length) {
    const incoming = new Set(
      graph.blocks.flatMap((block) => [block.next, block.thenId, block.elseId]).filter(Boolean),
    );
    start = (graph.blocks.find((block) => !incoming.has(block.id)) || graph.blocks[0]).id;
  }

  return { blocks: graph.blocks, start };
}

function normalizeTrigger(trigger) {
  return {
    type: Object.prototype.hasOwnProperty.call(TRIGGERS, trigger?.type) ? trigger.type : 'slash',
    command: str(trigger?.command, 40).replace(/[^\w-]/g, '') || 'mon-flux',
    keyword: str(trigger?.keyword, 120),
    match: ['contains', 'exact', 'startsWith'].includes(trigger?.match) ? trigger.match : 'contains',
    channel: str(trigger?.channel, 60),
    schedule: str(trigger?.schedule, 60),
    emoji: str(trigger?.emoji, 8),
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
    name: str(input.name, 60) || previous?.name || 'Nouveau flux',
    description: str(input.description, 200),
    enabled: input.enabled === undefined ? previous?.enabled ?? true : Boolean(input.enabled),
    trigger: normalizeTrigger(input.trigger ?? previous?.trigger),
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
        { type: 'message', text: 'Un membre du staff arrive, {{user.name}}.', ephemeral: true },
        {
          type: 'embed',
          title: 'Ticket ouvert',
          description: 'Décris ton problème en quelques lignes, on te répond vite.',
          color: '#7c5cff',
          footer: botName,
        },
        { type: 'button', label: 'Fermer le ticket', style: 'danger', target: '' },
        { type: 'role', action: 'add', role: 'Support' },
        { type: 'log', text: 'Ticket créé par {{user.name}}' },
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

  return sanitizeFlow({ ...base, trigger: { type: 'slash', command: 'mon-flux' } });
}

/* ------------------------------------------------------------------ */
/* exécution                                                           */
/* ------------------------------------------------------------------ */

const VAR_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g;

function resolvePath(expr, ctx, vars) {
  if (expr === 'user.name') return ctx.user.name;
  if (expr === 'user.mention') return `<@${ctx.user.name}>`;
  if (expr === 'user.roles') return ctx.user.roles.join(', ');
  if (expr === 'server.name') return ctx.server;
  if (expr === 'channel') return ctx.channel;
  if (expr === 'message') return ctx.message;
  if (expr === 'bot.name') return ctx.bot;
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

export function runFlow(flow, input = {}) {
  const ctx = {
    user: {
      name: str(input.user?.name, 40) || 'Alex',
      roles: Array.isArray(input.user?.roles) ? input.user.roles.map((role) => str(role, 40)).filter(Boolean) : ['Membre'],
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
  let current = flow.start && byId.has(flow.start) ? flow.start : null;
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
        const text = interpolate(block.text, ctx, vars);
        outputs.push({ kind: 'message', channel: block.channel || ctx.channel, text, ephemeral: block.ephemeral });
        entry.detail = `${block.channel || ctx.channel} · ${text.slice(0, 90)}`;
        break;
      }
      case 'embed': {
        const embed = {
          title: interpolate(block.title, ctx, vars),
          description: interpolate(block.description, ctx, vars),
          color: block.color,
          footer: interpolate(block.footer, ctx, vars),
        };
        outputs.push({ kind: 'embed', channel: ctx.channel, embed });
        entry.detail = embed.title || embed.description.slice(0, 80);
        break;
      }
      case 'dm': {
        const text = interpolate(block.text, ctx, vars);
        outputs.push({ kind: 'dm', to: ctx.user.name, text });
        entry.detail = `à ${ctx.user.name} · ${text.slice(0, 80)}`;
        break;
      }
      case 'button': {
        outputs.push({
          kind: 'button',
          label: interpolate(block.label, ctx, vars),
          style: block.style,
          target: block.target,
        });
        entry.detail = `bouton « ${block.label} »`;
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
        outputs.push({ kind: 'message', channel: ctx.channel, text, variant: variant.id });
        entry.detail = `variante choisie · ${text.slice(0, 80)}`;
        break;
      }
      case 'role': {
        outputs.push({ kind: 'role', action: block.action, role: block.role, user: ctx.user.name });
        entry.detail = `${block.action === 'remove' ? 'Retire' : 'Ajoute'} le rôle ${block.role || '—'} à ${ctx.user.name}`;
        break;
      }
      case 'channel': {
        outputs.push({ kind: 'channel', name: block.name, channelKind: block.kind });
        entry.detail = `salon ${block.kind === 'voice' ? 'vocal' : block.kind === 'forum' ? 'forum' : 'textuel'} « ${block.name} »`;
        break;
      }
      case 'pin': {
        outputs.push({ kind: 'pin', unpin: block.unpin });
        entry.detail = block.unpin ? 'Désépingle le message' : 'Épingle le message';
        break;
      }
      case 'delete': {
        outputs.push({ kind: 'delete', count: block.count });
        entry.detail = `${block.count} message(s) supprimé(s)`;
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
        outputs.push({ kind: 'webhook', method: block.method, url: block.url, status: 200, simulated: true });
        entry.detail = `${block.method} ${block.url || '(url vide)'} → 200 (simulé)`;
        break;
      }
      case 'log': {
        const text = interpolate(block.text, ctx, vars);
        outputs.push({ kind: 'log', text });
        entry.detail = text;
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
