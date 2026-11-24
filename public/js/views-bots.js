'use strict';

/* ------------------------------------------------------------------ */
/* vue : tableau de bord                                               */
/* ------------------------------------------------------------------ */

function viewDashboard() {
  const { stats, ws, user } = state;
  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const activity = ws.activity
    .slice(0, 5)
    .map(
      (item) => `<div class="activity-item">
        <span class="a-ic">${icon(activityIcon(item.type))}</span>
        <div>${esc(item.message)}<time>${esc(timeAgo(item.at))}</time></div>
      </div>`,
    )
    .join('');

  const courseRows = ws.courses.length
    ? ws.courses
        .slice(0, 4)
        .map((course) => {
          const learners = ws.learners.filter((l) => l.courseId === course.id);
          const avg = learners.length ? Math.round(learners.reduce((sum, l) => sum + l.progress, 0) / learners.length) : 0;
          return `<a class="activity-item" href="#/courses/${course.id}" style="text-decoration:none">
            <span class="a-ic" style="background:rgba(34,211,238,.12);color:var(--cyan)">${icon('book')}</span>
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;gap:10px">
                <span style="color:var(--text);font-weight:600;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(course.title)}</span>
                <span style="font-size:11px;color:var(--muted-2)">${avg}%</span>
              </div>
              <div class="progress" style="margin-top:7px;min-width:0"><i style="width:${avg}%"></i></div>
            </div>
          </a>`;
        })
        .join('')
    : '<div class="activity-item">Aucune formation pour le moment.</div>';

  return `<div class="page-head">
      <div>
        <h1>${greeting}, ${esc(preferredName(user.name))}</h1>
        <p class="sub">Voici l'activité de votre studio — ${ws.bots.length} bot(s), ${ws.courses.length} formation(s) et ${ws.learners.length} apprenant(s).</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost" data-action="new-course">${icon('plus')} Nouvelle formation</button>
        <button class="btn btn-primary" data-action="new-bot">${icon('plus')} Nouveau bot</button>
      </div>
    </div>

    <div class="grid-stats">
      ${statCard('Bots actifs', `${stats.botsOnline}/${stats.bots}`, `${stats.commands} commandes configurées`, 'bot')}
      ${statCard('Commandes exécutées', fmt(stats.executions), `${fmt(stats.executions7d)} sur les 7 derniers jours`, 'zap')}
      ${statCard('Formations publiées', `${stats.published}/${stats.courses}`, `${stats.lessons} leçons au total`, 'book')}
      ${statCard('Apprenants', fmt(stats.learners), `${stats.avgProgress} % de progression moyenne`, 'users')}
    </div>

    ${dailyRewardCard()}

    <div class="dash-grid">
      <div class="panel">
        <div class="panel-head">
          <h3>Activité des 14 derniers jours</h3>
          <div class="ph-actions">
            <div class="legend"><span><i></i>Commandes</span><span><i class="alt"></i>Apprenants actifs</span></div>
          </div>
        </div>
        <div class="panel-body">${areaChart(stats.series)}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Répartition par bot</h3></div>
        <div class="panel-body">${perBotBars(stats.perBot)}</div>
      </div>
    </div>

    <div class="quick-grid">
      <button class="quick-action" data-action="new-bot"><span class="qa-ic">${icon('bot')}</span> Créer un bot</button>
      <button class="quick-action" data-action="new-course"><span class="qa-ic">${icon('book')}</span> Créer une formation</button>
      <button class="quick-action" data-action="new-learner"><span class="qa-ic">${icon('users')}</span> Inscrire un apprenant</button>
      <a class="quick-action" href="#/templates"><span class="qa-ic">${icon('template')}</span> Parcourir les modèles</a>
    </div>

    <div class="dash-grid equal">
      <div class="panel">
        <div class="panel-head"><h3>Activité récente</h3><a class="link-btn" href="#/stats" style="margin-left:auto">Tout voir</a></div>
        <div class="panel-body tight">${activity || '<div class="activity-item">Aucune activité.</div>'}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Progression des formations</h3><a class="link-btn" href="#/courses" style="margin-left:auto">Toutes</a></div>
        <div class="panel-body tight">${courseRows}</div>
      </div>
    </div>`;
}

function dailyRewardCard() {
  const reward = state.billing?.dailyReward;
  if (!reward) return '';
  const credits = state.ws.credits || 0;
  const activeDay = Math.min(reward.claimedToday ? reward.streak : reward.nextStreak, 7);
  const schedule = reward.schedule || [];
  return `<div class="panel reward-panel">
    <div class="reward-main">
      <span class="rw-ic">${icon('spark')}</span>
      <div>
        <div class="reward-kicker">Récompense quotidienne</div>
        <h3>Solde : ${fmt(credits)} crédit${credits > 1 ? 's' : ''}</h3>
        <p>${
          reward.claimedToday
            ? `Déjà récupérée aujourd’hui · série de ${reward.streak} jour(s)`
            : `Récupérez ${reward.amount} crédits aujourd’hui · série de ${reward.nextStreak} jour(s)`
        }</p>
      </div>
      <div class="reward-days">
        ${schedule
          .map(
            (entry) => `<span class="reward-day ${entry.day <= activeDay ? 'done' : ''} ${entry.day === activeDay ? 'today' : ''}">
              <small>J${entry.day}</small><b>${entry.amount}</b>
            </span>`,
          )
          .join('')}
      </div>
    </div>
    <button class="btn btn-primary" data-action="claim-reward" ${reward.claimedToday ? 'disabled' : ''}>
      ${reward.claimedToday ? 'Revenez demain' : `Réclamer +${reward.amount}`}
    </button>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* vue : liste des bots                                                */
/* ------------------------------------------------------------------ */

function viewBots() {
  const query = state.search.toLowerCase();
  const bots = state.ws.bots.filter(
    (bot) => !query || `${bot.name} ${bot.description} ${bot.tags.join(' ')}`.toLowerCase().includes(query),
  );

  const cards = bots
    .map((bot) => {
      const activeAutomations = bot.automations.filter((a) => a.enabled).length;
      const runtime = bot.runtime || {};
      const online = runtime.status === 'online';
      const connecting = runtime.status === 'starting';
      const statusClass = online ? 'online' : connecting || runtime.status === 'error' ? 'draft' : bot.status === 'draft' ? 'draft' : 'offline';
      const statusLabel = online ? 'Connecté' : connecting ? 'Connexion…' : runtime.status === 'error' ? 'Erreur' : bot.status === 'draft' ? 'Brouillon' : 'Hors ligne';
      return `<article class="bot-card">
        <div class="bot-top">
          <span class="bot-avatar" style="background:linear-gradient(140deg,${esc(bot.color)},${esc(bot.color)}99)">${esc(initials(bot.name))}</span>
          <div class="bot-title">
            <h3>${esc(bot.name)}</h3>
            <span class="status"><i class="status-dot ${statusClass}"></i>${statusLabel}</span>
          </div>
          <button class="mini-btn" data-action="toggle-bot-status" data-id="${esc(bot.id)}" title="Changer le statut">
            ${icon(online ? 'clock' : 'play')}
          </button>
        </div>
        <p class="bot-desc">${esc(bot.description || 'Aucune description pour ce bot.')}</p>
        <div class="tag-row">${bot.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</div>
        <div class="bot-meta">
          <span><b>${bot.commands.length}</b> commandes</span>
          <span><b>${activeAutomations}</b> automatisations</span>
          <span>préfixe <b>${esc(bot.prefix)}</b></span>
        </div>
        <div class="bot-actions">
          <a class="btn btn-ghost btn-sm" href="#/bots/${esc(bot.id)}">Ouvrir</a>
          <button class="mini-btn danger" data-action="delete-bot" data-id="${esc(bot.id)}" title="Supprimer" style="width:34px;height:34px">${icon('trash')}</button>
        </div>
      </article>`;
    })
    .join('');

  return `<div class="page-head">
      <div>
        <h1>Mes bots</h1>
        <p class="sub">Commandes, automatisations et réglages de vos bots Discord.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="new-bot">${icon('plus')} Nouveau bot</button>
      </div>
    </div>
    ${
      bots.length
        ? `<div class="bot-grid">${cards}</div>`
        : emptyState('Aucun bot pour l’instant', 'Créez votre premier bot ou partez d’un modèle prêt à l’emploi.', 'Créer un bot', 'new-bot')
    }`;
}

/* ------------------------------------------------------------------ */
/* vue : détail d'un bot                                               */
/* ------------------------------------------------------------------ */

const AUTOMATION_DESCRIPTIONS = {
  welcome: 'Envoie un message personnalisé à chaque nouveau membre.',
  autorole: 'Attribue automatiquement un rôle à l’arrivée.',
  levels: 'Gagne de l’XP en discutant et débloque des rôles.',
  ticketPanel: 'Panneau de tickets pour le support.',
  moderation: 'Filtre les messages et applique les sanctions.',
  antiSpam: 'Détecte et bloque les messages répétitifs.',
  autoMod: 'Filtre automatiquement les contenus indésirables.',
  logs: 'Journalise les actions de modération.',
  reminders: 'Envoie des rappels de cours aux apprenants.',
  antiRaid: 'Détecte les vagues d’arrivées, sanctionne les comptes suspects et verrouille le serveur.',
  repair: 'Restaure automatiquement les salons, rôles et messages du bot après une suppression massive.',
};

const AUTOMATION_TYPES = [
  { type: 'welcome', label: "Message d'accueil" },
  { type: 'autorole', label: 'Rôle automatique' },
  { type: 'levels', label: 'Niveaux et XP' },
  { type: 'ticketPanel', label: 'Panneau de tickets' },
  { type: 'moderation', label: 'Modération automatique' },
  { type: 'antiSpam', label: 'Anti-spam' },
  { type: 'autoMod', label: 'Auto-modération' },
  { type: 'antiRaid', label: 'Anti-raid' },
  { type: 'repair', label: 'Réparation salons / rôles' },
  { type: 'logs', label: 'Journaux de modération' },
  { type: 'reminders', label: 'Rappels de formation' },
];

const AUTOMATION_FIELDS = {
  welcome: [
    { key: 'channel', label: 'Salon d’accueil', placeholder: '#bienvenue', list: 'channelSuggestions' },
    { key: 'category', label: 'Catégorie', placeholder: 'Accueil', list: 'categorySuggestions' },
    { key: 'message', label: 'Message de bienvenue', type: 'textarea', placeholder: 'Bienvenue {user} !' },
  ],
  autorole: [
    { key: 'role', label: 'Rôle attribué', placeholder: 'Membre', list: 'roleSuggestions' },
    { key: 'category', label: 'Catégorie', placeholder: 'Arrivées', list: 'categorySuggestions' },
  ],
  levels: [
    { key: 'channel', label: 'Salon des niveaux', placeholder: '#niveaux', list: 'channelSuggestions' },
    { key: 'xpPerMessage', label: 'XP par message', type: 'number', min: 1, max: 100 },
  ],
  ticketPanel: [
    { key: 'channel', label: 'Salon du panneau', placeholder: '#support', list: 'channelSuggestions' },
    { key: 'category', label: 'Catégorie des tickets', placeholder: 'Support', list: 'categorySuggestions' },
  ],
  moderation: [
    { key: 'channel', label: 'Salon de journalisation', placeholder: '#logs', list: 'channelSuggestions' },
    { key: 'category', label: 'Catégorie', placeholder: 'Modération', list: 'categorySuggestions' },
    { key: 'antiSpam', label: 'Bloquer automatiquement le spam', type: 'boolean' },
  ],
  antiSpam: [
    { key: 'channel', label: 'Salon surveillé', placeholder: '#général', list: 'channelSuggestions' },
    { key: 'threshold', label: 'Messages avant sanction', type: 'number', min: 2, max: 20 },
  ],
  autoMod: [
    { key: 'category', label: 'Catégorie', placeholder: 'Modération', list: 'categorySuggestions' },
    { key: 'blockLinks', label: 'Bloquer les liens', type: 'boolean' },
  ],
  antiRaid: [
    { key: 'joinThreshold', label: 'Arrivées avant déclenchement', type: 'number', min: 2, max: 100, default: 10 },
    { key: 'joinWindow', label: 'Fenêtre de détection (secondes)', type: 'number', min: 5, max: 300, default: 10 },
    { key: 'minAccountAgeDays', label: 'Âge minimum du compte (jours, 0 = tous)', type: 'number', min: 0, max: 365, default: 7 },
    {
      key: 'action',
      label: 'Sanction',
      type: 'select',
      default: 'kick',
      options: [
        ['kick', 'Expulser'],
        ['ban', 'Bannir'],
        ['timeout', 'Exclure 10 minutes'],
      ],
    },
    { key: 'lockdown', label: 'Renforcer la vérification du serveur', type: 'boolean', default: true },
    { key: 'logChannel', label: 'Salon des alertes', placeholder: '#logs', list: 'channelSuggestions' },
  ],
  repair: [
    { key: 'channelDeleteThreshold', label: 'Salons supprimés avant réparation', type: 'number', min: 1, max: 50, default: 3 },
    { key: 'roleDeleteThreshold', label: 'Rôles supprimés avant réparation', type: 'number', min: 1, max: 50, default: 2 },
    { key: 'windowSeconds', label: 'Fenêtre de détection (secondes)', type: 'number', min: 10, max: 300, default: 60 },
    { key: 'restoreMessages', label: 'Restaurer les derniers messages du bot', type: 'boolean', default: true },
    { key: 'repairChannels', label: 'Restaurer les salons', type: 'boolean', default: true },
    { key: 'repairRoles', label: 'Restaurer les rôles', type: 'boolean', default: true },
    { key: 'logChannel', label: 'Salon des alertes', placeholder: '#logs', list: 'channelSuggestions' },
  ],
  logs: [{ key: 'channel', label: 'Salon des logs', placeholder: '#logs', list: 'channelSuggestions' }],
  reminders: [
    { key: 'channel', label: 'Salon des rappels', placeholder: '#annonces', list: 'channelSuggestions' },
    { key: 'cron', label: 'Fréquence', placeholder: 'lundi 09:00' },
  ],
};

const CHANNEL_SUGGESTIONS = ['#bienvenue', '#général', '#annonces', '#logs', '#support', '#niveaux', '#règles'];
const CATEGORY_SUGGESTIONS = ['Accueil', 'Support', 'Modération', 'Formation', 'Logs', 'Annonces'];
const FLOW_ROLES_FALLBACK = ['everyone', 'Membre', 'Modérateur', 'Administrateur', 'Bot', 'VIP'];

function automationFields(type) {
  return (
    AUTOMATION_FIELDS[type] || [
      { key: 'channel', label: 'Salon', placeholder: '#général', list: 'channelSuggestions' },
      { key: 'category', label: 'Catégorie', placeholder: 'Général', list: 'categorySuggestions' },
    ]
  );
}

function automationSummary(automation) {
  const config = automation.config || {};
  const pills = [];
  if (config.channel) pills.push(`<span class="pill cyan">${esc(config.channel)}</span>`);
  if (config.category) pills.push(`<span class="pill violet">${esc(config.category)}</span>`);
  const details = Object.entries(config)
    .filter(([key]) => !['channel', 'category'].includes(key))
    .map(([key, value]) => `${esc(key)}: ${esc(typeof value === 'boolean' ? (value ? 'oui' : 'non') : value)}`);
  return `<div class="auto-config">
    ${pills.join('')}
    ${details.length ? `<span class="auto-detail">${details.join(' · ')}</span>` : ''}
    ${!pills.length && !details.length ? '<span class="auto-detail">Aucun salon configuré pour l’instant.</span>' : ''}
  </div>`;
}

function automationFieldControl(field, value, discord = {}) {
  value = value ?? field.default;
  const channelOptions = (discord.channels || [])
    .filter((channel) => channel.type !== 'voice')
    .map((channel) => `#${channel.name}`);
  const categoryOptions = discord.categories || [];
  const roleOptions = [...new Set(['everyone', ...(discord.roles || []).map((role) => role.name)])];
  const common = `name="${esc(field.key)}" id="auto-${esc(field.key)}"`;
  if (field.type === 'select') {
    return `<div class="field"><label for="auto-${esc(field.key)}">${esc(field.label)}</label>
      <select class="select" ${common}>
        ${(field.options || []).map(([optionValue, label]) => `<option value="${esc(optionValue)}" ${optionValue === String(value ?? '') ? 'selected' : ''}>${esc(label)}</option>`).join('')}
      </select></div>`;
  }
  if (field.type === 'boolean') {
    return `<label class="check-row"><input type="checkbox" ${common} ${value ? 'checked' : ''}> <span>${esc(field.label)}</span></label>`;
  }
  if (field.type === 'textarea') {
    return `<div class="field"><label for="auto-${esc(field.key)}">${esc(field.label)}</label>
      <textarea class="textarea" ${common} placeholder="${esc(field.placeholder || '')}">${esc(value ?? '')}</textarea></div>`;
  }
  if (field.list) {
    const options = field.list === 'channelSuggestions'
      ? (channelOptions.length ? channelOptions : CHANNEL_SUGGESTIONS)
      : field.list === 'roleSuggestions'
        ? (roleOptions.length ? roleOptions : FLOW_ROLES_FALLBACK)
        : (categoryOptions.length ? categoryOptions : CATEGORY_SUGGESTIONS);
    return `<div class="field"><label for="auto-${esc(field.key)}">${esc(field.label)}</label>
      <div class="form-row">
        <select class="select" data-fill-target="auto-${esc(field.key)}">
          <option value="">Choisir…</option>
          ${options.map((option) => `<option value="${esc(option)}" ${value === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}
        </select>
        <input class="input" ${common} list="${field.list}" placeholder="${esc(field.placeholder || '')}" value="${esc(value ?? '')}">
      </div>
    </div>`;
  }
  return `<div class="field"><label for="auto-${esc(field.key)}">${esc(field.label)}</label>
    <input class="input" ${common} type="${field.type || 'text'}" ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''} placeholder="${esc(field.placeholder || '')}" value="${esc(value ?? '')}"></div>`;
}

function bindAutomationPickers(form) {
  form.querySelectorAll('[data-fill-target]').forEach((select) => {
    select.addEventListener('change', () => {
      const input = form.querySelector(`#${select.dataset.fillTarget}`);
      if (input && select.value) {
        input.value = select.value;
        input.focus();
      }
    });
  });
}

