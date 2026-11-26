'use strict';

/* ------------------------------------------------------------------ */
/* état & utilitaires                                                  */
/* ------------------------------------------------------------------ */

const APP_VERSION = '1.1.5';

const APP_CHANGELOG = [
  {
    version: '1.1.5',
    date: '2026-11-21',
    title: 'IA polyvalente, tickets et AutoMod',
    items: [
      'Tickets améliorés : rôle staff, salon de logs, message d’accueil, préfixe de salon et limite de tickets par membre.',
      'Les tickets ont maintenant des boutons Réclamer et Fermer, avec contrôle du staff et suppression automatique.',
      'Le panneau de tickets envoie un bouton « Ouvrir un ticket » et applique les mêmes options au ticket créé.',
      'AutoMod : nouvelle liste de rôles exemptés, pour ne jamais filtrer le staff, les modérateurs ou les VIP.',
      'Blocage des MP au bot : option claire, réponse personnalisable et une seule réponse par membre.',
      'Création de flux : le modèle « Bienvenue » est sélectionné par défaut pour éviter le canvas vide, avec un message clair si aucun serveur n’est choisi.',
      'Chrono du service actuel : nouveau mode du bloc Chronomètre et modèle « Chrono service » avec la commande /chrono, pour afficher le temps de service en cours sans l’arrêter. {{chrono}} fonctionne aussi dans les messages et embeds.',
      'Chrono en ligne : nouvel encadré foncé qui liste chaque personne en service, une par ligne, avec son temps en ligne. Il s’actualise toutes les 30 secondes ou toutes les minutes, se met à jour dès un démarrage/arrêt et se restaure après un redémarrage du bot.',
      'Formulaires : jusqu’à 15 champs, répartis automatiquement en plusieurs fenêtres Discord de 5 champs, et titres de champs jusqu’à 100 caractères (45 en titre, le reste en description).',
      'Le bloc « Réponse IA » utilise maintenant la vraie IA dans les flux : fini le texte simulé.',
      'L’IA répond à toutes les questions, même hors sujet Discord, avec des faits directs et sans formule vide.',
      'Mémoire de conversation par salon et par membre : elle retient un prénom et le réutilise dans les messages suivants.',
      'Faits vérifiés via Wikipédia et Wikidata, avec les réponses intégrées en secours si le réseau est indisponible.',
      'Les questions sur les planètes, la météo ou les dirigeants français reçoivent une réponse réelle, sans invention.',
    ],
  },
  {
    version: '1.1.4',
    date: '2026-11-21',
    title: 'Sécurité, automatisations et expérience',
    items: [
      'Connexion renforcée : un code de sécurité à 6 chiffres est obligatoire, avec un code de secours pour retrouver son studio.',
      'Les sauvegardes restent liées au compte après une déconnexion : rien n’est effacé.',
      'Nouvelle animation d’entrée et nouveau visuel de cœur numérique KyllBot.',
      'Automatisations prêtes à l’emploi en un clic : accueil, rôles, AutoMod, anti-spam, anti-raid, tickets, logs, niveaux et réparation.',
      'Nouveau bouclier anti-bots : score des comptes suspects, quarantaine, exclusion, expulsion ou bannissement.',
      'AutoMod enrichi : invitations, faux Nitro, liens, mots interdits, majuscules, mentions, messages répétés, zalgo et rafales d’emojis.',
      'Commandes prêtes à l’emploi : 13 modèles (bienvenue, règles, ticket, sondage, giveaway, vérification…).',
      'Nouveau bloc « Lancer une automatisation » et modèle de flux « Bouclier anti-bots » dans l’éditeur 2D.',
      'Statistiques calculées uniquement à partir de votre activité réelle, sans profils fictifs.',
      'Récompense quotidienne en crédits et boutique : achats immédiats avec le solde, sans carte bancaire.',
      'Plan Gratuit amélioré : 60 commandes par bot, AutoMod, bouclier anti-bots et statistiques réelles.',
      'Fiches apprenants et équipe : badge « compte lié » et suppression directe des personnes.',
      'Formations : explication concrète de l’utilité, des bénéfices et du suivi des apprenants.',
      'Création de bot guidée avec le Token Discord et le choix du serveur.',
      'Éditeur de flux 2D : démarrage guidé, blocs prêts à l’emploi et aperçu des réactions.',
    ],
  },
  {
    version: '1.1.3',
    date: '2026-11-21',
    title: 'Commandes par serveur et connexion sécurisée',
    items: [
      'Correction du bloc « Réponse IA » : réponses locales naturelles, sans message répétitif sur l’API.',
      'Nouveau sélecteur de serveur dans l’onglet Commandes : choisis clairement le serveur Discord cible, ajoute le bot à un nouveau serveur et synchronise ses commandes en un clic.',
      'Bouton « Ajouter le bot » : invitation directe vers le serveur de ton choix.',
      'Bouton « Mes serveurs » : liste les serveurs où le bot est déjà présent et permet de les configurer en un clic.',
      'Chaque commande peut contenir jusqu’à 20 variantes de réponse, tirées au hasard selon un poids configurable.',
      'Connexion email renforcée : limitation des tentatives, comparaison sécurisée des codes et code de démonstration masqué en production.',
      'Les blocs webhook et musique refusent les adresses locales ou privées.',
      'Les diagnostics techniques détaillés sont désormais réservés au propriétaire du studio.',
    ],
  },
  {
    version: '1.1.2',
    date: '2026-11-21',
    title: 'Contrôle total des messages et de l’apparence',
    items: [
      'Nouveau choix de visibilité pour tous les envois : public, éphémère (seul le membre voit) ou message privé.',
      'Chrono, compte à rebours et blocs de service peuvent maintenant envoyer leurs messages dans un autre salon.',
      'Bloc de modération complet : avertir, exclure, expulser, bannir, softban, débannir, purger, verrouiller, ralentir, mute vocal et plus.',
      'Éditeur de flux amélioré : fond personnalisable, meilleure palette, nœuds plus lisibles et bouton variantes disponible partout.',
      'Nouveaux thèmes et interrupteurs d’interface : Néon, Océan, Sunset, Forêt, Mono, Bonbon et effets visuels.',
      'Nouvelles automatisations prêtes à configurer : départ, boost, mentions abusives, majuscules, fils automatiques et messages de congé.',
      'Avertissement clair en mode démonstration : aucune modification n’est conservée.',
      'Badge de version discret en bas à droite et page Nouveautés.',
    ],
  },
  {
    version: '1.1.1',
    date: '2026-11-21',
    title: 'Persistance Supabase renforcée',
    items: [
      'Sauvegarde Supabase plus fiable avec reprise automatique.',
      'Diagnostic de stockage visible dans /healthz.',
      'Correction du service worker pour éviter les anciennes interfaces en cache.',
    ],
  },
];

