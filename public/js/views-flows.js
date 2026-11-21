/* ------------------------------------------------------------------ */
/* flux : liste dans la fiche bot + éditeur canvas 2D                  */
/* ------------------------------------------------------------------ */

const FLOW_TRIGGERS = {
  slash: { label: 'Commande slash', icon: 'slash' },
  keyword: { label: 'Mot-clé', icon: 'message' },
  join: { label: 'Arrivée d’un membre', icon: 'userPlus' },
  leave: { label: 'Départ d’un membre', icon: 'userMinus' },
  reaction: { label: 'Réaction', icon: 'smile' },
  button: { label: 'Bouton', icon: 'cursor' },
  schedule: { label: 'Planification', icon: 'clock' },
  dm: { label: 'Message privé reçu', icon: 'mail' },
};

const FLOW_BLOCKS = {
  message: { label: 'Message', icon: 'message', tone: 'violet', group: 'message', hint: 'Texte simple dans un salon' },
  embed: { label: 'Embed', icon: 'layers', tone: 'cyan', group: 'message', hint: 'Carte avec titre et couleur' },
  dm: { label: 'Message privé', icon: 'mail', tone: 'cyan', group: 'message', hint: 'Envoie un MP au membre' },
  button: { label: 'Boutons', icon: 'cursor', tone: 'violet', group: 'message', hint: 'Composants cliquables' },
  react: { label: 'Réaction', icon: 'smile', tone: 'grey', group: 'message', hint: 'Ajoute un emoji' },
  random: { label: 'Variantes', icon: 'shuffle', tone: 'pink', group: 'message', hint: 'Tire un texte au hasard' },
  role: { label: 'Rôle', icon: 'shield', tone: 'green', group: 'gestion', hint: 'Ajoute ou retire un rôle' },
  channel: { label: 'Salon', icon: 'hashtag', tone: 'green', group: 'gestion', hint: 'Crée un salon textuel ou vocal' },
  pin: { label: 'Épingler', icon: 'pin', tone: 'green', group: 'gestion', hint: 'Épingle le message' },
  delete: { label: 'Supprimer', icon: 'trash', tone: 'pink', group: 'gestion', hint: 'Efface des messages' },
  setvar: { label: 'Variable', icon: 'variable', tone: 'violet', group: 'logique', hint: 'Assigne une valeur' },
  counter: { label: 'Calcul', icon: 'calc', tone: 'violet', group: 'logique', hint: 'Additionne ou retire' },
  condition: { label: 'Condition', icon: 'branch', tone: 'amber', group: 'logique', hint: 'Deux branches vrai / faux' },
  wait: { label: 'Attendre', icon: 'clock', tone: 'grey', group: 'logique', hint: 'Pause avant de continuer' },
  cooldown: { label: 'Anti-spam', icon: 'shield', tone: 'amber', group: 'logique', hint: 'Limite la fréquence' },
  typing: { label: 'Saisie', icon: 'keyboard', tone: 'grey', group: 'technique', hint: 'Affiche « écrit… »' },
  webhook: { label: 'HTTP', icon: 'plug', tone: 'cyan', group: 'technique', hint: 'Appelle une API externe' },
  log: { label: 'Journal', icon: 'terminal', tone: 'grey', group: 'technique', hint: 'Note dans les logs' },
};

const FLOW_GROUPS = [
  ['message', 'Messages'],
  ['gestion', 'Gestion du serveur'],
  ['logique', 'Logique'],
  ['technique', 'Technique'],
];

const FLOW_OPERATORS = {
  eq: 'est égal à',
  neq: 'est différent de',
  contains: 'contient',
  notContains: 'ne contient pas',
  startsWith: 'commence par',
  endsWith: 'se termine par',
  gt: 'supérieur à',
  lt: 'inférieur à',
  gte: 'supérieur ou égal',
  lte: 'inférieur ou égal',
  hasRole: 'possède le rôle',
  chance: 'chance (%)',
};

const FLOW_TEMPLATES = [
  { value: '', label: 'Flux vide', hint: 'Vous ajoutez les blocs vous-même.' },
  { value: 'welcome', label: 'Bienvenue', hint: 'Saisie, message, condition, rôle et MP.' },
  { value: 'ticket', label: 'Ticket support', hint: 'Message éphémère, embed, bouton et rôle.' },
  { value: 'quiz', label: 'Quiz', hint: 'Variantes, attente, condition et score.' },
  { value: 'moderation', label: 'Filtre anti-spam', hint: 'Anti-spam, condition et sanction.' },
  { value: 'support', label: 'Relance support', hint: 'HTTP, MP, attente et épinglage.' },
];


const VARIANT_BANK = [
  {
    theme: 'Accueil',
    items: [
      'Bienvenue {{user.mention}}, installe-toi, on est ravis de te voir !',
      'Salut {{user.name}} ! Passe lire les règles puis présente-toi.',
      'Un nouveau visage : bienvenue sur {{server.name}} !',
      'Te voilà parmi nous, {{user.name}} ! Prends un cookie 🍪',
      'Bienvenue ! Ton aventure commence dans #présentations.',
      'Hey {{user.name}}, n’hésite pas à poser tes questions.',
      'Bienvenue à bord ! Le staff est là si besoin.',
      'Nouveau membre détecté : {{user.name}} vient d’arriver !',
    ],
  },
  {
    theme: 'Absence et retour',
    items: [
      'Bon retour {{user.name}}, tu nous as manqué !',
      'Content de te revoir parmi nous.',
      'Te revoilà ! On a gardé ta place.',
      'Absence notée, reviens vite {{user.name}}.',
      'Repos bien mérité, à très vite sur le serveur.',
      'Le serveur est resté calme pendant ton absence… ou presque.',
      'Retour enregistré, tes rôles sont restaurés.',
      'Bon retour ! Tu as raté quelques annonces dans #news.',
    ],
  },
  {
    theme: 'Quiz et formation',
    items: [
      'Question : quelle commande affiche ton niveau ?',
      'Question : combien de modules compte la formation Discord ?',
      'Question : quel rôle obtient-on à 10 messages ?',
      'Question : que fait la commande /ticket ?',
      'Question : à quoi sert un webhook ?',
      'Question : comment obtient-on un certificat ?',
      'Question : que signifie l’acronyme XP ?',
      'Question : quel bloc sert à tester une condition ?',
    ],
  },
  {
    theme: 'Modération',
    items: [
      '{{user.mention}}, merci de garder un ton respectueux.',
      'Ce lien n’est pas autorisé sur le serveur.',
      'Message supprimé : publicité non autorisée.',
      'Doucement sur le spam, {{user.name}}.',
      'Le sujet a déjà été traité dans #faq.',
      'Merci d’éviter les majuscules, c’est considéré comme du cri.',
      'Ce salon est réservé aux annonces du staff.',
      'Sanction appliquée : avertissement 1 sur 3.',
    ],
  },
  {
    theme: 'Événements',
    items: [
      'Le concours commence dans 10 minutes, préparez-vous !',
      'Réagis avec 🎉 pour participer au tirage.',
      'Soirée jeu ce vendredi à 21 h, qui est partant ?',
      'Dernière chance de s’inscrire à l’événement.',
      'Bravo aux participants, le classement arrive.',
      'Le stream démarre, rejoins le salon vocal.',
      'Nouvelle animation : devine le nombre mystère.',
      'Merci à tous pour cette soirée, on remet ça bientôt !',
    ],
  },
  {
    theme: 'Relance et support',
    items: [
      'Petit rappel : ton ticket est toujours ouvert, {{user.name}}.',
      'Le staff a répondu, tu peux jeter un œil au ticket.',
      'Sans réponse d’ici 24 h, le ticket sera fermé automatiquement.',
      'Besoin d’aide ? Ouvre un ticket avec /ticket.',
      'Ta demande a bien été prise en compte.',
      'On revient vers toi dès que possible.',
      'Le problème est résolu, on ferme le ticket ?',
      'N’oublie pas de noter la qualité du support.',
    ],
  },
];