function automationIcon(type) {
  if (/anti|mod|logs/.test(type)) return 'shield';
  if (/ticket/.test(type)) return 'ticket';
  if (/level/.test(type)) return 'spark';
  if (/remind/.test(type)) return 'clock';
  return 'zap';
}

function viewBotMessages(bot) {
  const messages = bot.savedMessages || [];
  const cards = messages
    .map(
      (message) => `<div class="auto-card saved-card">
        <span class="a-ic">${icon('message')}</span>
        <div class="a-main">
          <h4>${esc(message.label || message.name || 'Message sauvegardé')}
            ${message.hasEmbed ? '<span class="pill violet">embed</span>' : ''}
            ${message.buttonCount ? `<span class="pill cyan">${message.buttonCount} bouton(s)</span>` : ''}
          </h4>
          <p><b>#${esc(message.channelName || message.channelId || 'salon')}</b> · ${
            message.lastSentAt ? `Dernier envoi ${esc(timeAgo(message.lastSentAt))}` : 'Pas encore envoyé'
          }</p>
          <div class="auto-config"><span class="auto-detail">${esc(message.preview || '')}</span></div>
        </div>
        <button class="btn btn-ghost btn-sm" data-action="run-saved-message" data-id="${esc(bot.id)}" data-message="${esc(message.id)}" title="Envoyer maintenant">${icon('play')} Envoyer</button>
        <button class="btn btn-ghost btn-sm" data-action="edit-saved-message" data-id="${esc(bot.id)}" data-message="${esc(message.id)}">${icon('edit')}</button>
        <button class="mini-btn" data-action="duplicate-saved-message" data-id="${esc(bot.id)}" data-message="${esc(message.id)}" title="Dupliquer">${icon('copy')}</button>
        <button class="mini-btn danger" data-action="delete-saved-message" data-id="${esc(bot.id)}" data-message="${esc(message.id)}" title="Supprimer">${icon('trash')}</button>
      </div>`,
    )
    .join('');

  return `<div class="panel">
    <div class="panel-head">
      <h3>Messages sauvegardés</h3>
      <div class="ph-actions">
        <span class="pill cyan">${messages.length}</span>
        <button class="btn btn-primary btn-sm" data-action="new-saved-message" data-id="${esc(bot.id)}">${icon('plus')} Nouveau message</button>
      </div>
    </div>
    <div class="panel-body">
      <p class="hint">Écris un message, garde-le, puis envoie-le quand tu veux. Tu peux ajouter un embed, des boutons, des liens et des réponses au clic.</p>
      ${
        messages.length
          ? `<div class="sched-list">${cards}</div>`
          : `<div class="empty" style="padding:38px 20px">
              <div class="ic">${icon('message')}</div>
              <h3>Aucun message sauvegardé</h3>
              <p>Garde une annonce, une réponse ou un message riche sous la main, puis envoie-le en un clic.</p>
              <button class="btn btn-primary" data-action="new-saved-message" data-id="${esc(bot.id)}">Créer un message</button>
            </div>`
      }
    </div>
  </div>`;
}

function viewBotScheduled(bot) {
  const messages = bot.scheduledMessages || [];
  const active = messages.filter((message) => message.enabled).length;
  const timezone = messages[0]?.timezone || 'Europe/Paris';
  const cards = messages
    .map(
      (message) => `<div class="auto-card sched-card">
        <span class="a-ic">${icon('clock')}</span>
        <div class="a-main">
          <h4>${esc(message.label)} ${message.enabled ? '' : '<span class="pill gray">Désactivé</span>'}</h4>
          <p>${esc(message.scheduleLabel || `À ${message.time}`)} · <b>#${esc(message.channelName || message.channelId || 'salon')}</b></p>
          <div class="auto-config">
            <span class="auto-detail">${
              message.lastSentAt ? `Dernier envoi ${esc(timeAgo(message.lastSentAt))}` : 'Pas encore envoyé'
            }${message.lastError ? ` · Erreur : ${esc(message.lastError)}` : ''}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" data-action="run-scheduled-message" data-id="${esc(bot.id)}" data-message="${esc(message.id)}" title="Envoyer maintenant">${icon('play')} Envoyer</button>
        <button class="btn btn-ghost btn-sm" data-action="edit-scheduled-message" data-id="${esc(bot.id)}" data-message="${esc(message.id)}">${icon('edit')}</button>
        <button class="switch ${message.enabled ? 'on' : ''}" data-action="toggle-scheduled-message" data-id="${esc(bot.id)}" data-message="${esc(message.id)}" aria-label="Activer ${esc(message.label)}"></button>
        <button class="mini-btn danger" data-action="delete-scheduled-message" data-id="${esc(bot.id)}" data-message="${esc(message.id)}" title="Supprimer">${icon('trash')}</button>
      </div>`,
    )
    .join('');

  return `<div class="panel">
    <div class="panel-head">
      <h3>Messages programmés</h3>
      <div class="ph-actions">
        <span class="pill cyan">${active} actif(s)</span>
        <button class="btn btn-primary btn-sm" data-action="new-scheduled-message" data-id="${esc(bot.id)}">${icon('plus')} Programmer</button>
      </div>
    </div>
    <div class="panel-body">
      <p class="hint">Le bot envoie automatiquement le message à l’heure fixée, dans le fuseau <b>${esc(timezone)}</b>. Les envois sont vérifiés toutes les 20 secondes et ne sont jamais dupliqués.</p>
      ${
        messages.length
          ? `<div class="sched-list">${cards}</div>`
          : `<div class="empty" style="padding:38px 20px">
              <div class="ic">${icon('clock')}</div>
              <h3>Aucun message programmé</h3>
              <p>Programme une annonce, un rappel ou un message récurrent à une heure précise.</p>
              <button class="btn btn-primary" data-action="new-scheduled-message" data-id="${esc(bot.id)}">Programmer un message</button>
            </div>`
      }
    </div>
  </div>`;
}

