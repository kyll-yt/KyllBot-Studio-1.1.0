(() => {
  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  const isStandalone = () => standaloneQuery.matches || window.navigator.standalone === true;
  const swSupported = 'serviceWorker' in navigator;

  let deferredPrompt = null;
  let registration = null;
  let updateBanner = null;
  let reloading = false;
  let hadController = swSupported ? Boolean(navigator.serviceWorker.controller) : false;

  function syncStandalone() {
    document.body.classList.toggle('pwa-standalone', isStandalone());
  }

  function ensureUpdateBanner() {
    if (updateBanner) return updateBanner;
    updateBanner = document.createElement('div');
    updateBanner.className = 'pwa-update';
    updateBanner.hidden = true;
    updateBanner.innerHTML = `
      <span class="pwa-update-dot" aria-hidden="true"></span>
      <div class="pwa-update-copy">
        <b>Nouvelle version disponible</b>
        <span>Recharge pour profiter des dernières améliorations.</span>
      </div>
      <button type="button" class="btn btn-primary btn-sm" data-pwa-reload>Recharger</button>
      <button type="button" class="pwa-update-close" data-pwa-dismiss aria-label="Fermer">×</button>`;
    document.body.appendChild(updateBanner);
    updateBanner.querySelector('[data-pwa-reload]').addEventListener('click', applyUpdate);
    updateBanner.querySelector('[data-pwa-dismiss]').addEventListener('click', () => {
      updateBanner.hidden = true;
    });
    return updateBanner;
  }

  function showUpdate() {
    ensureUpdateBanner().hidden = false;
  }

  function applyUpdate() {
    reloading = true;
    const waiting = registration?.waiting;
    if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(() => window.location.reload(), 900);
  }

  function showInstallHelp() {
    if (document.querySelector('.pwa-help')) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const steps = isStandalone()
      ? ['KyllBot Studio est déjà installé sur cet appareil.']
      : ios
        ? [
            'Ouvre cette page dans Safari.',
            'Appuie sur le bouton Partager en bas de l’écran.',
            'Choisis « Sur l’écran d’accueil », puis « Ajouter ».',
          ]
        : [
            'Ouvre le menu de ton navigateur (les trois points en haut à droite).',
            'Choisis « Installer KyllBot Studio » ou « Installer l’application ».',
            'Si l’option n’apparaît pas, cherche l’icône d’installation dans la barre d’adresse.',
          ];

    const overlay = document.createElement('div');
    overlay.className = 'pwa-help';
    overlay.innerHTML = `
      <div class="pwa-help-card" role="dialog" aria-modal="true" aria-labelledby="pwaHelpTitle">
        <button type="button" class="pwa-help-close" data-pwa-help-close aria-label="Fermer">×</button>
        <span class="pwa-help-icon" aria-hidden="true">↓</span>
        <h2 id="pwaHelpTitle">Installer KyllBot Studio</h2>
        <p>Ajoute le studio à ton écran d’accueil pour l’ouvrir comme une application, en plein écran, et recevoir les mises à jour automatiquement.</p>
        <ol>${steps.map((step) => `<li>${step}</li>`).join('')}</ol>
        <button type="button" class="btn btn-primary" data-pwa-help-close>J’ai compris</button>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.closest('[data-pwa-help-close]')) close();
    });
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') close();
      },
      { once: true },
    );
  }

  async function promptInstall() {
    if (isStandalone()) {
      showInstallHelp();
      return;
    }
    if (!deferredPrompt) {
      showInstallHelp();
      return;
    }
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    try {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice.catch(() => ({ outcome: 'dismissed' }));
      if (choice.outcome !== 'accepted') showInstallHelp();
    } catch {
      showInstallHelp();
    }
  }

  async function checkForUpdates() {
    if (!registration) return false;
    try {
      await registration.update();
      return true;
    } catch {
      return false;
    }
  }

  async function registerServiceWorker() {
    try {
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      hadController = Boolean(navigator.serviceWorker.controller);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
        });
      });

      if (registration.waiting && navigator.serviceWorker.controller) showUpdate();
      await checkForUpdates();
      setInterval(checkForUpdates, 5 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkForUpdates();
      });
    } catch (error) {
      console.warn('[PWA] Service worker indisponible', error);
    }
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    syncStandalone();
  });

  document.addEventListener('click', async (event) => {
    const installButton = event.target.closest('[data-install-app]');
    if (installButton) {
      event.preventDefault();
      await promptInstall();
      return;
    }

    const checkButton = event.target.closest('[data-pwa-check]');
    if (checkButton) {
      event.preventDefault();
      checkButton.disabled = true;
      const status = document.querySelector('[data-pwa-status]');
      const ok = await checkForUpdates();
      if (status) {
        status.textContent = ok
          ? 'Vérification terminée. Si une nouvelle version existe, un bouton « Recharger » apparaît.'
          : 'Vérification impossible pour le moment. Réessaie dans un instant.';
      }
      checkButton.disabled = false;
    }
  });

  if (swSupported) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (reloading) window.location.reload();
      else showUpdate();
    });
    window.addEventListener('load', registerServiceWorker);
  }

  standaloneQuery.addEventListener?.('change', syncStandalone);
  syncStandalone();

  window.KyllPWA = {
    install: promptInstall,
    showHelp: showInstallHelp,
    checkForUpdates,
    isStandalone,
    canInstall: () => Boolean(deferredPrompt),
  };
})();
