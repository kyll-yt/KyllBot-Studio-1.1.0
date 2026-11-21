'use strict';

/* ------------------------------------------------------------------ */
/* vue : statistiques                                                  */
/* ------------------------------------------------------------------ */

function viewStats() {
  const { stats, ws } = state;
  const commands = ws.bots
    .flatMap((bot) => bot.commands.map((command) => ({ ...command, botName: bot.name, color: bot.color })))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 8);

  const buckets = [
    { label: '0 – 25 %', count: 0 },
    { label: '26 – 50 %', count: 0 },
    { label: '51 – 75 %', count: 0 },
    { label: '76 – 99 %', count: 0 },
    { label: '100 % (certifiés)', count: 0 },
  ];
  ws.learners.forEach((learner) => {
    if (learner.progress <= 25) buckets[0].count += 1;
    else if (learner.progress <= 50) buckets[1].count += 1;
    else if (learner.progress <= 75) buckets[2].count += 1;
    else if (learner.progress < 100) buckets[3].count += 1;
    else buckets[4].count += 1;
  });
  const maxBucket = Math.max(...buckets.map((bucket) => bucket.count), 1);

  const activeAutomations = ws.bots.reduce((sum, bot) => sum + bot.automations.filter((a) => a.enabled).length, 0);

  return `<div class="page-head">
      <div>
        <h1>Statistiques</h1>
        <p class="sub">Vue consolidée de l'activité de vos bots et de vos formations.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost" data-action="export-stats">${icon('download')} Exporter le rapport</button>
      </div>
    </div>

    <div class="grid-stats">
      ${statCard('Commandes exécutées', fmt(stats.executions), 'cumul sur tous les bots', 'zap')}
      ${statCard('Automatisations actives', String(activeAutomations), `sur ${ws.bots.reduce((s, b) => s + b.automations.length, 0)} configurées`, 'shield')}
      ${statCard('Progression moyenne', `${stats.avgProgress} %`, `${stats.learners} apprenants suivis`, 'chart')}
      ${statCard('Certificats délivrés', String(stats.certificates), `${stats.lessons} leçons publiées`, 'award')}
    </div>

    <div class="panel" style="margin-top:16px">
      <div class="panel-head">
        <h3>Activité sur 14 jours</h3>
        <div class="ph-actions"><div class="legend"><span><i></i>Commandes</span><span><i class="alt"></i>Apprenants actifs</span></div></div>
      </div>
      <div class="panel-body">${areaChart(stats.series)}</div>
    </div>

    <div class="dash-grid">
      <div class="panel">
        <div class="panel-head"><h3>Commandes les plus utilisées</h3></div>
        <div class="panel-body tight">
          ${
            commands.length
              ? `<div class="table-wrap"><table class="table">
                  <thead><tr><th>Commande</th><th>Bot</th><th style="text-align:right">Exécutions</th></tr></thead>
                  <tbody>${commands
                    .map(
                      (command) => `<tr>
                        <td><span class="cmd-name">/${esc(command.name)}</span></td>
                        <td style="color:var(--muted)">${esc(command.botName)}</td>
                        <td style="text-align:right;font-weight:600">${fmt(command.uses)}</td>
                      </tr>`,
                    )
                    .join('')}</tbody>
                </table></div>`
              : '<div class="empty" style="padding:36px 20px"><p>Aucune commande exécutée pour le moment.</p></div>'
          }
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Complétion des formations</h3></div>
        <div class="panel-body">
          ${buckets
            .map(
              (bucket) => `<div style="margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:6px">
                  <span style="color:var(--muted)">${esc(bucket.label)}</span>
                  <b>${bucket.count}</b>
                </div>
                <div class="progress"><i style="width:${(bucket.count / maxBucket) * 100}%"></i></div>
              </div>`,
            )
            .join('')}
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Activité par bot</h3></div>
      <div class="panel-body">${perBotBars(stats.perBot)}</div>
    </div>`;
}