const APPEARANCE_THEMES = {
  classic: {
    label: 'Classique',
    hint: 'Le violet KyllBot original.',
    accent: '#7c5cff',
    accent2: '#22d3ee',
    bg: '#07060d',
    surface: '#110f1d',
  },
  neon: {
    label: 'Néon',
    hint: 'Cyber, glow et contrastes électriques.',
    accent: '#00f5d4',
    accent2: '#ff2e88',
    bg: '#03040a',
    surface: '#0a0d18',
  },
  ocean: {
    label: 'Océan',
    hint: 'Bleu profond et vagues cyan.',
    accent: '#38bdf8',
    accent2: '#2dd4bf',
    bg: '#041018',
    surface: '#0a1c2a',
  },
  sunset: {
    label: 'Sunset',
    hint: 'Orange chaud et rose corail.',
    accent: '#fb923c',
    accent2: '#f43f5e',
    bg: '#120806',
    surface: '#24110d',
  },
  forest: {
    label: 'Forêt',
    hint: 'Vert naturel et brume douce.',
    accent: '#4ade80',
    accent2: '#a3e635',
    bg: '#050d09',
    surface: '#0c1a12',
  },
  mono: {
    label: 'Mono',
    hint: 'Minimal, gris et élégant.',
    accent: '#e5e7eb',
    accent2: '#94a3b8',
    bg: '#08090b',
    surface: '#14161a',
  },
  candy: {
    label: 'Bonbon',
    hint: 'Rose, lilas et pêche.',
    accent: '#f472b6',
    accent2: '#c084fc',
    bg: '#120714',
    surface: '#24102a',
  },
};

const APPEARANCE_TOGGLES = {
  neon: { label: 'Néon', hint: 'Halo lumineux autour des boutons et des cartes.' },
  glass: { label: 'Verre', hint: 'Panneaux translucides avec flou.' },
  animations: { label: 'Animations', hint: 'Transitions et apparitions animées.' },
  compact: { label: 'Compact', hint: 'Réduit les espacements pour voir plus de contenu.' },
  rounded: { label: 'Arrondi', hint: 'Coins plus doux sur les cartes et boutons.' },
  grid: { label: 'Grille', hint: 'Affiche la grille de fond du studio.' },
  glowText: { label: 'Texte lumineux', hint: 'Titres et accents avec un léger glow.' },
  reducedMotion: { label: 'Réduire les mouvements', hint: 'Désactive les animations non essentielles.' },
};