function viewBotDetail(id) {
  const bot = state.ws.bots.find((entry) => entry.id === id);
  if (!bot) return emptyState('Bot introuvable', 'Ce bot a peut-être été supprimé.', 'Retour aux bots', 'go-bots');

  const tabs = [
    ['commands', `Commandes (${bot.commands.length})`],
    ['messages', `Messages (${(bot.savedMessages || []).length})`],
    ['flows', `Flux (${(bot.flows || []).length})`],
    ['automations', `Automatisations (${bot.automations.length})`],
    ['scheduled', `Messages programmés (${(bot.scheduledMessages || []).length})`],
    ['settings', 'Paramètres'],
  ];

  let body = '';

  if (state.botTab === 'commands') {
    const discord = bot.discord || {};
    const servers = Array.isArray(discord.servers) && discord.servers.length ? discord.servers : discord.guildId ? [discord] : [];
    const activeKey = discord.activeGuildId || discord.guildId || '';
    const activeServer = servers.find((server) => server.id === activeKey || server.guildId === activeKey) || servers[0] || null;
    const runtime = bot.runtime || {};
    const serverName = activeServer?.guildName || activeServer?.name || 'Aucun serveur';
    const knownGuilds = Array.isArray(bot.discordAccount?.guilds) ? bot.discordAccount.guilds : [];
    const unconfiguredGuilds = knownGuilds.filter((guild) => !servers.some((server) => server.guildId === guild.id));
    const inviteUrl = botInviteUrl(bot);
    body = `<div class="panel" style="margin-bottom:14px">
      <div class="panel-head">
        <h3>Serveur des commandes</h3>
        <div class="ph-actions">
          <span class="pill ${activeServer ? 'green' : 'gray'}">${esc(serverName)}</span>
          ${
            inviteUrl
              ? `<a class="btn btn-primary btn-sm" href="/api/bots/${esc(bot.id)}/discord/oauth/start">${icon('users')} Voir mes serveurs</a>
                 <a class="btn btn-ghost btn-sm" href="${esc(inviteUrl)}" target="_blank" rel="noopener noreferrer">${icon('plus')} Lien direct</a>`
              : `<button class="btn btn-ghost btn-sm" data-action="bot-tab" data-tab="settings">${icon('key')} Ajouter le token</button>`
          }
          <button class="btn btn-ghost btn-sm" data-action="sync-bot-commands" data-id="${esc(bot.id)}">${icon('shuffle')} Synchroniser</button>
        </div>
      </div>
      <div class="panel-body">
        <p class="hint" style="margin:0 0 12px">Choisis clairement le serveur qui doit recevoir les commandes ci-dessous. Discord les enregistre immédiatement sur ce serveur.</p>
        ${
          servers.length
            ? `<div class="server-list">
                ${servers
                  .map((server) => {
                    const active = activeServer && (server.id === activeServer.id || (server.guildId && server.guildId === activeServer.guildId));
                    return `<button type="button" class="server-card ${active ? 'active' : ''}" data-action="bot-command-server" data-id="${esc(bot.id)}" data-guild="${esc(server.guildId || server.id)}">
                      <span class="server-avatar">${esc((server.name || server.guildName || 'S').slice(0, 1).toUpperCase())}</span>
                      <span class="server-main">
                        <b>${esc(server.guildName || server.name || 'Serveur Discord')}</b>
                        <small>${server.guildId ? `ID ${esc(server.guildId)}` : 'Non connecté à Discord'} · ${bot.commands.length} commande(s)</small>
                      </span>
                      ${active ? '<span class="pill green">Commandes ici</span>' : '<span class="pill gray">Choisir</span>'}
                    </button>`;
                  })
                  .join('')}
              </div>`
            : `<div class="empty" style="padding:24px 18px">
                <div class="ic">${icon('bot')}</div>
                <h3>Aucun serveur connecté</h3>
                <p>Connecte un serveur Discord pour choisir où enregistrer les commandes.</p>
                <button class="btn btn-primary btn-sm" data-action="bot-tab" data-tab="settings">Ouvrir les paramètres</button>
              </div>`
        }
        ${
          unconfiguredGuilds.length
            ? `<div class="server-connect">
                <span class="hint">Serveurs où le bot est déjà présent, mais pas encore configurés :</span>
                ${unconfiguredGuilds
                  .map(
                    (guild) => `<button class="btn btn-ghost btn-sm" data-action="bot-connect-server" data-id="${esc(bot.id)}" data-guild="${esc(guild.id)}">${icon('plus')} Configurer ${esc(guild.name)}</button>`,
                  )
                  .join('')}
              </div>`
            : ''
        }
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px">
          <span class="hint" style="margin:0">${runtime.lastSyncAt ? `Dernière synchro : ${esc(timeAgo(runtime.lastSyncAt))} · ${runtime.commandCount || 0} commande(s)` : 'Pas encore synchronisé avec Discord.'}</span>
        </div>
        <p class="hint" style="margin-top:8px">${
          inviteUrl
            ? 'Le bot n’est pas encore sur ton serveur ? Clique sur « Voir mes serveurs » ou sur « Lien direct », choisis le serveur, puis reviens ici et clique sur « Synchroniser ».'
            : 'Ajoute le token du bot dans Paramètres pour générer le lien d’invitation vers un nouveau serveur.'
        }</p>
        ${
          inviteUrl
            ? `<details class="token-help"><summary>Première fois : autoriser le retour Discord</summary>
                <p>Dans Discord Developer Portal → ton application → OAuth2 → Redirects, ajoute cette URL :</p>
                <code>${esc(state.config?.discordOAuthRedirectUri || `${window.location.origin}/api/discord/oauth/callback`)}</code>
                <p>Ensuite, le bouton « Voir mes serveurs » fonctionnera.</p>
              </details>`
            : ''
        }
        ${runtime.warning ? `<p class="hint" style="color:#fde68a;margin-top:6px">${esc(runtime.warning)}</p>` : ''}
        ${runtime.lastError ? `<p class="hint" style="color:#fda4af;margin-top:6px">Dernière erreur : ${esc(runtime.lastError)}</p>` : ''}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <h3>Commandes · ${esc(serverName)}</h3>
        <div class="ph-actions"><button class="btn btn-primary btn-sm" data-action="new-command" data-id="${esc(bot.id)}">${icon('plus')} Ajouter</button></div>
      </div>
      <div class="panel-body tight">
        ${
          bot.commands.length
            ? bot.commands
                .map(
                  (command) => `<div class="command-row">
                    <button class="switch ${command.enabled ? 'on' : ''}" data-action="toggle-command" data-id="${esc(bot.id)}" data-cmd="${esc(command.id)}" aria-label="Activer ${esc(command.name)}"></button>
                    <span class="cmd-name">/${esc(command.name)}</span>
                    <div class="cmd-main"><p>${esc(command.description || commandPreviewText(command) || 'Aucune description')}</p></div>
                    <div class="cmd-uses">${commandVariants(command).length ? `<span class="pill gray">${commandVariants(command).length} variantes</span>` : ''} ${fmt(command.uses)} usages</div>
                    <button class="mini-btn" data-action="edit-command" data-id="${esc(bot.id)}" data-cmd="${esc(command.id)}" title="Modifier">${icon('edit')}</button>
                    <button class="mini-btn danger" data-action="delete-command" data-id="${esc(bot.id)}" data-cmd="${esc(command.id)}" title="Supprimer">${icon('trash')}</button>
                  </div>`,
                )
                .join('')
            : `<div class="empty" style="padding:38px 20px">
                <div class="ic">${icon('code')}</div>
                <h3>Aucune commande</h3>
                <p>Ajoutez une première commande avec sa réponse et son embed.</p>
                <button class="btn btn-primary" data-action="new-command" data-id="${esc(bot.id)}">Ajouter une commande</button>
              </div>`
        }
      </div>
    </div>`;
  } else if (state.botTab === 'messages') {
    body = viewBotMessages(bot);
  } else if (state.botTab === 'flows') {
    body = viewBotFlows(bot);
  } else if (state.botTab === 'scheduled') {
    body = viewBotScheduled(bot);
  } else if (state.botTab === 'automations') {
    body = `<div class="panel">
      <div class="panel-head"><h3>Automatisations</h3><div class="ph-actions"><span class="pill violet">${bot.automations.filter((a) => a.enabled).length} active(s)</span><button class="btn btn-primary btn-sm" data-action="new-automation" data-id="${esc(bot.id)}">${icon('plus')} Ajouter</button></div></div>
      <div class="panel-body">
        ${
          bot.automations.length
            ? bot.automations
                .map(
                  (automation) => `<div class="auto-card">
                    <span class="a-ic">${icon(automationIcon(automation.type))}</span>
                    <div class="a-main">
                      <h4>${esc(automation.label)}</h4>
                      <p>${esc(AUTOMATION_DESCRIPTIONS[automation.type] || 'Automatisation personnalisée.')}</p>
                      ${automationSummary(automation)}
                    </div>
                    <button class="btn btn-ghost btn-sm" data-action="config-automation" data-id="${esc(bot.id)}" data-auto="${esc(automation.id)}">${icon('gear')} Configurer</button>
                    ${automation.enabled ? `<button class="btn btn-ghost btn-sm" data-action="run-automation" data-id="${esc(bot.id)}" data-auto="${esc(automation.id)}" title="Déclencher les flux liés à cette automatisation">${icon('play')} Déclencher</button>` : ''}
                    <button class="mini-btn danger" data-action="delete-automation" data-id="${esc(bot.id)}" data-auto="${esc(automation.id)}" title="Supprimer">${icon('trash')}</button>
                    <button class="switch ${automation.enabled ? 'on' : ''}" data-action="toggle-automation" data-id="${esc(bot.id)}" data-auto="${esc(automation.id)}" aria-label="Activer ${esc(automation.label)}"></button>
                  </div>`,
                )
                .join('')
            : `<div class="empty" style="padding:38px 20px">
                <div class="ic">${icon('zap')}</div>
                <h3>Aucune automatisation</h3>
                <p>Choisissez un salon ou une catégorie, puis activez l’automatisation.</p>
                <button class="btn btn-primary" data-action="new-automation" data-id="${esc(bot.id)}">Ajouter une automatisation</button>
              </div>`
        }
      </div>
    </div>`;
  } else {
    const discord = bot.discord || { name: '', channels: [], categories: [], roles: [], guildId: '' };
    const servers = Array.isArray(discord.servers) && discord.servers.length ? discord.servers : [discord];
    const activeServerId = discord.activeGuildId || discord.guildId || servers[0]?.id || '';
    const runtime = bot.runtime || { status: 'offline', logs: [], guilds: [] };
    const runtimeClass =
      runtime.status === 'online' ? 'green' : runtime.status === 'error' ? 'red' : runtime.status === 'starting' ? 'amber' : 'gray';
    const runtimeLabel =
      runtime.status === 'online'
        ? 'Connecté à Discord'
        : runtime.status === 'starting'
          ? 'Connexion…'
          : runtime.status === 'error'
            ? 'Erreur de connexion'
            : 'Hors ligne';
    const knownGuilds = Array.isArray(bot.discordAccount?.guilds) ? bot.discordAccount.guilds : [];
    const inviteUrl = botInviteUrl(bot);
    body = `<div class="panel">
      <div class="panel-head"><h3>Paramètres du bot</h3></div>
      <div class="panel-body">
        <form data-form="bot-settings" data-id="${esc(bot.id)}">
          <div class="form-row">
            <div class="field"><label for="bName">Nom</label><input class="input" id="bName" name="name" value="${esc(bot.name)}" required></div>
            <div class="field"><label for="bPrefix">Préfixe</label><input class="input" id="bPrefix" name="prefix" value="${esc(bot.prefix)}" maxlength="4"></div>
          </div>
          <div class="field"><label for="bDesc">Description</label><textarea class="textarea" id="bDesc" name="description">${esc(bot.description)}</textarea></div>
          <div class="form-row">
            <div class="field"><label for="bColor">Couleur</label><input class="input" id="bColor" name="color" type="color" value="${esc(bot.color)}"></div>
            <div class="field"><label for="bStatus">Statut</label>
              <select class="select" id="bStatus" name="status">
                <option value="online" ${bot.status === 'online' ? 'selected' : ''}>En ligne</option>
                <option value="offline" ${bot.status === 'offline' ? 'selected' : ''}>Hors ligne</option>
                <option value="draft" ${bot.status === 'draft' ? 'selected' : ''}>Brouillon</option>
              </select>
            </div>
          </div>
          <div class="field"><label for="bTags">Étiquettes (séparées par des virgules)</label><input class="input" id="bTags" name="tags" value="${esc(bot.tags.join(', '))}"></div>
          <button class="btn btn-primary" type="submit">Enregistrer les modifications</button>
        </form>
      </div>
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="panel-head">
        <h3>Serveur Discord</h3>
        <div class="ph-actions">
          ${inviteUrl ? `<a class="btn btn-primary btn-sm" href="/api/bots/${esc(bot.id)}/discord/oauth/start">${icon('users')} Voir mes serveurs</a>
          <a class="btn btn-ghost btn-sm" href="${esc(inviteUrl)}" target="_blank" rel="noopener noreferrer">${icon('plus')} Lien direct</a>` : ''}
          <button class="btn btn-ghost btn-sm" data-action="bot-sync-discord" data-id="${esc(bot.id)}">${icon('shuffle')} Synchroniser depuis Discord</button>
          <span class="pill violet">${discord.channels.length} salon(s) · ${discord.categories.length} catégorie(s)</span>
        </div>
      </div>
      <div class="panel-body">
        <div class="server-list-head">
          <div>
            <b>Serveurs connectés</b>
            <p class="hint" style="margin:3px 0 0">Choisis un serveur : les salons, catégories et rôles affichés ensuite sont uniquement ceux de ce serveur.</p>
          </div>
          <span class="pill violet">${servers.length} serveur(s)</span>
        </div>
        <div class="server-list">
          ${servers
            .map(
              (server) => `<button type="button" class="server-card ${server.id === activeServerId ? 'active' : ''}" data-action="bot-select-server" data-id="${esc(bot.id)}" data-guild="${esc(server.guildId || server.id)}">
                <span class="server-avatar">${esc((server.name || 'S').slice(0, 1).toUpperCase())}</span>
                <span class="server-main">
                  <b>${esc(server.name || 'Serveur Discord')}</b>
                  <small>${server.guildId ? `ID ${esc(server.guildId)}` : 'Non connecté à Discord'} · ${server.channels?.length || 0} salon(s) · ${server.roles?.length || 0} rôle(s)</small>
                </span>
                ${server.id === activeServerId ? '<span class="pill green">Actif</span>' : '<span class="pill gray">Choisir</span>'}
              </button>`,
            )
            .join('')}
        </div>
        ${
          knownGuilds.filter((guild) => !servers.some((server) => server.guildId === guild.id)).length
            ? `<div class="server-connect">
                <span class="hint">Autres serveurs détectés avec ce token :</span>
                ${knownGuilds
                  .filter((guild) => !servers.some((server) => server.guildId === guild.id))
                  .map(
                    (guild) => `<button class="btn btn-ghost btn-sm" data-action="bot-connect-server" data-id="${esc(bot.id)}" data-guild="${esc(guild.id)}">${icon('plus')} Connecter ${esc(guild.name)}</button>`,
                  )
                  .join('')}
              </div>`
            : ''
        }
        <p class="hint">${
          discord.syncedAt
            ? `Dernière synchronisation Discord : ${esc(timeAgo(discord.syncedAt))}. Les listes ci-dessous viennent du serveur actif.`
            : 'Ces listes sont des données de démonstration. Clique sur « Synchroniser depuis Discord » pour récupérer les vrais salons, catégories et rôles du serveur actif.'
        }</p>
        <form data-form="bot-discord" data-id="${esc(bot.id)}">
          <div class="field"><label for="bdName">Nom du serveur</label><input class="input" id="bdName" name="serverName" value="${esc(discord.name)}"></div>
          <div class="field">
            <label for="bdGuildId">ID du serveur Discord</label>
            <div class="form-row">
              ${
                knownGuilds.length
                  ? `<select class="select" data-fill-target="bdGuildId"><option value="">Choisir un serveur…</option>${knownGuilds
                      .map((guild) => `<option value="${esc(guild.id)}" ${discord.guildId === guild.id ? 'selected' : ''}>${esc(guild.name)}</option>`)
                      .join('')}</select>`
                  : ''
              }
              <input class="input" id="bdGuildId" name="guildId" value="${esc(discord.guildId || '')}" placeholder="123456789012345678">
            </div>
            <div class="hint">Requis pour synchroniser les commandes instantanément. ${
              knownGuilds.length ? `${knownGuilds.length} serveur(s) détecté(s) avec ce token.` : 'Ajoute le token pour détecter automatiquement tes serveurs.'
            }</div>
          </div>
          <div class="field">
            <label for="bdChannels">Salons <span class="muted-small">(un par ligne · format #salon | Catégorie | text/voice/forum)</span></label>
            <textarea class="textarea" id="bdChannels" name="channels" rows="6">${esc(discord.channels.map((channel) => `#${channel.name} | ${channel.category || 'Général'} | ${channel.type || 'text'}`).join('\n'))}</textarea>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="bdCategories">Catégories <span class="muted-small">(une par ligne)</span></label>
              <textarea class="textarea" id="bdCategories" name="categories" rows="4">${esc(discord.categories.join('\n'))}</textarea>
            </div>
            <div class="field">
              <label for="bdRoles">Rôles <span class="muted-small">(format Nom | #couleur)</span></label>
              <textarea class="textarea" id="bdRoles" name="roles" rows="4">${esc(discord.roles.map((role) => `${role.name} | ${role.color || '#7c5cff'}`).join('\n'))}</textarea>
            </div>
          </div>
          <label class="check-row"><input type="checkbox" name="privilegedIntents" ${discord.privilegedIntents !== false ? 'checked' : ''}> <span>Activer les intents privilégiés (membres + contenu des messages)</span></label>
          <p class="hint">« Synchroniser depuis Discord » remplace ces listes par les vrais salons, catégories et rôles du serveur. Ces données alimentent les automatisations et les flux. Les intents privilégiés doivent aussi être activés dans le portail développeur Discord ; sinon le bot bascule automatiquement en mode sûr (commandes OK, accueil et messages limités).</p>
          <button class="btn btn-primary" type="submit">Enregistrer le serveur</button>
        </form>
      </div>
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="panel-head">
        <h3>Connexion Discord</h3>
        <div class="ph-actions"><span class="pill ${runtimeClass}">${runtimeLabel}</span></div>
      </div>
      <div class="panel-body">
        <div class="token-row">
          <span class="a-ic" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(124,92,255,.13);color:#c2b4ff">${icon('key')}</span>
          <div style="flex:1;min-width:0">
            <b style="font-family:var(--mono);font-size:12.5px">${bot.hasToken ? `••••••••${esc(bot.tokenHint || '')}` : 'Aucun token'}</b>
            <p style="font-size:11.5px;color:var(--muted-2);margin-top:2px">${bot.hasToken ? `Mis à jour ${esc(timeAgo(bot.tokenUpdatedAt))}` : 'Ajoutez le token pour connecter ce bot à Discord.'}</p>
          </div>
          <button class="btn btn-ghost btn-sm" data-action="bot-token" data-id="${esc(bot.id)}">${icon('key')} ${bot.hasToken ? 'Remplacer' : 'Ajouter'} le token</button>
          ${bot.hasToken ? `<button class="btn btn-danger btn-sm" data-action="bot-token-clear" data-id="${esc(bot.id)}">Supprimer</button>` : ''}
        </div>
        ${
          bot.tokenNeedsReconnect
            ? '<p class="hint" style="color:#fde68a">Cet ancien token était stocké sous forme d’empreinte et ne peut plus être utilisé. Réenregistre le token pour activer la connexion réelle.</p>'
            : ''
        }
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <button class="btn btn-ghost btn-sm" data-action="bot-test-connection" data-id="${esc(bot.id)}">${icon('zap')} Tester la connexion</button>
          <button class="btn btn-ghost btn-sm" data-action="bot-sync" data-id="${esc(bot.id)}">${icon('shuffle')} Synchroniser les commandes</button>
          <button class="btn btn-ghost btn-sm" data-action="bot-test-message" data-id="${esc(bot.id)}">${icon('message')} Message de test</button>
          <button class="btn btn-ghost btn-sm" data-action="bot-restart" data-id="${esc(bot.id)}">${icon('play')} Reconnecter</button>
        </div>
        <div style="margin-top:12px;display:grid;gap:4px">
          ${runtime.tag ? `<p class="hint">Connecté en tant que <b>${esc(runtime.tag)}</b>${runtime.guilds?.length ? ` · ${runtime.guilds.length} serveur(s)` : ''}</p>` : ''}
          ${runtime.lastSyncAt ? `<p class="hint">Dernière synchro : ${esc(timeAgo(runtime.lastSyncAt))} · ${runtime.commandCount} commande(s)</p>` : ''}
          ${runtime.lastError ? `<p class="hint" style="color:#fda4af">Dernière erreur : ${esc(runtime.lastError)}</p>` : ''}
          ${runtime.warning ? `<p class="hint" style="color:#fde68a">${esc(runtime.warning)}</p>` : ''}
        </div>
        ${
          runtime.logs?.length
            ? `<details class="token-help"><summary>Journal de connexion</summary>${runtime.logs
                .slice(0, 6)
                .map((entry) => `<p>${esc(entry.message)}</p>`)
                .join('')}</details>`
            : ''
        }
        <p class="hint">Le token est stocké chiffré (AES-256-GCM) et n’est jamais réaffiché. Le bot se connecte réellement à Discord quand un token valide et l’ID du serveur sont enregistrés.</p>
      </div>
    </div>
    <div class="panel" style="margin-top:14px;border-color:rgba(251,113,133,.25)">
      <div class="panel-head"><h3 style="color:#fda4af">Zone sensible</h3></div>
      <div class="panel-body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <p style="flex:1;min-width:200px;font-size:12.5px;color:var(--muted)">Supprimer définitivement ce bot et toutes ses commandes.</p>
        <button class="btn btn-danger btn-sm" data-action="delete-bot" data-id="${esc(bot.id)}">Supprimer le bot</button>
      </div>
    </div>`;
  }

  return `<a class="back-link" href="#/bots">${icon('arrowLeft')} Retour aux bots</a>
    <div class="page-head">
      <span class="bot-avatar" style="width:52px;height:52px;border-radius:15px;font-size:20px;background:linear-gradient(140deg,${esc(bot.color)},${esc(bot.color)}99)">${esc(initials(bot.name))}</span>
      <div>
        <h1 style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${esc(bot.name)} ${statusPill(bot.runtime?.status || bot.status)}</h1>
        <p class="sub">${esc(bot.description || 'Aucune description.')} · préfixe <b>${esc(bot.prefix)}</b> · créé ${esc(timeAgo(bot.createdAt))}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost" data-action="test-bot" data-id="${esc(bot.id)}">${icon('play')} Simuler</button>
        <button class="btn btn-primary" data-action="toggle-bot-status" data-id="${esc(bot.id)}">${icon('zap')} ${bot.runtime?.status === 'online' ? 'Déconnecter' : 'Connecter'}</button>
      </div>
    </div>
    <div class="tabs">
      ${tabs.map(([key, label]) => `<button class="tab ${state.botTab === key ? 'active' : ''}" data-action="bot-tab" data-tab="${key}">${label}</button>`).join('')}
    </div>
    ${body}`;
}

/* ------------------------------------------------------------------ */
/* modales & actions : bots                                            */
/* ------------------------------------------------------------------ */

function savedButtonRow(button = {}) {
  const type = button.url ? 'link' : button.label ? 'action' : 'link';
  return `<div class="msg-btn-row">
    <input class="input" data-field="label" maxlength="80" placeholder="Libellé" value="${esc(button.label || '')}">
    <select class="select" data-field="type">
      <option value="link" ${type === 'link' ? 'selected' : ''}>Lien</option>
      <option value="action" ${type === 'action' ? 'selected' : ''}>Réponse</option>
    </select>
    <input class="input ${type === 'link' ? '' : 'is-hidden'}" data-field="url" maxlength="512" placeholder="https://..." value="${esc(button.url || '')}">
    <input class="input ${type === 'action' ? '' : 'is-hidden'}" data-field="response" maxlength="1000" placeholder="Réponse au clic" value="${esc(button.response || '')}">
    <input class="input msg-btn-emoji" data-field="emoji" maxlength="32" placeholder="😀" value="${esc(button.emoji || '')}">
    <select class="select ${type === 'action' ? '' : 'is-hidden'}" data-field="style">
      <option value="primary" ${button.style === 'primary' || !button.style ? 'selected' : ''}>Bleu</option>
      <option value="secondary" ${button.style === 'secondary' ? 'selected' : ''}>Gris</option>
      <option value="success" ${button.style === 'success' ? 'selected' : ''}>Vert</option>
      <option value="danger" ${button.style === 'danger' ? 'selected' : ''}>Rouge</option>
    </select>
    <button type="button" class="mini-btn danger" data-remove-saved-button title="Retirer">${icon('x')}</button>
  </div>`;
}

function mountSavedButtonEditor(form, initialButtons = []) {
  const container = form.querySelector('#savedButtons');
  if (!container) return;
  const syncRow = (row) => {
    const type = row.querySelector('[data-field="type"]').value;
    row.querySelector('[data-field="url"]').classList.toggle('is-hidden', type !== 'link');
    row.querySelector('[data-field="response"]').classList.toggle('is-hidden', type !== 'action');
    row.querySelector('[data-field="style"]').classList.toggle('is-hidden', type !== 'action');
  };
  const addRow = (button = {}) => {
    if (container.children.length >= 5) {
      toast('Maximum 5 boutons par message.', 'error');
      return;
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = savedButtonRow(button);
    const row = wrapper.firstElementChild;
    row.querySelector('[data-field="type"]').addEventListener('change', () => syncRow(row));
    row.querySelector('[data-remove-saved-button]').addEventListener('click', () => row.remove());
    container.appendChild(row);
    syncRow(row);
  };
  (initialButtons.length ? initialButtons : [{}]).slice(0, 5).forEach(addRow);
  form.querySelector('[data-add-saved-button]')?.addEventListener('click', () => addRow());
}

function savedMessageModal(bot, message = null) {
  const channels = (bot.discord?.channels || []).filter((channel) => channel.type !== 'voice');
  const embed = message?.embed || {};
  const hasEmbed = Boolean(embed.title || embed.description || embed.footer || embed.image || embed.thumbnail);
  const form = openModal({
    title: message ? 'Modifier le message' : 'Nouveau message',
    subtitle: 'Écris, sauvegarde, puis envoie quand tu veux.',
    wide: true,
    submitLabel: message ? 'Enregistrer' : 'Sauvegarder le message',
    body: `
      <div class="field">
        <label for="savedName">Nom interne</label>
        <input class="input" id="savedName" name="name" maxlength="80" value="${esc(message?.name || '')}" placeholder="Annonce de lancement">
      </div>
      <div class="field">
        <label for="savedChannelName">Salon Discord</label>
        <div class="form-row">
          <select class="select" name="channelId">
            <option value="">Choisir un salon…</option>
            ${channels
              .map(
                (channel) => `<option value="${esc(channel.id)}" data-name="${esc(channel.name)}" ${
                  message?.channelId === channel.id || (!message?.channelId && message?.channelName === channel.name) ? 'selected' : ''
                }>#${esc(channel.name)}${channel.category ? ` · ${esc(channel.category)}` : ''}</option>`,
              )
              .join('')}
          </select>
          <input class="input" id="savedChannelName" name="channelName" list="savedChannelSuggestions" value="${esc(message?.channelName || '')}" placeholder="#annonces">
        </div>
        <div class="hint">Choisis un salon synchronisé, ou écris son nom / son ID.</div>
        <datalist id="savedChannelSuggestions">
          ${channels.map((channel) => `<option value="${esc(channel.name)}"></option>`).join('')}
        </datalist>
      </div>
      <div class="field">
        <label for="savedContent">Message</label>
        <textarea class="textarea" id="savedContent" name="content" rows="5" maxlength="2000" placeholder="Bonjour à tous ! Voici les annonces du jour…">${esc(message?.content || '')}</textarea>
      </div>
      <details class="msg-embed" ${hasEmbed ? 'open' : ''}>
        <summary>Ajouter un embed (titre, description, couleur, image…)</summary>
        <div class="form-row">
          <div class="field">
            <label for="savedEmbedTitle">Titre</label>
            <input class="input" id="savedEmbedTitle" name="embedTitle" maxlength="256" value="${esc(embed.title || '')}" placeholder="Annonce importante">
          </div>
          <div class="field">
            <label for="savedEmbedColor">Couleur</label>
            <input class="input" id="savedEmbedColor" name="embedColor" type="color" value="${esc(embed.color || '#7c5cff')}">
          </div>
        </div>
        <div class="field">
          <label for="savedEmbedDescription">Description</label>
          <textarea class="textarea" id="savedEmbedDescription" name="embedDescription" rows="3" maxlength="4096" placeholder="Le texte de l’embed…">${esc(embed.description || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="field">
            <label for="savedEmbedFooter">Pied de page</label>
            <input class="input" id="savedEmbedFooter" name="embedFooter" maxlength="2048" value="${esc(embed.footer || '')}" placeholder="KyllBot Studio">
          </div>
          <div class="field">
            <label for="savedEmbedImage">Image (URL)</label>
            <input class="input" id="savedEmbedImage" name="embedImage" maxlength="512" value="${esc(embed.image || '')}" placeholder="https://...">
          </div>
        </div>
        <div class="field">
          <label for="savedEmbedThumbnail">Miniature (URL)</label>
          <input class="input" id="savedEmbedThumbnail" name="embedThumbnail" maxlength="512" value="${esc(embed.thumbnail || '')}" placeholder="https://...">
        </div>
      </details>
      <div class="msg-buttons-head">
        <label>Boutons</label>
        <button type="button" class="btn btn-ghost btn-sm" data-add-saved-button>${icon('plus')} Ajouter un bouton</button>
      </div>
      <div class="msg-buttons" id="savedButtons"></div>
      <p class="hint">Un bouton « lien » ouvre une URL. Un bouton « réponse » répond au clic avec le texte prévu. Maximum 5 boutons.</p>
    `,
    onSubmit: async (formData) => {
      const select = form.querySelector('select[name="channelId"]');
      const selectedOption = select?.selectedOptions?.[0];
      let channelId = String(formData.get('channelId') || '').trim();
      let channelName = String(formData.get('channelName') || '').trim().replace(/^#/, '');
      if (!channelName && selectedOption?.dataset?.name) channelName = selectedOption.dataset.name;
      if (channelId && channelName && selectedOption?.dataset?.name && channelName.toLowerCase() !== selectedOption.dataset.name.toLowerCase()) {
        channelId = '';
      }
      const buttons = [...form.querySelectorAll('.msg-btn-row')]
        .map((row) => {
          const label = String(row.querySelector('[data-field="label"]')?.value || '').trim();
          if (!label) return null;
          const type = row.querySelector('[data-field="type"]')?.value || 'link';
          const url = String(row.querySelector('[data-field="url"]')?.value || '').trim();
          const response = String(row.querySelector('[data-field="response"]')?.value || '').trim();
          if (type === 'link' && !/^https?:\/\/\S+$/i.test(url)) {
            throw new Error(`Le bouton « ${label} » doit avoir une URL qui commence par http:// ou https://.`);
          }
          if (type === 'action' && !response) {
            throw new Error(`Renseigne la réponse du bouton « ${label} ».`);
          }
          return {
            label,
            emoji: String(row.querySelector('[data-field="emoji"]')?.value || '').trim(),
            style: row.querySelector('[data-field="style"]')?.value || 'primary',
            url: type === 'link' ? url : '',
            response: type === 'action' ? response : '',
            ephemeral: true,
          };
        })
        .filter(Boolean);
      const payload = {
        name: String(formData.get('name') || '').trim(),
        channelId,
        channelName,
        content: String(formData.get('content') || '').trim(),
        embed: {
          title: String(formData.get('embedTitle') || '').trim(),
          description: String(formData.get('embedDescription') || '').trim(),
          color: String(formData.get('embedColor') || '#7c5cff').trim(),
          footer: String(formData.get('embedFooter') || '').trim(),
          image: String(formData.get('embedImage') || '').trim(),
          thumbnail: String(formData.get('embedThumbnail') || '').trim(),
        },
        buttons,
      };
      const hasEmbedContent = Boolean(
        payload.embed.title || payload.embed.description || payload.embed.footer || payload.embed.image || payload.embed.thumbnail,
      );
      if (!payload.content && !hasEmbedContent && !buttons.length) {
        throw new Error('Écris un message, un embed ou ajoute au moins un bouton.');
      }
      await api(
        message ? `/api/bots/${bot.id}/messages/${message.id}` : `/api/bots/${bot.id}/messages`,
        { method: message ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
      );
      await refresh();
      toast(message ? 'Message mis à jour.' : 'Message sauvegardé.');
    },
  });

  const channelSelect = form.querySelector('select[name="channelId"]');
  channelSelect?.addEventListener('change', () => {
    const option = channelSelect.selectedOptions[0];
    const input = form.querySelector('#savedChannelName');
    if (option?.value && option.dataset.name && input) input.value = option.dataset.name;
  });
  mountSavedButtonEditor(form, message?.buttons || []);
  return form;
}

