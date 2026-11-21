/* ------------------------------------------------------------------ */
/* flux : onglet de la fiche bot + éditeur de blocs                    */
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
  message: { label: 'Envoyer un message', icon: 'message', tone: 'violet' },
  embed: { label: 'Envoyer un embed', icon: 'layers', tone: 'cyan' },
  dm: { label: 'Message privé', icon: 'mail', tone: 'cyan' },
  condition: { label: 'Condition', icon: 'branch', tone: 'amber' },
  role: { label: 'Rôle', icon: 'shield', tone: 'green' },
  setvar: { label: 'Définir une variable', icon: 'variable', tone: 'violet' },
  wait: { label: 'Attendre', icon: 'clock', tone: 'grey' },
  random: { label: 'Variante aléatoire', icon: 'shuffle', tone: 'pink' },
  react: { label: 'Ajouter une réaction', icon: 'smile', tone: 'grey' },
  log: { label: 'Journaliser', icon: 'terminal', tone: 'grey' },
};

const FLOW_OPERATORS = {
  eq: 'est égal à',
  neq: 'est différent de',
  contains: 'contient',
  notContains: 'ne contient pas',
  startsWith: 'commence par',
  endsWith: 'se termine par',
  gt: 'est supérieur à',
  lt: 'est inférieur à',
  hasRole: 'possède le rôle',
  chance: 'chance (%)',
};

const FLOW_TEMPLATES = [
  { value: '', label: 'Flux vide', hint: 'Vous ajoutez les blocs vous-même.' },
  { value: 'welcome', label: 'Bienvenue', hint: 'Message, condition sur le rôle, rôle auto et MP.' },
  { value: 'ticket', label: 'Ticket support', hint: 'Confirmation, embed et rôle Support.' },
  { value: 'quiz', label: 'Quiz', hint: 'Variante aléatoire, attente, condition et score.' },
  { value: 'moderation', label: 'Filtre anti-spam', hint: 'Condition sur les liens et sanction.' },
];

const flowEditor = {
  botId: null,
  flow: null,
  dirty: false,
  result: null,
  running: false,
  ctx: {
    message: 'salut, je découvre le serveur',
    user: 'Sarah',
    roles: 'Invité',
    server: 'Mon serveur',
    channel: '#général',
  },
};

const flowClone = (value) => JSON.parse(JSON.stringify(value));

const flowTokens = (path) =>
  String(path || '')
    .split('.')
    .filter((token) => token !== '')
    .map((token) => (/^\d+$/.test(token) ? Number(token) : token));

function flowListAt(listPath) {
  if (!listPath) return flowEditor.flow.blocks;
  let list = flowEditor.flow.blocks;
  let node = null;
  for (const part of flowTokens(listPath)) {
    if (typeof part === 'number') node = list[part];
    else list = node[part];
  }
  return list;
}

function flowLocate(path) {
  const parts = flowTokens(path);
  const index = parts.pop();
  let list = flowEditor.flow.blocks;
  let node = null;
  for (const part of parts) {
    if (typeof part === 'number') node = list[part];
    else list = node[part];
  }
  return { list, index, block: list[index] };
}

const flowUid = () => window.crypto?.randomUUID?.() || `id-${Math.random().toString(36).slice(2, 10)}`;