onAction('export-stats', () => {
  const report = {
    exportedAt: new Date().toISOString(),
    studio: state.ws.studioName,
    stats: state.stats,
    bots: state.ws.bots.map((bot) => ({ name: bot.name, status: bot.status, commands: bot.commands.length })),
    learners: state.ws.learners.map((learner) => ({ name: learner.name, progress: learner.progress, score: learner.score })),
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'kyllbot-rapport.json';
  link.click();
  URL.revokeObjectURL(link.href);
  toast('Rapport exporté.');
});

/* ------------------------------------------------------------------ */
/* vue : modèles                                                       */
/* ------------------------------------------------------------------ */

const TEMPLATES = [
  {
    key: 'community',
    kind: 'bot',
    name: 'Communauté & accueil',
    cover: 0,
    glyph: 'users',
    description: 'Accueil personnalisé, autorôle, niveaux et panneau de tickets.',
    meta: '3 commandes · 2 automatisations',
    color: '#7c5cff',
    prefix: '!',
    commands: [
      { name: 'bienvenue', description: 'Message d’accueil', response: 'Bienvenue {user} sur **{server}** !' },
      { name: 'rank', description: 'Niveau et XP', response: '{user} est niveau **{level}** avec **{xp} XP**.' },
      { name: 'ticket', description: 'Ouvre un ticket support', response: 'Un membre du staff arrive.' },
    ],
  },
  {
    key: 'moderation',
    kind: 'bot',
    name: 'Modération avancée',
    cover: 2,
    glyph: 'shield',
    description: 'Sanctions graduées, anti-spam et journal des actions.',
    meta: '3 commandes · 2 automatisations',
    color: '#f472b6',
    prefix: '?',
    commands: [
      { name: 'ban', description: 'Bannit un membre', response: '**{user}** a été banni.' },
      { name: 'warn', description: 'Avertit un membre', response: 'Avertissement pour **{user}**.' },
      { name: 'clear', description: 'Supprime des messages', response: 'Messages supprimés.' },
    ],
  },
  {
    key: 'minigames',
    kind: 'bot',
    name: 'Mini-jeux & animations',
    cover: 3,
    glyph: 'spark',
    description: 'Jeux rapides pour animer votre serveur au quotidien.',
    meta: '2 commandes · 1 automatisation',
    color: '#a3e635',
    prefix: '!',
    commands: [
      { name: 'pendu', description: 'Lance une partie de pendu', response: 'Partie de pendu lancée !' },
      { name: 'devine', description: 'Devine le nombre', response: 'Devine un nombre entre 1 et 100.' },
    ],
  },
  {
    key: 'onboarding',
    kind: 'course',
    name: 'Onboarding produit',
    cover: 1,
    glyph: 'book',
    description: 'Trois modules, quiz final et certificat automatique.',
    meta: '2 modules · 4 leçons · quiz',
    category: 'Pédagogie',
    level: 'Débutant',
    modules: [
      {
        title: 'Module 1 — Découverte',
        lessons: [
          { title: 'Bienvenue dans le produit', type: 'video', duration: 8, content: 'Tour d’horizon des fonctionnalités clés.' },
          { title: 'Premiers pas', type: 'text', duration: 10, content: 'Créez votre espace et invitez votre équipe.' },
        ],
      },
      {
        title: 'Module 2 — Pratique',
        lessons: [
          { title: 'Cas d’usage concrets', type: 'video', duration: 14, content: 'Trois scénarios pas à pas.' },
          { title: 'Évaluation', type: 'quiz', duration: 5 },
        ],
      },
    ],
    quiz: [
      { question: 'Que fait-on en premier ?', options: ['Inviter l’équipe', 'Supprimer son compte', 'Rien'], answer: 0 },
    ],
  },
  {
    key: 'security',
    kind: 'course',
    name: 'Sécurité Discord',
    cover: 2,
    glyph: 'shield',
    description: 'Protéger une communauté : permissions, anti-raid, réaction.',
    meta: '2 modules · 4 leçons · quiz',
    category: 'Modération',
    level: 'Avancé',
    modules: [
      {
        title: 'Prévenir',
        lessons: [
          { title: 'Le moindre privilège', type: 'text', duration: 12, content: 'Limitez les droits au strict nécessaire.' },
          { title: 'Anti-raid', type: 'video', duration: 18, content: 'Détecter et bloquer une attaque.' },
        ],
      },
      {
        title: 'Réagir',
        lessons: [
          { title: 'Sanctions graduées', type: 'video', duration: 15, content: 'Une échelle cohérente et documentée.' },
          { title: 'Journalisation', type: 'text', duration: 9, content: 'Ce qu’il faut tracer et conserver.' },
        ],
      },
    ],
    quiz: [
      { question: 'Le moindre privilège consiste à…', options: ['Tout autoriser', 'Limiter les droits', 'Désactiver les logs'], answer: 1 },
    ],
  },
  {
    key: 'creator',
    kind: 'course',
    name: 'Créer une formation',
    cover: 0,
    glyph: 'book',
    description: 'La méthode pour scénariser un parcours engageant.',
    meta: '2 modules · 4 leçons · quiz',
    category: 'Pédagogie',
    level: 'Intermédiaire',
    modules: [
      {
        title: 'Concevoir',
        lessons: [
          { title: 'Objectifs pédagogiques', type: 'text', duration: 10, content: 'Formulez des objectifs mesurables.' },
          { title: 'Micro-learning', type: 'video', duration: 12, content: 'Découpez en séquences de 5 à 10 minutes.' },
        ],
      },
      {
        title: 'Engager',
        lessons: [
          { title: 'Mises en situation', type: 'video', duration: 16, content: 'Ancrez avec des cas concrets.' },
          { title: 'Quiz interactif', type: 'quiz', duration: 6 },
        ],
      },
    ],
    quiz: [
      { question: 'Durée idéale d’une séquence ?', options: ['45 min', '5 à 10 min', '2 h'], answer: 1 },
    ],
  },
];

function viewTemplates() {
  return `<div class="page-head">
      <div>
        <h1>Modèles</h1>
        <p class="sub">Démarrez avec une base solide : dupliquez, adaptez, publiez.</p>
      </div>
    </div>
    <div class="tpl-grid">
      ${TEMPLATES.map(
        (template) => `<article class="tpl-card">
          <div class="tpl-cover c${template.cover}">${icon(template.glyph)}</div>
          <div class="tpl-body">
            <div class="tk">${template.kind === 'bot' ? 'Bot Discord' : 'Formation'}</div>
            <h3>${esc(template.name)}</h3>
            <p>${esc(template.description)}</p>
            <div style="font-size:10.5px;color:var(--muted-2);margin-top:9px">${esc(template.meta)}</div>
            <button class="btn btn-ghost btn-sm" data-action="use-template" data-key="${esc(template.key)}">Utiliser ce modèle</button>
          </div>
        </article>`,
      ).join('')}
    </div>`;
}

onAction('use-template', async (el) => {
  const template = TEMPLATES.find((entry) => entry.key === el.dataset.key);
  if (!template) return;
  el.disabled = true;
  el.textContent = 'Installation…';
  try {
    if (template.kind === 'bot') {
      const { bot } = await api('/api/bots', {
        method: 'POST',
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          prefix: template.prefix,
          color: template.color,
          tags: [template.name.split(' ')[0]],
        }),
      });
      for (const command of template.commands) {
        await api(`/api/bots/${bot.id}/commands`, { method: 'POST', body: JSON.stringify(command) });
      }
      await refresh();
      toast(`Modèle « ${template.name} » installé.`);
      window.location.hash = `#/bots/${bot.id}`;
    } else {
      const { course } = await api('/api/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: template.name,
          description: template.description,
          category: template.category,
          level: template.level,
        }),
      });
      for (const module of template.modules) {
        const created = await api(`/api/courses/${course.id}/modules`, { method: 'POST', body: JSON.stringify({ title: module.title }) });
        for (const lesson of module.lessons) {
          await api(`/api/courses/${course.id}/modules/${created.module.id}/lessons`, { method: 'POST', body: JSON.stringify(lesson) });
        }
      }
      for (const question of template.quiz) {
        await api(`/api/courses/${course.id}/quiz`, { method: 'POST', body: JSON.stringify(question) });
      }
      await refresh();
      toast(`Modèle « ${template.name} » installé.`);
      window.location.hash = `#/courses/${course.id}`;
    }
  } finally {
    el.disabled = false;
    el.textContent = 'Utiliser ce modèle';
  }
});