function scheduledMessageModal(bot, message = null) {
  const channels = (bot.discord?.channels || []).filter((channel) => channel.type !== 'voice');
  const days = Array.isArray(message?.days) ? message.days : [0, 1, 2, 3, 4, 5, 6];
  const dayOptions = [
    [1, 'Lun'],
    [2, 'Mar'],
    [3, 'Mer'],
    [4, 'Jeu'],
    [5, 'Ven'],
    [6, 'Sam'],
    [0, 'Dim'],
  ];
  const form = openModal({
    title: message ? 'Modifier le message programmé' : 'Nouveau message programmé',
    subtitle: 'Choisis le salon, l’heure fixe et les jours d’envoi.',
    submitLabel: message ? 'Enregistrer' : 'Programmer le message',
    body: `
      <div class="field">
        <label for="schedLabel">Nom du message</label>
        <input class="input" id="schedLabel" name="label" maxlength="80" value="${esc(message?.label || '')}" placeholder="Annonce du lundi">
      </div>
      <div class="field">
        <label for="schedChannelName">Salon Discord</label>
        <div class="form-row">
          <select class="select" name="channelId">
            <option value="">Choisir un salon…</option>
            ${channels
              .map(
                (channel) => `<option value="${esc(channel.id)}" data-name="${esc(channel.name)}" ${
                  message?.channelId === channel.id || (!message?.channelId && message?.channelName === channel.name) ? 'selected' : ''
                }>#${esc(channel.name)}${channel.category ? ` · ${esc(channel.category)}` : ''}</option>`,
              )
              .join('')}
          </select>
          <input class="input" id="schedChannelName" name="channelName" list="scheduledChannelSuggestions" value="${esc(message?.channelName || '')}" placeholder="#annonces">
        </div>
        <div class="hint">Choisis un salon synchronisé, ou écris son nom / son ID. Le bot doit avoir la permission d’envoyer dans ce salon.</div>
        <datalist id="scheduledChannelSuggestions">
          ${channels.map((channel) => `<option value="${esc(channel.name)}"></option>`).join('')}
        </datalist>
      </div>
      <div class="form-row">
        <div class="field">
          <label for="schedTime">Heure fixe</label>
          <input class="input" id="schedTime" name="time" type="time" value="${esc(message?.time || '09:00')}" required>
        </div>
        <div class="field">
          <label for="schedTimezone">Fuseau horaire</label>
          <input class="input" id="schedTimezone" name="timezone" value="${esc(message?.timezone || 'Europe/Paris')}" placeholder="Europe/Paris">
        </div>
      </div>
      <div class="field">
        <label>Jours d’envoi</label>
        <div class="sched-days">
          ${dayOptions
            .map(
              ([value, label]) => `<label class="sched-day"><input type="checkbox" name="days" value="${value}" ${
                days.includes(value) ? 'checked' : ''
              }> <span>${label}</span></label>`,
            )
            .join('')}
        </div>
        <div class="hint">Laisse tous les jours cochés pour un envoi quotidien.</div>
      </div>
      <div class="field">
        <label for="schedContent">Message à envoyer</label>
        <textarea class="textarea" id="schedContent" name="content" rows="5" maxlength="2000" required placeholder="Bonjour à tous ! Voici les annonces du jour…">${esc(message?.content || '')}</textarea>
      </div>
      <label class="check-row"><input type="checkbox" name="enabled" ${message?.enabled !== false ? 'checked' : ''}> <span>Message actif</span></label>
      <p class="hint">Le message est envoyé par le bot Discord, pas par KyllBot Studio. Les mentions sont désactivées pour éviter les pings involontaires.</p>
    `,
    onSubmit: async (formData) => {
      const select = form.querySelector('select[name="channelId"]');
      const selectedOption = select?.selectedOptions?.[0];
      let channelId = String(formData.get('channelId') || '').trim();
      let channelName = String(formData.get('channelName') || '').trim().replace(/^#/, '');
      if (!channelName && selectedOption?.dataset?.name) channelName = selectedOption.dataset.name;
      if (channelId && channelName && selectedOption?.dataset?.name && channelName.toLowerCase() !== selectedOption.dataset.name.toLowerCase()) {
        channelId = '';
      }
      const selectedDays = [...form.querySelectorAll('input[name="days"]:checked')].map((input) => Number(input.value));
      const payload = {
        label: String(formData.get('label') || '').trim(),
        channelId,
        channelName,
        time: String(formData.get('time') || '').trim(),
        timezone: String(formData.get('timezone') || 'Europe/Paris').trim(),
        days: selectedDays,
        content: String(formData.get('content') || '').trim(),
        enabled: formData.get('enabled') === 'on',
      };
      await api(
        message ? `/api/bots/${bot.id}/scheduled-messages/${message.id}` : `/api/bots/${bot.id}/scheduled-messages`,
        { method: message ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
      );
      await refresh();
      toast(message ? 'Message programmé mis à jour.' : 'Message programmé ajouté.');
    },
  });

  const channelSelect = form.querySelector('select[name="channelId"]');
  channelSelect?.addEventListener('change', () => {
    const option = channelSelect.selectedOptions[0];
    const input = form.querySelector('#schedChannelName');
    if (option?.value && option.dataset.name && input) input.value = option.dataset.name;
  });
  return form;
}

function newBotModal() {
  openModal({
    title: 'Créer un bot',
    subtitle: 'Vous pourrez ajouter vos commandes et automatisations juste après.',
    submitLabel: 'Créer le bot',
    body: `
      <div class="field"><label for="nbName">Nom du bot</label><input class="input" id="nbName" name="name" placeholder="KyllBot Communauté" required></div>
      <div class="field"><label for="nbDesc">Description</label><textarea class="textarea" id="nbDesc" name="description" placeholder="Ce que fait votre bot, en une phrase."></textarea></div>
      <div class="form-row">
        <div class="field"><label for="nbPrefix">Préfixe</label><input class="input" id="nbPrefix" name="prefix" value="!" maxlength="4"></div>
        <div class="field"><label for="nbColor">Couleur</label><input class="input" id="nbColor" name="color" type="color" value="#7c5cff"></div>
      </div>
      <div class="field"><label for="nbTags">Étiquettes</label><input class="input" id="nbTags" name="tags" placeholder="Communauté, Modération"></div>
      <div class="field">
        <label for="nbToken">Token du bot Discord <span class="muted-small">(optionnel)</span></label>
        <input class="input" id="nbToken" name="token" type="password" placeholder="Collez le token depuis le portail développeur Discord" autocomplete="off">
        <div class="hint">Le token n’est jamais réaffiché : seul un indice (4 derniers caractères) est conservé. Vous pourrez le remplacer dans Paramètres → Connexion Discord.</div>
        <details class="token-help">
          <summary>Où trouver mon token ?</summary>
          <p>Portail développeur Discord → votre application → onglet Bot → Reset Token. Ne partagez jamais ce token.</p>
        </details>
      </div>
    `,
    onSubmit: async (formData) => {
      await api('/api/bots', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          prefix: formData.get('prefix'),
          color: formData.get('color'),
          token: String(formData.get('token') || '').trim() || undefined,
          tags: String(formData.get('tags') || '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      await refresh();
      toast('Bot créé avec succès.');
    },
  });
}

const COMMAND_PRESETS = [
  {
    key: 'welcome',
    label: 'Bienvenue',
    name: 'bienvenue',
    description: "Affiche le message d'accueil",
    response: 'Bienvenue {user} sur **{server}** !',
    embed: { title: 'Bienvenue !', description: 'Passe lire les règles, puis présente-toi dans #présentations.', color: '#7c5cff', footer: 'KyllBot Studio' },
  },
  {
    key: 'rules',
    label: 'Règles',
    name: 'regles',
    description: 'Rappelle les règles du serveur',
    response: '',
    embed: { title: 'Règles du serveur', description: '1. Respect · 2. Pas de spam · 3. Pas de publicité non autorisée.', color: '#22d3ee', footer: 'KyllBot Studio' },
  },
  {
    key: 'ping',
    label: 'Ping',
    name: 'ping',
    description: 'Affiche la latence du bot',
    response: 'Pong ! Latence : **{latency} ms**.',
    embed: { title: '', description: '', color: '#7c5cff', footer: 'KyllBot Studio' },
  },
  {
    key: 'help',
    label: 'Aide',
    name: 'aide',
    description: 'Liste les commandes disponibles',
    response: '',
    embed: { title: 'Commandes disponibles', description: '/bienvenue · /regles · /ticket · /rank · /ping', color: '#a3e635', footer: 'KyllBot Studio' },
  },
  {
    key: 'ticket',
    label: 'Ticket',
    name: 'ticket',
    description: 'Ouvre un ticket de support',
    response: 'Ticket ouvert : un membre du staff arrive.',
    embed: { title: 'Support', description: 'Décris ton problème, un membre du staff te répondra ici.', color: '#f472b6', footer: 'Support' },
  },
  {
    key: 'poll',
    label: 'Sondage',
    name: 'sondage',
    description: 'Lance un sondage rapide',
    response: '',
    embed: { title: 'Sondage', description: 'Réagis avec ✅ pour oui ou ❌ pour non.', color: '#fbbf24', footer: 'KyllBot Studio' },
  },
  {
    key: 'rank',
    label: 'Niveau',
    name: 'rank',
    description: 'Affiche le niveau et l’XP',
    response: '{user} est niveau **{level}** avec **{xp} XP**.',
    embed: { title: '', description: '', color: '#7c5cff', footer: 'KyllBot Studio' },
  },
  {
    key: 'announce',
    label: 'Annonce',
    name: 'annonce',
    description: 'Publie une annonce',
    response: '',
    embed: { title: '📢 Annonce', description: 'Votre annonce ici.', color: '#7c5cff', footer: 'Staff' },
  },
  {
    key: 'verification',
    label: 'Vérification',
    name: 'verifier',
    description: 'Demande au membre de valider les règles',
    response: '',
    embed: { title: '✅ Vérification', description: 'Clique sur le bouton ci-dessous pour confirmer que tu as lu les règles.', color: '#22d3ee', footer: 'KyllBot Studio' },
  },
  {
    key: 'giveaway',
    label: 'Giveaway',
    name: 'giveaway',
    description: 'Lance un tirage au sort',
    response: '',
    embed: { title: '🎁 Giveaway', description: 'Réagis avec 🎉 pour participer. Fin dans 24 h !', color: '#f472b6', footer: 'KyllBot Studio' },
  },
  {
    key: 'dm',
    label: 'Message privé',
    name: 'mp',
    description: 'Envoie un message privé au membre',
    response: 'Un message privé vient de t’être envoyé.',
    embed: { title: '💬 Message privé', description: 'Ce message est visible uniquement par toi.', color: '#a3e635', footer: 'KyllBot Studio' },
  },
  {
    key: 'stats',
    label: 'Statistiques',
    name: 'stats',
    description: 'Affiche les statistiques du serveur',
    response: '**{server}** · Niveau **{level}** · **{xp} XP**',
    embed: { title: '📊 Statistiques', description: 'Membres actifs, messages et progression de la communauté.', color: '#7c5cff', footer: 'KyllBot Studio' },
  },
  {
    key: 'invite',
    label: 'Invitation',
    name: 'invitation',
    description: 'Partage le lien d’invitation du serveur',
    response: 'Rejoins-nous sur **{server}** !',
    embed: { title: '🔗 Invitation', description: 'Partage ce lien avec tes amis.', color: '#fbbf24', footer: 'KyllBot Studio' },
  },
];

const BOT_INVITE_PERMISSIONS = '1100454816983';

function botInviteUrl(bot, guildId = '') {
  const appId = String(bot?.discordAccount?.id || bot?.runtime?.userId || '').trim();
  if (!/^\d{17,20}$/.test(appId)) return '';
  const guild = guildId ? `&guild_id=${encodeURIComponent(guildId)}&disable_guild_select=true` : '';
  return `https://discord.com/oauth2/authorize?client_id=${appId}&permissions=${BOT_INVITE_PERMISSIONS}&scope=bot%20applications.commands${guild}`;
}