const state = {
  user: null,
  ws: null,
  stats: null,
  billing: null,
  config: {},
  route: { name: 'dashboard', id: null },
  botTab: 'commands',
  search: '',
  feedback: null,
  feedbackSummary: null,
  feedbackFilter: 'all',
  feedbackLoading: false,
};

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0);

const initials = (name) => {
  const words = String(name || '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const value = words
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return value || 'K';
};

const preferredName = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'toi';
  return parts.find((part) => part.replace(/[.'’\-]/g, '').length > 1) || parts[0];
};

function avatarHtml(user, size = 34, radius = 10) {
  if (user?.avatar) {
    return `<span class="avatar" style="width:${size}px;height:${size}px;border-radius:${radius}px"><img src="${esc(user.avatar)}" alt=""></span>`;
  }
  return `<span class="avatar" style="width:${size}px;height:${size}px;border-radius:${radius}px;font-size:${Math.round(size * 0.38)}px">${esc(initials(user?.name))}</span>`;
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(diff)) return '';
  if (diff < 90) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const ICONS = {
  grid: '<rect x="2.5" y="2.5" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.5"/><rect x="11.5" y="2.5" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.5"/><rect x="2.5" y="11.5" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.5"/><rect x="11.5" y="11.5" width="6" height="6" rx="1.6" stroke="currentColor" stroke-width="1.5"/>',
  bot: '<rect x="3" y="5" width="14" height="11" rx="3.4" stroke="currentColor" stroke-width="1.5"/><circle cx="7.6" cy="10.5" r="1.2" fill="currentColor"/><circle cx="12.4" cy="10.5" r="1.2" fill="currentColor"/><path d="M10 5V2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  book: '<path d="M10 4.5 2.8 7.6 10 10.7l7.2-3.1L10 4.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5.2 9.4v4.1c0 1.2 2.1 2.4 4.8 2.4s4.8-1.2 4.8-2.4V9.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  users: '<circle cx="7.5" cy="7" r="2.8" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 16.5c0-2.7 2.2-4.8 5-4.8s5 2.1 5 4.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M13.4 6.2a2.4 2.4 0 0 1 0 4.7M15.4 16c0-1.9-.8-3.2-2-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  chart: '<path d="M3 16.5V10M7.7 16.5V5M12.3 16.5v-4.5M17 16.5V7.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  template: '<rect x="2.5" y="3" width="15" height="14" rx="2.4" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 7.5h15M7 7.5V17" stroke="currentColor" stroke-width="1.5"/>',
  team: '<circle cx="7" cy="7.5" r="2.6" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 16c0-2.5 2-4.4 4.5-4.4S11.5 13.5 11.5 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="14" cy="7" r="2" stroke="currentColor" stroke-width="1.5"/>',
  code: '<path d="M7.5 6 3.5 10l4 4M12.5 6l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  card: '<rect x="2" y="5" width="16" height="11" rx="2.4" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h16" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 13h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  gear: '<circle cx="10" cy="10" r="2.6" stroke="currentColor" stroke-width="1.5"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  plus: '<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  trash: '<path d="M4 6h12M8 6V4.5c0-.6.4-1 1-1h2c.6 0 1 .4 1 1V6M6 6l.7 10c0 .6.5 1 1 1h4.6c.5 0 1-.4 1-1L14 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
  edit: '<path d="M12.6 3.9a1.6 1.6 0 0 1 2.3 2.3l-8 8-3 .7.7-3 8-8Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  play: '<path d="M6 4.5 14.5 10 6 15.5v-11Z" fill="currentColor"/>',
  stop: '<rect x="5" y="5" width="10" height="10" rx="1.8" fill="currentColor"/>',
  check: '<path d="M3.5 10.5 7.5 14.5l9-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M5 5l10 10M15 5 5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  clock: '<circle cx="10" cy="10" r="7.2" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4.3l2.8 1.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  music: '<path d="M7.5 14.5V5.2l7-1.4v9.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="14.5" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="12.5" cy="13" r="2" stroke="currentColor" stroke-width="1.5"/>',
  video: '<rect x="2.5" y="5" width="11" height="10" rx="2.2" stroke="currentColor" stroke-width="1.5"/><path d="M13.5 8.5 17.5 6v8l-4-2.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  file: '<path d="M5 2.5h6l4 4v11H5v-15Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M11 2.5v4h4M7.5 10.5h5M7.5 13.5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  quiz: '<circle cx="10" cy="10" r="7.2" stroke="currentColor" stroke-width="1.5"/><path d="M8 8a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6 1v.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="14" r=".9" fill="currentColor"/>',
  key: '<circle cx="7" cy="10" r="3.2" stroke="currentColor" stroke-width="1.5"/><path d="M10 10h7M14 10v2.5M16.5 10v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  copy: '<rect x="7" y="7" width="9.5" height="9.5" rx="1.8" stroke="currentColor" stroke-width="1.4"/><path d="M12.5 7V4.8c0-.7-.6-1.3-1.3-1.3H4.8c-.7 0-1.3.6-1.3 1.3v6.4c0 .7.6 1.3 1.3 1.3H7" stroke="currentColor" stroke-width="1.4"/>',
  download: '<path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M3.5 15.5h13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  shield: '<path d="M10 2.5 16 5v5c0 3.8-2.5 6.5-6 7.5-3.5-1-6-3.7-6-7.5V5l6-2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  zap: '<path d="M11 2 4 11h5l-1 7 8-9.5h-5L11 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  arrow: '<path d="M3.5 10h12M11 5.5 15.5 10 11 14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  arrowLeft: '<path d="M16.5 10h-12M9 5.5 4.5 10 9 14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  spark: '<path d="M8 1.5 9.8 6l4.7.4-3.6 3.1 1.1 4.6L8 11.6l-4 2.5 1.1-4.6L1.5 6.4 6.2 6 8 1.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
  mail: '<rect x="2.5" y="4.5" width="15" height="11" rx="2.2" stroke="currentColor" stroke-width="1.5"/><path d="m3.5 6 6.5 4.7L16.5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  ticket: '<path d="M3 7.5V5.5h14v2a2.5 2.5 0 0 0 0 5v2H3v-2a2.5 2.5 0 0 0 0-5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 5.5v9" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2"/>',
  award: '<circle cx="10" cy="8" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 11.8 6 17.5l4-2 4 2-1-5.7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  external: '<path d="M11 4h5v5M16 4l-7 7M8 5H4.5v10.5H15V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  alert: '<path d="M10 3 18 17H2L10 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 8v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="10" cy="14.6" r=".9" fill="currentColor"/>',
  link: '<path d="M8 12 12 8M7 6.5 8.7 4.8a3 3 0 0 1 4.2 4.2L11.2 10.7M13 13.5l-1.7 1.7a3 3 0 0 1-4.2-4.2L8.8 9.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  globe: '<circle cx="10" cy="10" r="7.2" stroke="currentColor" stroke-width="1.5"/><path d="M2.8 10h14.4M10 2.8c2 2 3 4.5 3 7.2s-1 5.2-3 7.2c-2-2-3-4.5-3-7.2s1-5.2 3-7.2Z" stroke="currentColor" stroke-width="1.3"/>',
  logout: '<path d="M12.5 6.5V4.8c0-.7-.6-1.3-1.3-1.3H4.8c-.7 0-1.3.6-1.3 1.3v10.4c0 .7.6 1.3 1.3 1.3h6.4c.7 0 1.3-.6 1.3-1.3v-1.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8.5 10h8m-2.5-2.5L16.5 10 14 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  message: '<path d="M3 5.5h14v8H9.5L5 16.5v-3H3v-8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  layers: '<path d="M10 3 3 6.4l7 3.4 7-3.4L10 3Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="m3 10 7 3.4 7-3.4M3 13.6 10 17l7-3.4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  branch: '<circle cx="5" cy="5" r="2.1" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="15" r="2.1" stroke="currentColor" stroke-width="1.5"/><circle cx="15" cy="10" r="2.1" stroke="currentColor" stroke-width="1.5"/><path d="M5 7.1v5.8M7.1 5h4.4c1.4 0 2.4 1 2.4 2.4v.5M7.1 15H11c1.4 0 2.4-1 2.4-2.4v-.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  variable: '<path d="M4 5.5c2 0 3 1.2 3 3v3c0 1.8 1 3 3 3M16 5.5c-2 0-3 1.2-3 3v3c0 1.8-1 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  shuffle: '<path d="M3 6h3l7 8h4M3 14h3l2.2-2.5M14 6h3M14 6l2.5-2.5M14 6l2.5 2.5M14 14l2.5-2.5M14 14l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
  terminal: '<rect x="2.5" y="4" width="15" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="m6 8.5 2 2-2 2M10.5 12.5h3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
  smile: '<circle cx="10" cy="10" r="7.2" stroke="currentColor" stroke-width="1.5"/><path d="M7 11.5c.7 1.4 1.7 2 3 2s2.3-.6 3-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="7.6" cy="8" r=".9" fill="currentColor"/><circle cx="12.4" cy="8" r=".9" fill="currentColor"/>',
  cursor: '<path d="M5 3.5 15.5 9l-4.4 1.3L9.6 15 5 3.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  userPlus: '<circle cx="7.5" cy="7" r="2.7" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 16.4c0-2.6 2.2-4.6 5-4.6 1 0 2 .3 2.7.8M14 9.5v4M12 11.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  userMinus: '<circle cx="7.5" cy="7" r="2.7" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 16.4c0-2.6 2.2-4.6 5-4.6 1 0 2 .3 2.7.8M12 11.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  slash: '<path d="M12.5 3 7.5 17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  flow: '<circle cx="4.5" cy="5" r="1.8" stroke="currentColor" stroke-width="1.4"/><circle cx="4.5" cy="15" r="1.8" stroke="currentColor" stroke-width="1.4"/><circle cx="15.5" cy="10" r="1.8" stroke="currentColor" stroke-width="1.4"/><path d="M6.3 5h3.2c1.5 0 2.5 1 2.5 2.5v0M6.3 15h3.2c1.5 0 2.5-1 2.5-2.5v0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  save: '<path d="M4 3.5h8.5L16.5 7v9.5H4V3.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 3.5v4h5v-4M7 16.5v-4.5h6v4.5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  duplicate: '<rect x="6.5" y="6.5" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M13.5 6.5V5.2c0-.9-.8-1.7-1.7-1.7H5.2c-.9 0-1.7.8-1.7 1.7v6.6c0 .9.8 1.7 1.7 1.7h1.3" stroke="currentColor" stroke-width="1.4"/>',
  up: '<path d="M10 15.5V5M5.5 9.5 10 5l4.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  pin: '<path d="M7 3.5h6l-.7 3.4 2.7 2.6H5l2.7-2.6L7 3.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 9.5v7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  keyboard: '<rect x="2.5" y="5.5" width="15" height="9" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 8.5h1M8.5 8.5h1M11.5 8.5h1M14 8.5h.5M6.5 11.5h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  calc: '<rect x="4.5" y="2.5" width="11" height="15" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M7 6h6M7 9.5h1.5M11 9.5h1.5M7 13h1.5M11 13h1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  plug: '<path d="M7 3v4M13 3v4M5 7h10v3a5 5 0 0 1-10 0V7ZM10 15v2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
  hashtag: '<path d="M7.5 3 6 17M14 3l-1.5 14M3.5 7.5h13M3 12.5h13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  down: '<path d="M10 4.5V15M5.5 10.5 10 15l4.5-4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
};

const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 20 20" fill="none" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

let serverDownPoll = null;

function showServerDown() {
  if (document.getElementById('serverDownOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'serverDownOverlay';
  overlay.className = 'server-down';
  overlay.innerHTML = `
    <div class="server-down-card" role="alertdialog" aria-modal="true" aria-labelledby="serverDownTitle">
      <div class="server-down-mark" aria-hidden="true">K</div>
      <h2 id="serverDownTitle">Le site/application est déconnecté</h2>
      <p>Le serveur ne répond plus. Tu peux le relancer sans fermer cet onglet.</p>
      <button type="button" data-restart-server>Redémarrer le site/application</button>
      <p class="server-down-status" data-server-down-status role="status" aria-live="polite"></p>
    </div>`;
  document.body.appendChild(overlay);

  const button = overlay.querySelector('[data-restart-server]');
  const status = overlay.querySelector('[data-server-down-status]');

  button.addEventListener('click', async () => {
    button.disabled = true;
    status.classList.remove('error');
    status.textContent = 'Redémarrage du site/application…';
    try {
      const response = await fetch('/__restart', { method: 'POST', headers: { Accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'Le redémarrage a échoué.');
      status.textContent = 'Site/application redémarré. Rechargement…';
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      status.textContent = error.message || 'Redémarrage impossible. Réessaie dans quelques secondes.';
      status.classList.add('error');
      button.disabled = false;
    }
  });

  if (!serverDownPoll) {
    serverDownPoll = setInterval(async () => {
      try {
        const response = await fetch('/__gateway/health', { cache: 'no-store' });
        const data = await response.json();
        if (data.app === 'up') window.location.reload();
      } catch {
        /* le gateway ne répond pas encore */
      }
    }, 4000);
  }
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (error) {
    showServerDown();
    throw new Error('Le site/application est déconnecté.');
  }
  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expirée.');
  }
  if ([502, 503, 504].includes(response.status)) showServerDown();
  let data = {};
  try {
    data = await response.json();
  } catch {
    /* réponse vide */
  }
  if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}

async function refresh() {
  const data = await api('/api/workspace');
  state.user = data.user;
  state.ws = data.workspace;
  state.stats = data.stats;
  state.billing = data.billing;
  applyAppearance();
  updateChrome();
  render();
}

function appearanceSettings() {
  const saved = state.ws?.settings?.appearance || {};
  return {
    theme: APPEARANCE_THEMES[saved.theme] ? saved.theme : 'classic',
    ...Object.fromEntries(Object.keys(APPEARANCE_TOGGLES).map((key) => [key, Boolean(saved[key])])),
  };
}

function applyAppearance() {
  const appearance = appearanceSettings();
  const theme = APPEARANCE_THEMES[appearance.theme];
  const root = document.documentElement;
  root.dataset.theme = appearance.theme;
  root.style.setProperty('--primary', theme.accent);
  root.style.setProperty('--primary-soft', `${theme.accent}24`);
  root.style.setProperty('--violet', theme.accent2);
  root.style.setProperty('--cyan', theme.accent2);
  root.style.setProperty('--bg', theme.bg);
  root.style.setProperty('--bg-soft', theme.surface);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--surface-2', theme.surface);
  root.style.setProperty('--surface-3', theme.surface);
  root.style.setProperty('--gradient', `linear-gradient(120deg, ${theme.accent} 0%, ${theme.accent2} 100%)`);
  root.style.setProperty('--gradient-soft', `linear-gradient(120deg, ${theme.accent}24, ${theme.accent2}18)`);
  for (const [key, enabled] of Object.entries(appearance)) {
    if (key !== 'theme') root.classList.toggle(`ui-${key}`, Boolean(enabled));
  }
  const version = document.getElementById('appVersion');
  if (version) version.textContent = `v${APP_VERSION}`;
  syncDemoBanner();
}

function syncDemoBanner() {
  const banner = document.getElementById('demoBanner');
  if (!banner) return;
  const isDemo = state.user?.provider === 'demo';
  const dismissed = sessionStorage.getItem('kyll-demo-banner-dismissed') === '1';
  banner.hidden = !isDemo || dismissed;
  if (banner.dataset.bound === '1') return;
  banner.dataset.bound = '1';
  banner.querySelector('[data-dismiss-demo]')?.addEventListener('click', () => {
    sessionStorage.setItem('kyll-demo-banner-dismissed', '1');
    banner.hidden = true;
  });
}

/* ------------------------------------------------------------------ */
/* toasts & modales                                                    */
/* ------------------------------------------------------------------ */

function toast(message, type = 'success') {
  const root = document.getElementById('toastRoot');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const glyph = type === 'error' ? icon('alert') : type === 'info' ? icon('spark') : icon('check');
  el.innerHTML = `<span class="t-ic">${glyph}</span><span>${esc(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 250);
  }, 3600);
}

function closeModal() {
  document.getElementById('modalRoot').innerHTML = '';
  document.body.style.overflow = '';
}

function openModal({ title, subtitle = '', body, submitLabel = 'Enregistrer', wide = false, danger = false, onSubmit, hideFooter = false }) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <form id="modalForm" novalidate>
          <div class="modal-head">
            <div>
              <h2 id="modalTitle">${esc(title)}</h2>
              ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
            </div>
            <button type="button" class="icon-btn" data-close aria-label="Fermer">${icon('x')}</button>
          </div>
          <div class="modal-body">${body}</div>
          ${
            hideFooter
              ? ''
              : `<div class="modal-foot">
                  <button type="button" class="btn btn-ghost" data-close>Annuler</button>
                  <button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modalSubmit">${esc(submitLabel)}</button>
                </div>`
          }
        </form>
      </div>
    </div>`;

  const backdrop = root.querySelector('.modal-backdrop');
  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) closeModal();
  });
  root.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', closeModal));

  const form = root.querySelector('#modalForm');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('#modalSubmit');
    const label = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = 'Enregistrement…';
    }
    try {
      const result = await onSubmit?.(new FormData(form), form);
      if (result !== false) closeModal();
    } catch (error) {
      toast(error.message, 'error');
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
    }
  });

  const first = form.querySelector('input:not([type=hidden]), textarea, select');
  setTimeout(() => first?.focus(), 60);
  return form;
}

