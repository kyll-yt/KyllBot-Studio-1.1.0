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
        <h1>${greeting}, ${esc(user.name.split(' ')[0])}</h1>
        <p class="sub">Voici l'activité de votre studio — ${ws.bots.length} bot(s), ${ws.courses.length} formation(s) et ${ws.learners.length} apprenant(s).</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost" data-action="new-course">${icon('plus')} Nouvelle formation</button>
        <button class="btn btn-primary" data-action="new-bot">${icon('plus')} Nouveau bot</button>
      </div>
    </div>

    <div class="grid-stats">
      ${statCard('Bots actifs', `${stats.botsOnline}/${stats.bots}`, `${stats.commands} commandes configurées`, 'bot')}
      ${statCard('Commandes exécutées', fmt(stats.executions), '<span class="up">+12 %</span> vs semaine dernière', 'zap')}
      ${statCard('Formations publiées', `${stats.published}/${stats.courses}`, `${stats.lessons} leçons au total`, 'book')}
      ${statCard('Apprenants', fmt(stats.learners), `${stats.avgProgress} % de progression moyenne`, 'users')}
    </div>

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
      const statusClass = bot.status === 'online' ? 'online' : bot.status === 'draft' ? 'draft' : 'offline';
      const statusLabel = bot.status === 'online' ? 'En ligne' : bot.status === 'draft' ? 'Brouillon' : 'Hors ligne';
      return `<article class="bot-card">
        <div class="bot-top">
          <span class="bot-avatar" style="background:linear-gradient(140deg,${esc(bot.color)},${esc(bot.color)}99)">${esc(initials(bot.name))}</span>
          <div class="bot-title">
            <h3>${esc(bot.name)}</h3>
            <span class="status"><i class="status-dot ${statusClass}"></i>${statusLabel}</span>
          </div>
          <button class="mini-btn" data-action="toggle-bot-status" data-id="${esc(bot.id)}" title="Changer le statut">
            ${icon(bot.status === 'online' ? 'clock' : 'play')}
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
};

function automationIcon(type) {
  if (/anti|mod|logs/.test(type)) return 'shield';
  if (/ticket/.test(type)) return 'ticket';
  if (/level/.test(type)) return 'spark';
  if (/remind/.test(type)) return 'clock';
  return 'zap';
}

function viewBotDetail(id) {
  const bot = state.ws.bots.find((entry) => entry.id === id);
  if (!bot) return emptyState('Bot introuvable', 'Ce bot a peut-être été supprimé.', 'Retour aux bots', 'go-bots');

  const tabs = [
    ['commands', `Commandes (${bot.commands.length})`],
    ['flows', `Flux (${(bot.flows || []).length})`],
    ['automations', `Automatisations (${bot.automations.length})`],
    ['settings', 'Paramètres'],
  ];

  let body = '';

  if (state.botTab === 'commands') {
    body = `<div class="panel">
      <div class="panel-head">
        <h3>Commandes</h3>
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
                    <div class="cmd-main"><p>${esc(command.description || command.response || 'Aucune description')}</p></div>
                    <span class="cmd-uses">${fmt(command.uses)} usages</span>
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
  } else if (state.botTab === 'flows') {
    body = viewBotFlows(bot);
  } else if (state.botTab === 'automations') {
    body = `<div class="panel">
      <div class="panel-head"><h3>Automatisations</h3><div class="ph-actions"><span class="pill violet">${bot.automations.filter((a) => a.enabled).length} active(s)</span></div></div>
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
                      ${
                        Object.keys(automation.config || {}).length
                          ? `<p style="margin-top:5px;font-family:var(--mono);font-size:10.5px">${Object.entries(automation.config)
                              .map(([key, value]) => `${esc(key)}: ${esc(typeof value === 'object' ? JSON.stringify(value) : value)}`)
                              .join(' · ')}</p>`
                          : ''
                      }
                    </div>
                    <button class="switch ${automation.enabled ? 'on' : ''}" data-action="toggle-automation" data-id="${esc(bot.id)}" data-auto="${esc(automation.id)}" aria-label="Activer ${esc(automation.label)}"></button>
                  </div>`,
                )
                .join('')
            : '<p style="font-size:12.5px;color:var(--muted-2)">Aucune automatisation disponible.</p>'
        }
      </div>
    </div>`;
  } else {
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
        <h1 style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${esc(bot.name)} ${statusPill(bot.status)}</h1>
        <p class="sub">${esc(bot.description || 'Aucune description.')} · préfixe <b>${esc(bot.prefix)}</b> · créé ${esc(timeAgo(bot.createdAt))}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost" data-action="test-bot" data-id="${esc(bot.id)}">${icon('play')} Tester</button>
        <button class="btn btn-primary" data-action="toggle-bot-status" data-id="${esc(bot.id)}">${icon('zap')} ${bot.status === 'online' ? 'Mettre hors ligne' : 'Connecter'}</button>
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
      <p class="hint">Astuce : ne saisissez jamais votre token Discord ici. La connexion se fait depuis l’onglet Paramètres.</p>
    `,
    onSubmit: async (formData) => {
      await api('/api/bots', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          prefix: formData.get('prefix'),
          color: formData.get('color'),
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

function commandModal(bot, command) {
  const value = command || {
    name: '',
    description: '',
    response: '',
    cooldown: 3,
    embed: { title: '', description: '', color: bot.color || '#7c5cff', footer: 'KyllBot Studio' },
  };

  const form = openModal({
    title: command ? 'Modifier la commande' : 'Nouvelle commande',
    subtitle: 'Prévisualisez le rendu Discord en direct.',
    wide: true,
    submitLabel: command ? 'Enregistrer' : 'Créer la commande',
    body: `
      <div class="form-row">
        <div class="field"><label for="cName">Nom</label><input class="input" id="cName" name="name" placeholder="bienvenue" value="${esc(value.name)}" required></div>
        <div class="field"><label for="cCooldown">Cooldown (secondes)</label><input class="input" id="cCooldown" name="cooldown" type="number" min="0" max="600" value="${esc(value.cooldown)}"></div>
      </div>
      <div class="field"><label for="cDesc">Description</label><input class="input" id="cDesc" name="description" placeholder="Affiche le message d'accueil" value="${esc(value.description)}"></div>
      <div class="field"><label for="cResp">Réponse texte</label><textarea class="textarea" id="cResp" name="response" placeholder="Bienvenue {user} sur {server} !">${esc(value.response)}</textarea><div class="hint">Variables disponibles : {user}, {server}, {level}, {xp}</div></div>
      <div class="form-row">
        <div class="field"><label for="eTitle">Titre de l'embed</label><input class="input" id="eTitle" name="embedTitle" value="${esc(value.embed.title)}"></div>
        <div class="field"><label for="eColor">Couleur de l'embed</label><input class="input" id="eColor" name="embedColor" type="color" value="${esc(value.embed.color)}"></div>
      </div>
      <div class="field"><label for="eDesc">Description de l'embed</label><textarea class="textarea" id="eDesc" name="embedDescription">${esc(value.embed.description)}</textarea></div>
      <div class="field"><label for="eFooter">Pied de page</label><input class="input" id="eFooter" name="embedFooter" value="${esc(value.embed.footer)}"></div>
      <div class="field"><label>Aperçu Discord</label><div class="modal-preview" id="cmdPreview"></div></div>
    `,
    onSubmit: async (formData) => {
      const payload = {
        name: formData.get('name'),
        description: formData.get('description'),
        response: formData.get('response'),
        cooldown: Number(formData.get('cooldown')),
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

  const update = () => {
    const data = new FormData(form);
    const preview = document.getElementById('cmdPreview');
    if (!preview) return;
    preview.innerHTML = embedPreview({
      title: data.get('embedTitle'),
      description: data.get('embedDescription'),
      color: data.get('embedColor'),
      footer: data.get('embedFooter'),
      response: data.get('response'),
    });
  };
  form.addEventListener('input', update);
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
  const next = bot.status === 'online' ? 'offline' : 'online';
  await api(`/api/bots/${bot.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
  await refresh();
  toast(next === 'online' ? `${bot.name} est en ligne.` : `${bot.name} est hors ligne.`, 'info');
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

onAction('test-bot', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  if (!bot) return;
  const options = bot.commands.map((command) => `<option value="${esc(command.id)}">/${esc(command.name)}</option>`).join('');
  const form = openModal({
    title: `Tester ${bot.name}`,
    subtitle: 'Simulation locale : aucune action réelle n’est envoyée sur Discord.',
    submitLabel: 'Fermer',
    body: `
      ${
        bot.commands.length
          ? `<div class="field"><label for="testCmd">Commande</label><select class="select" id="testCmd" name="command">${options}</select></div>
             <div class="field"><label>Réponse simulée</label><div id="testOut"></div></div>`
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
    const response = (command.response || '').replace(/\{user\}/g, '@Alex').replace(/\{server\}/g, 'Kyll Community');
    out.innerHTML =
      embedPreview({ ...command.embed, response }) +
      `<p style="font-size:11.5px;color:var(--muted-2);margin-top:9px">Cooldown : ${command.cooldown}s · ${fmt(command.uses)} usages cumulés</p>`;
  };
  select?.addEventListener('change', update);
  update();
});