function flowNewBlock(type) {
  const base = { id: flowUid(), type };
  switch (type) {
    case 'embed':
      return { ...base, title: '', description: '', color: '#7c5cff', footer: '' };
    case 'dm':
      return { ...base, text: '' };
    case 'condition':
      return {
        ...base,
        mode: 'all',
        rules: [{ id: flowUid(), left: '{{user.roles}}', op: 'contains', right: 'Membre' }],
        then: [],
        else: [],
      };
    case 'role':
      return { ...base, action: 'add', role: 'Membre' };
    case 'setvar':
      return { ...base, name: 'compteur', value: '1' };
    case 'wait':
      return { ...base, seconds: 3 };
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

function flowCloneBlock(block) {
  const copy = flowClone(block);
  const refresh = (node) => {
    node.id = flowUid();
    for (const key of ['then', 'else']) if (Array.isArray(node[key])) node[key].forEach(refresh);
    if (Array.isArray(node.rules)) node.rules.forEach((rule) => (rule.id = flowUid()));
    if (Array.isArray(node.variants)) node.variants.forEach((variant) => (variant.id = flowUid()));
  };
  refresh(copy);
  return copy;
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
                return `<div class="flow-card">
                  <span class="fl-ic">${icon(trigger.icon)}</span>
                  <div class="fl-main">
                    <h4>${esc(flow.name)} ${flow.enabled ? '' : '<span class="pill grey">En pause</span>'}</h4>
                    <p>${esc(flow.description || trigger.label)}</p>
                    <div class="fl-meta">
                      <span>${flow.blocks?.length || 0} bloc(s)</span>
                      <span>${fmt(flow.runs || 0)} exécution(s)</span>
                      <span>${flow.lastRunAt ? `dernier test ${timeAgo(flow.lastRunAt)}` : 'jamais testé'}</span>
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
              <p>Un flux part d’un déclencheur puis enchaîne des blocs d’action et de condition.</p>
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
  <div class="flow-layout">
    <aside class="flow-side">
      ${renderTriggerCard(flow)}
      ${renderVariablesCard(flow)}
    </aside>
    <section class="flow-canvas">
      <div class="canvas-head">
        <span>${icon('flow')} Déroulé du flux</span>
        <span class="muted-small">${flow.blocks.length} bloc(s)</span>
      </div>
      <div class="block-stack">
        ${flow.blocks.map((block, index) => renderBlock(block, String(index), index)).join('')}
        ${renderAddButton('', flow.blocks.length, 'Ajouter un bloc')}
      </div>
    </section>
    <aside class="flow-test">
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

function renderBlock(block, path, index) {
  const meta = FLOW_BLOCKS[block.type] || FLOW_BLOCKS.message;
  return `<div class="blk tone-${meta.tone}" data-block="${esc(block.id)}">
    <div class="blk-rail"><span class="blk-ic">${icon(meta.icon)}</span></div>
    <div class="blk-body">
      <div class="blk-head">
        <span class="blk-title">${meta.label}</span>
        <span class="blk-index">#${index + 1}</span>
        <div class="blk-tools">
          <button class="mini-btn" data-action="flow-move" data-path="${path}" data-dir="-1" title="Monter">${icon('up')}</button>
          <button class="mini-btn" data-action="flow-move" data-path="${path}" data-dir="1" title="Descendre">${icon('down')}</button>
          <button class="mini-btn" data-action="flow-dup" data-path="${path}" title="Dupliquer">${icon('duplicate')}</button>
          <button class="mini-btn danger" data-action="flow-del" data-path="${path}" title="Supprimer">${icon('trash')}</button>
        </div>
      </div>
      <div class="blk-fields">${renderBlockFields(block, path)}</div>
    </div>
  </div>`;
}

function field(label, inner, extra = '') {
  return `<label class="fld ${extra}"><span>${label}</span>${inner}</label>`;
}

function renderBlockFields(block, path) {
  const bind = (name) => `data-path="${path}" data-field="${name}"`;

  switch (block.type) {
    case 'message':
      return `<div class="fld-row">
          ${field('Salon', `<input class="input" ${bind('channel')} value="${esc(block.channel || '')}" placeholder="#général (vide = salon courant)">`, 'grow')}
          ${field('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-toggle-field" data-path="${path}" data-field="ephemeral"></button>`, 'shrink')}
        </div>
        ${field('Message', `<textarea class="textarea" rows="3" ${bind('text')} placeholder="Bienvenue {{user.mention}} !">${esc(block.text)}</textarea>`)}`;
    case 'embed':
      return `<div class="fld-row">
          ${field('Titre', `<input class="input" ${bind('title')} value="${esc(block.title || '')}">`, 'grow')}
          ${field('Couleur', `<input class="input color-mini" type="color" ${bind('color')} value="${esc(block.color || '#7c5cff')}">`, 'shrink')}
        </div>
        ${field('Description', `<textarea class="textarea" rows="3" ${bind('description')}>${esc(block.description || '')}</textarea>`)}
        ${field('Pied de page', `<input class="input" ${bind('footer')} value="${esc(block.footer || '')}">`)}`;
    case 'dm':
      return field('Message privé', `<textarea class="textarea" rows="3" ${bind('text')} placeholder="Salut {{user.name}} !">${esc(block.text)}</textarea>`);
    case 'role':
      return `<div class="fld-row">
          ${field('Action', `<select class="select" ${bind('action')}>
            <option value="add" ${block.action === 'add' ? 'selected' : ''}>Ajouter</option>
            <option value="remove" ${block.action === 'remove' ? 'selected' : ''}>Retirer</option>
          </select>`, 'shrink')}
          ${field('Rôle', `<input class="input" ${bind('role')} value="${esc(block.role || '')}" placeholder="Membre">`, 'grow')}
        </div>`;
    case 'setvar':
      return `<div class="fld-row">
          ${field('Variable', `<input class="input" ${bind('name')} value="${esc(block.name || '')}" placeholder="score">`, 'shrink')}
          ${field('Valeur', `<input class="input" ${bind('value')} value="${esc(block.value || '')}" placeholder="3">`, 'grow')}
        </div>`;
    case 'wait':
      return field('Durée (secondes)', `<input class="input" type="number" min="1" max="30" ${bind('seconds')} value="${block.seconds || 3}">`, 'shrink');
    case 'random':
      return `<div class="variants">${block.variants
        .map(
          (variant, index) => `<div class="variant-row">
            <span class="variant-badge">V${index + 1}</span>
            <input class="input" data-path="${path}" data-variant="${index}" data-variant-field="text" value="${esc(variant.text)}" placeholder="Texte de la variante">
            <input class="input weight" type="number" min="1" max="100" data-path="${path}" data-variant="${index}" data-variant-field="weight" value="${variant.weight}" title="Poids">
            <button class="mini-btn danger" data-action="flow-del-variant" data-path="${path}" data-index="${index}" title="Supprimer">${icon('x')}</button>
          </div>`,
        )
        .join('')}
        <button class="link-btn" data-action="flow-add-variant" data-path="${path}">${icon('plus')} Ajouter une variante</button>
      </div>
      <p class="hint">Une variante est tirée au hasard selon son poids.</p>`;
    case 'react':
      return field('Emoji', `<input class="input" ${bind('emoji')} value="${esc(block.emoji || '')}" placeholder="👍">`, 'shrink');
    case 'log':
      return field('Note de journal', `<input class="input" ${bind('text')} value="${esc(block.text || '')}" placeholder="Ticket créé par {{user.name}}">`);
    case 'condition':
      return renderConditionFields(block, path);
    default:
      return '';
  }
}

function renderConditionFields(block, path) {
  return `<div class="cond-top">
      <span>Branche « oui » si</span>
      <select class="select slim" data-path="${path}" data-field="mode">
        <option value="all" ${block.mode === 'all' ? 'selected' : ''}>toutes les règles</option>
        <option value="any" ${block.mode === 'any' ? 'selected' : ''}>au moins une règle</option>
      </select>
      <span>sont vraies</span>
    </div>
    <div class="rules">
      ${block.rules
        .map(
          (rule, index) => `<div class="rule-row">
            <input class="input" data-path="${path}" data-rule="${index}" data-rule-field="left" value="${esc(rule.left)}" placeholder="{{user.roles}}">
            <select class="select slim" data-path="${path}" data-rule="${index}" data-rule-field="op">
              ${Object.entries(FLOW_OPERATORS)
                .map(([key, label]) => `<option value="${key}" ${rule.op === key ? 'selected' : ''}>${label}</option>`)
                .join('')}
            </select>
            <input class="input" data-path="${path}" data-rule="${index}" data-rule-field="right" value="${esc(rule.right)}" placeholder="Membre">
            <button class="mini-btn danger" data-action="flow-del-rule" data-path="${path}" data-index="${index}" title="Supprimer">${icon('x')}</button>
          </div>`,
        )
        .join('')}
      <button class="link-btn" data-action="flow-add-rule" data-path="${path}">${icon('plus')} Ajouter une règle</button>
    </div>
    <div class="branches">
      <div class="branch-col then">
        <div class="branch-head"><span class="branch-tag">Alors</span><span>${block.then.length} bloc(s)</span></div>
        ${block.then.map((child, index) => renderBlock(child, `${path}.then.${index}`, index)).join('')}
        ${renderAddButton(`${path}.then`, block.then.length, 'Bloc si vrai')}
      </div>
      <div class="branch-col else">
        <div class="branch-head"><span class="branch-tag alt">Sinon</span><span>${block.else.length} bloc(s)</span></div>
        ${block.else.map((child, index) => renderBlock(child, `${path}.else.${index}`, index)).join('')}
        ${renderAddButton(`${path}.else`, block.else.length, 'Bloc si faux')}
      </div>
    </div>`;
}

function renderAddButton(listPath, index, label) {
  return `<button class="add-block" data-action="flow-add" data-list="${listPath}" data-index="${index}">
    ${icon('plus')} <span>${label}</span>
  </button>`;
}

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
        ${field('Membre', `<input class="input" data-ctx="user" value="${esc(ctx.user)}">`, 'grow')}
        ${field('Salon', `<input class="input" data-ctx="channel" value="${esc(ctx.channel)}">`, 'grow')}
      </div>
      <div class="fld-row">
        ${field('Rôles (virgules)', `<input class="input" data-ctx="roles" value="${esc(ctx.roles)}">`, 'grow')}
        ${field('Serveur', `<input class="input" data-ctx="server" value="${esc(ctx.server)}">`, 'grow')}
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
  if (output.kind === 'dm') {
    return `<div class="dc-effect">${icon('mail')} <span><b>MP à ${esc(output.to)}</b> — ${esc(output.text)}</span></div>`;
  }
  if (output.kind === 'role') {
    return `<div class="dc-effect">${icon('shield')} ${output.action === 'remove' ? 'Retire' : 'Ajoute'} le rôle <b>${esc(output.role)}</b> à ${esc(output.user)}</div>`;
  }
  if (output.kind === 'var') {
    return `<div class="dc-effect">${icon('variable')} <b>${esc(output.name)}</b> = ${esc(output.value)}</div>`;
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
/* actions                                                             */
/* ------------------------------------------------------------------ */

async function flowSave() {
  const flow = flowEditor.flow;
  try {
    const { flow: saved } = await api(`/api/bots/${flowEditor.botId}/flows/${flow.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: flow.name,
        description: flow.description,
        enabled: flow.enabled,
        trigger: flow.trigger,
        variables: flow.variables,
        blocks: flow.blocks,
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

onAction('flow-save', () => flowSave());
onAction('flow-run', () => flowRun());

onAction('flow-add', (el) => {
  const listPath = el.dataset.list || '';
  const index = Number(el.dataset.index);
  const groups = [
    ['Actions', ['message', 'embed', 'dm', 'role', 'setvar', 'wait', 'random', 'react', 'log']],
    ['Condition', ['condition']],
  ];
  openModal({
    title: 'Ajouter un bloc',
    subtitle: 'Les blocs s’exécutent de haut en bas.',
    hideFooter: true,
    body: `<div class="block-pick">
      ${groups
        .map(
          ([label, types]) => `<div class="bp-group"><span class="bp-label">${label}</span>
            <div class="bp-grid">${types
              .map(
                (type) => `<button type="button" class="bp-item" data-action="flow-insert" data-list="${listPath}" data-index="${index}" data-type="${type}">
                  <span class="blk-ic tone-${FLOW_BLOCKS[type].tone}">${icon(FLOW_BLOCKS[type].icon)}</span>
                  <b>${FLOW_BLOCKS[type].label}</b>
                </button>`,
              )
              .join('')}</div>
          </div>`,
        )
        .join('')}
    </div>`,
  });
});

onAction('flow-insert', (el) => {
  const list = flowListAt(el.dataset.list);
  list.splice(Number(el.dataset.index), 0, flowNewBlock(el.dataset.type));
  flowEditor.dirty = true;
  closeModal();
  render();
});

onAction('flow-del', (el) => {
  const { list, index } = flowLocate(el.dataset.path);
  list.splice(index, 1);
  flowEditor.dirty = true;
  render();
});

onAction('flow-dup', (el) => {
  const { list, index, block } = flowLocate(el.dataset.path);
  list.splice(index + 1, 0, flowCloneBlock(block));
  flowEditor.dirty = true;
  render();
});

onAction('flow-move', (el) => {
  const { list, index } = flowLocate(el.dataset.path);
  const target = index + Number(el.dataset.dir);
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  flowEditor.dirty = true;
  render();
});

onAction('flow-toggle-field', (el) => {
  const { block } = flowLocate(el.dataset.path);
  block[el.dataset.field] = !block[el.dataset.field];
  flowEditor.dirty = true;
  render();
});

onAction('flow-add-rule', (el) => {
  const { block } = flowLocate(el.dataset.path);
  block.rules.push({ id: flowUid(), left: '{{message}}', op: 'contains', right: '' });
  flowEditor.dirty = true;
  render();
});

onAction('flow-del-rule', (el) => {
  const { block } = flowLocate(el.dataset.path);
  block.rules.splice(Number(el.dataset.index), 1);
  flowEditor.dirty = true;
  render();
});

onAction('flow-add-variant', (el) => {
  const { block } = flowLocate(el.dataset.path);
  block.variants.push({ id: flowUid(), text: '', weight: 1 });
  flowEditor.dirty = true;
  render();
});

onAction('flow-del-variant', (el) => {
  const { block } = flowLocate(el.dataset.path);
  if (block.variants.length <= 1) return toast('Gardez au moins une variante.', 'error');
  block.variants.splice(Number(el.dataset.index), 1);
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

/* ------------------------------------------------------------------ */
/* saisie directe (sans re-render)                                     */
/* ------------------------------------------------------------------ */

function bindFlowInputs() {
  document.addEventListener('input', (event) => {
    const el = event.target;
    if (!el.matches('[data-path], [data-trigger], [data-var], [data-ctx], [data-flow-name]')) return;

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
      if (!variable) return;
      variable[el.dataset.varField] = el.value;
      flowEditor.dirty = true;
      return;
    }

    const { block } = flowLocate(el.dataset.path);
    if (!block) return;

    if (el.dataset.rule !== undefined) {
      block.rules[Number(el.dataset.rule)][el.dataset.ruleField] = el.value;
    } else if (el.dataset.variant !== undefined) {
      const variant = block.variants[Number(el.dataset.variant)];
      variant[el.dataset.variantField] = el.dataset.variantField === 'weight' ? Number(el.value) || 1 : el.value;
    } else if (el.dataset.field) {
      block[el.dataset.field] = el.dataset.field === 'seconds' ? Number(el.value) || 1 : el.value;
    }
    flowEditor.dirty = true;
  });

  document.addEventListener('change', (event) => {
    const el = event.target;
    if (!el.matches('[data-path], [data-trigger="type"]')) return;

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

    const { block } = flowLocate(el.dataset.path);
    if (!block) return;
    if (el.dataset.rule !== undefined) block.rules[Number(el.dataset.rule)][el.dataset.ruleField] = el.value;
    else if (el.dataset.field) block[el.dataset.field] = el.value;
    flowEditor.dirty = true;
  });
}

bindFlowInputs();