function confirmDialog({ title, message, confirmLabel = 'Confirmer', onConfirm }) {
  openModal({
    title,
    body: `<p style="font-size:13px;color:var(--muted);line-height:1.65">${esc(message)}</p>`,
    submitLabel: confirmLabel,
    danger: true,
    onSubmit: async () => {
      await onConfirm();
    },
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
    document.querySelectorAll('.dropdown-menu.open').forEach((menu) => menu.classList.remove('open'));
  }
});

/* ------------------------------------------------------------------ */
/* chrome (sidebar, topbar)                                            */
/* ------------------------------------------------------------------ */

function activityIcon(type) {
  return { bot: 'bot', learner: 'users', course: 'book', team: 'team', certificate: 'award' }[type] || 'spark';
}

function updateChrome() {
  const { user, ws } = state;
  if (!user || !ws) return;
  document.getElementById('sideName').textContent = user.name;
  document.getElementById('sideEmail').textContent = user.email;
  document.getElementById('sideAvatar').outerHTML = avatarHtml(user, 32, 9).replace('class="avatar"', 'class="avatar" id="sideAvatar"');
  document.getElementById('topName').textContent = user.name.split(' ')[0];
  document.getElementById('topAvatar').outerHTML = avatarHtml(user, 26, 8).replace('class="avatar"', 'class="avatar" id="topAvatar"');
  document.getElementById('navBotCount').textContent = String(ws.bots.length);
  document.getElementById('planName').textContent = ws.owner ? 'Propriétaire' : ws.plan;
  const limits = state.billing?.limits;
  const hint = document.getElementById('planHint');
  if (hint) {
    hint.textContent = ws.owner
      ? 'Accès propriétaire · limites maximales'
      : limits
        ? `${limits.bots} bots · ${limits.courses} formations · ${fmt(limits.learners)} apprenants`
        : 'Votre abonnement et vos limites.';
  }
  const creditHint = document.getElementById('creditHint');
  if (creditHint) creditHint.textContent = `${fmt(ws.credits || 0)} crédit${(ws.credits || 0) > 1 ? 's' : ''}`;
  document.getElementById('userMenuHead').textContent = user.email;

  const navName = ['bot', 'flow'].includes(state.route.name) ? 'bots' : state.route.name === 'course' ? 'courses' : state.route.name;
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.nav === navName);
  });

  const labels = {
    dashboard: "Vue d'ensemble",
    bots: 'Mes bots',
    news: 'Nouveautés',
    bot: 'Détail du bot',
    flow: 'Éditeur de flux',
    courses: 'Formations',
    course: 'Éditeur de formation',
    learners: 'Apprenants',
    templates: 'Modèles',
    stats: 'Statistiques',
    team: 'Équipe',
    feedback: 'Avis & idées',
    api: 'API & webhooks',
    billing: 'Facturation',
    settings: 'Paramètres',
  };
  const crumb = labels[state.route.name] || "Vue d'ensemble";
  document.getElementById('crumbCurrent').textContent = crumb;
  document.title = `${crumb} — KyllBot Studio`;

  const notifList = document.getElementById('notifList');
  notifList.innerHTML =
    ws.activity
      .slice(0, 6)
      .map(
        (item) => `<div class="notif">
          <span class="n-ic">${icon(activityIcon(item.type))}</span>
          <div>${esc(item.message)}<time>${esc(timeAgo(item.at))}</time></div>
        </div>`,
      )
      .join('') || '<div class="notif">Aucune activité pour le moment.</div>';
}

