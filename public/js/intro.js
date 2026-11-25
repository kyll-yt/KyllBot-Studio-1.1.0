(function () {
  const KEY = 'kyllbot-intro-seen';
  const intro = document.getElementById('kbIntro');
  if (!intro) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const replay = new URLSearchParams(window.location.search).has('intro');
  let seen = false;
  try {
    seen = sessionStorage.getItem(KEY) === '1';
  } catch {
    seen = false;
  }
  if ((seen && !replay) || reduced) {
    intro.remove();
    return;
  }
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* navigation privée : l’animation reste ponctuelle */
  }

  document.documentElement.classList.add('kb-intro-lock');
  intro.hidden = false;
  requestAnimationFrame(() => intro.classList.add('is-active'));

  const leave = () => {
    intro.classList.add('is-leaving');
    document.documentElement.classList.remove('kb-intro-lock');
    window.setTimeout(() => intro.remove(), 850);
  };
  window.setTimeout(leave, replay ? 2400 : 1900);
  intro.addEventListener('click', leave);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') leave();
  }, { once: true });
})();
