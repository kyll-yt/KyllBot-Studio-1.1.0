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
  message: { label: 'Envoyer un message', group: 'action' },
  embed: { label: 'Envoyer un embed', group: 'action' },
  dm: { label: 'Message privé', group: 'action' },
  condition: { label: 'Condition', group: 'condition' },
  role: { label: 'Rôle', group: 'action' },
  setvar: { label: 'Définir une variable', group: 'action' },
  wait: { label: 'Attendre', group: 'action' },
  random: { label: 'Variante aléatoire', group: 'action' },
  react: { label: 'Ajouter une réaction', group: 'action' },
  log: { label: 'Journaliser', group: 'action' },
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
  hasRole: 'possède le rôle',
  chance: 'chance (en %)',
};

const MAX_BLOCKS = 120;
const MAX_DEPTH = 6;
const MAX_STEPS = 400;

const str = (value, max = 300) => String(value ?? '').trim().slice(0, max);

/* ------------------------------------------------------------------ */
/* normalisation                                                       */
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
    weight: Math.min(100, Math.max(1, Number(variant?.weight) || 1)),
  };
}

function normalizeBlock(block, depth = 0) {
  const type = Object.prototype.hasOwnProperty.call(BLOCKS, block?.type) ? block.type : 'message';
  const base = { id: str(block?.id, 40) || newId(), type };

  if (depth > MAX_DEPTH) return { ...base, type: 'log', text: 'Bloc trop profond (ignoré).' };

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
    case 'condition':
      return {
        ...base,
        mode: block?.mode === 'any' ? 'any' : 'all',
        rules: Array.isArray(block?.rules) ? block.rules.slice(0, 10).map(normalizeRule) : [],
        then: Array.isArray(block?.then) ? block.then.slice(0, 40).map((b) => normalizeBlock(b, depth + 1)) : [],
        else: Array.isArray(block?.else) ? block.else.slice(0, 40).map((b) => normalizeBlock(b, depth + 1)) : [],
      };
    case 'role':
      return {
        ...base,
        action: block?.action === 'remove' ? 'remove' : 'add',
        role: str(block?.role, 60),
      };
    case 'setvar':
      return { ...base, name: str(block?.name, 40).replace(/[^\w.-]/g, ''), value: str(block?.value, 300) };
    case 'wait':
      return { ...base, seconds: Math.min(30, Math.max(1, Number(block?.seconds) || 3)) };
    case 'random': {
      const variants = Array.isArray(block?.variants) && block.variants.length
        ? block.variants.slice(0, 8).map(normalizeVariant)
        : [normalizeVariant({ text: '' }), normalizeVariant({ text: '' })];
      return { ...base, variants };
    }
    case 'react':
      return { ...base, emoji: str(block?.emoji, 8) || '👍' };
    case 'log':
      return { ...base, text: str(block?.text, 300) };
    default:
      return { ...base, text: '' };
  }
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
    blocks: (Array.isArray(input.blocks) ? input.blocks : previous?.blocks || [])
      .slice(0, MAX_BLOCKS)
      .map((block) => normalizeBlock(block)),
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
        { type: 'message', channel: '#bienvenue', text: 'Bienvenue {{user.mention}} sur **{{server.name}}** !' },
        {
          type: 'condition',
          mode: 'all',
          rules: [{ left: '{{user.roles}}', op: 'contains', right: 'Invité' }],
          then: [{ type: 'message', channel: '#bienvenue', text: 'Pense à passer te présenter dans #présentations.' }],
          else: [{ type: 'message', channel: '#bienvenue', text: 'Bon retour parmi nous !' }],
        },
        { type: 'role', action: 'add', role: 'Membre' },
        { type: 'dm', text: 'Salut {{user.name}}, bienvenue sur {{server.name}} !' },
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
          ],
        },
        { type: 'wait', seconds: 3 },
        {
          type: 'condition',
          mode: 'all',
          rules: [{ left: '{{message}}', op: 'contains', right: 'rank' }],
          then: [
            { type: 'setvar', name: 'score', value: '1' },
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
        {
          type: 'condition',
          mode: 'any',
          rules: [
            { left: '{{message}}', op: 'contains', right: 'discord.gg' },
            { left: '{{message}}', op: 'contains', right: 'http' },
          ],
          then: [
            { type: 'message', text: '{{user.mention}}, les liens ne sont pas autorisés ici.', ephemeral: true },
            { type: 'role', action: 'remove', role: 'Membre' },
            { type: 'log', text: 'Lien supprimé pour {{user.name}}' },
          ],
          else: [],
        },
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
  let steps = 0;
  const started = Date.now();

  const walk = (blocks, depth) => {
    for (const block of blocks || []) {
      if (steps >= MAX_STEPS) return;
      steps += 1;
      const entry = {
        id: block.id,
        type: block.type,
        depth,
        status: 'ok',
        title: BLOCKS[block.type]?.label || block.type,
        detail: '',
      };

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
        case 'condition': {
          const results = (block.rules || []).map((rule) => ({ ...rule, ...evaluateRule(rule, ctx, vars) }));
          const pass = block.mode === 'any' ? results.some((result) => result.pass) : results.every((result) => result.pass);
          entry.status = pass ? 'ok' : 'skipped';
          entry.branch = pass ? 'then' : 'else';
          entry.rules = results;
          entry.detail = results.length
            ? results.map((result) => `${result.left} ${OPERATORS[result.op]} ${result.right} → ${result.pass ? 'vrai' : 'faux'}`).join(' · ')
            : 'Aucune règle : branche « sinon »';
          trace.push(entry);
          walk(pass ? block.then : block.else, depth + 1);
          continue;
        }
        case 'role': {
          outputs.push({ kind: 'role', action: block.action, role: block.role, user: ctx.user.name });
          entry.detail = `${block.action === 'remove' ? 'Retire' : 'Ajoute'} le rôle ${block.role || '—'} à ${ctx.user.name}`;
          break;
        }
        case 'setvar': {
          const value = interpolate(block.value, ctx, vars);
          vars[block.name] = value;
          outputs.push({ kind: 'var', name: block.name, value });
          entry.detail = `${block.name} = ${value}`;
          break;
        }
        case 'wait': {
          outputs.push({ kind: 'wait', seconds: block.seconds });
          entry.detail = `${block.seconds} s`;
          break;
        }
        case 'random': {
          const variant = pickVariant(block.variants);
          const text = interpolate(variant.text, ctx, vars);
          outputs.push({ kind: 'message', channel: ctx.channel, text, variant: variant.id });
          entry.detail = `variante choisie · ${text.slice(0, 80)}`;
          break;
        }
        case 'react': {
          outputs.push({ kind: 'react', emoji: block.emoji });
          entry.detail = block.emoji;
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
    }
  };

  walk(flow.blocks, 0);

  return { trace, outputs, variables: vars, steps, durationMs: Date.now() - started };
}

export function ensureBotFlows(bot) {
  if (!Array.isArray(bot.flows)) bot.flows = [];
  return bot.flows;
}