const flowEditor = {
  botId: null,
  flow: null,
  dirty: false,
  result: null,
  running: false,
  view: null,
  sideOpen: false,
  testOpen: false,
  ctx: {
    message: 'salut, je découvre le serveur',
    user: 'Sarah',
    roles: 'Invité',
    server: 'Mon serveur',
    channel: '#général',
  },
};

const flowClone = (value) => JSON.parse(JSON.stringify(value));
const flowUid = () => window.crypto?.randomUUID?.() || `id-${Math.random().toString(36).slice(2, 10)}`;
const flowNode = (id) => flowEditor.flow?.blocks.find((block) => block.id === id) || null;

function flowNewBlock(type, x = 120, y = 120) {
  const base = { id: flowUid(), type, x, y, next: null };
  switch (type) {
    case 'embed':
      return { ...base, title: 'Titre', description: '', color: '#7c5cff', footer: '' };
    case 'dm':
      return { ...base, text: '' };
    case 'button':
      return { ...base, label: 'Cliquez ici', style: 'primary', target: '' };
    case 'role':
      return { ...base, action: 'add', role: 'Membre' };
    case 'channel':
      return { ...base, name: 'nouveau-salon', kind: 'text' };
    case 'pin':
      return { ...base, unpin: false };
    case 'delete':
      return { ...base, count: 1 };
    case 'setvar':
      return { ...base, name: 'compteur', value: '1' };
    case 'counter':
      return { ...base, name: 'score', op: 'add', value: '1' };
    case 'condition':
      return { ...base, mode: 'all', rules: [{ id: flowUid(), left: '{{user.roles}}', op: 'contains', right: 'Membre' }], thenId: null, elseId: null, next: undefined };
    case 'wait':
      return { ...base, seconds: 3 };
    case 'cooldown':
      return { ...base, seconds: 10, scope: 'member' };
    case 'typing':
      return { ...base, seconds: 2 };
    case 'webhook':
      return { ...base, method: 'POST', url: '', body: '' };
    case 'random':
      return {
        ...base,
        variants: [
          { id: flowUid(), text: 'Première variante', weight: 1 },
          { id: flowUid(), text: 'Deuxième variante', weight: 1 },
        ],
      };
    case 'react':
      return { ...base, emoji: '👍' };
    case 'log':
      return { ...base, text: '' };
    default:
      return { ...base, channel: '', text: '', ephemeral: false };
  }
}

function flowCloneBlock(block, offset = 48) {
  const copy = flowClone(block);
  copy.id = flowUid();
  copy.next = null;
  if (copy.thenId !== undefined) {
    copy.thenId = null;
    copy.elseId = null;
  }
  copy.x += offset;
  copy.y += offset;
  if (Array.isArray(copy.rules)) copy.rules.forEach((rule) => (rule.id = flowUid()));
  if (Array.isArray(copy.variants)) copy.variants.forEach((variant) => (variant.id = flowUid()));
  return copy;
}

