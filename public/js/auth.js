const els = {
  error: document.getElementById('authError'),
  stepEmail: document.getElementById('stepEmail'),
  stepCode: document.getElementById('stepCode'),
  emailForm: document.getElementById('emailForm'),
  email: document.getElementById('email'),
  emailSubmit: document.getElementById('emailSubmit'),
  mailNote: document.getElementById('mailNote'),
  emailDisplay: document.getElementById('emailDisplay'),
  codeForm: document.getElementById('codeForm'),
  codeRow: document.getElementById('codeRow'),
  codeSubmit: document.getElementById('codeSubmit'),
  resendBtn: document.getElementById('resendBtn'),
  changeEmail: document.getElementById('changeEmail'),
  googleBtn: document.getElementById('googleBtn'),
  devNote: document.getElementById('devNote'),
  devCode: document.getElementById('devCode'),
  demoLink: document.getElementById('demoLink'),
  ownerForm: document.getElementById('ownerForm'),
  ownerCode: document.getElementById('ownerCode'),
  ownerSubmit: document.getElementById('ownerSubmit'),
};

const state = { email: '', google: false, mail: false, timer: null, busy: false };
const inputs = [...els.codeRow.querySelectorAll('input')];

function showError(message) {
  els.error.textContent = message;
  els.error.classList.remove('success');
  els.error.classList.add('show');
}

function showNotice(message) {
  showError(message);
  els.error.classList.add('success');
}

function clearError() {
  els.error.classList.remove('show', 'success');
  els.error.textContent = '';
}

function showStep(name) {
  els.stepEmail.classList.toggle('active', name === 'email');
  els.stepCode.classList.toggle('active', name === 'code');
  clearError();
  if (name === 'code') setTimeout(() => inputs[0].focus(), 120);
  else els.email.focus();
}

function setBusy(button, busy, label) {
  state.busy = busy;
  button.disabled = busy;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label || 'Un instant…';
  } else if (button.dataset.label) {
    button.textContent = button.dataset.label;
  }
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    /* réponse vide */
  }
  if (!response.ok) throw new Error(payload.error || 'Une erreur est survenue.');
  return payload;
}

function startCountdown(seconds = 30) {
  clearInterval(state.timer);
  let remaining = seconds;
  els.resendBtn.disabled = true;
  els.resendBtn.textContent = `Renvoyer le code (${remaining}s)`;
  state.timer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(state.timer);
      els.resendBtn.disabled = false;
      els.resendBtn.textContent = 'Renvoyer le code';
    } else {
      els.resendBtn.textContent = `Renvoyer le code (${remaining}s)`;
    }
  }, 1000);
}

async function requestCode(email) {
  const payload = await api('/api/auth/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  state.email = payload.email || email;
  els.emailDisplay.textContent = state.email;
  if (payload.devCode) {
    els.devCode.textContent = payload.devCode;
    els.devNote.hidden = false;
  } else {
    els.devNote.hidden = true;
  }
  if (payload.transport === 'smtp' || payload.transport === 'resend') {
    showNotice(`Code envoyé à ${state.email}. Vérifiez aussi les spams.`);
  }
  startCountdown(30);
}

els.emailForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();
  const email = els.email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
    showError('Entrez une adresse email valide.');
    els.email.focus();
    return;
  }
  setBusy(els.emailSubmit, true, 'Envoi du code…');
  try {
    await requestCode(email);
    inputs.forEach((input) => {
      input.value = '';
      input.classList.remove('filled');
    });
    showStep('code');
  } catch (error) {
    showError(error.message);
  } finally {
    setBusy(els.emailSubmit, false);
  }
});

function codeValue() {
  return inputs.map((input) => input.value).join('');
}

inputs.forEach((input, index) => {
  input.addEventListener('input', () => {
    const digit = input.value.replace(/\D/g, '').slice(-1);
    input.value = digit;
    input.classList.toggle('filled', Boolean(digit));
    clearError();
    if (digit && index < inputs.length - 1) inputs[index + 1].focus();
    if (codeValue().length === 6) {
      setTimeout(() => {
        if (codeValue().length === 6) submitCode();
      }, 180);
    }
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && !input.value && index > 0) {
      inputs[index - 1].focus();
      inputs[index - 1].value = '';
      inputs[index - 1].classList.remove('filled');
      event.preventDefault();
    }
    if (event.key === 'ArrowLeft' && index > 0) inputs[index - 1].focus();
    if (event.key === 'ArrowRight' && index < inputs.length - 1) inputs[index + 1].focus();
  });

  input.addEventListener('paste', (event) => {
    event.preventDefault();
    const digits = (event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6).split('');
    digits.forEach((digit, i) => {
      if (inputs[i]) {
        inputs[i].value = digit;
        inputs[i].classList.add('filled');
      }
    });
    const next = inputs[Math.min(digits.length, 5)];
    next.focus();
    if (digits.length === 6) submitCode();
  });
});

