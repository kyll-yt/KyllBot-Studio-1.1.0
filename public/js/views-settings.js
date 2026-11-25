'use strict';

/* ------------------------------------------------------------------ */
/* vue : facturation                                                   */
/* ------------------------------------------------------------------ */

function usageMeter(label, used, max) {
  const ratio = Math.min(100, Math.round((used / Math.max(max, 1)) * 100));
  return `<div class="usage">
    <div class="usage-top"><span>${esc(label)}</span><b>${fmt(used)} / ${max >= 999999 ? '∞' : fmt(max)}</b></div>
    <div class="progress"><i style="width:${Math.max(3, ratio)}%"></i></div>
  </div>`;
}

function invoiceDate(invoice) {
  const parsed = new Date(invoice.date);
  if (Number.isNaN(parsed.getTime())) return invoice.date || '—';
  return parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function viewBilling() {
  const { ws } = state;
  const billing = state.billing || { plans: [], limits: {}, shop: [], invoices: [], dailyReward: null };
  const plans = billing.plans || [];
  const shop = billing.shop || [];
  const invoices = billing.invoices || [];
  const limits = billing.limits || {};
  const credits = Number(ws.credits) || 0;
  const current = plans.find((entry) => entry.current);
  const planItem = (name) => shop.find((item) => item.plan === name);
  const studioItem = planItem('Studio');
  const studioMissing = studioItem ? Math.max(0, studioItem.credits - credits) : 0;

  return `<div class="page-head">
      <div>
        <h1>Facturation</h1>
        <p class="sub">Gérez votre plan, gagnez des crédits et débloquez des avantages.</p>
      </div>
    </div>

    <div class="plan-banner">
      <div>
        <span class="pill violet">Plan actuel</span>
        <h3 style="margin-top:8px">${esc(ws.plan)}${current && current.credits > 0 ? ` — ${fmt(current.credits)} crédits / mois` : ' — 0 crédit / mois'}</h3>
        <p>${esc(current?.tagline || 'Votre plan actuel et ses limites.')}</p>
        <p class="credit-balance">${fmt(credits)} crédits disponibles</p>
      </div>
      <div class="banner-actions">
        <a class="btn btn-ghost" href="#/dashboard">Gagner des crédits</a>
        ${ws.plan !== 'Studio' && studioItem ? `<button class="btn ${studioMissing ? 'btn-ghost' : 'btn-primary'}" data-action="buy-item" data-item="${esc(studioItem.id)}" ${studioMissing ? 'disabled' : ''}>${studioMissing ? `Studio · encore ${fmt(studioMissing)} crédits` : `Passer à Studio · ${fmt(studioItem.credits)} crédits`}</button>` : ''}
      </div>
    </div>

    ${dailyRewardCard()}

    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Choisir un plan</h3><span class="pill gray">Sans engagement</span></div>
      <div class="panel-body">
        <div class="plan-grid">
          ${plans
            .map((entry) => {
              const creditItem = planItem(entry.name);
              return `<div class="plan-card ${entry.current ? 'current' : ''}">
                ${entry.current ? '<span class="pill green plan-badge">Actuel</span>' : ''}
                <h4>${esc(entry.name)}</h4>
                <div class="plan-price">${entry.credits === 0 ? '0 crédit' : `${fmt(entry.credits)} crédits`}<span>/ mois</span></div>
                <p class="plan-tagline">${esc(entry.tagline)}</p>
                <ul class="plan-features">${entry.features.map((feature) => `<li>${icon('check')} ${esc(feature)}</li>`).join('')}</ul>
                <div class="plan-actions">
                  ${
                    entry.current
                      ? '<button class="btn btn-ghost" disabled>Plan actuel</button>'
                      : entry.id === 'Gratuit'
                        ? '<button class="btn btn-ghost" data-action="change-plan" data-plan="Gratuit">Revenir au gratuit</button>'
                        : creditItem
                          ? `<button class="btn ${entry.id === 'Studio' ? 'btn-primary' : 'btn-ghost'}" data-action="buy-item" data-item="${esc(creditItem.id)}">Activer · ${fmt(creditItem.credits)} crédits</button>`
                          : ''
                  }
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="panel">
        <div class="panel-head"><h3>Utilisation ce mois</h3></div>
        <div class="panel-body">
          ${usageMeter('Bots Discord', ws.bots.length, limits.bots || 1)}
          ${usageMeter('Formations', ws.courses.length, limits.courses || 1)}
          ${usageMeter('Apprenants', ws.learners.length, limits.learners || 1)}
          ${usageMeter('Membres de l’équipe', ws.team.length + 1, limits.members || 1)}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Paiement</h3></div>
        <div class="panel-body">
          <div class="empty-inline">
            <span class="a-ic" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(124,92,255,.13);color:#c2b4ff">${icon('card')}</span>
            <div>
              <b>Aucun moyen de paiement enregistré</b>
              <p>Les achats se font avec des crédits gagnés chaque jour. Le paiement par carte n’est pas encore activé.</p>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-top:13px" data-action="update-card">Configurer le paiement</button>
          <p class="hint">Aucun débit réel n’est effectué dans cette version.</p>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Boutique en crédits</h3><span class="pill violet">${fmt(credits)} crédits</span></div>
      <div class="panel-body">
        <div class="shop-grid">
          ${shop
            .map(
              (item) => `<div class="shop-card ${item.owned ? 'owned' : ''}">
                <div class="shop-head">
                  <span class="shop-ic">${icon(item.icon || 'spark')}</span>
                  <span class="pill ${item.owned ? 'green' : item.plan ? 'violet' : 'gray'}">${item.owned ? 'Activé' : item.plan ? 'Plan' : 'Crédits'}</span>
                </div>
                <h4>${esc(item.label)}</h4>
                <p>${esc(item.detail)}</p>
                <button class="btn ${item.owned ? 'btn-ghost' : 'btn-primary'} btn-sm" data-action="buy-item" data-item="${esc(item.id)}" ${item.owned || credits < item.credits ? 'disabled' : ''}>
                  ${item.owned ? 'Déjà activé' : credits < item.credits ? `Il manque ${fmt(item.credits - credits)} crédits` : `Acheter · ${fmt(item.credits)} crédits`}
                </button>
              </div>`,
            )
            .join('')}
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Factures</h3></div>
      ${
        invoices.length
          ? invoices
              .map(
                (invoice) => `<div class="invoice-row">
                  <span class="inv-ic">${icon('file')}</span>
                  <div style="flex:1"><div style="font-weight:600">${esc(invoice.label || invoice.id)}</div><div style="font-size:10.5px;color:var(--muted-2)">${esc(invoiceDate(invoice))}</div></div>
                  <span style="color:var(--muted)">${invoice.credits ? `${fmt(invoice.credits)} crédits` : '—'}</span>
                  <span class="pill green">${esc(invoice.status || 'Payée')}</span>
                  <button class="mini-btn" data-action="download-invoice" data-id="${esc(invoice.id)}" data-label="${esc(invoice.label || invoice.id)}" data-amount="${esc(invoice.credits ? `${invoice.credits} crédits` : '0 crédit')}" title="Télécharger">${icon('download')}</button>
                </div>`,
              )
              .join('')
          : '<div class="empty-inline" style="margin:16px"><div><b>Aucune facture pour l’instant</b><p>Vos achats en crédits apparaîtront ici avec leur justificatif.</p></div></div>'
      }
    </div>`;
}

onAction('claim-reward', async () => {
  const result = await api('/api/rewards/daily', { method: 'POST' });
  await refresh();
  toast(
    result.alreadyClaimed ? 'Récompense déjà récupérée aujourd’hui. Revenez demain !' : `+${fmt(result.awarded)} crédits ajoutés à votre solde.`,
    result.alreadyClaimed ? 'info' : 'success',
  );
});

onAction('buy-item', (el) => {
  const item = (state.billing?.shop || []).find((entry) => entry.id === el.dataset.item);
  if (!item) return;
  const credits = Number(state.ws.credits) || 0;
  if (credits < item.credits) {
    toast(`Il vous manque ${fmt(item.credits - credits)} crédits.`, 'error');
    return;
  }
  confirmDialog({
    title: `Acheter « ${item.label} » ?`,
    message: `${fmt(item.credits)} crédits seront débités de votre solde (${fmt(credits)} crédits).`,
    confirmLabel: 'Acheter',
    onConfirm: async () => {
      const result = await api('/api/billing/redeem', {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id }),
      });
      await refresh();
      toast(item.plan ? `Plan ${result.plan} activé pour 30 jours.` : `${item.label} activé.`);
    },
  });
});

onAction('change-plan', (el) => {
  const plan = el.dataset.plan;
  if (plan === state.ws.plan) return;
  confirmDialog({
    title: `Activer le plan ${plan} ?`,
    message:
      plan === 'Gratuit'
        ? 'Vous reviendrez au plan gratuit avec ses limites.'
        : 'Le plan sera activé immédiatement. Le paiement par carte n’étant pas encore branché, aucun débit réel ne sera effectué.',
    confirmLabel: 'Activer',
    onConfirm: async () => {
      await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ plan }) });
      await refresh();
      toast(`Plan ${plan} activé.`);
    },
  });
});

onAction('update-card', () => {
  toast('Le paiement par carte n’est pas encore activé. Utilisez vos crédits quotidiens pour acheter un plan ou un avantage.', 'info');
});

onAction('download-invoice', (el) => {
  const text = `KyllBot Studio\nFacture ${el.dataset.id}\n${el.dataset.label || ''}\n\nMontant : ${el.dataset.amount || '0'}\n\nMerci pour votre confiance.`;
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${el.dataset.id}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast('Facture téléchargée.');
});

/* ------------------------------------------------------------------ */
/* vue : paramètres                                                    */
/* ------------------------------------------------------------------ */

function viewSettings() {
  const { user, ws } = state;
  return `<div class="page-head">
      <div>
        <h1>Paramètres</h1>
        <p class="sub">Votre profil, votre studio et vos préférences.</p>
      </div>
    </div>

    <div class="settings-grid">
      <div class="panel">
        <div class="panel-head"><h3>Profil</h3></div>
        <div class="panel-body">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
            ${avatarHtml(user, 52, 14)}
            <div>
              <div style="font-size:14px;font-weight:700">${esc(user.name)}</div>
              <div style="font-size:11.5px;color:var(--muted-2)">${esc(user.email)}</div>
              <span class="pill ${user.provider === 'google' ? 'cyan' : 'violet'}" style="margin-top:6px">
                ${user.provider === 'google' ? 'Compte Google' : user.provider === 'demo' ? 'Compte démo' : 'Vérifié par email'}
              </span>
            </div>
          </div>
          <form data-form="profile">
            <div class="field"><label for="pName">Nom affiché</label><input class="input" id="pName" name="name" value="${esc(user.name)}" required></div>
            <div class="field"><label for="pEmail">Adresse email</label><input class="input" id="pEmail" value="${esc(user.email)}" readonly disabled><div class="hint">L’email de connexion ne peut pas être modifié ici.</div></div>
            <button class="btn btn-primary" type="submit">Enregistrer</button>
          </form>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Studio</h3></div>
        <div class="panel-body">
          <form data-form="workspace">
            <div class="field"><label for="wName">Nom du studio</label><input class="input" id="wName" name="studioName" value="${esc(ws.studioName)}" required></div>
            <div class="form-row">
              <div class="field"><label for="wTz">Fuseau horaire</label>
                <select class="select" id="wTz" name="timezone">
                  ${['Europe/Paris', 'Europe/Brussels', 'Europe/Geneva', 'America/Montreal', 'Africa/Dakar']
                    .map((zone) => `<option ${ws.settings.timezone === zone ? 'selected' : ''}>${zone}</option>`)
                    .join('')}
                </select>
              </div>
              <div class="field"><label for="wLang">Langue</label>
                <select class="select" id="wLang" name="language">
                  <option value="fr" ${ws.settings.language === 'fr' ? 'selected' : ''}>Français</option>
                  <option value="en" ${ws.settings.language === 'en' ? 'selected' : ''}>English</option>
                </select>
              </div>
            </div>
            <button class="btn btn-primary" type="submit">Enregistrer</button>
          </form>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Notifications</h3></div>
        <div class="panel-body">
          <div class="setting-row">
            <div class="sr-main"><h4>Résumé par email</h4><p>Un récapitulatif hebdomadaire de l’activité.</p></div>
            <button class="switch ${ws.settings.notifications.email ? 'on' : ''}" data-action="toggle-notif" data-key="email" aria-label="Notifications email"></button>
          </div>
          <div class="setting-row">
            <div class="sr-main"><h4>Nouveautés produit</h4><p>Les nouvelles fonctionnalités du studio.</p></div>
            <button class="switch ${ws.settings.notifications.product ? 'on' : ''}" data-action="toggle-notif" data-key="product" aria-label="Nouveautés produit"></button>
          </div>
          <div class="setting-row" style="border-bottom:0">
            <div class="sr-main"><h4>Rapport hebdomadaire</h4><p>Statistiques des bots et des formations.</p></div>
            <button class="switch ${ws.settings.notifications.weekly ? 'on' : ''}" data-action="toggle-notif" data-key="weekly" aria-label="Rapport hebdomadaire"></button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Apparence</h3></div>
        <div class="panel-body">
          <form data-form="branding">
            <div class="field"><label for="wAccent">Couleur d’accent</label>
              <div style="display:flex;gap:10px;align-items:center">
                <input class="input" id="wAccent" name="accent" type="color" value="${esc(ws.settings.branding.accent)}" style="max-width:70px">
                <span style="font-size:11.5px;color:var(--muted-2)">Utilisée pour les embeds et les certificats.</span>
              </div>
            </div>
            <button class="btn btn-primary" type="submit">Enregistrer</button>
          </form>
        </div>
      </div>

      <div class="panel style-panel">
        <div class="panel-head"><h3>Style du site</h3><span class="pill violet">${esc(APPEARANCE_THEMES[appearanceSettings().theme]?.label || 'Classique')}</span></div>
        <div class="panel-body">
          <div class="theme-grid">
            ${Object.entries(APPEARANCE_THEMES)
              .map(
                ([key, theme]) => `<button type="button" class="theme-card ${appearanceSettings().theme === key ? 'active' : ''}" data-action="set-theme" data-theme="${key}" style="--theme-a:${theme.accent};--theme-b:${theme.accent2};--theme-bg:${theme.bg}">
                  <span class="theme-preview"><i></i><i></i><i></i></span>
                  <b>${esc(theme.label)}</b>
                  <small>${esc(theme.hint)}</small>
                </button>`,
              )
              .join('')}
          </div>
          <div class="style-toggles">
            ${Object.entries(APPEARANCE_TOGGLES)
              .map(
                ([key, toggle]) => `<div class="setting-row">
                  <div class="sr-main"><h4>${esc(toggle.label)}</h4><p>${esc(toggle.hint)}</p></div>
                  <button class="switch ${appearanceSettings()[key] ? 'on' : ''}" data-action="toggle-appearance" data-key="${key}" aria-label="${esc(toggle.label)}"></button>
                </div>`,
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Application</h3><span class="pill violet">PWA</span></div>
      <div class="panel-body">
        <div class="setting-row">
          <div class="sr-main"><h4>Installer KyllBot Studio</h4><p>Ouvre le studio comme une application, en plein écran, et reçois les mises à jour automatiquement.</p></div>
          <button class="btn btn-primary btn-sm" type="button" data-install-app>Installer</button>
        </div>
        <div class="setting-row" style="border-bottom:0">
          <div class="sr-main"><h4>Mises à jour</h4><p data-pwa-status>Le studio vérifie automatiquement les nouvelles versions.</p></div>
          <button class="btn btn-ghost btn-sm" type="button" data-pwa-check>Vérifier</button>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Sécurité &amp; session</h3></div>
      <div class="panel-body">
        <div class="setting-row"><div class="sr-main"><h4>Méthode de connexion</h4><p>${user.provider === 'google' ? 'Google OAuth' : user.provider === 'demo' ? 'Compte de démonstration' : 'Code à usage unique par email'}</p></div><span class="pill green">Sécurisé</span></div>
        <div class="setting-row"><div class="sr-main"><h4>Code de sécurité</h4><p>${user.hasSecurityCode ? `Activé le ${esc(new Date(user.securityCodeSetAt).toLocaleDateString('fr-FR'))}` : 'Pas encore configuré sur ce compte.'}</p></div><span class="pill ${user.hasSecurityCode ? 'green' : 'grey'}">${user.hasSecurityCode ? 'Actif' : 'À configurer'}</span></div>
        <div class="setting-row"><div class="sr-main"><h4>Dernière connexion</h4><p>${esc(timeAgo(user.lastLoginAt))}</p></div></div>
        <div class="setting-row"><div class="sr-main"><h4>Compte créé</h4><p>${esc(new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))}</p></div></div>
        <div class="setting-row" style="border-bottom:0">
          <div class="sr-main"><h4>Se déconnecter</h4><p>Met fin à cette session sur cet appareil.</p></div>
          <button class="btn btn-ghost btn-sm" data-action="logout">Se déconnecter</button>
        </div>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* actions : paramètres                                                */
/* ------------------------------------------------------------------ */

onAction('toggle-notif', async (el) => {
  const key = el.dataset.key;
  const notifications = { ...state.ws.settings.notifications, [key]: !state.ws.settings.notifications[key] };
  await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ notifications }) });
  await refresh();
});