function flowLayout() {
  const flow = flowEditor.flow;
  const byId = new Map(flow.blocks.map((block) => [block.id, block]));
  const levels = new Map();
  const queue = [];
  if (flow.start && byId.has(flow.start)) {
    levels.set(flow.start, 0);
    queue.push(flow.start);
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
  for (const block of flow.blocks) {
    if (!levels.has(block.id)) {
      orphans.push(block);
      continue;
    }
    const level = levels.get(block.id);
    const index = used.get(level) || 0;
    used.set(level, index + 1);
    block.x = 80 + level * 340;
    block.y = 80 + index * 240;
  }
  orphans.forEach((block, index) => {
    block.x = 80 + (index % 3) * 340;
    block.y = 80 + (maxLevel + 2) * 240 + Math.floor(index / 3) * 240;
  });
  flowEditor.view = null;
}

/* ------------------------------------------------------------------ */
/* onglet « Flux » de la fiche bot                                     */
/* ------------------------------------------------------------------ */

function viewBotFlows(bot) {
  const flows = bot.flows || [];
  const active = flows.filter((flow) => flow.enabled).length;

  return `<div class="panel">
    <div class="panel-head">
      <h3>Flux</h3>
      <div class="ph-actions">
        <span class="pill violet">${active} actif(s)</span>
        <button class="btn btn-primary btn-sm" data-action="new-flow" data-id="${esc(bot.id)}">${icon('plus')} Nouveau flux</button>
      </div>
    </div>
    <div class="panel-body">
      ${
        flows.length
          ? `<div class="flow-list">${flows
              .map((flow) => {
                const trigger = FLOW_TRIGGERS[flow.trigger?.type] || FLOW_TRIGGERS.slash;
                const links = (flow.blocks || []).filter((block) => block.next || block.thenId || block.elseId).length;
                return `<div class="flow-card">
                  <span class="fl-ic">${icon(trigger.icon)}</span>
                  <div class="fl-main">
                    <h4>${esc(flow.name)} ${flow.enabled ? '' : '<span class="pill grey">En pause</span>'}</h4>
                    <p>${esc(flow.description || trigger.label)}</p>
                    <div class="fl-meta">
                      <span>${flow.blocks?.length || 0} bloc(s)</span>
                      <span>${links} connexion(s)</span>
                      <span>${fmt(flow.runs || 0)} exécution(s)</span>
                    </div>
                  </div>
                  <button class="switch ${flow.enabled ? 'on' : ''}" data-action="toggle-flow" data-id="${esc(bot.id)}" data-flow="${esc(flow.id)}" aria-label="Activer ${esc(flow.name)}"></button>
                  <a class="btn btn-sm btn-ghost" href="#/bots/${esc(bot.id)}/flows/${esc(flow.id)}">${icon('edit')} Ouvrir</a>
                  <button class="mini-btn danger" data-action="delete-flow" data-id="${esc(bot.id)}" data-flow="${esc(flow.id)}" title="Supprimer">${icon('trash')}</button>
                </div>`;
              })
              .join('')}</div>`
          : `<div class="empty" style="padding:38px 20px">
              <div class="ic">${icon('flow')}</div>
              <h3>Aucun flux</h3>
              <p>Un flux part d’un déclencheur puis enchaîne des blocs reliés entre eux.</p>
              <button class="btn btn-primary" data-action="new-flow" data-id="${esc(bot.id)}">Créer un premier flux</button>
            </div>`
      }
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* éditeur                                                             */
/* ------------------------------------------------------------------ */

function flowEnsureLoaded(botId, flowId) {
  if (flowEditor.flow?.id === flowId && flowEditor.botId === botId) return true;
  const bot = state.ws.bots.find((entry) => entry.id === botId);
  const flow = bot?.flows?.find((entry) => entry.id === flowId);
  if (!flow) return false;
  flowEditor.botId = botId;
  flowEditor.flow = flowClone(flow);
  flowEditor.dirty = false;
  flowEditor.result = null;
  flowEditor.view = null;
  return true;
}

function viewFlowEditor(botId, flowId) {
  const bot = state.ws.bots.find((entry) => entry.id === botId);
  if (!bot) return emptyState('Bot introuvable', 'Ce bot a peut-être été supprimé.', 'Retour aux bots', 'go-bots');
  if (!flowEnsureLoaded(botId, flowId)) {
    return `<div class="empty">
      <div class="ic">${icon('flow')}</div>
      <h3>Flux introuvable</h3>
      <p>Ce flux a peut-être été supprimé.</p>
      <a class="btn btn-primary" href="#/bots/${esc(botId)}">Retour au bot</a>
    </div>`;
  }

  const flow = flowEditor.flow;
  const trigger = FLOW_TRIGGERS[flow.trigger?.type] || FLOW_TRIGGERS.slash;
  const view = flowEditor.view || { x: 40, y: 40, zoom: 1 };

  requestAnimationFrame(() => initFlowCanvas());

  return `<a class="back-link" href="#/bots/${esc(bot.id)}">${icon('arrowLeft')} Retour à ${esc(bot.name)}</a>
  <div class="flow-head">
    <div class="fh-id">
      <span class="fl-ic lg">${icon(trigger.icon)}</span>
      <div class="fh-text">
        <input class="flow-name" id="flowName" value="${esc(flow.name)}" aria-label="Nom du flux" data-flow-name />
        <p>${esc(bot.name)} · ${flow.blocks.length} bloc(s)${flowEditor.dirty ? ' · <span class="fh-dirty">modifications non enregistrées</span>' : ''}</p>
      </div>
    </div>
    <div class="fh-actions">
      <button class="btn btn-ghost btn-sm" data-action="flow-run">${icon('play')} Tester</button>
      <button class="btn btn-primary btn-sm" data-action="flow-save">${icon('save')} Enregistrer</button>
    </div>
  </div>
  <div class="flow-layout${flowEditor.sideOpen ? ' side-open' : ''}${flowEditor.testOpen ? ' test-open' : ''}" id="flowLayout">
    <section class="flow-canvas2d">
      <div class="canvas-toolbar">
        <button class="tool-btn" data-action="flow-toggle-side">${icon('gear')} Réglages</button>
        <div class="zoom-group">
          <button class="mini-btn" data-action="flow-zoom" data-dir="-1" title="Zoom arrière">−</button>
          <span class="zoom-label" id="flowZoomLabel">${Math.round(view.zoom * 100)} %</span>
          <button class="mini-btn" data-action="flow-zoom" data-dir="1" title="Zoom avant">+</button>
        </div>
        <button class="tool-btn" data-action="flow-fit" title="Recentrer">${icon('grid')} Recentrer</button>
        <button class="tool-btn" data-action="flow-auto" title="Ranger les blocs">${icon('flow')} Ranger</button>
        <span class="toolbar-spacer"></span>
        <button class="tool-btn" data-action="flow-toggle-test">${icon('play')} Test</button>
        <button class="tool-btn" data-action="flow-add-menu">${icon('plus')} Bloc</button>
      </div>
      <div class="canvas-viewport" id="flowViewport">
        <div class="canvas-world" id="flowWorld" style="transform: translate(${view.x}px, ${view.y}px) scale(${view.zoom})">
          <svg class="canvas-edges" id="flowEdges" aria-hidden="true"></svg>
          ${flow.blocks.map((block) => renderNode(block, flow)).join('')}
        </div>
        ${
          flow.blocks.length
            ? ''
            : `<div class="canvas-hint">${icon('cursor')} <span>Glissez un bloc depuis la palette de gauche pour commencer.</span></div>`
        }
      </div>
    </section>
    <aside class="flow-side" id="flowSide">
      ${renderTriggerCard(flow)}
      ${renderVariablesCard(flow)}
      ${renderPalette()}
    </aside>
    <aside class="flow-test" id="flowTest">
      ${renderTestPanel()}
    </aside>
  </div>`;
}

function renderTriggerCard(flow) {
  const trigger = flow.trigger || {};
  const type = trigger.type || 'slash';
  let fields = '';

  if (type === 'slash') {
    fields = `<div class="field"><label>Commande</label>
      <div class="input-prefix"><span>/</span><input class="input" data-trigger="command" value="${esc(trigger.command || '')}" placeholder="mon-flux"></div></div>`;
  } else if (type === 'keyword') {
    fields = `<div class="field"><label>Mot-clé</label>
        <input class="input" data-trigger="keyword" value="${esc(trigger.keyword || '')}" placeholder="bonjour"></div>
      <div class="field"><label>Correspondance</label>
        <select class="select" data-trigger="match">
          <option value="contains" ${trigger.match === 'contains' ? 'selected' : ''}>Contient</option>
          <option value="startsWith" ${trigger.match === 'startsWith' ? 'selected' : ''}>Commence par</option>
          <option value="exact" ${trigger.match === 'exact' ? 'selected' : ''}>Exactement</option>
        </select></div>`;
  } else if (type === 'reaction') {
    fields = `<div class="field"><label>Emoji</label><input class="input" data-trigger="emoji" value="${esc(trigger.emoji || '')}" placeholder="🎉"></div>`;
  } else if (type === 'schedule') {
    fields = `<div class="field"><label>Fréquence</label><input class="input" data-trigger="schedule" value="${esc(trigger.schedule || '')}" placeholder="lundi 09:00"></div>`;
  }

  if (['slash', 'keyword', 'join', 'leave', 'reaction', 'button'].includes(type)) {
    fields += `<div class="field"><label>Salon (optionnel)</label>
      <input class="input" data-trigger="channel" value="${esc(trigger.channel || '')}" placeholder="#général"></div>`;
  }

  return `<div class="panel flow-panel">
    <div class="panel-head"><h3>${icon('zap')} Déclencheur</h3></div>
    <div class="panel-body">
      <div class="field"><label>Quand le flux démarre</label>
        <select class="select" data-trigger="type">
          ${Object.entries(FLOW_TRIGGERS)
            .map(([key, value]) => `<option value="${key}" ${type === key ? 'selected' : ''}>${value.label}</option>`)
            .join('')}
        </select>
      </div>
      ${fields}
      <p class="hint">Variables : <code>{{user.name}}</code>, <code>{{user.mention}}</code>, <code>{{user.roles}}</code>, <code>{{server.name}}</code>, <code>{{message}}</code>.</p>
    </div>
  </div>`;
}

function renderVariablesCard(flow) {
  return `<div class="panel flow-panel">
    <div class="panel-head"><h3>${icon('variable')} Variables</h3>
      <div class="ph-actions"><button class="mini-btn" data-action="flow-add-var" title="Ajouter une variable">${icon('plus')}</button></div>
    </div>
    <div class="panel-body">
      ${
        flow.variables.length
          ? flow.variables
              .map(
                (variable, index) => `<div class="var-row">
                  <input class="input var-name" data-var="${index}" data-var-field="name" value="${esc(variable.name)}" placeholder="nom" />
                  <span class="var-eq">=</span>
                  <input class="input" data-var="${index}" data-var-field="value" value="${esc(variable.value)}" placeholder="valeur" />
                  <button class="mini-btn danger" data-action="flow-del-var" data-index="${index}" title="Supprimer">${icon('x')}</button>
                </div>`,
              )
              .join('')
          : '<p class="hint">Aucune variable. Utilisez <code>{{ma-variable}}</code> dans vos textes.</p>'
      }
    </div>
  </div>`;
}

function renderPalette() {
  return `<div class="panel flow-panel">
    <div class="panel-head"><h3>${icon('layers')} Palette</h3></div>
    <div class="panel-body palette">
      ${FLOW_GROUPS.map(
        ([key, label]) => `<span class="pal-label">${label}</span>
          <div class="pal-grid">
            ${Object.entries(FLOW_BLOCKS)
              .filter(([, meta]) => meta.group === key)
              .map(
                ([type, meta]) => `<button class="pal-item" data-action="flow-add-node" data-type="${type}" title="${meta.hint}">
                  <span class="blk-ic tone-${meta.tone}">${icon(meta.icon)}</span>
                  <span>${meta.label}</span>
                </button>`,
              )
              .join('')}
          </div>`,
      ).join('')}
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* nœuds du canvas                                                     */
/* ------------------------------------------------------------------ */

function renderNode(block, flow) {
  const meta = FLOW_BLOCKS[block.type] || FLOW_BLOCKS.message;
  const isStart = flow.start === block.id;
  const outputs = block.type === 'condition'
    ? `<div class="node-outs two">
        <button class="port out then" data-node="${block.id}" data-branch="then" title="Glissez vers un bloc (vrai)"><i></i><span>vrai</span></button>
        <button class="port out else" data-node="${block.id}" data-branch="else" title="Glissez vers un bloc (faux)"><i></i><span>faux</span></button>
      </div>`
    : `<div class="node-outs">
        <button class="port out" data-node="${block.id}" data-branch="next" title="Glissez vers un bloc"></button>
      </div>`;

  return `<div class="node tone-${meta.tone}${isStart ? ' is-start' : ''}" data-node="${block.id}" style="left:${block.x}px;top:${block.y}px">
    <span class="port in" title="Entrée"></span>
    <div class="node-head" data-drag="${block.id}">
      <span class="node-ic">${icon(meta.icon)}</span>
      <span class="node-title">${meta.label}</span>
      ${isStart ? '<span class="node-badge">départ</span>' : ''}
      <span class="node-tools">
        <button class="mini-btn" data-action="flow-node-start" data-id="${block.id}" title="Définir comme départ">${icon('play')}</button>
        <button class="mini-btn" data-action="flow-node-dup" data-id="${block.id}" title="Dupliquer">${icon('duplicate')}</button>
        <button class="mini-btn danger" data-action="flow-node-del" data-id="${block.id}" title="Supprimer">${icon('trash')}</button>
      </span>
    </div>
    <div class="node-body">${renderNodeFields(block)}</div>
    ${outputs}
  </div>`;
}

function nodeField(label, inner, extra = '') {
  return `<label class="fld ${extra}"><span>${label}</span>${inner}</label>`;
}

function renderNodeFields(block) {
  const bind = (name) => `data-node="${block.id}" data-field="${name}"`;

  switch (block.type) {
    case 'message':
      return `<div class="fld-row">
          ${nodeField('Salon', `<input class="input" ${bind('channel')} value="${esc(block.channel || '')}" placeholder="#général">`, 'grow')}
          ${nodeField('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
        </div>
        ${nodeField('Message', `<textarea class="textarea" rows="3" ${bind('text')} placeholder="Bienvenue {{user.mention}} !">${esc(block.text)}</textarea>`)}`;
    case 'embed':
      return `<div class="fld-row">
          ${nodeField('Titre', `<input class="input" ${bind('title')} value="${esc(block.title || '')}">`, 'grow')}
          ${nodeField('Couleur', `<input class="input color-mini" type="color" ${bind('color')} value="${esc(block.color || '#7c5cff')}">`, 'shrink')}
        </div>
        ${nodeField('Description', `<textarea class="textarea" rows="3" ${bind('description')}>${esc(block.description || '')}</textarea>`)}
        ${nodeField('Pied de page', `<input class="input" ${bind('footer')} value="${esc(block.footer || '')}">`)}`;
    case 'dm':
      return nodeField('Message privé', `<textarea class="textarea" rows="3" ${bind('text')} placeholder="Salut {{user.name}} !">${esc(block.text)}</textarea>`);
    case 'button':
      return `<div class="fld-row">
          ${nodeField('Libellé', `<input class="input" ${bind('label')} value="${esc(block.label || '')}">`, 'grow')}
          ${nodeField('Style', `<select class="select" ${bind('style')}>
            <option value="primary" ${block.style === 'primary' ? 'selected' : ''}>Primaire</option>
            <option value="secondary" ${block.style === 'secondary' ? 'selected' : ''}>Secondaire</option>
            <option value="success" ${block.style === 'success' ? 'selected' : ''}>Succès</option>
            <option value="danger" ${block.style === 'danger' ? 'selected' : ''}>Danger</option>
          </select>`, 'shrink')}
        </div>
        ${nodeField('Flux déclenché', `<input class="input" ${bind('target')} value="${esc(block.target || '')}" placeholder="nom du flux (optionnel)">`)}`;
    case 'react':
      return nodeField('Emoji', `<input class="input" ${bind('emoji')} value="${esc(block.emoji || '')}" placeholder="👍">`, 'shrink');
    case 'random':
      return `<div class="variants">${block.variants
        .map(
          (variant, index) => `<div class="variant-row">
            <span class="variant-badge">V${index + 1}</span>
            <input class="input" data-node="${block.id}" data-variant="${index}" data-variant-field="text" value="${esc(variant.text)}" placeholder="Texte de la variante">
            <input class="input weight" type="number" min="1" max="100" data-node="${block.id}" data-variant="${index}" data-variant-field="weight" value="${variant.weight}" title="Poids">
            <button class="mini-btn danger" data-action="flow-del-variant" data-id="${block.id}" data-index="${index}" title="Supprimer">${icon('x')}</button>
          </div>`,
        )
        .join('')}
        <div class="variant-actions">
          <button class="link-btn" data-action="flow-add-variant" data-id="${block.id}">${icon('plus')} Variante</button>
          <button class="link-btn" data-action="flow-variant-bank" data-id="${block.id}">${icon('shuffle')} Banque (48)</button>
        </div>
      </div>`;
    case 'role':
      return `<div class="fld-row">
          ${nodeField('Action', `<select class="select" ${bind('action')}>
            <option value="add" ${block.action === 'add' ? 'selected' : ''}>Ajouter</option>
            <option value="remove" ${block.action === 'remove' ? 'selected' : ''}>Retirer</option>
          </select>`, 'shrink')}
          ${nodeField('Rôle', `<input class="input" ${bind('role')} value="${esc(block.role || '')}" placeholder="Membre">`, 'grow')}
        </div>`;
    case 'channel':
      return `<div class="fld-row">
          ${nodeField('Nom', `<input class="input" ${bind('name')} value="${esc(block.name || '')}" placeholder="nouveau-salon">`, 'grow')}
          ${nodeField('Type', `<select class="select" ${bind('kind')}>
            <option value="text" ${block.kind === 'text' ? 'selected' : ''}>Textuel</option>
            <option value="voice" ${block.kind === 'voice' ? 'selected' : ''}>Vocal</option>
            <option value="forum" ${block.kind === 'forum' ? 'selected' : ''}>Forum</option>
          </select>`, 'shrink')}
        </div>`;
    default:
      return renderNodeFieldsB(block);
  }
}

function renderNodeFieldsB(block) {
  const bind = (name) => `data-node="${block.id}" data-field="${name}"`;

  switch (block.type) {
    case 'pin':
      return `${nodeField('Action', `<select class="select" ${bind('unpin')}>
          <option value="false" ${!block.unpin ? 'selected' : ''}>Épingler</option>
          <option value="true" ${block.unpin ? 'selected' : ''}>Désépingler</option>
        </select>`)}`;
    case 'delete':
      return nodeField('Nombre de messages', `<input class="input" type="number" min="1" max="100" ${bind('count')} value="${block.count || 1}">`, 'shrink');
    case 'setvar':
      return `<div class="fld-row">
          ${nodeField('Variable', `<input class="input" ${bind('name')} value="${esc(block.name || '')}" placeholder="score">`, 'shrink')}
          ${nodeField('Valeur', `<input class="input" ${bind('value')} value="${esc(block.value || '')}" placeholder="3">`, 'grow')}
        </div>`;
    case 'counter':
      return `<div class="fld-row">
          ${nodeField('Variable', `<input class="input" ${bind('name')} value="${esc(block.name || '')}" placeholder="score">`, 'grow')}
          ${nodeField('Opération', `<select class="select" ${bind('op')}>
            <option value="add" ${block.op === 'add' ? 'selected' : ''}>+</option>
            <option value="sub" ${block.op === 'sub' ? 'selected' : ''}>−</option>
            <option value="mul" ${block.op === 'mul' ? 'selected' : ''}>×</option>
            <option value="set" ${block.op === 'set' ? 'selected' : ''}>=</option>
          </select>`, 'shrink')}
          ${nodeField('Valeur', `<input class="input" ${bind('value')} value="${esc(block.value || '')}" placeholder="1">`, 'shrink')}
        </div>`;
    case 'wait':
      return nodeField('Durée (secondes)', `<input class="input" type="number" min="1" max="30" ${bind('seconds')} value="${block.seconds || 3}">`, 'shrink');
    case 'cooldown':
      return `<div class="fld-row">
          ${nodeField('Durée (s)', `<input class="input" type="number" min="1" max="3600" ${bind('seconds')} value="${block.seconds || 10}">`, 'shrink')}
          ${nodeField('Par', `<select class="select" ${bind('scope')}>
            <option value="member" ${block.scope === 'member' ? 'selected' : ''}>Membre</option>
            <option value="channel" ${block.scope === 'channel' ? 'selected' : ''}>Salon</option>
          </select>`, 'grow')}
        </div>`;
    case 'typing':
      return nodeField('Durée (secondes)', `<input class="input" type="number" min="1" max="15" ${bind('seconds')} value="${block.seconds || 2}">`, 'shrink');
    case 'webhook':
      return `<div class="fld-row">
          ${nodeField('Méthode', `<select class="select" ${bind('method')}>
            <option value="POST" ${block.method === 'POST' ? 'selected' : ''}>POST</option>
            <option value="GET" ${block.method === 'GET' ? 'selected' : ''}>GET</option>
            <option value="PATCH" ${block.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
          </select>`, 'shrink')}
          ${nodeField('URL', `<input class="input" ${bind('url')} value="${esc(block.url || '')}" placeholder="https://…">`, 'grow')}
        </div>
        ${nodeField('Corps JSON', `<textarea class="textarea" rows="2" ${bind('body')} placeholder='{"membre":"{{user.name}}"}'>${esc(block.body)}</textarea>`)}`;
    case 'log':
      return nodeField('Note de journal', `<input class="input" ${bind('text')} value="${esc(block.text || '')}" placeholder="Ticket créé par {{user.name}}">`);
    case 'condition':
      return renderConditionFields(block);
    default:
      return '';
  }
}

function renderConditionFields(block) {
  return `<div class="cond-top">
      <span>Vrai si</span>
      <select class="select slim" data-node="${block.id}" data-field="mode">
        <option value="all" ${block.mode === 'all' ? 'selected' : ''}>toutes les règles</option>
        <option value="any" ${block.mode === 'any' ? 'selected' : ''}>au moins une règle</option>
      </select>
    </div>
    <div class="rules">
      ${block.rules
        .map(
          (rule, index) => `<div class="rule-row">
            <input class="input" data-node="${block.id}" data-rule="${index}" data-rule-field="left" value="${esc(rule.left)}" placeholder="{{user.roles}}">
            <select class="select slim" data-node="${block.id}" data-rule="${index}" data-rule-field="op">
              ${Object.entries(FLOW_OPERATORS)
                .map(([key, label]) => `<option value="${key}" ${rule.op === key ? 'selected' : ''}>${label}</option>`)
                .join('')}
            </select>
            <input class="input" data-node="${block.id}" data-rule="${index}" data-rule-field="right" value="${esc(rule.right)}" placeholder="Membre">
            <button class="mini-btn danger" data-action="flow-del-rule" data-id="${block.id}" data-index="${index}" title="Supprimer">${icon('x')}</button>
          </div>`,
        )
        .join('')}
      <button class="link-btn" data-action="flow-add-rule" data-id="${block.id}">${icon('plus')} Règle</button>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* panneau de test                                                     */
/* ------------------------------------------------------------------ */

function renderTestPanel() {
  const result = flowEditor.result;
  const ctx = flowEditor.ctx;
  return `<div class="panel flow-panel test-panel">
    <div class="panel-head"><h3>${icon('play')} Test</h3>
      <div class="ph-actions"><button class="btn btn-primary btn-sm" data-action="flow-run" ${flowEditor.running ? 'disabled' : ''}>${flowEditor.running ? 'Exécution…' : 'Lancer'}</button></div>
    </div>
    <div class="panel-body">
      <div class="field"><label>Message reçu</label><input class="input" data-ctx="message" value="${esc(ctx.message)}"></div>
      <div class="fld-row">
        ${nodeField('Membre', `<input class="input" data-ctx="user" value="${esc(ctx.user)}">`, 'grow')}
        ${nodeField('Salon', `<input class="input" data-ctx="channel" value="${esc(ctx.channel)}">`, 'grow')}
      </div>
      <div class="fld-row">
        ${nodeField('Rôles (virgules)', `<input class="input" data-ctx="roles" value="${esc(ctx.roles)}">`, 'grow')}
        ${nodeField('Serveur', `<input class="input" data-ctx="server" value="${esc(ctx.server)}">`, 'grow')}
      </div>
      ${result ? renderTestResult(result) : '<p class="hint">Lancez le flux pour voir les messages produits et le détail de chaque bloc.</p>'}
    </div>
  </div>`;
}

function renderTestResult(result) {
  return `<div class="test-result">
    <div class="tr-meta">${result.outputs.length} sortie(s) · ${result.steps} bloc(s) · ${result.durationMs} ms</div>
    <div class="tr-outputs">
      ${
        result.outputs.length
          ? result.outputs.map(renderOutput).join('')
          : '<p class="hint">Aucune sortie : le flux s’est arrêté sans message.</p>'
      }
    </div>
    <div class="tr-trace">
      ${result.trace
        .map(
          (entry) => `<div class="trace-row ${entry.status}">
            <span class="trace-dot"></span>
            <div class="trace-main">
              <b>${esc(entry.title)}</b>
              <span>${esc(entry.detail || '')}</span>
            </div>
          </div>`,
        )
        .join('')}
    </div>
    ${
      Object.keys(result.variables || {}).length
        ? `<div class="tr-vars">${Object.entries(result.variables)
            .map(([key, value]) => `<span class="var-chip">${esc(key)} = ${esc(value)}</span>`)
            .join('')}</div>`
        : ''
    }
  </div>`;
}

function renderOutput(output) {
  if (output.kind === 'message') {
    return `<div class="dc-msg">
      <span class="dc-av">K</span>
      <div class="dc-body">
        <div class="dc-head"><b>KyllBot</b><span class="dc-bot">BOT</span><span class="dc-time">${esc(output.channel)}</span>${output.ephemeral ? '<span class="dc-tag">éphémère</span>' : ''}</div>
        <p>${flowFormatDiscord(output.text)}</p>
      </div>
    </div>`;
  }
  if (output.kind === 'embed') {
    return `<div class="dc-embed" style="border-left-color:${esc(output.embed.color)}">
      ${output.embed.title ? `<b>${esc(output.embed.title)}</b>` : ''}
      ${output.embed.description ? `<p>${flowFormatDiscord(output.embed.description)}</p>` : ''}
      ${output.embed.footer ? `<span class="dc-footer">${esc(output.embed.footer)}</span>` : ''}
    </div>`;
  }
  if (output.kind === 'button') {
    return `<div class="dc-msg">
      <span class="dc-av">K</span>
      <div class="dc-body">
        <div class="dc-head"><b>KyllBot</b><span class="dc-bot">BOT</span></div>
        <p style="color:var(--muted-2);font-size:11px">composants interactifs${output.target ? ` · cible : ${esc(output.target)}` : ''}</p>
        <span class="dc-btn ${esc(output.style)}">${esc(output.label)}</span>
      </div>
    </div>`;
  }
  if (output.kind === 'dm') {
    return `<div class="dc-effect">${icon('mail')} <span><b>MP à ${esc(output.to)}</b> — ${esc(output.text)}</span></div>`;
  }
  if (output.kind === 'role') {
    return `<div class="dc-effect">${icon('shield')} ${output.action === 'remove' ? 'Retire' : 'Ajoute'} le rôle <b>${esc(output.role)}</b> à ${esc(output.user)}</div>`;
  }
  if (output.kind === 'var') {
    return `<div class="dc-effect">${icon('variable')} <b>${esc(output.name)}</b> = ${esc(output.value)}</div>`;
  }
  if (output.kind === 'channel') {
    return `<div class="dc-effect">${icon('hashtag')} Salon créé <b>#${esc(output.name)}</b></div>`;
  }
  if (output.kind === 'pin') {
    return `<div class="dc-effect">${icon('pin')} ${output.unpin ? 'Message désépinglé' : 'Message épinglé'}</div>`;
  }
  if (output.kind === 'delete') {
    return `<div class="dc-effect">${icon('trash')} ${output.count} message(s) supprimé(s)</div>`;
  }
  if (output.kind === 'cooldown') {
    return `<div class="dc-effect">${icon('shield')} Anti-spam ${output.seconds} s par ${output.scope === 'channel' ? 'salon' : 'membre'}</div>`;
  }
  if (output.kind === 'typing') {
    return `<div class="dc-effect">${icon('keyboard')} KyllBot est en train d’écrire… (${output.seconds} s)</div>`;
  }
  if (output.kind === 'webhook') {
    return `<div class="dc-effect">${icon('plug')} ${esc(output.method)} ${esc(output.url || '—')} → ${output.status} <span class="dc-sim">simulé</span></div>`;
  }
  if (output.kind === 'wait') {
    return `<div class="dc-effect">${icon('clock')} Pause de ${output.seconds} s</div>`;
  }
  if (output.kind === 'react') {
    return `<div class="dc-effect">${icon('smile')} Réaction ${esc(output.emoji)}</div>`;
  }
  return `<div class="dc-effect">${icon('terminal')} ${esc(output.text)}</div>`;
}

function flowFormatDiscord(text) {
  return esc(text || '')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/&lt;@([^&]+)&gt;/g, '<span class="dc-mention">@$1</span>');
}

/* ------------------------------------------------------------------ */
/* canvas : vue, zoom, liens                                           */
/* ------------------------------------------------------------------ */

function flowViewState() {
  if (!flowEditor.view) flowEditor.view = { x: 40, y: 40, zoom: 1 };
  return flowEditor.view;
}

function applyFlowView() {
  const world = document.getElementById('flowWorld');
  const label = document.getElementById('flowZoomLabel');
  const view = flowViewState();
  if (world) world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
  if (label) label.textContent = `${Math.round(view.zoom * 100)} %`;
}

function fitFlowView() {
  const viewport = document.getElementById('flowViewport');
  const blocks = flowEditor.flow?.blocks || [];
  if (!viewport) return;
  if (!blocks.length) {
    flowEditor.view = { x: 40, y: 40, zoom: 1 };
    applyFlowView();
    return;
  }
  const minX = Math.min(...blocks.map((block) => block.x));
  const minY = Math.min(...blocks.map((block) => block.y));
  const maxX = Math.max(...blocks.map((block) => block.x)) + 320;
  const maxY = Math.max(...blocks.map((block) => block.y)) + 300;
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const zoom = Math.min(1, Math.max(0.18, Math.min((viewport.clientWidth - 60) / width, (viewport.clientHeight - 60) / height)));
  flowEditor.view = {
    zoom,
    x: (viewport.clientWidth - width * zoom) / 2 - minX * zoom,
    y: (viewport.clientHeight - height * zoom) / 2 - minY * zoom,
  };
  applyFlowView();
}

function drawFlowEdges() {
  const svg = document.getElementById('flowEdges');
  const world = document.getElementById('flowWorld');
  const viewport = document.getElementById('flowViewport');
  if (!svg || !world || !flowEditor.flow) return;

  const blocks = flowEditor.flow.blocks;
  const view = flowViewState();
  const worldRect = world.getBoundingClientRect();
  const box = (el) => {
    const rect = el.getBoundingClientRect();
    return {
      x: (rect.left - worldRect.left) / view.zoom,
      y: (rect.top - worldRect.top) / view.zoom,
      w: rect.width / view.zoom,
      h: rect.height / view.zoom,
    };
  };

  const maxX = blocks.reduce((max, block) => Math.max(max, block.x), 0) + 560;
  const maxY = blocks.reduce((max, block) => Math.max(max, block.y), 0) + 420;
  world.style.width = `${Math.max(maxX, viewport?.clientWidth || 0)}px`;
  world.style.height = `${Math.max(maxY, viewport?.clientHeight || 0)}px`;
  svg.setAttribute('width', String(Math.max(maxX, viewport?.clientWidth || 0)));
  svg.setAttribute('height', String(Math.max(maxY, viewport?.clientHeight || 0)));

  const paths = [];
  for (const block of blocks) {
    const node = world.querySelector(`.node[data-node="${block.id}"]`);
    if (!node) continue;
    const pairs = block.type === 'condition'
      ? [['then', block.thenId, 'ok'], ['else', block.elseId, 'alt']]
      : [['next', block.next, 'ok']];

    for (const [branch, targetId, tone] of pairs) {
      if (!targetId) continue;
      const port = node.querySelector(`.port.out[data-branch="${branch}"]`);
      const target = world.querySelector(`.node[data-node="${targetId}"] .port.in`);
      if (!port || !target) continue;
      const a = box(port);
      const b = box(target);
      const x1 = a.x + a.w;
      const y1 = a.y + a.h / 2;
      const x2 = b.x;
      const y2 = b.y + b.h / 2;
      const dx = Math.max(50, Math.abs(x2 - x1) * 0.45);
      paths.push(
        `<path class="edge ${tone}" d="M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}" />`,
      );
    }
  }
  svg.innerHTML = paths.join('');
}

function canvasPoint(clientX, clientY) {
  const world = document.getElementById('flowWorld');
  const view = flowViewState();
  const rect = world.getBoundingClientRect();
  return { x: (clientX - rect.left) / view.zoom, y: (clientY - rect.top) / view.zoom };
}

/* ------------------------------------------------------------------ */
/* canvas : interactions                                               */
/* ------------------------------------------------------------------ */

function onCanvasResize() {
  drawFlowEdges();
}

function initFlowCanvas() {
  const viewport = document.getElementById('flowViewport');
  const world = document.getElementById('flowWorld');
  if (!viewport || !world) return;

  if (!flowEditor.view) fitFlowView();
  applyFlowView();
  drawFlowEdges();

  viewport.addEventListener('pointerdown', onCanvasDown);
  viewport.addEventListener('wheel', onCanvasWheel, { passive: false });
  window.removeEventListener('resize', onCanvasResize);
  window.addEventListener('resize', onCanvasResize);
}

function onCanvasDown(event) {
  const target = event.target;
  if (target.closest('.mini-btn, .switch, .link-btn, input, textarea, select')) return;

  const port = target.closest('.port.out');
  if (port) {
    event.preventDefault();
    startFlowConnect(event, port);
    return;
  }

  const nodeEl = target.closest('.node');
  if (nodeEl) {
    const head = target.closest('.node-head');
    if (head) {
      event.preventDefault();
      startNodeDrag(event, nodeEl);
    }
    return;
  }

  startCanvasPan(event);
}

function startNodeDrag(event, nodeEl) {
  const block = flowNode(nodeEl.dataset.node);
  if (!block) return;
  const zoom = flowViewState().zoom;
  const origin = { x: block.x, y: block.y };
  const start = { x: event.clientX, y: event.clientY };
  nodeEl.classList.add('dragging');
  nodeEl.style.zIndex = '30';

  const move = (moveEvent) => {
    block.x = Math.round(origin.x + (moveEvent.clientX - start.x) / zoom);
    block.y = Math.round(origin.y + (moveEvent.clientY - start.y) / zoom);
    nodeEl.style.left = `${block.x}px`;
    nodeEl.style.top = `${block.y}px`;
    drawFlowEdges();
  };
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    nodeEl.classList.remove('dragging');
    nodeEl.style.zIndex = '';
    flowEditor.dirty = true;
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

function startCanvasPan(event) {
  const viewport = document.getElementById('flowViewport');
  const view = flowViewState();
  const origin = { x: view.x, y: view.y };
  const start = { x: event.clientX, y: event.clientY };
  viewport.classList.add('panning');

  const move = (moveEvent) => {
    view.x = origin.x + (moveEvent.clientX - start.x);
    view.y = origin.y + (moveEvent.clientY - start.y);
    applyFlowView();
    drawFlowEdges();
  };
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    viewport.classList.remove('panning');
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

function startFlowConnect(event, port) {
  const svg = document.getElementById('flowEdges');
  const world = document.getElementById('flowWorld');
  const sourceId = port.dataset.node;
  const branch = port.dataset.branch;
  const source = flowNode(sourceId);
  if (!svg || !world || !source) return;

  const portRect = port.getBoundingClientRect();
  const worldRect = world.getBoundingClientRect();
  const zoom = flowViewState().zoom;
  const startX = (portRect.left - worldRect.left) / zoom + portRect.width / zoom;
  const startY = (portRect.top - worldRect.top) / zoom + portRect.height / (2 * zoom);

  const temp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  temp.setAttribute('class', 'edge temp');
  svg.appendChild(temp);
  port.classList.add('active');
  let hovered = null;
  let moved = false;

  const move = (moveEvent) => {
    if (Math.abs(moveEvent.clientX - event.clientX) + Math.abs(moveEvent.clientY - event.clientY) > 4) moved = true;
    const point = canvasPoint(moveEvent.clientX, moveEvent.clientY);
    const dx = Math.max(50, Math.abs(point.x - startX) * 0.45);
    temp.setAttribute('d', `M${startX},${startY} C${startX + dx},${startY} ${point.x - dx},${point.y} ${point.x},${point.y}`);

    const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
    const nodeEl = el?.closest('.node');
    if (nodeEl !== hovered) {
      hovered?.classList.remove('connect-target');
      hovered = nodeEl;
      if (hovered && hovered.dataset.node !== sourceId) hovered.classList.add('connect-target');
    }
  };

  const up = (upEvent) => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    port.classList.remove('active');
    hovered?.classList.remove('connect-target');
    temp.remove();

    const el = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
    const targetEl = el?.closest('.node');
    const targetId = targetEl?.dataset.node;
    const valid = targetId && targetId !== sourceId && flowNode(targetId);

    if (valid) {
      setFlowLink(source, branch, targetId);
    } else if (!moved) {
      setFlowLink(source, branch, null);
    } else {
      setFlowLink(source, branch, null);
    }
    flowEditor.dirty = true;
    drawFlowEdges();
  };

  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

function setFlowLink(block, branch, targetId) {
  if (branch === 'then') block.thenId = targetId;
  else if (branch === 'else') block.elseId = targetId;
  else block.next = targetId;
}

function onCanvasWheel(event) {
  event.preventDefault();
  const viewport = document.getElementById('flowViewport');
  const view = flowViewState();
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  const next = Math.min(1.8, Math.max(0.18, view.zoom * factor));
  const rect = viewport.getBoundingClientRect();
  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;
  view.x = px - ((px - view.x) / view.zoom) * next;
  view.y = py - ((py - view.y) / view.zoom) * next;
  view.zoom = next;
  applyFlowView();
  drawFlowEdges();
}

/* ------------------------------------------------------------------ */
/* actions                                                             */
/* ------------------------------------------------------------------ */

async function flowSave() {
  const flow = flowEditor.flow;
  try {
    const { flow: saved } = await api(`/api/bots/${flowEditor.botId}/flows/${flow.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: flow.name,
        enabled: flow.enabled,
        trigger: flow.trigger,
        variables: flow.variables,
        blocks: flow.blocks,
        start: flow.start,
      }),
    });
    const bot = state.ws.bots.find((entry) => entry.id === flowEditor.botId);
    const index = bot.flows.findIndex((entry) => entry.id === saved.id);
    if (index >= 0) bot.flows[index] = saved;
    flowEditor.flow = flowClone(saved);
    flowEditor.dirty = false;
    toast('Flux enregistré.');
    render();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function flowRun() {
  flowEditor.testOpen = true;
  flowEditor.running = true;
  render();
  try {
    flowEditor.result = await api(`/api/bots/${flowEditor.botId}/flows/${flowEditor.flow.id}/run`, {
      method: 'POST',
      body: JSON.stringify({
        message: flowEditor.ctx.message,
        channel: flowEditor.ctx.channel,
        server: flowEditor.ctx.server,
        user: {
          name: flowEditor.ctx.user,
          roles: flowEditor.ctx.roles.split(',').map((role) => role.trim()).filter(Boolean),
        },
      }),
    });
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    flowEditor.running = false;
    render();
  }
}

onAction('flow-save', () => flowSave());
onAction('flow-run', () => flowRun());

onAction('flow-add-node', (el) => {
  const viewport = document.getElementById('flowViewport');
  const view = flowViewState();
  const centerX = viewport ? (viewport.clientWidth / 2 - view.x) / view.zoom - 160 : 120;
  const centerY = viewport ? (viewport.clientHeight / 2 - view.y) / view.zoom - 80 : 120;
  const jitter = (flowEditor.flow.blocks.length % 6) * 26;
  const block = flowNewBlock(el.dataset.type, Math.round(centerX + jitter), Math.round(centerY + jitter));
  flowEditor.flow.blocks.push(block);
  if (!flowEditor.flow.start) flowEditor.flow.start = block.id;
  flowEditor.dirty = true;
  render();
  toast(`${FLOW_BLOCKS[block.type].label} ajouté.`, 'info');
});

onAction('flow-add-menu', () => {
  openModal({
    title: 'Ajouter un bloc',
    subtitle: 'Le bloc apparaît au centre du canvas, puis vous le reliez.',
    hideFooter: true,
    body: `<div class="block-pick">
      ${FLOW_GROUPS.map(
        ([key, label]) => `<div class="bp-group"><span class="bp-label">${label}</span>
          <div class="bp-grid">${Object.entries(FLOW_BLOCKS)
            .filter(([, meta]) => meta.group === key)
            .map(
              ([type, meta]) => `<button type="button" class="bp-item" data-action="flow-add-node" data-type="${type}">
                <span class="blk-ic tone-${meta.tone}">${icon(meta.icon)}</span>
                <b>${meta.label}</b>
              </button>`,
            )
            .join('')}</div>
        </div>`,
      ).join('')}
    </div>`,
  });
});

onAction('flow-node-del', (el) => {
  const id = el.dataset.id;
  const flow = flowEditor.flow;
  flow.blocks = flow.blocks.filter((block) => block.id !== id);
  for (const block of flow.blocks) {
    if (block.next === id) block.next = null;
    if (block.thenId === id) block.thenId = null;
    if (block.elseId === id) block.elseId = null;
  }
  if (flow.start === id) flow.start = flow.blocks[0]?.id || null;
  flowEditor.dirty = true;
  render();
});

onAction('flow-node-dup', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  flowEditor.flow.blocks.push(flowCloneBlock(block));
  flowEditor.dirty = true;
  render();
});

onAction('flow-node-start', (el) => {
  flowEditor.flow.start = el.dataset.id;
  flowEditor.dirty = true;
  render();
  toast('Point de départ mis à jour.', 'info');
});

onAction('flow-node-toggle', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  block[el.dataset.field] = !block[el.dataset.field];
  flowEditor.dirty = true;
  render();
});

onAction('flow-add-rule', (el) => {
  const block = flowNode(el.dataset.id);
  block.rules.push({ id: flowUid(), left: '{{message}}', op: 'contains', right: '' });
  flowEditor.dirty = true;
  render();
});

onAction('flow-del-rule', (el) => {
  const block = flowNode(el.dataset.id);
  block.rules.splice(Number(el.dataset.index), 1);
  flowEditor.dirty = true;
  render();
});

onAction('flow-add-var', () => {
  flowEditor.flow.variables.push({ id: flowUid(), name: '', value: '' });
  flowEditor.dirty = true;
  render();
});

onAction('flow-del-var', (el) => {
  flowEditor.flow.variables.splice(Number(el.dataset.index), 1);
  flowEditor.dirty = true;
  render();
});

onAction('flow-zoom', (el) => {
  const view = flowViewState();
  const viewport = document.getElementById('flowViewport');
  const factor = Number(el.dataset.dir) > 0 ? 1.15 : 1 / 1.15;
  const next = Math.min(1.8, Math.max(0.18, view.zoom * factor));
  const cx = viewport ? viewport.clientWidth / 2 : 0;
  const cy = viewport ? viewport.clientHeight / 2 : 0;
  view.x = cx - ((cx - view.x) / view.zoom) * next;
  view.y = cy - ((cy - view.y) / view.zoom) * next;
  view.zoom = next;
  applyFlowView();
  drawFlowEdges();
});

onAction('flow-fit', () => {
  fitFlowView();
  drawFlowEdges();
});

onAction('flow-auto', () => {
  flowLayout();
  render();
  requestAnimationFrame(() => {
    fitFlowView();
    drawFlowEdges();
  });
  flowEditor.dirty = true;
  toast('Blocs rangés.', 'info');
});

onAction('flow-add-variant', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  if (block.variants.length >= 20) return toast('20 variantes maximum par bloc.', 'error');
  block.variants.push({ id: flowUid(), text: '', weight: 1 });
  flowEditor.dirty = true;
  render();
});

onAction('flow-del-variant', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block || block.variants.length <= 1) return toast('Gardez au moins une variante.', 'error');
  block.variants.splice(Number(el.dataset.index), 1);
  flowEditor.dirty = true;
  render();
});

onAction('flow-variant-bank', (el) => {
  const blockId = el.dataset.id;
  openModal({
    title: 'Banque de variantes',
    subtitle: '48 textes prêts à l’emploi, cliquez pour les ajouter.',
    hideFooter: true,
    wide: true,
    body: `<div class="variant-bank">
      ${VARIANT_BANK.map(
        (group, groupIndex) => `<div class="vb-theme">
          <div class="vb-head">
            <b>${group.theme}</b>
            <button class="link-btn" data-action="flow-bank-theme" data-id="${blockId}" data-group="${groupIndex}">Tout ajouter</button>
          </div>
          <div class="vb-items">
            ${group.items
              .map(
                (item, index) => `<button class="vb-item" data-action="flow-bank-add" data-id="${blockId}" data-group="${groupIndex}" data-index="${index}">${esc(item)}</button>`,
              )
              .join('')}
          </div>
        </div>`,
      ).join('')}
    </div>`,
  });
});

onAction('flow-bank-add', (el) => {
  const block = flowNode(el.dataset.id);
  const group = VARIANT_BANK[Number(el.dataset.group)];
  const text = group?.items[Number(el.dataset.index)];
  if (!block || !text) return;
  if (block.variants.length >= 20) return toast('20 variantes maximum par bloc.', 'error');
  block.variants.push({ id: flowUid(), text, weight: 1 });
  flowEditor.dirty = true;
  closeModal();
  render();
  toast('Variante ajoutée.', 'info');
});

onAction('flow-bank-theme', (el) => {
  const block = flowNode(el.dataset.id);
  const group = VARIANT_BANK[Number(el.dataset.group)];
  if (!block || !group) return;
  const room = 20 - block.variants.length;
  const added = group.items.slice(0, Math.max(0, room));
  for (const text of added) block.variants.push({ id: flowUid(), text, weight: 1 });
  flowEditor.dirty = true;
  closeModal();
  render();
  toast(`${added.length} variante(s) ajoutée(s).`, 'info');
});

onAction('new-flow', (el) => {
  const botId = el.dataset.id;
  openModal({
    title: 'Nouveau flux',
    subtitle: 'Partez d’un modèle ou d’une page blanche.',
    submitLabel: 'Créer le flux',
    body: `<div class="field"><label for="nfName">Nom du flux</label><input class="input" id="nfName" name="name" value="Nouveau flux" required></div>
      <div class="field"><label>Modèle</label>
        <div class="template-pick">
          ${FLOW_TEMPLATES.map(
            (template, index) => `<label class="tp-item">
              <input type="radio" name="template" value="${template.value}" ${index === 0 ? 'checked' : ''}>
              <span><b>${template.label}</b><em>${template.hint}</em></span>
            </label>`,
          ).join('')}
        </div>
      </div>`,
    onSubmit: async (formData) => {
      const { flow } = await api(`/api/bots/${botId}/flows`, {
        method: 'POST',
        body: JSON.stringify({
          name: String(formData.get('name') || '').trim(),
          template: String(formData.get('template') || ''),
        }),
      });
      const bot = state.ws.bots.find((entry) => entry.id === botId);
      bot.flows = [...(bot.flows || []), flow];
      closeModal();
      window.location.hash = `#/bots/${botId}/flows/${flow.id}`;
    },
  });
});

onAction('toggle-flow', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const flow = bot.flows.find((entry) => entry.id === el.dataset.flow);
  try {
    const { flow: saved } = await api(`/api/bots/${bot.id}/flows/${flow.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !flow.enabled }),
    });
    Object.assign(flow, saved);
    render();
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('delete-flow', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const flow = bot.flows.find((entry) => entry.id === el.dataset.flow);
  openModal({
    title: 'Supprimer ce flux ?',
    subtitle: `« ${flow.name} » sera définitivement supprimé.`,
    submitLabel: 'Supprimer',
    danger: true,
    body: '<p style="font-size:13px;color:var(--muted)">Cette action est immédiate et ne peut pas être annulée.</p>',
    onSubmit: async () => {
      await api(`/api/bots/${bot.id}/flows/${flow.id}`, { method: 'DELETE' });
      bot.flows = bot.flows.filter((entry) => entry.id !== flow.id);
      closeModal();
      toast('Flux supprimé.');
      render();
    },
  });
});

/* ------------------------------------------------------------------ */
/* saisie directe (sans re-render)                                     */
/* ------------------------------------------------------------------ */

document.addEventListener('input', (event) => {
  const el = event.target;
  if (!el.matches('[data-flow-name], [data-ctx], [data-trigger], [data-var], [data-node]')) return;

  if (el.matches('[data-flow-name]')) {
    flowEditor.flow.name = el.value;
    flowEditor.dirty = true;
    return;
  }
  if (el.matches('[data-ctx]')) {
    flowEditor.ctx[el.dataset.ctx] = el.value;
    return;
  }
  if (el.matches('[data-trigger]')) {
    flowEditor.flow.trigger[el.dataset.trigger] = el.value;
    flowEditor.dirty = true;
    return;
  }
  if (el.matches('[data-var]')) {
    const variable = flowEditor.flow.variables[Number(el.dataset.var)];
    if (variable) variable[el.dataset.varField] = el.value;
    flowEditor.dirty = true;
    return;
  }

  const block = flowNode(el.dataset.node);
  if (!block) return;
  if (el.dataset.rule !== undefined) {
    block.rules[Number(el.dataset.rule)][el.dataset.ruleField] = el.value;
  } else if (el.dataset.variant !== undefined) {
    const variant = block.variants[Number(el.dataset.variant)];
    if (variant) {
      variant[el.dataset.variantField] =
        el.dataset.variantField === 'weight' ? Math.min(100, Math.max(1, Number(el.value) || 1)) : el.value;
    }
  } else if (el.dataset.field) {
    block[el.dataset.field] =
      el.dataset.field === 'seconds' || el.dataset.field === 'count' ? Number(el.value) || 1 : el.value;
  }
  flowEditor.dirty = true;
});

document.addEventListener('change', (event) => {
  const el = event.target;
  if (!el.matches('[data-node], [data-trigger="type"]')) return;

  if (el.matches('[data-trigger="type"]')) {
    const previous = flowEditor.flow.trigger || {};
    flowEditor.flow.trigger = {
      type: el.value,
      command: previous.command || 'mon-flux',
      keyword: previous.keyword || '',
      match: previous.match || 'contains',
      channel: '',
      schedule: '',
      emoji: '',
    };
    flowEditor.dirty = true;
    render();
    return;
  }

  const block = flowNode(el.dataset.node);
  if (!block) return;
  if (el.dataset.rule !== undefined) block.rules[Number(el.dataset.rule)][el.dataset.ruleField] = el.value;
  else if (el.dataset.field === 'unpin') block.unpin = el.value === 'true';
  else if (el.dataset.field === 'seconds' || el.dataset.field === 'count') block[el.dataset.field] = Number(el.value) || 1;
  else if (el.dataset.field) block[el.dataset.field] = el.value;
  flowEditor.dirty = true;
});

onAction('flow-toggle-side', () => {
  flowEditor.sideOpen = !flowEditor.sideOpen;
  render();
});

onAction('flow-toggle-test', () => {
  flowEditor.testOpen = !flowEditor.testOpen;
  render();
});