/* ------------------------------------------------------------------ */
/* routeur                                                             */
/* ------------------------------------------------------------------ */

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [base, id, sub, subId] = raw.split('/');
  let name = base || 'dashboard';
  if (id && name === 'bots') name = sub === 'flows' && subId ? 'flow' : 'bot';
  if (id && name === 'courses') name = 'course';
  return { name, id: id || null, sub: sub || null, subId: subId || null };
}

function render() {
  const view = document.getElementById('view');
  const { name, id } = state.route;
  const routes = {
    dashboard: viewDashboard,
    bots: viewBots,
    news: viewNews,
    bot: () => viewBotDetail(id),
    flow: () => viewFlowEditor(id, state.route.subId),
    courses: viewCourses,
    course: () => viewCourseDetail(id),
    learners: viewLearners,
    templates: viewTemplates,
    stats: viewStats,
    team: viewTeam,
    feedback: viewFeedback,
    api: viewApi,
    billing: viewBilling,
    settings: viewSettings,
  };
  const renderer = routes[name] || viewDashboard;
  view.innerHTML = renderer();
  view.classList.remove('view');
  void view.offsetWidth;
  view.classList.add('view');
}

/* ------------------------------------------------------------------ */
/* actions déléguées                                                   */
/* ------------------------------------------------------------------ */