onAction('set-theme', async (el) => {
  const theme = el.dataset.theme;
  if (!APPEARANCE_THEMES[theme]) return;
  await api('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify({ appearance: { ...appearanceSettings(), theme } }),
  });
  state.ws.settings.appearance = { ...appearanceSettings(), theme };
  applyAppearance();
  render();
  toast(`Thème « ${APPEARANCE_THEMES[theme].label} » activé.`);
});

onAction('toggle-appearance', async (el) => {
  const key = el.dataset.key;
  if (!Object.hasOwn(APPEARANCE_TOGGLES, key)) return;
  const appearance = appearanceSettings();
  appearance[key] = !appearance[key];
  await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ appearance }) });
  state.ws.settings.appearance = appearance;
  applyAppearance();
  render();
  toast(`${APPEARANCE_TOGGLES[key].label} ${appearance[key] ? 'activé' : 'désactivé'}.`, 'info');
});

onAction('logout', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
});

onForm('profile', async (form, formData) => {
  await api('/api/me', { method: 'PATCH', body: JSON.stringify({ name: formData.get('name') }) });
  await refresh();
  toast('Profil mis à jour.');
});

onForm('workspace', async (form, formData) => {
  await api('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify({
      studioName: formData.get('studioName'),
      timezone: formData.get('timezone'),
      language: formData.get('language'),
    }),
  });
  await refresh();
  toast('Paramètres du studio enregistrés.');
});