function commandServerName(bot) {
  const discord = bot?.discord || {};
  const servers = Array.isArray(discord.servers) && discord.servers.length ? discord.servers : discord.guildId ? [discord] : [];
  const key = discord.activeGuildId || discord.guildId || '';
  const active = servers.find((server) => server.id === key || server.guildId === key) || servers[0];
  return active?.guildName || active?.name || '';
}

function openDiscordGuildsModal(result) {
  const bot = state.ws?.bots?.find((entry) => entry.id === result.botId);
  const available = result.availableGuilds || [];
  const present = result.presentGuilds || [];
  const body = result.error
    ? `<div class="empty" style="padding:28px 18px"><div class="ic">${icon('x')}</div><h3>Autorisation impossible</h3><p>${esc(result.error)}</p></div>`
    : `<p class="hint">Compte Discord : <b>${esc(result.user?.globalName || result.user?.username || 'inconnu')}</b></p>
      <div class="field">
        <label>Serveurs où tu peux ajouter le bot (${available.length})</label>
        ${
          available.length
            ? `<div class="server-list">${available
                .map(
                  (guild) => `<div class="server-card">
                    <span class="server-avatar">${esc((guild.name || 'S').slice(0, 1).toUpperCase())}</span>
                    <span class="server-main"><b>${esc(guild.name)}</b><small>${guild.owner ? 'Tu es propriétaire' : 'Tu peux gérer ce serveur'} · bot absent</small></span>
                    ${bot ? `<a class="btn btn-primary btn-sm" href="${esc(botInviteUrl(bot, guild.id))}" target="_blank" rel="noopener noreferrer">Ajouter le bot</a>` : ''}
                    <button type="button" class="btn btn-ghost btn-sm" data-action="bot-connect-server" data-id="${esc(result.botId)}" data-guild="${esc(guild.id)}" data-close-modal="1">Configurer</button>
                  </div>`,
                )
                .join('')}</div>`
            : `<div class="empty" style="padding:24px 18px"><div class="ic">${icon('users')}</div><h3>Aucun serveur disponible</h3><p>Le bot est déjà présent sur tous tes serveurs gérables, ou tu n’as pas la permission « Gérer le serveur ».</p></div>`
        }
      </div>
      ${
        present.length
          ? `<details class="token-help"><summary>Bot déjà présent sur ${present.length} serveur(s)</summary>${present.map((guild) => `<p>${esc(guild.name)}</p>`).join('')}</details>`
          : ''
      }
      <p class="hint">Tu dois avoir la permission « Gérer le serveur » sur le serveur de ton ami. Si elle n’apparaît pas, demande-lui de t’ajouter comme administrateur ou de faire l’ajout lui-même.</p>`;
  openModal({
    title: 'Ajouter le bot à un serveur',
    subtitle: 'Choisis un serveur, autorise l’invitation, puis configure-le.',
    body,
    hideFooter: true,
    wide: true,
  });
}

