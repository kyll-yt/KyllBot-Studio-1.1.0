'use strict';

/* ------------------------------------------------------------------ */
/* vue : facturation                                                   */
/* ------------------------------------------------------------------ */

const PLANS = {
  Starter: { price: 0, bots: 1, courses: 1, learners: 25, members: 1 },
  Pro: { price: 19, bots: 10, courses: 20, learners: 2000, members: 10 },
  Studio: { price: 49, bots: 999, courses: 999, learners: 999999, members: 50 },
};

function usageMeter(label, used, max) {
  const ratio = Math.min(100, Math.round((used / max) * 100));
  return `<div class="usage">
    <div class="usage-top"><span>${esc(label)}</span><b>${fmt(used)} / ${max >= 999 ? '∞' : fmt(max)}</b></div>
    <div class="progress"><i style="width:${Math.max(3, ratio)}%"></i></div>
  </div>`;
}

function viewBilling() {
  const { ws } = state;
  const plan = PLANS[ws.plan] || PLANS.Pro;
  const invoices = [
    { id: 'INV-2026-011', date: '1 novembre 2026', amount: '19,00 €', status: 'Payée' },
    { id: 'INV-2026-010', date: '1 octobre 2026', amount: '19,00 €', status: 'Payée' },
    { id: 'INV-2026-009', date: '1 septembre 2026', amount: '19,00 €', status: 'Payée' },
  ];

  return `<div class="page-head">
      <div>
        <h1>Facturation</h1>
        <p class="sub">Gérez votre abonnement, vos moyens de paiement et vos factures.</p>
      </div>
    </div>

    <div class="plan-banner">
      <div>
        <span class="pill violet">Plan actuel</span>
        <h3 style="margin-top:8px">${esc(ws.plan)} — ${plan.price === 0 ? 'Gratuit' : `${plan.price} € / mois`}</h3>
        <p>${ws.plan === 'Studio' ? 'Bots et formations illimités, marque blanche incluse.' : 'Passez au Studio pour débloquer les bots illimités et la marque blanche.'}</p>
      </div>
      <button class="btn btn-primary" data-action="change-plan" data-plan="${ws.plan === 'Studio' ? 'Pro' : 'Studio'}">
        ${ws.plan === 'Studio' ? 'Revenir au Pro' : 'Passer au Studio'}
      </button>
    </div>

    <div class="dash-grid">
      <div class="panel">
        <div class="panel-head"><h3>Utilisation ce mois</h3></div>
        <div class="panel-body">
          ${usageMeter('Bots Discord', ws.bots.length, plan.bots)}
          ${usageMeter('Formations', ws.courses.length, plan.courses)}
          ${usageMeter('Apprenants', ws.learners.length, plan.learners)}
          ${usageMeter('Membres de l’équipe', ws.team.length + 1, plan.members)}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Moyen de paiement</h3></div>
        <div class="panel-body">
          <div style="display:flex;align-items:center;gap:13px;padding:14px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.025)">
            <span style="width:40px;height:28px;border-radius:6px;background:linear-gradient(135deg,#1a1f71,#3b4bc4);display:grid;place-items:center;font-size:8px;font-weight:800;letter-spacing:.06em;color:#fff">VISA</span>
            <div style="flex:1"><div style="font-size:12.5px;font-weight:600">Visa •••• 4242</div><div style="font-size:10.5px;color:var(--muted-2)">Expire 08/2029</div></div>
            <span class="pill green">Par défaut</span>
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-top:13px" data-action="update-card">Mettre à jour</button>
          <p style="font-size:11px;color:var(--muted-2);margin-top:12px;line-height:1.6">Paiement sécurisé. En mode démonstration, aucun débit réel n’est effectué.</p>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Factures</h3></div>
      ${invoices
        .map(
          (invoice) => `<div class="invoice-row">
            <span class="inv-ic">${icon('file')}</span>
            <div style="flex:1"><div style="font-weight:600">${esc(invoice.id)}</div><div style="font-size:10.5px;color:var(--muted-2)">${esc(invoice.date)}</div></div>
            <span style="color:var(--muted)">${esc(invoice.amount)}</span>
            <span class="pill green">${esc(invoice.status)}</span>
            <button class="mini-btn" data-action="download-invoice" data-id="${esc(invoice.id)}" title="Télécharger">${icon('download')}</button>
          </div>`,
        )
        .join('')}
    </div>`;
}

onAction('change-plan', async (el) => {
  const plan = el.dataset.plan;
  await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ plan }) });
  await refresh();
  toast(`Plan ${plan} activé.`);
});

onAction('update-card', () => {
  toast('Le portail de paiement n’est pas disponible en mode démonstration.', 'info');
});

onAction('download-invoice', (el) => {
  const text = `KyllBot Studio Officiel\nFacture ${el.dataset.id}\n\nMerci pour votre confiance.\nMontant : 19,00 € TTC`;
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
    </div>

    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Sécurité &amp; session</h3></div>
      <div class="panel-body">
        <div class="setting-row"><div class="sr-main"><h4>Méthode de connexion</h4><p>${user.provider === 'google' ? 'Google OAuth' : user.provider === 'demo' ? 'Compte de démonstration' : 'Code à usage unique par email'}</p></div><span class="pill green">Sécurisé</span></div>
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
  search?.addEventListener('input', () => {
    state.search = search.value.trim();
    render();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      event.preventDefault();
      search?.focus();
    }
  });
}

async function bootstrap() {
  try {
    const data = await api('/api/me');
    state.user = data.user;
    state.ws = data.workspace;
    state.stats = data.stats;
    state.config = data.config || {};
  } catch {
    return;
  }

  bindChrome();
  state.route = parseHash();
  updateChrome();
  render();

  window.addEventListener('hashchange', () => {
    state.route = parseHash();
    state.search = '';
    const search = document.getElementById('globalSearch');
    if (search) search.value = '';
    state.botTab = 'commands';
    render();
    updateChrome();
  });
}

bootstrap();
