const nav = document.getElementById('siteNav');
const toggle = document.getElementById('navToggle');
const mobileMenu = document.getElementById('mobileMenu');

window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 12);
}, { passive: true });

toggle?.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px' },
);
document.querySelectorAll('.reveal').forEach((el, index) => {
  el.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
  observer.observe(el);
});

document.getElementById('year').textContent = String(new Date().getFullYear());

const demoBtn = document.getElementById('demoBtn');
demoBtn?.addEventListener('click', async () => {
  const label = demoBtn.innerHTML;
  demoBtn.disabled = true;
  demoBtn.textContent = 'Ouverture de la démo…';
  try {
    const response = await fetch('/api/auth/demo', { method: 'POST' });
    if (!response.ok) throw new Error();
    window.location.href = '/app';
  } catch {
    demoBtn.disabled = false;
    demoBtn.innerHTML = label;
    alert("Impossible d'ouvrir la démo. Vérifiez que le serveur est démarré.");
  }
});