const ACTIONS = {};
const onAction = (name, handler) => {
  ACTIONS[name] = handler;
};

document.addEventListener('click', async (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const handler = ACTIONS[el.dataset.action];
  if (!handler) return;
  event.preventDefault();
  try {
    await handler(el, event);
  } catch (error) {
    toast(error.message, 'error');
  }
});

/* ------------------------------------------------------------------ */
/* composants                                                          */
/* ------------------------------------------------------------------ */

function statCard(label, value, hint, iconName) {
  return `<div class="stat-card">
    <span class="sl">${esc(label)}</span>
    <b>${esc(value)}</b>
    <div class="sx">${hint}</div>
    <span class="stat-ic">${icon(iconName)}</span>
  </div>`;
}

function areaChart(series) {
  const width = 620;
  const height = 230;
  const padding = { top: 18, right: 14, bottom: 26, left: 34 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const commands = series.map((point) => point.commands);
  const learners = series.map((point) => point.learners);
  const maxC = Math.max(...commands, 1) * 1.12;
  const maxL = Math.max(...learners, 1) * 1.12;

  const point = (value, max, index) => {
    const x = padding.left + (index * innerW) / Math.max(series.length - 1, 1);
    const y = padding.top + innerH - (value / max) * innerH;
    return [x, y];
  };

  const line = (values, max) =>
    values.map((value, index) => point(value, max, index).map((n) => n.toFixed(1)).join(',')).join(' ');

  const area = (values, max) => {
    const pts = values.map((value, index) => point(value, max, index));
    return `M${pts[0][0].toFixed(1)},${(padding.top + innerH).toFixed(1)} L${pts
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' L')} L${pts[pts.length - 1][0].toFixed(1)},${(padding.top + innerH).toFixed(1)} Z`;
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = padding.top + innerH - ratio * innerH;
      return `<line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}"/>`;
    })
    .join('');

  const xLabels = series
    .map((pointData, index) => {
      if (index % 3 !== 0 && index !== series.length - 1) return '';
      const [x] = point(0, 1, index);
      const label = new Date(`${pointData.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      return `<text class="chart-label" x="${x.toFixed(1)}" y="${height - 8}" text-anchor="middle">${esc(label)}</text>`;
    })
    .join('');

  const yLabels = [0, 0.5, 1]
    .map((ratio) => {
      const y = padding.top + innerH - ratio * innerH;
      return `<text class="chart-label" x="${padding.left - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end">${fmt(Math.round(maxC * ratio))}</text>`;
    })
    .join('');

  return `<div class="chart-wrap">
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Graphique d'activité sur 14 jours">
      <defs>
        <linearGradient id="gradC" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7c5cff" stop-opacity=".38"/>
          <stop offset="1" stop-color="#7c5cff" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="gradL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#22d3ee" stop-opacity=".26"/>
          <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g class="chart-grid">${gridLines}</g>
      <path d="${area(learners, maxL)}" fill="url(#gradL)"/>
      <path d="${area(commands, maxC)}" fill="url(#gradC)"/>
      <polyline points="${line(learners, maxL)}" fill="none" stroke="#22d3ee" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>
      <polyline points="${line(commands, maxC)}" fill="none" stroke="#8f74ff" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
      ${yLabels}${xLabels}
    </svg>
  </div>`;
}

function perBotBars(perBot) {
  if (!perBot.length) return '<p style="font-size:12.5px;color:var(--muted-2)">Aucun bot pour le moment.</p>';
  const max = Math.max(...perBot.map((bot) => bot.uses), 1);
  return perBot
    .map(
      (bot) => `<div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:6px">
          <span style="display:flex;align-items:center;gap:7px"><i style="width:7px;height:7px;border-radius:2px;background:${esc(bot.color)}"></i>${esc(bot.name)}</span>
          <b style="color:var(--muted)">${fmt(bot.uses)}</b>
        </div>
        <div class="progress"><i style="width:${Math.max(4, (bot.uses / max) * 100)}%;background:${esc(bot.color)}"></i></div>
      </div>`,
    )
    .join('');
}

function statusPill(status) {
  const map = {
    online: ['green', 'Connecté à Discord'],
    starting: ['amber', 'Connexion…'],
    connecting: ['amber', 'Connexion…'],
    error: ['red', 'Erreur Discord'],
    offline: ['gray', 'Hors ligne'],
    draft: ['amber', 'Brouillon'],
    published: ['green', 'Publiée'],
  };
  const [cls, label] = map[status] || ['gray', status];
  return `<span class="pill ${cls}">${esc(label)}</span>`;
}

function emptyState(title, text, actionLabel, action) {
  return `<div class="empty">
    <div class="ic">${icon('spark')}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(text)}</p>
    ${actionLabel ? `<button class="btn btn-primary" data-action="${action}">${esc(actionLabel)}</button>` : ''}
  </div>`;
}

/* ------------------------------------------------------------------ */
/* formulaires inline                                                  */
/* ------------------------------------------------------------------ */

const FORM_HANDLERS = {};
const onForm = (name, handler) => {
  FORM_HANDLERS[name] = handler;
};

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const handler = FORM_HANDLERS[form.dataset.form];
  if (!handler) return;
  const button = form.querySelector('button[type="submit"]');
  const label = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = 'Enregistrement…';
  }
  try {
    await handler(form, new FormData(form));
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = label;
    }
  }
});