async function handleDiscordOAuthReturn() {
  const params = new URLSearchParams(window.location.search);
  const stateId = params.get('discord_oauth');
  const error = params.get('discord_oauth_error');
  if (!stateId && !error) return;
  const url = new URL(window.location.href);
  url.searchParams.delete('discord_oauth');
  url.searchParams.delete('discord_oauth_error');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  if (error) {
    toast(error, 'error');
    return;
  }
  try {
    const result = await api(`/api/discord/oauth/result?state=${encodeURIComponent(stateId)}`);
    openDiscordGuildsModal(result);
  } catch (errorObject) {
    toast(errorObject.message, 'error');
  }
}

function commandVariants(command) {
  return Array.isArray(command?.variants) ? command.variants.filter((variant) => variant?.text) : [];
}

function commandPreviewText(command) {
  const variants = commandVariants(command);
  if (command?.variantMode && variants.length) return variants[0].text;
  return command?.response || '';
}

function commandVariantRow(variant = {}) {
  return `<div class="command-variant-row" data-command-variant>
    <span class="variant-badge">V</span>
    <div class="variant-main">
      <textarea class="textarea" rows="2" name="variantText" maxlength="1000" placeholder="Texte de la variante">${esc(variant.text || '')}</textarea>
      <div class="variant-meta">
        <label>Poids <input class="input" type="number" name="variantWeight" min="1" max="100" value="${esc(variant.weight || 1)}"></label>
      </div>
    </div>
    <input type="hidden" name="variantId" value="${esc(variant.id || '')}">
    <button type="button" class="mini-btn danger" data-remove-command-variant title="Supprimer">${icon('x')}</button>
  </div>`;
}