/* ------------------------------------------------------------------ */
/* vue : équipe                                                        */
/* ------------------------------------------------------------------ */

function viewTeam() {
  const owner = state.user;
  const members = state.ws.team;
  return `<div class="page-head">
      <div>
        <h1>Équipe</h1>
        <p class="sub">Invitez vos collaborateurs et définissez leurs permissions.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="invite-member">${icon('plus')} Inviter un membre</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>${members.length + 1} membre(s)</h3><div class="ph-actions"><span class="pill violet">Plan ${esc(state.ws.plan)}</span></div></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Membre</th><th>Rôle</th><th>Statut</th><th>Depuis</th><th></th></tr></thead>
        <tbody>
          <tr>
            <td><div class="cell-user">
              ${avatarHtml(owner, 30, 9)}
              <div><b>${esc(owner.name)}</b><span>${esc(owner.email)}</span></div>
            </div></td>
            <td><span class="pill violet">Propriétaire</span></td>
            <td><span class="pill green">Actif</span></td>
            <td style="color:var(--muted-2);font-size:11.5px">${esc(timeAgo(owner.createdAt))}</td>
            <td></td>
          </tr>
          ${members
            .map(
              (member) => `<tr>
                <td><div class="cell-user">
                  <span class="avatar" style="width:30px;height:30px;border-radius:9px;font-size:10.5px">${esc(initials(member.name))}</span>
                  <div><b>${esc(member.name)}</b><span>${esc(member.email)}</span></div>
                </div></td>
                <td>
                  <select class="select" style="width:130px;padding:6px 28px 6px 10px;font-size:12px" data-change="member-role" data-id="${esc(member.id)}">
                    ${['Éditeur', 'Analyste', 'Lecteur']
                      .map((role) => `<option ${member.role === role ? 'selected' : ''}>${role}</option>`)
                      .join('')}
                  </select>
                </td>
                <td><span class="pill ${member.status === 'active' ? 'green' : 'amber'}">${member.status === 'active' ? 'Actif' : 'Invité'}</span></td>
                <td style="color:var(--muted-2);font-size:11.5px">${esc(timeAgo(member.joinedAt))}</td>
                <td><div style="display:flex;justify-content:flex-end">
                  <button class="mini-btn danger" data-action="remove-member" data-id="${esc(member.id)}" title="Retirer">${icon('trash')}</button>
                </div></td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table></div>
    </div>

    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Rôles &amp; permissions</h3></div>
      <div class="panel-body">
        <div class="setting-row"><div class="sr-main"><h4>Éditeur</h4><p>Peut créer et modifier les bots, formations et quiz.</p></div><span class="pill violet">Écriture</span></div>
        <div class="setting-row"><div class="sr-main"><h4>Analyste</h4><p>Accès aux statistiques et aux exports, sans modification.</p></div><span class="pill cyan">Lecture+</span></div>
        <div class="setting-row" style="border-bottom:0"><div class="sr-main"><h4>Lecteur</h4><p>Consultation uniquement.</p></div><span class="pill gray">Lecture</span></div>
      </div>
    </div>`;
}

onAction('invite-member', () => {
  openModal({
    title: 'Inviter un membre',
    subtitle: 'Un email d’invitation sera envoyé (simulé en mode démo).',
    submitLabel: 'Envoyer l’invitation',
    body: `
      <div class="form-row">
        <div class="field"><label for="imName">Nom</label><input class="input" id="imName" name="name" placeholder="Léa Martin"></div>
        <div class="field"><label for="imEmail">Email</label><input class="input" id="imEmail" name="email" type="email" placeholder="lea@exemple.com" required></div>
      </div>
      <div class="field"><label for="imRole">Rôle</label>
        <select class="select" id="imRole" name="role"><option>Éditeur</option><option>Analyste</option><option>Lecteur</option></select>
      </div>
    `,
    onSubmit: async (formData) => {
      await api('/api/team', {
        method: 'POST',
        body: JSON.stringify({ name: formData.get('name'), email: formData.get('email'), role: formData.get('role') }),
      });
      await refresh();
      toast('Invitation envoyée.');
    },
  });
});

document.addEventListener('change', async (event) => {
  const el = event.target.closest('[data-change]');
  if (!el) return;
  try {
    if (el.dataset.change === 'member-role') {
      await api(`/api/team/${el.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ role: el.value }) });
      toast('Rôle mis à jour.');
      await refresh();
    }
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('remove-member', (el) => {
  const member = state.ws.team.find((entry) => entry.id === el.dataset.id);
  if (!member) return;
  confirmDialog({
    title: `Retirer ${member.name} ?`,
    message: 'Ce membre perdra immédiatement l’accès au studio.',
    confirmLabel: 'Retirer',
    onConfirm: async () => {
      await api(`/api/team/${member.id}`, { method: 'DELETE' });
      await refresh();
      toast('Membre retiré.', 'info');
    },
  });
});