onForm('branding', async (form, formData) => {
  await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ branding: { accent: formData.get('accent') } }) });
  await refresh();
  toast('Apparence mise à jour.');
});

onForm('bot-settings', async (form, formData) => {
  const botId = form.dataset.id;
  await api(`/api/bots/${botId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: formData.get('name'),
      prefix: formData.get('prefix'),
      description: formData.get('description'),
      color: formData.get('color'),
      status: formData.get('status'),
      tags: String(formData.get('tags') || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }),
  });
  await refresh();
  toast('Bot mis à jour.');
});

onForm('bot-discord', async (form, formData) => {
  form.querySelectorAll('[data-fill-target]').forEach((select) => {
    if (select.dataset.bound === '1') return;
    select.dataset.bound = '1';
    select.addEventListener('change', () => {
      const input = form.querySelector(`#${select.dataset.fillTarget}`);
      if (input && select.value) input.value = select.value;
    });
  });
  const lines = (value) =>
    String(value || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  const bot = state.ws.bots.find((entry) => entry.id === form.dataset.id);
  const knownChannels = bot?.discord?.channels || [];
  const knownRoles = bot?.discord?.roles || [];
  const channels = lines(formData.get('channels'))
    .map((line) => {
      const [name, category, type] = line.split('|').map((part) => part.trim());
      const channelName = String(name || '').replace(/^#/, '');
      const channelType = ['text', 'voice', 'forum'].includes(type) ? type : 'text';
      const channelCategory = category || 'Général';
      return {
        id: knownChannels.find(
          (channel) => channel.name === channelName && channel.category === channelCategory && channel.type === channelType,
        )?.id,
        name: channelName,
        category: channelCategory,
        type: channelType,
      };
    })
    .filter((channel) => channel.name);
  const categories = lines(formData.get('categories'));
  const roles = lines(formData.get('roles'))
    .map((line) => {
      const [name, color] = line.split('|').map((part) => part.trim());
      return {
        id: knownRoles.find((role) => role.name === name)?.id,
        name,
        color: /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#7c5cff',
      };
    })
    .filter((role) => role.name);

  await api(`/api/bots/${form.dataset.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      discord: {
        name: formData.get('serverName'),
        guildId: String(formData.get('guildId') || '').trim(),
        guildName: bot?.discord?.guildName || '',
        syncedAt: bot?.discord?.syncedAt || '',
        privilegedIntents: formData.get('privilegedIntents') === 'on',
        channels,
        categories,
        roles,
      },
    }),
  });
  await refresh();
  toast('Serveur Discord mis à jour.');
});

/* ------------------------------------------------------------------ */
/* amorçage                                                            */
/* ------------------------------------------------------------------ */

function bindChrome() {
  const shell = document.getElementById('appShell');
  document.getElementById('menuBtn')?.addEventListener('click', () => shell.classList.toggle('menu-open'));
  document.getElementById('sidebarOverlay')?.addEventListener('click', () => shell.classList.remove('menu-open'));
  document.querySelectorAll('.sidebar .nav-link').forEach((link) => {
    link.addEventListener('click', () => shell.classList.remove('menu-open'));
  });

  const bellBtn = document.getElementById('bellBtn');
  const bellMenu = document.getElementById('bellMenu');
  const userBtn = document.getElementById('userBtn');
  const userMenu = document.getElementById('userMenu');

  const closeMenus = () => {
    bellMenu.classList.remove('open');
    userMenu.classList.remove('open');
    bellBtn.setAttribute('aria-expanded', 'false');
    userBtn.setAttribute('aria-expanded', 'false');
  };

  bellBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = !bellMenu.classList.contains('open');
    closeMenus();
    bellMenu.classList.toggle('open', open);
    bellBtn.setAttribute('aria-expanded', String(open));
  });

  userBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = !userMenu.classList.contains('open');
    closeMenus();
    userMenu.classList.toggle('open', open);
    userBtn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.dropdown')) closeMenus();
  });

  document.querySelectorAll('#logoutBtn, #logoutBtn2').forEach((button) => {
    button.addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    });
  });

  const search = document.getElementById('globalSearch');
  const searchBox = document.getElementById('searchResults');

  search?.addEventListener('input', () => {
    state.search = search.value.trim();
    renderSearchResults();
    if (['bots', 'courses'].includes(state.route.name)) render();
  });

  searchBox?.addEventListener('click', (event) => {
    if (!event.target.closest('a')) return;
    state.search = '';
    if (search) search.value = '';
    searchBox.hidden = true;
  });

  document.addEventListener('click', (event) => {
    if (searchBox && !event.target.closest('.search')) searchBox.hidden = true;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      event.preventDefault();
      search?.focus();
    }
    if (event.key === 'Escape' && searchBox) searchBox.hidden = true;
  });
}

function renderSearchResults() {
  const box = document.getElementById('searchResults');
  const input = document.getElementById('globalSearch');
  if (!box || !input) return;
  const query = state.search.toLowerCase();
  if (!query) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }

  const matches = [
    ...state.ws.bots
      .filter((bot) => `${bot.name} ${bot.description}`.toLowerCase().includes(query))
      .map((bot) => ({ href: `#/bots/${bot.id}`, icon: 'bot', title: bot.name, sub: 'Bot Discord' })),
    ...state.ws.courses
      .filter((course) => `${course.title} ${course.description}`.toLowerCase().includes(query))
      .map((course) => ({ href: `#/courses/${course.id}`, icon: 'book', title: course.title, sub: 'Formation' })),
    ...state.ws.learners
      .filter((learner) => `${learner.name} ${learner.email}`.toLowerCase().includes(query))
      .map((learner) => ({ href: '#/learners', icon: 'users', title: learner.name, sub: 'Apprenant' })),
    ...('avis idées avis idee idée feedback'.includes(query)
      ? [{ href: '#/feedback', icon: 'message', title: 'Avis & idées', sub: 'Partager une idée ou un avis' }]
      : []),
  ].slice(0, 8);

  box.hidden = false;
  box.innerHTML = matches.length
    ? matches
        .map(
          (item) => `<a class="sh-item" href="${item.href}">
            <span class="sh-ic">${icon(item.icon)}</span>
            <span class="sh-main">
              <span class="sh-title">${esc(item.title)}</span>
              <span class="sh-sub">${esc(item.sub)}</span>
            </span>
          </a>`,
        )
        .join('')
    : '<div class="sh-empty">Aucun résultat pour cette recherche.</div>';
}

async function bootstrap() {
  try {
    const data = await api('/api/me');
    state.user = data.user;
    state.ws = data.workspace;
    state.stats = data.stats;
    state.billing = data.billing;
    state.config = data.config || {};
  } catch {
    return;
  }

  bindChrome();
  applyAppearance();
  state.route = parseHash();
  updateChrome();
  render();

  window.addEventListener('hashchange', () => {
    state.route = parseHash();
    state.search = '';
    const search = document.getElementById('globalSearch');
    if (search) search.value = '';
    const results = document.getElementById('searchResults');
    if (results) results.hidden = true;
    state.botTab = 'commands';
    if (state.route.name === 'feedback') state.feedback = null;
    render();
    updateChrome();
  });
}

bootstrap();