function commandModal(bot, command) {
  const value = command || {
    name: '',
    description: '',
    response: '',
    cooldown: 3,
    variants: [],
    variantMode: false,
    embed: { title: '', description: '', color: bot.color || '#7c5cff', footer: 'KyllBot Studio' },
  };
  const initialVariants = commandVariants(value);
  const serverName = commandServerName(bot);

  const form = openModal({
    title: command ? 'Modifier la commande' : 'Nouvelle commande',
    subtitle: `${serverName ? `Serveur cible : ${serverName} · ` : ''}Prévisualisez le rendu Discord en direct.`,
    wide: true,
    submitLabel: command ? 'Enregistrer' : 'Créer la commande',
    body: `
      <div class="field">
        <label>Actions prêtes à l’emploi</label>
        <div class="preset-grid">
          ${COMMAND_PRESETS.map(
            (preset) => `<button type="button" class="preset-chip" data-preset="${esc(preset.key)}">${esc(preset.label)}</button>`,
          ).join('')}
        </div>
        <div class="hint">Cliquez sur une action pour remplir le formulaire, puis adaptez le texte.</div>
      </div>
      <div class="form-row">
        <div class="field"><label for="cName">Nom</label><input class="input" id="cName" name="name" placeholder="bienvenue" value="${esc(value.name)}" required></div>
        <div class="field"><label for="cCooldown">Cooldown (secondes)</label><input class="input" id="cCooldown" name="cooldown" type="number" min="0" max="600" value="${esc(value.cooldown)}"></div>
      </div>
      <div class="field"><label for="cDesc">Description</label><input class="input" id="cDesc" name="description" placeholder="Affiche le message d'accueil" value="${esc(value.description)}"></div>
      <div class="field"><label for="cResp">Réponse texte</label><textarea class="textarea" id="cResp" name="response" placeholder="Bienvenue {user} sur {server} !">${esc(value.response)}</textarea><div class="hint">Variables disponibles : {user}, {server}, {level}, {xp}</div></div>
      <div class="field">
        <div class="variant-editor-head">
          <b>Variantes de réponse</b>
          <span class="pill gray" id="cmdVariantCount">0 variante</span>
        </div>
        <label class="check-row" style="margin:8px 0"><input type="checkbox" name="variantMode" ${value.variantMode ? 'checked' : ''}> <span>Choisir une variante au hasard à chaque utilisation</span></label>
        <p class="hint">Ajoute plusieurs textes : le bot en tire un au hasard selon son poids. Si l'option est désactivée, la réponse texte ci-dessus est utilisée.</p>
        <div class="variants" id="cmdVariants">${initialVariants.map((variant) => commandVariantRow(variant)).join('')}</div>
        <button type="button" class="link-btn" id="cmdAddVariant" style="margin-top:8px">${icon('plus')} Ajouter une variante</button>
      </div>
      <div class="form-row">
        <div class="field"><label for="eTitle">Titre de l'embed</label><input class="input" id="eTitle" name="embedTitle" value="${esc(value.embed.title)}"></div>
        <div class="field"><label for="eColor">Couleur de l'embed</label><input class="input" id="eColor" name="embedColor" type="color" value="${esc(value.embed.color)}"></div>
      </div>
      <div class="field"><label for="eDesc">Description de l'embed</label><textarea class="textarea" id="eDesc" name="embedDescription">${esc(value.embed.description)}</textarea></div>
      <div class="field"><label for="eFooter">Pied de page</label><input class="input" id="eFooter" name="embedFooter" value="${esc(value.embed.footer)}"></div>
      <div class="field"><label>Aperçu Discord</label><div class="modal-preview" id="cmdPreview"></div></div>
    `,
    onSubmit: async (formData) => {
      const variantIds = formData.getAll('variantId');
      const variantTexts = formData.getAll('variantText');
      const variantWeights = formData.getAll('variantWeight');
      const variants = variantTexts
        .map((text, index) => ({
          id: String(variantIds[index] || '').trim(),
          text: String(text || '').trim(),
          weight: Math.min(100, Math.max(1, Number(variantWeights[index]) || 1)),
        }))
        .filter((variant) => variant.text)
        .slice(0, 20);
      const payload = {
        name: formData.get('name'),
        description: formData.get('description'),
        response: formData.get('response'),
        cooldown: Number(formData.get('cooldown')),
        variantMode: Boolean(formData.get('variantMode')),
        variants,
        embed: {
          title: formData.get('embedTitle'),
          description: formData.get('embedDescription'),
          color: formData.get('embedColor'),
          footer: formData.get('embedFooter'),
        },
      };
      if (!String(payload.name || '').trim()) throw new Error('Le nom de la commande est requis.');
      if (command) {
        await api(`/api/bots/${bot.id}/commands/${command.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api(`/api/bots/${bot.id}/commands`, { method: 'POST', body: JSON.stringify(payload) });
      }
      await refresh();
      toast(command ? 'Commande mise à jour.' : 'Commande créée.');
    },
  });

  const variantsHost = form.querySelector('#cmdVariants');
  const variantCount = form.querySelector('#cmdVariantCount');
  const refreshVariantCount = () => {
    if (!variantCount) return;
    const count = variantsHost?.querySelectorAll('[data-command-variant]').length || 0;
    variantCount.textContent = `${count} variante${count > 1 ? 's' : ''}`;
  };
  const addVariant = (variant = {}) => {
    if (!variantsHost) return;
    if (variantsHost.querySelectorAll('[data-command-variant]').length >= 20) {
      toast('20 variantes maximum par commande.', 'error');
      return;
    }
    variantsHost.insertAdjacentHTML('beforeend', commandVariantRow(variant));
    refreshVariantCount();
    update();
  };

  form.querySelector('#cmdAddVariant')?.addEventListener('click', () => addVariant());
  variantsHost?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-command-variant]');
    if (!button) return;
    button.closest('[data-command-variant]')?.remove();
    refreshVariantCount();
    update();
  });

  const update = () => {
    const data = new FormData(form);
    const preview = document.getElementById('cmdPreview');
    refreshVariantCount();
    if (!preview) return;
    const variantTexts = data.getAll('variantText').map((value) => String(value).trim()).filter(Boolean);
    const response = data.get('variantMode') && variantTexts.length ? variantTexts[0] : data.get('response') || variantTexts[0] || '';
    preview.innerHTML = embedPreview({
      title: data.get('embedTitle'),
      description: data.get('embedDescription'),
      color: data.get('embedColor'),
      footer: data.get('embedFooter'),
      response,
    });
  };
  form.addEventListener('input', update);
  form.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const preset = COMMAND_PRESETS.find((entry) => entry.key === button.dataset.preset);
      if (!preset) return;
      const set = (name, value) => {
        const field = form.querySelector(`[name="${name}"]`);
        if (field) field.value = value;
      };
      set('name', preset.name);
      set('description', preset.description);
      set('response', preset.response);
      set('embedTitle', preset.embed.title);
      set('embedDescription', preset.embed.description);
      set('embedColor', preset.embed.color);
      set('embedFooter', preset.embed.footer);
      update();
      form.querySelector('[name="name"]')?.focus();
    });
  });
  update();
}

const formatDiscord = (text) => esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

function embedPreview({ title, description, color, footer, response }) {
  const desc = description || response || 'Votre réponse apparaîtra ici.';
  return `<div class="embed-preview" style="border-left-color:${esc(color || '#7c5cff')}">
    ${title ? `<div class="ep-title">${esc(title)}</div>` : ''}
    <div class="ep-desc">${formatDiscord(desc)}</div>
    <div class="ep-footer"><span class="avatar" style="width:16px;height:16px;font-size:7px">K</span>${esc(footer || 'KyllBot Studio')} · aujourd'hui</div>
  </div>`;
}

onAction('new-bot', newBotModal);

onAction('delete-bot', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  confirmDialog({
    title: `Supprimer « ${bot.name} » ?`,
    message: 'Cette action est définitive. Toutes les commandes et automatisations du bot seront supprimées.',
    confirmLabel: 'Supprimer',
    onConfirm: async () => {
      await api(`/api/bots/${bot.id}`, { method: 'DELETE' });
      if (state.route.name === 'bot') window.location.hash = '#/bots';
      await refresh();
      toast('Bot supprimé.', 'info');
    },
  });
});

onAction('toggle-bot-status', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  const online = bot.runtime?.status === 'online';
  const next = online ? 'offline' : 'online';
  try {
    const result = await api(`/api/bots/${bot.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
    await refresh();
    if (next === 'offline') toast(`${bot.name} est déconnecté de Discord.`, 'info');
    else if (result.runtime?.status === 'online') toast(`${bot.name} est connecté à Discord.`);
    else if (!bot.hasToken) toast('Ajoute un token Discord dans Paramètres → Connexion Discord.', 'info');
    else toast(result.runtime?.lastError || 'Connexion à Discord en cours…', result.runtime?.status === 'error' ? 'error' : 'info');
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('bot-test-connection', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  try {
    const result = await api(`/api/bots/${bot.id}/test`, { method: 'POST' });
    const account = result.account || {};
    toast(`Connexion réelle OK : ${account.globalName || account.username || 'bot Discord'} · ${(result.guilds || []).length} serveur(s).`);
    await refresh();
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('bot-sync', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  try {
    const result = await api(`/api/bots/${bot.id}/sync`, { method: 'POST' });
    const metadata = result.metadata?.ok
      ? ` · ${result.metadata.channels} salon(s), ${result.metadata.roles} rôle(s) synchronisés`
      : '';
    toast(
      `${result.count} commande(s) synchronisée(s)${result.global ? ' globalement (propagation jusqu’à 1 h)' : ' sur le serveur'}${metadata}.`,
      result.global ? 'info' : 'success',
    );
    await refresh();
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('bot-sync-discord', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  try {
    const result = await api(`/api/bots/${bot.id}/discord/sync`, { method: 'POST' });
    toast(
      `${result.channels} salon(s), ${result.categories} catégorie(s) et ${result.roles} rôle(s) synchronisés depuis ${result.guildName || 'Discord'}.`,
      'success',
    );
    await refresh();
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('bot-select-server', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  try {
    await api(`/api/bots/${bot.id}/discord/server`, { method: 'POST', body: JSON.stringify({ guildId: el.dataset.guild }) });
    await refresh();
    toast('Serveur actif changé. Les salons et rôles affichés sont ceux de ce serveur.', 'info');
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('bot-command-server', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  const target = (bot.discord?.servers || []).find((server) => server.id === el.dataset.guild || server.guildId === el.dataset.guild);
  const serverName = target?.guildName || target?.name || 'ce serveur';
  try {
    await api(`/api/bots/${bot.id}/discord/server`, { method: 'POST', body: JSON.stringify({ guildId: el.dataset.guild }) });
    let message = `Serveur des commandes : ${serverName}.`;
    let tone = 'info';
    if (bot.hasToken && target?.guildId) {
      try {
        const result = await api(`/api/bots/${bot.id}/commands/sync`, { method: 'POST' });
        message = `${result.count} commande(s) enregistrée(s) sur ${serverName}.`;
        tone = 'success';
      } catch (error) {
        message += ` Synchronisation impossible : ${error.message}`;
      }
    } else if (!bot.hasToken) {
      message += ' Ajoute un token Discord pour les enregistrer.';
    }
    await refresh();
    toast(message, tone);
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('sync-bot-commands', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  try {
    const result = await api(`/api/bots/${bot.id}/commands/sync`, { method: 'POST' });
    const server = (bot.discord?.servers || []).find((entry) => entry.guildId === result.guildId || entry.id === result.guildId);
    await refresh();
    if (result.global) {
      toast('Commandes enregistrées globalement. Discord peut mettre jusqu’à 1 h à les afficher : choisis un serveur pour une synchronisation instantanée.', 'info');
    } else {
      toast(`${result.count} commande(s) enregistrée(s) sur ${server?.guildName || server?.name || 'le serveur actif'}.`, 'success');
    }
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('bot-connect-server', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  try {
    const result = await api(`/api/bots/${bot.id}/discord/sync`, { method: 'POST', body: JSON.stringify({ guildId: el.dataset.guild }) });
    let commandInfo = '';
    let tone = 'success';
    try {
      const sync = await api(`/api/bots/${bot.id}/commands/sync`, { method: 'POST' });
      commandInfo = ` ${sync.count} commande(s) enregistrée(s).`;
    } catch (error) {
      commandInfo = ` Commandes non synchronisées : ${error.message}`;
      tone = 'info';
    }
    toast(`${result.guildName || 'Serveur'} connecté : ${result.channels} salons et ${result.roles} rôles.${commandInfo}`, tone);
    await refresh();
    if (el.dataset.closeModal === '1') closeModal();
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('bot-restart', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  try {
    const result = await api(`/api/bots/${bot.id}/restart`, { method: 'POST' });
    toast(
      result.runtime?.status === 'online' ? 'Bot reconnecté à Discord.' : `Connexion : ${result.runtime?.lastError || 'en cours…'}`,
      result.runtime?.status === 'error' ? 'error' : 'success',
    );
    await refresh();
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('bot-test-message', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  const channels = (bot.discord?.channels || []).filter((channel) => channel.type !== 'voice');
  openModal({
    title: 'Envoyer un message de test réel',
    subtitle: 'Le message sera publié sur ton serveur Discord avec le token du bot.',
    submitLabel: 'Envoyer sur Discord',
    body: `
      <div class="field"><label for="tmChannel">Salon</label>
        <select class="select" id="tmChannel" name="channel">
          <option value="">Premier salon textuel</option>
          ${channels.map((channel) => `<option value="#${esc(channel.name)}">#${esc(channel.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label for="tmCustom">Ou ID / nom exact du salon</label><input class="input" id="tmCustom" name="channelCustom" placeholder="#général ou 123456789012345678"></div>
      <p class="hint">Le bot doit être connecté et avoir la permission « Envoyer des messages » dans ce salon.</p>
    `,
    onSubmit: async (formData) => {
      const channel = String(formData.get('channelCustom') || '').trim() || String(formData.get('channel') || '').trim();
      const result = await api(`/api/bots/${bot.id}/test-message`, {
        method: 'POST',
        body: JSON.stringify({ channel }),
      });
      toast(`Message réel envoyé dans #${result.channel?.name || 'salon'}.`);
    },
  });
});

onAction('bot-token', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  openModal({
    title: bot.hasToken ? 'Remplacer le token Discord' : 'Ajouter le token Discord',
    subtitle: 'Le token est vérifié auprès de Discord puis stocké chiffré (AES-256-GCM).',
    submitLabel: 'Enregistrer le token',
    body: `
      <div class="field">
        <label for="botToken">Token du bot</label>
        <input class="input" id="botToken" name="token" type="password" placeholder="Collez le token Discord" autocomplete="off" required>
        <div class="hint">Portail développeur Discord → votre application → Bot → Reset Token. Ne partagez jamais ce token.</div>
      </div>
      <div class="field"><label class="check-row"><input type="checkbox" checked disabled> <span>Le bot se connecte réellement et synchronise ses commandes après l’enregistrement</span></label></div>
    `,
    onSubmit: async (formData) => {
      const result = await api(`/api/bots/${bot.id}/token`, {
        method: 'POST',
        body: JSON.stringify({ token: String(formData.get('token') || '').trim() }),
      });
      await refresh();
      if (result.runtime?.status === 'online') toast('Token valide. Le bot est connecté à Discord.');
      else toast(`Token enregistré. ${result.runtime?.lastError || 'Connexion à Discord en cours…'}`, result.runtime?.status === 'error' ? 'error' : 'info');
    },
  });
});

onAction('bot-token-clear', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  confirmDialog({
    title: 'Supprimer le token ?',
    message: 'Le bot sera déconnecté de Discord. Vous pourrez ajouter un nouveau token plus tard.',
    confirmLabel: 'Supprimer le token',
    onConfirm: async () => {
      await api(`/api/bots/${bot.id}/token`, { method: 'DELETE' });
      await refresh();
      toast('Token supprimé.', 'info');
    },
  });
});

onAction('bot-tab', (el) => {
  state.botTab = el.dataset.tab;
  render();
});

onAction('go-bots', () => {
  window.location.hash = '#/bots';
});

onAction('new-command', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (bot) commandModal(bot);
});

onAction('edit-command', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const command = bot?.commands.find((entry) => entry.id === el.dataset.cmd);
  if (bot && command) commandModal(bot, command);
});

onAction('delete-command', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const command = bot?.commands.find((entry) => entry.id === el.dataset.cmd);
  if (!bot || !command) return;
  confirmDialog({
    title: `Supprimer /${command.name} ?`,
    message: 'La commande sera définitivement retirée de ce bot.',
    confirmLabel: 'Supprimer',
    onConfirm: async () => {
      await api(`/api/bots/${bot.id}/commands/${command.id}`, { method: 'DELETE' });
      await refresh();
      toast('Commande supprimée.', 'info');
    },
  });
});

onAction('toggle-command', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const command = bot?.commands.find((entry) => entry.id === el.dataset.cmd);
  if (!bot || !command) return;
  await api(`/api/bots/${bot.id}/commands/${command.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled: !command.enabled }),
  });
  await refresh();
});

onAction('new-automation', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  const datalists = `
    <datalist id="channelSuggestions">${(bot.discord?.channels?.length ? bot.discord.channels.filter((channel) => channel.type !== 'voice').map((channel) => `#${channel.name}`) : CHANNEL_SUGGESTIONS).map((item) => `<option value="${esc(item)}"></option>`).join('')}</datalist>
    <datalist id="categorySuggestions">${(bot.discord?.categories?.length ? bot.discord.categories : CATEGORY_SUGGESTIONS).map((item) => `<option value="${esc(item)}"></option>`).join('')}</datalist>
    <datalist id="roleSuggestions">${(bot.discord?.roles || FLOW_ROLES_FALLBACK.map((name) => ({ name }))).map((role) => `<option value="${esc(role.name)}"></option>`).join('')}</datalist>`;
  const form = openModal({
    title: 'Ajouter une automatisation',
    subtitle: 'Choisissez le type, le salon ou la catégorie, puis activez-la.',
    submitLabel: 'Ajouter l’automatisation',
    body: `
      <div class="field"><label for="autoType">Type d’automatisation</label>
        <select class="select" id="autoType" name="type">
          ${AUTOMATION_TYPES.map((entry) => `<option value="${esc(entry.type)}">${esc(entry.label)}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label for="autoLabel">Nom</label>
        <input class="input" id="autoLabel" name="label" value="${esc(AUTOMATION_TYPES[0].label)}" maxlength="80">
      </div>
      <div id="autoFields"></div>
      ${datalists}
      <p class="hint">Le salon et la catégorie sont utilisés dès que le bot est connecté avec son token.</p>
    `,
    onSubmit: async (formData) => {
      const type = String(formData.get('type') || 'welcome');
      const config = {};
      for (const field of automationFields(type)) {
        if (field.type === 'boolean') config[field.key] = formData.get(field.key) === 'on';
        else if (field.type === 'number') config[field.key] = Number(formData.get(field.key)) || 0;
        else config[field.key] = String(formData.get(field.key) || '').trim();
      }
      await api(`/api/bots/${bot.id}/automations`, {
        method: 'POST',
        body: JSON.stringify({ type, label: formData.get('label'), config }),
      });
      await refresh();
      toast('Automatisation ajoutée.');
    },
  });
  const typeSelect = form.querySelector('#autoType');
  const fieldsHost = form.querySelector('#autoFields');
  const labelInput = form.querySelector('#autoLabel');
  const renderFields = () => {
    const type = typeSelect.value;
    const preset = AUTOMATION_TYPES.find((entry) => entry.type === type);
    if (labelInput && preset) labelInput.value = preset.label;
    if (fieldsHost) {
      fieldsHost.innerHTML = automationFields(type).map((field) => automationFieldControl(field, '', bot.discord || {})).join('');
      bindAutomationPickers(fieldsHost);
    }
  };
  typeSelect?.addEventListener('change', renderFields);
  renderFields();
});

onAction('delete-automation', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const automation = bot?.automations.find((entry) => entry.id === el.dataset.auto);
  if (!bot || !automation) return;
  confirmDialog({
    title: `Supprimer « ${automation.label} » ?`,
    message: 'Cette automatisation sera retirée du bot. Vous pourrez en ajouter une autre à tout moment.',
    confirmLabel: 'Supprimer',
    onConfirm: async () => {
      await api(`/api/bots/${bot.id}/automations/${automation.id}`, { method: 'DELETE' });
      await refresh();
      toast('Automatisation supprimée.', 'info');
    },
  });
});

onAction('config-automation', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const automation = bot?.automations.find((entry) => entry.id === el.dataset.auto);
  if (!bot || !automation) return;
  const fields = automationFields(automation.type);
  const config = automation.config || {};
  const form = openModal({
    title: `Configurer ${automation.label}`,
    subtitle: 'Choisissez le salon, la catégorie et les options de cette automatisation.',
    submitLabel: 'Enregistrer la configuration',
    body: `
      <div class="field"><label for="autoLabel">Nom de l’automatisation</label>
        <input class="input" id="autoLabel" name="label" value="${esc(automation.label)}" maxlength="80">
      </div>
      ${fields.map((field) => automationFieldControl(field, config[field.key], bot.discord || {})).join('')}
      <datalist id="channelSuggestions">${(bot.discord?.channels?.length ? bot.discord.channels.filter((channel) => channel.type !== 'voice').map((channel) => `#${channel.name}`) : CHANNEL_SUGGESTIONS).map((item) => `<option value="${esc(item)}"></option>`).join('')}</datalist>
      <datalist id="categorySuggestions">${(bot.discord?.categories?.length ? bot.discord.categories : CATEGORY_SUGGESTIONS).map((item) => `<option value="${esc(item)}"></option>`).join('')}</datalist>
      <datalist id="roleSuggestions">${(bot.discord?.roles || FLOW_ROLES_FALLBACK.map((name) => ({ name }))).map((role) => `<option value="${esc(role.name)}"></option>`).join('')}</datalist>
      <p class="hint">Le salon et la catégorie sont utilisés dès que le bot est connecté avec son token.</p>
    `,
    onSubmit: async (formData) => {
      const nextConfig = {};
      for (const field of fields) {
        if (field.type === 'boolean') nextConfig[field.key] = formData.get(field.key) === 'on';
        else if (field.type === 'number') nextConfig[field.key] = Number(formData.get(field.key)) || 0;
        else nextConfig[field.key] = String(formData.get(field.key) || '').trim();
      }
      await api(`/api/bots/${bot.id}/automations/${automation.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ label: formData.get('label'), config: nextConfig }),
      });
      await refresh();
      toast('Automatisation configurée.');
    },
  });
  bindAutomationPickers(form);
});

onAction('run-automation', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const automation = bot?.automations.find((entry) => entry.id === el.dataset.auto);
  if (!bot || !automation) return;
  try {
    const result = await api(`/api/bots/${bot.id}/automations/${automation.id}/run`, { method: 'POST' });
    toast(
      result.count
        ? `${result.count} flux déclenché(s) par « ${automation.label} ».`
        : `Aucun flux n’est configuré sur le déclencheur « Automatisation » pour ${automation.label}.`,
      result.count ? 'success' : 'info',
    );
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('toggle-automation', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const automation = bot?.automations.find((entry) => entry.id === el.dataset.auto);
  if (!bot || !automation) return;
  await api(`/api/bots/${bot.id}/automations/${automation.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled: !automation.enabled }),
  });
  await refresh();
  toast(automation.enabled ? `${automation.label} désactivée.` : `${automation.label} activée.`, 'info');
});

onAction('new-saved-message', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (bot) savedMessageModal(bot);
});

onAction('edit-saved-message', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const message = bot?.savedMessages?.find((entry) => entry.id === el.dataset.message);
  if (bot && message) savedMessageModal(bot, message);
});

onAction('duplicate-saved-message', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const message = bot?.savedMessages?.find((entry) => entry.id === el.dataset.message);
  if (!bot || !message) return;
  await api(`/api/bots/${bot.id}/messages/${message.id}/duplicate`, { method: 'POST' });
  await refresh();
  toast('Message dupliqué.', 'info');
});

onAction('delete-saved-message', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const message = bot?.savedMessages?.find((entry) => entry.id === el.dataset.message);
  if (!bot || !message) return;
  confirmDialog({
    title: `Supprimer « ${message.label || message.name} » ?`,
    message: 'Ce message sauvegardé sera définitivement supprimé. Les messages déjà envoyés sur Discord ne sont pas touchés.',
    confirmLabel: 'Supprimer',
    onConfirm: async () => {
      await api(`/api/bots/${bot.id}/messages/${message.id}`, { method: 'DELETE' });
      await refresh();
      toast('Message supprimé.', 'info');
    },
  });
});

onAction('run-saved-message', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const message = bot?.savedMessages?.find((entry) => entry.id === el.dataset.message);
  if (!bot || !message) return;
  const result = await api(`/api/bots/${bot.id}/messages/${message.id}/run`, { method: 'POST' });
  toast(`Message envoyé dans #${result.channel?.name || message.channelName || 'le salon'}.`);
  await refresh();
});

onAction('new-scheduled-message', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (bot) scheduledMessageModal(bot);
});

onAction('edit-scheduled-message', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const message = bot?.scheduledMessages?.find((entry) => entry.id === el.dataset.message);
  if (bot && message) scheduledMessageModal(bot, message);
});

onAction('toggle-scheduled-message', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const message = bot?.scheduledMessages?.find((entry) => entry.id === el.dataset.message);
  if (!bot || !message) return;
  await api(`/api/bots/${bot.id}/scheduled-messages/${message.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled: !message.enabled }),
  });
  await refresh();
  toast(message.enabled ? 'Message programmé désactivé.' : 'Message programmé activé.', 'info');
});

onAction('delete-scheduled-message', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const message = bot?.scheduledMessages?.find((entry) => entry.id === el.dataset.message);
  if (!bot || !message) return;
  confirmDialog({
    title: `Supprimer « ${message.label} » ?`,
    message: 'Ce message programmé sera définitivement supprimé. Le bot ne l’enverra plus.',
    confirmLabel: 'Supprimer',
    onConfirm: async () => {
      await api(`/api/bots/${bot.id}/scheduled-messages/${message.id}`, { method: 'DELETE' });
      await refresh();
      toast('Message programmé supprimé.', 'info');
    },
  });
});

onAction('run-scheduled-message', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const message = bot?.scheduledMessages?.find((entry) => entry.id === el.dataset.message);
  if (!bot || !message) return;
  const result = await api(`/api/bots/${bot.id}/scheduled-messages/${message.id}/run`, { method: 'POST' });
  toast(`Message envoyé dans #${result.channel?.name || message.channelName || 'le salon'}.`);
  await refresh();
});

onAction('test-bot', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  const options = bot.commands.map((command) => `<option value="${esc(command.id)}">/${esc(command.name)}</option>`).join('');
  const form = openModal({
    title: `Tester ${bot.name}`,
    subtitle: 'Simulation locale : aucune action réelle n’est envoyée sur Discord. Pour la connexion réelle, ouvre Paramètres → Connexion Discord.',
    submitLabel: 'Fermer',
    body: `
      ${
        bot.commands.length
          ? `<div class="field"><label for="testCmd">Commande</label><select class="select" id="testCmd" name="command">${options}</select></div>
             <div class="field"><label>Réponse simulée</label><div id="testOut"></div></div>
             <div class="field" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
               <button type="button" class="btn btn-primary btn-sm" id="testRun">${icon('play')} Exécuter la commande</button>
               <span style="font-size:11px;color:var(--muted-2)">Chaque exécution alimente les statistiques réelles.</span>
             </div>`
          : '<p style="font-size:13px;color:var(--muted)">Ce bot n’a encore aucune commande à tester.</p>'
      }
    `,
    onSubmit: () => {},
  });
  const select = form.querySelector('#testCmd');
  const out = form.querySelector('#testOut');
  const update = () => {
    const command = bot.commands.find((entry) => entry.id === select?.value);
    if (!command || !out) return;
    const response = (commandPreviewText(command) || '').replace(/\{user\}/g, '@Alex').replace(/\{server\}/g, 'Kyll Community');
    out.innerHTML =
      embedPreview({ ...command.embed, response }) +
      `<p style="font-size:11.5px;color:var(--muted-2);margin-top:9px">Cooldown : ${command.cooldown}s · ${fmt(command.uses)} usages cumulés</p>`;
  };
  select?.addEventListener('change', update);
  form.querySelector('#testRun')?.addEventListener('click', async () => {
    const command = bot.commands.find((entry) => entry.id === select?.value);
    if (!command) return;
    try {
      const result = await api(`/api/bots/${bot.id}/commands/${command.id}/run`, { method: 'POST' });
      command.uses = result.uses;
      update();
      toast('Commande exécutée : statistiques mises à jour.');
    } catch (error) {
      toast(error.message, 'error');
    }
  });
  update();
});