/* ------------------------------------------------------------------ */
/* vue : API & webhooks                                                */
/* ------------------------------------------------------------------ */

function viewApi() {
  const keys = state.ws.apiKeys;
  const origin = window.location.origin;
  return `<div class="page-head">
      <div>
        <h1>API &amp; webhooks</h1>
        <p class="sub">Branchez KyllBot Studio à vos propres outils.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-key">${icon('plus')} Nouvelle clé</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Clés API</h3><div class="ph-actions"><span class="pill gray">${keys.length} / 10</span></div></div>
      ${
        keys.length
          ? keys
              .map(
                (key) => `<div class="key-row">
                  <span class="a-ic" style="width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:rgba(124,92,255,.13);color:#c2b4ff">${icon('key')}</span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:12.5px;font-weight:600">${esc(key.label)}</div>
                    <div style="font-size:10.5px;color:var(--muted-2);margin-top:2px">Créée ${esc(timeAgo(key.createdAt))}${key.lastUsed ? ` · utilisée ${esc(timeAgo(key.lastUsed))}` : ' · jamais utilisée'}</div>
                  </div>
                  <span class="key-code">${esc(key.prefix)}••••${esc(key.hint)}</span>
                  <button class="mini-btn danger" data-action="delete-key" data-id="${esc(key.id)}" title="Révoquer">${icon('trash')}</button>
                </div>`,
              )
              .join('')
          : '<div class="empty" style="padding:36px 20px"><p>Aucune clé API. Créez-en une pour commencer.</p></div>'
      }
    </div>

    <div class="dash-grid">
      <div class="panel">
        <div class="panel-head"><h3>Exemple d'appel</h3></div>
        <div class="panel-body">
          <div class="code-block"><span class="c"># Lister vos bots</span>
<span class="k">curl</span> ${esc(origin)}/api/workspace \\
  -H <span class="s">"Authorization: Bearer kyll_live_…"</span></div>
          <p style="font-size:11.5px;color:var(--muted-2);margin-top:11px">Les clés se gèrent ici. En mode démo, l’API est locale à ce studio.</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Webhook entrant</h3></div>
        <div class="panel-body">
          <div class="field" style="margin-bottom:0">
            <label for="webhookUrl">URL à appeler depuis vos outils</label>
            <div style="display:flex;gap:8px">
              <input class="input" id="webhookUrl" value="${esc(origin)}/api/workspace" readonly>
              <button class="btn btn-ghost btn-sm" data-action="copy-text" data-text="${esc(origin)}/api/workspace">${icon('copy')}</button>
            </div>
            <div class="hint">Authentification par clé API. Les événements disponibles : bot.command.executed, learner.completed, certificate.issued.</div>
          </div>
        </div>
      </div>
    </div>`;
}