async function submitCode() {
  if (state.busy) return;
  clearError();
  const code = codeValue();
  if (code.length !== 6) {
    showError('Le code doit contenir 6 chiffres.');
    return;
  }
  setBusy(els.codeSubmit, true, 'Vérification…');
  try {
    await api('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email: state.email, code }),
    });
    els.codeSubmit.textContent = 'Bienvenue ! Redirection…';
    window.location.href = '/app';
  } catch (error) {
    showError(error.message);
    inputs.forEach((input) => {
      input.value = '';
      input.classList.remove('filled');
    });
    inputs[0].focus();
    setBusy(els.codeSubmit, false);
  }
}

els.codeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitCode();
});

els.resendBtn.addEventListener('click', async () => {
  if (els.resendBtn.disabled) return;
  clearError();
  els.resendBtn.disabled = true;
  els.resendBtn.textContent = 'Envoi…';
  try {
    await requestCode(state.email);
    els.error.textContent = 'Un nouveau code vient d’être envoyé.';
    els.error.classList.add('show');
    els.error.style.borderColor = 'rgba(163,230,53,.4)';
    els.error.style.background = 'rgba(163,230,53,.08)';
    els.error.style.color = '#d9f99d';
    setTimeout(() => {
      els.error.style.borderColor = '';
      els.error.style.background = '';
      els.error.style.color = '';
    }, 2600);
  } catch (error) {
    showError(error.message);
    els.resendBtn.disabled = false;
    els.resendBtn.textContent = 'Renvoyer le code';
  }
});

els.changeEmail.addEventListener('click', () => {
  clearInterval(state.timer);
  els.devNote.hidden = true;
  showStep('email');
});

els.googleBtn.addEventListener('click', () => {
  clearError();
  if (state.google) {
    window.location.href = '/api/auth/google';
    return;
  }
  showError(
    "La connexion Google n'est pas configurée sur cette instance. Utilisez votre adresse email ou le compte de démonstration ci-dessous.",
  );
});

els.demoLink.addEventListener('click', async (event) => {
  event.preventDefault();
  try {
    await api('/api/auth/demo', { method: 'POST' });
    window.location.href = '/app';
  } catch (error) {
    showError(error.message);
  }
});

els.ownerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();
  const code = els.ownerCode.value.trim();
  if (!code) {
    showError('Entrez le code d’accès propriétaire.');
    els.ownerCode.focus();
    return;
  }
  setBusy(els.ownerSubmit, true, 'Déverrouillage…');
  try {
    await api('/api/owner/unlock', { method: 'POST', body: JSON.stringify({ code }) });
    window.location.href = '/app';
  } catch (error) {
    showError(error.message);
  } finally {
    setBusy(els.ownerSubmit, false);
  }
});

(async function init() {
  const params = new URLSearchParams(window.location.search);
  const googleStatus = params.get('google');
  if (googleStatus === 'unconfigured') {
    showError("Google OAuth n'est pas configuré. Utilisez l'email ou la démo.");
  } else if (googleStatus === 'error') {
    showError('La connexion Google a échoué. Réessayez avec votre adresse email.');
  } else if (googleStatus === 'cancelled') {
    showError('Connexion Google annulée.');
  }

  try {
    const response = await fetch('/api/me');
    if (response.ok) {
      window.location.replace('/app');
      return;
    }
  } catch {
    /* serveur indisponible : on laisse le formulaire */
  }

  try {
    const config = await api('/api/auth/config');
    state.google = Boolean(config.google);
    state.mail = Boolean(config.mail);
    els.googleBtn.title = state.google
      ? 'Se connecter avec Google'
      : 'Google OAuth non configuré sur cette instance';
    if (els.mailNote) {
      els.mailNote.hidden = false;
      els.mailNote.classList.toggle('warn', !state.mail);
      els.mailNote.textContent = state.mail
        ? 'Le code à 6 chiffres sera envoyé par email.'
        : "L'envoi réel n'est pas configuré sur cette instance : le code s'affichera après validation.";
    }
  } catch {
    state.google = false;
  }

  els.email.focus();
})();