onAction('create-key', () => {
  openModal({
    title: 'Nouvelle clé API',
    submitLabel: 'Générer la clé',
    body: `<div class="field"><label for="kLabel">Nom de la clé</label><input class="input" id="kLabel" name="label" placeholder="Intégration site vitrine" required></div>
      <p class="hint">La clé complète ne sera affichée qu’une seule fois.</p>`,
    onSubmit: async (formData) => {
      const data = await api('/api/keys', { method: 'POST', body: JSON.stringify({ label: formData.get('label') }) });
      await refresh();
      toast('Clé API générée.');
      openModal({
        title: 'Votre nouvelle clé API',
        subtitle: 'Copiez-la maintenant : elle ne sera plus affichée.',
        submitLabel: 'J’ai copié',
        body: `<div class="field"><label>Clé secrète</label>
            <div style="display:flex;gap:8px">
              <input class="input" id="secretValue" value="${esc(data.secret)}" readonly>
              <button class="btn btn-ghost btn-sm" data-action="copy-text" data-text="${esc(data.secret)}">${icon('copy')}</button>
            </div>
            <div class="hint">Conservez-la dans un gestionnaire de secrets.</div>
          </div>`,
        onSubmit: () => {},
      });
    },
  });
});

onAction('delete-key', (el) => {
  const key = state.ws.apiKeys.find((entry) => entry.id === el.dataset.id);
  if (!key) return;
  confirmDialog({
    title: 'Révoquer cette clé ?',
    message: 'Toute intégration utilisant cette clé cessera de fonctionner immédiatement.',
    confirmLabel: 'Révoquer',
    onConfirm: async () => {
      await api(`/api/keys/${key.id}`, { method: 'DELETE' });
      await refresh();
      toast('Clé révoquée.', 'info');
    },
  });
});

onAction('copy-text', async (el) => {
  const text = el.dataset.text || '';
  try {
    await navigator.clipboard.writeText(text);
    toast('Copié dans le presse-papiers.');
  } catch {
    toast('Copie impossible dans ce navigateur.', 'error');
  }
});
