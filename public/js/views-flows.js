/* ------------------------------------------------------------------ */
/* flux : liste dans la fiche bot + éditeur canvas 2D                  */
/* ------------------------------------------------------------------ */

const FLOW_TRIGGERS = {
  slash: { label: 'Commande slash', icon: 'slash' },
  keyword: { label: 'Mot-clé', icon: 'message' },
  join: { label: 'Arrivée d’un membre', icon: 'userPlus' },
  leave: { label: 'Départ d’un membre', icon: 'userMinus' },
  reaction: { label: 'Réaction', icon: 'smile' },
  button: { label: 'Bouton', icon: 'cursor' },
  schedule: { label: 'Planification', icon: 'clock' },
  dm: { label: 'Message privé reçu', icon: 'mail' },
  botJoin: { label: 'Arrivée d’un bot', icon: 'bot' },
  booster: { label: 'Boost du serveur', icon: 'spark' },
  automation: { label: 'Automatisation', icon: 'zap' },
};

const FLOW_BLOCKS = {
  message: { label: 'Message', icon: 'message', tone: 'violet', group: 'message', hint: 'Texte, boutons et options de réponse' },
  embed: { label: 'Embed', icon: 'layers', tone: 'cyan', group: 'message', hint: 'Carte enrichie avec champs et images' },
  dm: { label: 'Message privé', icon: 'mail', tone: 'cyan', group: 'message', hint: 'Envoie un message privé au membre' },
  button: { label: 'Boutons', icon: 'cursor', tone: 'violet', group: 'message', hint: 'Jusqu’à 5 boutons cliquables' },
  react: { label: 'Réaction', icon: 'smile', tone: 'grey', group: 'message', hint: 'Ajoute un emoji' },
  random: { label: 'Variantes', icon: 'shuffle', tone: 'pink', group: 'message', hint: 'Réponses aléatoires pondérées' },
  role: { label: 'Rôle', icon: 'shield', tone: 'green', group: 'gestion', hint: 'Ajoute ou retire un rôle' },
  channel: { label: 'Salon', icon: 'hashtag', tone: 'green', group: 'gestion', hint: 'Crée un salon textuel ou vocal' },
  pin: { label: 'Épingler', icon: 'pin', tone: 'green', group: 'gestion', hint: 'Épingle le message' },
  delete: { label: 'Supprimer', icon: 'trash', tone: 'pink', group: 'gestion', hint: 'Efface des messages' },
  setvar: { label: 'Variable', icon: 'variable', tone: 'violet', group: 'logique', hint: 'Assigne une valeur' },
  counter: { label: 'Calcul', icon: 'calc', tone: 'violet', group: 'logique', hint: 'Additionne ou retire' },
  condition: { label: 'Condition', icon: 'branch', tone: 'amber', group: 'logique', hint: 'Deux branches vrai / faux' },
  wait: { label: 'Attendre', icon: 'clock', tone: 'grey', group: 'logique', hint: 'Pause avant de continuer' },
  timer: { label: 'Compte à rebours', icon: 'clock', tone: 'amber', group: 'logique', hint: 'Décompte avec message de fin' },
  chrono: { label: 'Chronomètre', icon: 'clock', tone: 'amber', group: 'logique', hint: 'Démarre, arrête ou affiche le chrono du service actuel' },
  serviceStart: { label: 'Service : démarrer', icon: 'play', tone: 'green', group: 'service', hint: 'Démarre le pointage du membre' },
  serviceStop: { label: 'Service : arrêter', icon: 'stop', tone: 'pink', group: 'service', hint: 'Ajoute le temps écoulé au total' },
  servicePenalty: { label: 'Service : pénalité', icon: 'alert', tone: 'amber', group: 'service', hint: 'Demande le membre et la durée de la pénalité' },
  serviceLeaderboard: { label: 'Service : classement', icon: 'award', tone: 'amber', group: 'service', hint: 'Classement service, pénalité et total' },
  serviceOnline: { label: 'Service : chrono en ligne', icon: 'clock', tone: 'green', group: 'service', hint: 'Affiche les personnes en service, une par ligne, et actualise l’encadré' },
  serviceConfig: { label: 'Service : période', icon: 'gear', tone: 'grey', group: 'service', hint: 'Choisit la période et la remise à zéro' },
  serviceReset: { label: 'Service : réinitialiser', icon: 'trash', tone: 'pink', group: 'service', hint: 'Remet les compteurs à zéro' },
  cooldown: { label: 'Anti-spam', icon: 'shield', tone: 'amber', group: 'logique', hint: 'Limite la fréquence' },
  typing: { label: 'Saisie', icon: 'keyboard', tone: 'grey', group: 'technique', hint: 'Affiche « écrit… »' },
  webhook: { label: 'HTTP', icon: 'plug', tone: 'cyan', group: 'technique', hint: 'Appelle une API externe' },
  log: { label: 'Journal', icon: 'terminal', tone: 'grey', group: 'technique', hint: 'Note dans les logs' },
  note: { label: 'Note', icon: 'edit', tone: 'grey', group: 'logique', hint: 'Note interne, stockée mais jamais envoyée' },
  reply: { label: 'Répondre', icon: 'message', tone: 'violet', group: 'message', hint: 'Répond au message déclencheur' },
  edit: { label: 'Modifier un message', icon: 'edit', tone: 'cyan', group: 'message', hint: 'Édite un message envoyé par le bot' },
  thread: { label: 'Créer un fil', icon: 'message', tone: 'cyan', group: 'message', hint: 'Ouvre un fil de discussion' },
  forum: { label: 'Post forum', icon: 'message', tone: 'cyan', group: 'message', hint: 'Publie dans un salon forum' },
  forumAction: { label: 'Forum : message / fermer', icon: 'message', tone: 'cyan', group: 'message', hint: 'Répond ou ferme un post de forum' },
  forumDelete: { label: 'Supprimer un message forum', icon: 'trash', tone: 'pink', group: 'moderation', hint: 'Efface un message dans un post de forum' },
  ai: { label: 'Réponse IA', icon: 'spark', tone: 'cyan', group: 'message', hint: 'Répond sans clé API obligatoire' },
  image: { label: 'Image / GIF', icon: 'file', tone: 'cyan', group: 'message', hint: 'Envoie une image ou un GIF' },
  music: { label: 'Musique', icon: 'music', tone: 'pink', group: 'technique', hint: 'Joue un son en vocal ou en privé' },
  poll: { label: 'Sondage', icon: 'chart', tone: 'amber', group: 'interaction', hint: 'Crée un sondage natif Discord' },
  select: { label: 'Menu déroulant', icon: 'cursor', tone: 'violet', group: 'interaction', hint: 'Menu de choix interactif' },
  modal: { label: 'Formulaire', icon: 'template', tone: 'violet', group: 'interaction', hint: 'Ouvre une fenêtre de saisie' },
  giveaway: { label: 'Giveaway', icon: 'award', tone: 'pink', group: 'interaction', hint: 'Tirage au sort avec durée' },
  await: { label: 'Attendre interaction', icon: 'clock', tone: 'grey', group: 'interaction', hint: 'Attend un clic, une réaction ou un message' },
  accountCheck: { label: 'Vérifier le compte', icon: 'shield', tone: 'amber', group: 'moderation', hint: 'Âge, avatar et comptes bots' },
  automationRun: { label: 'Lancer une automatisation', icon: 'zap', tone: 'pink', group: 'moderation', hint: 'Déclenche une automatisation du bot' },
  moderation: { label: 'Modération complète', icon: 'shield', tone: 'pink', group: 'moderation', hint: 'Avertir, timeout, kick, ban, purge, lock, mute vocal…' },
  timeout: { label: 'Exclure temporairement', icon: 'clock', tone: 'amber', group: 'moderation', hint: 'Rend le membre muet pendant une durée' },
  kick: { label: 'Expulser', icon: 'userMinus', tone: 'pink', group: 'moderation', hint: 'Retire le membre du serveur' },
  ban: { label: 'Bannir', icon: 'shield', tone: 'pink', group: 'moderation', hint: 'Bannit le membre du serveur' },
  nickname: { label: 'Changer le pseudo', icon: 'edit', tone: 'green', group: 'moderation', hint: 'Modifie le surnom du membre' },
  move: { label: 'Déplacer en vocal', icon: 'video', tone: 'green', group: 'gestion', hint: 'Déplace le membre dans un salon vocal' },
  invite: { label: 'Invitation', icon: 'link', tone: 'green', group: 'gestion', hint: 'Créer, voir ou envoyer un lien d’invitation' },
  ticket: { label: 'Gérer un ticket', icon: 'ticket', tone: 'green', group: 'gestion', hint: 'Ouvre, réclame ou ferme un ticket' },
  level: { label: 'Ajouter de l’XP', icon: 'zap', tone: 'green', group: 'gestion', hint: 'Ajoute ou retire de l’XP' },
  randomNumber: { label: 'Nombre aléatoire', icon: 'shuffle', tone: 'violet', group: 'logique', hint: 'Tire un nombre entre deux bornes' },
  string: { label: 'Manipuler le texte', icon: 'code', tone: 'violet', group: 'logique', hint: 'Majuscules, minuscules, remplacement…' },
  json: { label: 'Extraire du JSON', icon: 'code', tone: 'violet', group: 'logique', hint: 'Lit une valeur dans une réponse JSON' },
  date: { label: 'Date / heure', icon: 'clock', tone: 'violet', group: 'logique', hint: 'Formate la date et l’heure actuelles' },
  stop: { label: 'Arrêter le flux', icon: 'x', tone: 'pink', group: 'logique', hint: 'Stoppe le flux immédiatement' },
  database: { label: 'Base de données', icon: 'layers', tone: 'cyan', group: 'technique', hint: 'Stocke ou lit une valeur persistante' },
  captcha: { label: 'Vérification', icon: 'shield', tone: 'amber', group: 'technique', hint: 'Demande une vérification au membre' },
};

const FLOW_GROUPS = [
  ['message', 'Messages'],
  ['interaction', 'Interactions'],
  ['gestion', 'Gestion du serveur'],
  ['moderation', 'Modération'],
  ['service', 'Service & pointage'],
  ['logique', 'Logique'],
  ['technique', 'Technique & données'],
];

const FLOW_OPERATORS = {
  eq: 'est égal à',
  neq: 'est différent de',
  contains: 'contient',
  notContains: 'ne contient pas',
  startsWith: 'commence par',
  endsWith: 'se termine par',
  gt: 'supérieur à',
  lt: 'inférieur à',
  gte: 'supérieur ou égal',
  lte: 'inférieur ou égal',
  hasRole: 'possède le rôle',
  chance: 'chance (%)',
};

const FLOW_TEMPLATES = [
  { value: '', label: 'Flux vide', hint: 'Vous ajoutez les blocs vous-même, avec l’aide affichée sur le canvas.' },
  { value: 'welcome', label: 'Bienvenue', hint: 'Exemple prêt : message, condition, rôle et message privé.' },
  { value: 'ticket', label: 'Ticket support', hint: 'Exemple prêt : ticket privé avec rôle staff, logs et boutons.' },
  { value: 'servicechrono', label: 'Chrono service', hint: 'Commande /chrono qui affiche le temps de service en cours.' },
  { value: 'serviceonline', label: 'Chrono en ligne', hint: 'Encadré actualisé avec chaque personne en service et son temps en ligne.' },
  { value: 'quiz', label: 'Quiz', hint: 'Variantes, attente, condition et score.' },
  { value: 'moderation', label: 'Filtre anti-spam', hint: 'Anti-spam, condition et sanction.' },
  { value: 'support', label: 'Relance support', hint: 'HTTP, message privé, attente et épinglage.' },
  { value: 'botjoin', label: 'Arrivée d’un bot', hint: 'Message, rôle et journal pour un nouveau bot.' },
  { value: 'verification', label: 'Vérification', hint: 'Bouton, formulaire, rôle et journal.' },
  { value: 'giveaway', label: 'Giveaway', hint: 'Tirage, sondage, attente et annonce.' },
  { value: 'booster', label: 'Remerciement boost', hint: 'Message automatique quand un membre booste le serveur.' },
  { value: 'automation', label: 'Réaction automatisation', hint: 'Journal et annonce quand une automatisation se déclenche.' },
  { value: 'botguard', label: 'Bouclier anti-bots', hint: 'Vérifie le compte, isole les suspects et accueille les membres valides.' },
];


const VARIANT_BANK = [
  {
    theme: 'Accueil',
    items: [
      'Bienvenue {{user.mention}}, installe-toi, on est ravis de te voir !',
      'Salut {{user.name}} ! Passe lire les règles puis présente-toi.',
      'Un nouveau visage : bienvenue sur {{server.name}} !',
      'Te voilà parmi nous, {{user.name}} ! Prends un cookie 🍪',
      'Bienvenue ! Ton aventure commence dans #présentations.',
      'Hey {{user.name}}, n’hésite pas à poser tes questions.',
      'Bienvenue à bord ! Le staff est là si besoin.',
      'Nouveau membre détecté : {{user.name}} vient d’arriver !',
    ],
  },
  {
    theme: 'Absence et retour',
    items: [
      'Bon retour {{user.name}}, tu nous as manqué !',
      'Content de te revoir parmi nous.',
      'Te revoilà ! On a gardé ta place.',
      'Absence notée, reviens vite {{user.name}}.',
      'Repos bien mérité, à très vite sur le serveur.',
      'Le serveur est resté calme pendant ton absence… ou presque.',
      'Retour enregistré, tes rôles sont restaurés.',
      'Bon retour ! Tu as raté quelques annonces dans #news.',
    ],
  },
  {
    theme: 'Quiz et formation',
    items: [
      'Question : quelle commande affiche ton niveau ?',
      'Question : combien de modules compte la formation Discord ?',
      'Question : quel rôle obtient-on à 10 messages ?',
      'Question : que fait la commande /ticket ?',
      'Question : à quoi sert un webhook ?',
      'Question : comment obtient-on un certificat ?',
      'Question : que signifie l’acronyme XP ?',
      'Question : quel bloc sert à tester une condition ?',
    ],
  },
  {
    theme: 'Modération',
    items: [
      '{{user.mention}}, merci de garder un ton respectueux.',
      'Ce lien n’est pas autorisé sur le serveur.',
      'Message supprimé : publicité non autorisée.',
      'Doucement sur le spam, {{user.name}}.',
      'Le sujet a déjà été traité dans #faq.',
      'Merci d’éviter les majuscules, c’est considéré comme du cri.',
      'Ce salon est réservé aux annonces du staff.',
      'Sanction appliquée : avertissement 1 sur 3.',
    ],
  },
  {
    theme: 'Événements',
    items: [
      'Le concours commence dans 10 minutes, préparez-vous !',
      'Réagis avec 🎉 pour participer au tirage.',
      'Soirée jeu ce vendredi à 21 h, qui est partant ?',
      'Dernière chance de s’inscrire à l’événement.',
      'Bravo aux participants, le classement arrive.',
      'Le stream démarre, rejoins le salon vocal.',
      'Nouvelle animation : devine le nombre mystère.',
      'Merci à tous pour cette soirée, on remet ça bientôt !',
    ],
  },
  {
    theme: 'Relance et support',
    items: [
      'Petit rappel : ton ticket est toujours ouvert, {{user.name}}.',
      'Le staff a répondu, tu peux jeter un œil au ticket.',
      'Sans réponse d’ici 24 h, le ticket sera fermé automatiquement.',
      'Besoin d’aide ? Ouvre un ticket avec /ticket.',
      'Ta demande a bien été prise en compte.',
      'On revient vers toi dès que possible.',
      'Le problème est résolu, on ferme le ticket ?',
      'N’oublie pas de noter la qualité du support.',
    ],
  },
];

const FLOW_CHANNELS = ['#bienvenue', '#général', '#annonces', '#logs', '#support', '#niveaux', '#règles'];
const FLOW_CATEGORIES = ['Accueil', 'Support', 'Modération', 'Formation', 'Logs', 'Annonces'];
const FLOW_ROLES = ['Membre', 'Modérateur', 'Administrateur', 'Bot', 'VIP'];

function flowDiscord() {
  const bot = state.ws?.bots?.find((entry) => entry.id === flowEditor.botId);
  const source = bot?.discord || {};
  const channels = (Array.isArray(source.channels) && source.channels.length ? source.channels : FLOW_CHANNELS)
    .map((channel) => (typeof channel === 'string'
      ? { name: channel.replace(/^#/, ''), type: 'text', category: '' }
      : channel));
  const seenRoles = new Set();
  const roles = (Array.isArray(source.roles) && source.roles.length ? source.roles : FLOW_ROLES)
    .map((role) => (typeof role === 'string' ? { name: role, color: '#7c5cff' } : role))
    .filter((role) => role?.name && !seenRoles.has(role.name) && seenRoles.add(role.name))
    .concat([{ id: 'everyone', name: 'everyone', color: '#94a3b8' }]);
  const categories = Array.isArray(source.categories) && source.categories.length
    ? source.categories
    : [...new Set(channels.map((channel) => channel.category).filter(Boolean))];
  return {
    name: source.name || 'Serveur Discord',
    channels,
    roles,
    categories: categories.length ? categories : FLOW_CATEGORIES,
  };
}

function flowSelectOptions(values, selected, emptyLabel = '') {
  const value = String(selected || '');
  const list = [...new Set(values.map((entry) => String(entry)).filter(Boolean))];
  const extra = value && !list.includes(value) ? [value] : [];
  return `${emptyLabel ? `<option value="">${esc(emptyLabel)}</option>` : ''}${[...list, ...extra]
    .map((entry) => `<option value="${esc(entry)}" ${entry === value ? 'selected' : ''}>${esc(entry)}</option>`)
    .join('')}`;
}

function flowChannelSelect(bind, value, options = {}) {
  const meta = flowDiscord();
  const types = options.types || ['text', 'forum'];
  const channels = meta.channels
    .filter((channel) => types.includes(channel.type || 'text'))
    .map((channel) => `#${channel.name}`);
  return `<select class="select" ${bind}>${flowSelectOptions(channels, value, options.emptyLabel ?? 'Salon du déclencheur')}</select>`;
}

function flowRoleSelect(bind, value) {
  return `<select class="select" ${bind}>${flowSelectOptions(flowDiscord().roles.map((role) => role.name), value, 'Choisir un rôle…')}</select>`;
}

function flowCategorySelect(bind, value, emptyLabel = 'Choisir une catégorie…') {
  return `<select class="select" ${bind}>${flowSelectOptions(flowDiscord().categories, value, emptyLabel)}</select>`;
}

function flowTargetSelect(bind, blockId, selected) {
  const blocks = (flowEditor.flow?.blocks || []).filter((block) => block.id !== blockId);
  const options = blocks.map((block) => {
    const meta = FLOW_BLOCKS[block.type] || FLOW_BLOCKS.message;
    const detail = block.text || block.title || block.name || block.role || block.reason || '';
    return `<option value="${esc(block.id)}" ${block.id === selected ? 'selected' : ''}>${esc(meta.label)}${detail ? ` · ${esc(flowText(detail, '', 42))}` : ''}</option>`;
  });
  return `<select class="select" ${bind}><option value="">Aucune sortie</option>${options.join('')}</select>`;
}

const flowEditor = {
  botId: null,
  flow: null,
  dirty: false,
  view: null,
  sideOpen: true,
  editBlockId: null,
  messageEditorBlockId: null,
};

let flowLastField = null;
let flowFieldVarSeq = 0;
let flowVarPicker = null;
let flowVarTarget = null;
let roleMentionPop = null;
let roleMentionTarget = null;
let roleMentionStart = -1;
let roleMentionItems = [];
let roleMentionIndex = 0;

const flowClone = (value) => JSON.parse(JSON.stringify(value));
const flowUid = () => window.crypto?.randomUUID?.() || `id-${Math.random().toString(36).slice(2, 10)}`;
const flowNode = (id) => flowEditor.flow?.blocks.find((block) => block.id === id) || null;

function blockButtons(block) {
  if (Array.isArray(block.buttons) && block.buttons.length) return block.buttons;
  return [{
    id: `${block.id}-b0`,
    label: block.label || 'Bouton',
    value: block.value || '',
    style: block.style || 'primary',
    emoji: block.emoji || '',
    disabled: Boolean(block.disabled),
    url: block.url || '',
    target: block.target || '',
    next: block.next || null,
  }];
}

function ensureFlowButtons(block) {
  if (!Array.isArray(block.buttons) || !block.buttons.length) return [];
  block.buttons.forEach((button) => {
    if (!button.id) button.id = flowUid();
    if (button.next === undefined) button.next = null;
  });
  return block.buttons;
}

function ensureBlockButtons(block) {
  if (!Array.isArray(block.buttons) || !block.buttons.length) {
    block.buttons = blockButtons(block).map((button) => ({ ...button, next: button.next || null }));
  }
  return ensureFlowButtons(block);
}

function flowOutputPairs(block) {
  if (block.type === 'condition') {
    return [
      { branch: 'then', target: block.thenId || null, tone: 'ok', label: 'vrai' },
      { branch: 'else', target: block.elseId || null, tone: 'alt', label: 'faux' },
    ];
  }
  if (block.type === 'ticket') {
    const base = {
      branch: 'next',
      target: block.next || null,
      tone: 'ok',
      label: (block.action || 'open') === 'open' ? 'après ouverture' : 'après l’action',
    };
    if ((block.action || 'open') !== 'open') return [base];
    return [base, ...ensureFlowButtons(block).map((button, index) => ({
      branch: `button:${button.id}`,
      target: button.next || null,
      tone: 'ok',
      label: `${button.emoji ? `${button.emoji} ` : ''}${button.label || `Bouton ${index + 1}`}`,
    }))];
  }
  if (block.type === 'button' || (block.type === 'message' && Array.isArray(block.buttons) && block.buttons.length)) {
    if (!Array.isArray(block.buttons) || !block.buttons.length) {
      block.buttons = blockButtons(block);
    }
    const buttons = ensureFlowButtons(block);
    if (buttons.length) {
      return buttons.map((button, index) => ({
        branch: `button:${button.id}`,
        target: button.next || null,
        tone: 'ok',
        label: `${button.emoji ? `${button.emoji} ` : ''}${button.label || `Bouton ${index + 1}`}`,
      }));
    }
  }
  if (block.type === 'random' && Array.isArray(block.variants) && block.variants.length) {
    const total = block.variants.reduce((sum, variant) => sum + (Number(variant.weight) || 1), 0);
    return block.variants.map((variant, index) => ({
      branch: `variant:${variant.id}`,
      target: variant.next || null,
      tone: 'ok',
      label: `V${index + 1} · ${Math.round(((Number(variant.weight) || 1) / total) * 100)} %`,
    }));
  }
  return [{ branch: 'next', target: block.next || null, tone: 'ok', label: '' }];
}

function flowNewBlock(type, x = 120, y = 120) {
  const base = { id: flowUid(), type, x, y, next: null };
  switch (type) {
    case 'embed':
      return { ...base, channel: '', title: 'Titre', url: '', description: '', color: '#7c5cff', footer: '', footerIcon: '', author: '', authorIcon: '', image: '', thumbnail: '', timestamp: false, ephemeral: false, dm: false, deleteAfter: 0, silent: false, fields: [] };
    case 'dm':
      return { ...base, text: '', target: '', embed: false, title: '', description: '', color: '#7c5cff' };
    case 'button':
      return {
        ...base,
        channel: '',
        buttons: [{ id: flowUid(), label: 'Bouton 1', value: '', style: 'primary', emoji: '', disabled: false, url: '', target: '', next: null }],
      };
    case 'role':
      return { ...base, action: 'add', role: 'Membre', duration: 0, durationUnit: 'minutes', reason: '' };
    case 'channel':
      return { ...base, name: 'nouveau-salon', kind: 'text', category: '', topic: '', nsfw: false, slowmode: 0 };
    case 'pin':
      return { ...base, unpin: false };
    case 'delete':
      return { ...base, channel: '', count: 1 };
    case 'setvar':
      return { ...base, name: 'compteur', value: '1' };
    case 'counter':
      return { ...base, name: 'score', op: 'add', value: '1' };
    case 'condition':
      return { ...base, mode: 'all', rules: [{ id: flowUid(), left: '{{user.roles}}', op: 'contains', right: 'Membre' }], thenId: null, elseId: null, next: undefined };
    case 'wait':
      return { ...base, seconds: 3 };
    case 'timer':
      return {
        ...base,
        action: 'countdown',
        channel: '',
        duration: 5,
        unit: 'minutes',
        startText: '⏳ Fin {{time}}',
        endText: '⏰ Temps écoulé !',
        wait: false,
        ephemeral: false,
        dm: false,
        silent: false,
      };
    case 'chrono':
      return {
        ...base,
        action: 'start',
        channel: '',
        variable: 'chrono_start',
        startText: '⏱️ Chronomètre démarré.',
        stopText: '⏱️ Temps écoulé : {{elapsed}}',
        serviceText: '⏱️ {{member}} est en service depuis {{elapsed}}.',
        emptyServiceText: '⚠️ Aucun service en cours pour {{member}}.',
        ephemeral: false,
        dm: false,
        silent: false,
      };
    case 'serviceStart':
      return {
        ...base,
        channel: '',
        startText: '▶️ Service démarré pour {{member}}.',
        alreadyText: '⚠️ Service déjà en cours depuis {{since}}.',
        ephemeral: false,
        dm: false,
        silent: false,
      };
    case 'serviceStop':
      return {
        ...base,
        channel: '',
        stopText: '⏹️ Service terminé : {{duration}} ajoutées. Service : {{service}} · Pénalité : {{penalty}} · Total : {{total}}.',
        emptyText: '⚠️ Aucun service en cours pour {{member}}.',
        ephemeral: false,
        dm: false,
        silent: false,
      };
    case 'servicePenalty':
      return {
        ...base,
        channel: '',
        title: 'Pénalité de service',
        penaltyText: '✅ Pénalité de {{penalty_added}} ajoutée à {{member}}. Service : {{service}} · Pénalité totale : {{penalty}} · Total : {{total}}.',
      };
    case 'serviceLeaderboard':
      return {
        ...base,
        channel: '',
        title: 'Classement du service',
        top: 10,
        ephemeral: false,
      };
    case 'serviceOnline':
      return {
        ...base,
        channel: '',
        title: '🟢 Chrono en ligne',
        emptyText: 'Personne n’est en service pour le moment.',
        interval: 60,
        maxEntries: 25,
      };
    case 'serviceConfig':
      return {
        ...base,
        channel: '',
        period: 'week',
        resetDay: 1,
        resetHour: 0,
        timezone: 'Europe/Paris',
        message: '✅ Période du service : {{period}}.',
        ephemeral: false,
        dm: false,
        silent: false,
      };
    case 'serviceReset':
      return {
        ...base,
        channel: '',
        message: '🧹 Les compteurs du service ont été réinitialisés.',
        ephemeral: false,
        dm: false,
        silent: false,
      };
    case 'cooldown':
      return { ...base, seconds: 10, scope: 'member' };
    case 'typing':
      return { ...base, seconds: 2 };
    case 'webhook':
      return { ...base, method: 'POST', url: '', body: '' };
    case 'random':
      return {
        ...base,
        channel: '',
        ephemeral: false,
        dm: false,
        deleteAfter: 0,
        silent: false,
        reply: false,
        tts: false,
        suppressEmbeds: false,
        embed: false,
        title: '',
        description: '',
        color: '#7c5cff',
        footer: '',
        footerIcon: '',
        author: '',
        authorIcon: '',
        image: '',
        thumbnail: '',
        timestamp: false,
        fields: [],
        variants: [
          { id: flowUid(), text: 'Première variante', weight: 1, next: null },
          { id: flowUid(), text: 'Deuxième variante', weight: 1, next: null },
        ],
      };
    case 'message':
      return {
        ...base,
        channel: '',
        text: '',
        variantMode: false,
        variants: [],
        buttons: [],
        ephemeral: false,
        dm: false,
        deleteAfter: 0,
        reply: false,
        tts: false,
        silent: false,
        suppressEmbeds: false,
      };
    case 'react':
      return { ...base, emoji: '👍' };
    case 'log':
      return { ...base, text: '' };
    case 'reply':
      return { ...base, channel: '', text: '', ping: true, ephemeral: false, dm: false, deleteAfter: 0 };
    case 'edit':
      return { ...base, messageRef: 'dernier', text: '', embed: false, title: '', description: '', color: '#7c5cff' };
    case 'thread':
      return { ...base, name: 'discussion', archive: '1440', private: false };
    case 'forum':
      return { ...base, channel: '', title: 'Nouveau post', content: '', tags: '' };
    case 'forumAction':
      return { ...base, action: 'message', channel: '', post: '', content: '', reason: 'Post fermé par le staff.' };
    case 'forumDelete':
      return { ...base, channel: '', post: '', message: 'last' };
    case 'ai':
      return { ...base, channel: '', prompt: '{{message}}', provider: 'auto', model: 'gpt-4o-mini', maxTokens: 300, variable: 'ia' };
    case 'image':
      return { ...base, channel: '', url: '', alt: '' };
    case 'music':
      return { ...base, action: 'play', mode: 'voice', channel: '', url: '', title: '', volume: 80, loop: false };
    case 'poll':
      return { ...base, channel: '', question: 'Votre avis ?', options: 'Oui\nNon\nPeut-être', duration: 24, multiple: false };
    case 'select':
      return { ...base, channel: '', placeholder: 'Choisissez…', options: 'Option 1\nOption 2', min: 1, max: 1 };
    case 'modal':
      return {
        ...base,
        channel: '',
        title: 'Formulaire',
        fields: [
          { id: flowUid(), label: 'Nom', type: 'short', required: true, placeholder: '' },
          { id: flowUid(), label: 'Email', type: 'short', required: false, placeholder: '' },
        ],
        submitLabel: 'Envoyer',
      };
    case 'giveaway':
      return { ...base, channel: '', prize: 'Un mois de Nitro', duration: 24, winners: 1, emoji: '🎉' };
    case 'await':
      return { ...base, kind: 'button', timeout: 60 };
    case 'automationRun':
      return { ...base, automationType: 'autoMod', notify: true };
    case 'accountCheck':
      return {
        ...base,
        minAgeDays: 7,
        requireAvatar: false,
        blockBots: true,
        failAction: 'stop',
        failMessage: '🚫 Ton compte est trop récent ou suspect. Réessaie dans quelques jours ou contacte le staff.',
        variable: 'account_ok',
        channel: '',
      };
    case 'moderation':
      return {
        ...base,
        action: 'warn',
        target: '',
        duration: 10,
        durationUnit: 'minutes',
        reason: 'Règles du serveur',
        deleteDays: 0,
        deleteMessages: false,
        amount: 10,
        seconds: 10,
        role: '',
        channel: '',
        nickname: '',
        notify: true,
        notifyMessage: 'Tu as reçu une sanction : {{reason}}',
        logChannel: '',
        evidence: '',
      };
    case 'timeout':
      return { ...base, duration: 10, reason: 'Comportement contraire aux règles' };
    case 'kick':
      return { ...base, reason: 'Règles non respectées' };
    case 'ban':
      return { ...base, reason: 'Règles non respectées', deleteDays: 0 };
    case 'nickname':
      return { ...base, nickname: '{{user.name}}' };
    case 'move':
      return { ...base, channel: '#vocal' };
    case 'invite':
      return {
        ...base,
        action: 'create',
        channel: '#général',
        invite: '',
        maxUses: 0,
        maxAge: 24,
        temporary: false,
        delivery: 'channel',
        message: 'Invitation : {{invite}}',
        variable: 'invite',
      };
    case 'note':
      return { ...base, title: 'Note', text: '' };
    case 'ticket':
      return {
        ...base,
        action: 'open',
        category: '',
        reason: 'Demande de support',
        staffRole: 'Support',
        logChannel: '#logs',
        welcomeMessage: 'Ton ticket est ouvert. Décris ton problème, un membre du staff arrive.',
        maxOpen: 1,
        namePrefix: 'ticket',
        topicTemplate: 'Ticket de {user} — {reason}',
        closeMode: 'delete',
        closeDelay: 3,
        archiveCategory: '',
        transcript: false,
        pingStaff: true,
        claimButton: true,
        closeButton: true,
        buttons: [],
      };
    case 'level':
      return { ...base, amount: 10, variable: 'xp' };
    case 'randomNumber':
      return { ...base, min: 1, max: 100, variable: 'nombre' };
    case 'string':
      return { ...base, operation: 'upper', source: '{{message}}', search: '', replace: '', variable: 'texte' };
    case 'json':
      return { ...base, source: '', path: 'data.value', variable: 'valeur' };
    case 'date':
      return { ...base, format: 'dd/MM/yyyy HH:mm', variable: 'date' };
    case 'stop':
      return { ...base, reason: 'Flux terminé' };
    case 'database':
      return { ...base, action: 'set', key: 'cle', value: '', variable: 'valeur' };
    case 'captcha':
      return { ...base, kind: 'button', timeout: 120, role: '' };
    default:
      return { ...base, channel: '', text: '', ephemeral: false, reply: false, tts: false, silent: false, suppressEmbeds: false };
  }
}

function flowCloneBlock(block, offset = 48) {
  const copy = flowClone(block);
  copy.id = flowUid();
  copy.next = null;
  if (copy.thenId !== undefined) {
    copy.thenId = null;
    copy.elseId = null;
  }
  copy.x += offset;
  copy.y += offset;
  if (Array.isArray(copy.rules)) copy.rules.forEach((rule) => (rule.id = flowUid()));
  if (Array.isArray(copy.variants)) copy.variants.forEach((variant) => { variant.id = flowUid(); variant.next = null; });
  if (Array.isArray(copy.buttons)) copy.buttons.forEach((button) => { button.id = flowUid(); button.next = null; });
  if (Array.isArray(copy.fields)) copy.fields.forEach((field) => (field.id = flowUid()));
  return copy;
}

function flowLayout() {
  const flow = flowEditor.flow;
  const byId = new Map(flow.blocks.map((block) => [block.id, block]));
  const levels = new Map();
  const queue = [];
  if (flow.start && byId.has(flow.start)) {
    levels.set(flow.start, 0);
    queue.push(flow.start);
  }
  while (queue.length) {
    const id = queue.shift();
    const block = byId.get(id);
    if (!block) continue;
    const targets = flowOutputPairs(block).map((pair) => pair.target);
    for (const target of targets) {
      if (target && byId.has(target) && !levels.has(target)) {
        levels.set(target, levels.get(id) + 1);
        queue.push(target);
      }
    }
  }
  let maxLevel = 0;
  for (const level of levels.values()) maxLevel = Math.max(maxLevel, level);
  const used = new Map();
  const orphans = [];
  for (const block of flow.blocks) {
    if (!levels.has(block.id)) {
      orphans.push(block);
      continue;
    }
    const level = levels.get(block.id);
    const index = used.get(level) || 0;
    used.set(level, index + 1);
    block.x = 80 + level * 340;
    block.y = 80 + index * 240;
  }
  orphans.forEach((block, index) => {
    block.x = 80 + (index % 3) * 340;
    block.y = 80 + (maxLevel + 2) * 240 + Math.floor(index / 3) * 240;
  });
  flowEditor.view = null;
}

/* ------------------------------------------------------------------ */
/* onglet « Flux » de la fiche bot                                     */
/* ------------------------------------------------------------------ */

function viewBotFlows(bot) {
  const server = activeBotServer(bot);
  const serverName = server?.guildName || server?.name || 'ce serveur';
  const flows = server ? (bot.flows || []).filter((flow) => itemServerKey(bot, flow) === server.id) : bot.flows || [];
  const active = flows.filter((flow) => flow.enabled).length;

  return `<div class="panel">
    <div class="panel-head">
      <h3>Flux · ${esc(serverName)}</h3>
      <div class="ph-actions">
        <span class="pill violet">${active} actif(s)</span>
        <button class="btn btn-primary btn-sm" data-action="new-flow" data-id="${esc(bot.id)}">${icon('plus')} Nouveau flux</button>
      </div>
    </div>
    <div class="panel-body">
      ${
        flows.length
          ? `<div class="flow-list">${flows
              .map((flow) => {
                const trigger = FLOW_TRIGGERS[flow.trigger?.type] || FLOW_TRIGGERS.slash;
                const links = (flow.blocks || []).filter((block) => block.next || block.thenId || block.elseId).length;
                const flowServer =
                  botDiscordServers(bot).find((server) => server.id === flow.serverId || server.guildId === flow.serverId) ||
                  activeBotServer(bot);
                return `<div class="flow-card">
                  <span class="fl-ic">${icon(trigger.icon)}</span>
                  <div class="fl-main">
                    <h4>${esc(flow.name)} ${flow.enabled ? '' : '<span class="pill grey">En pause</span>'}</h4>
                    <p>${esc(flow.description || trigger.label)}</p>
                    <div class="fl-meta">
                      ${flow.trigger?.type === 'slash' && flowServer ? `<span>${esc(flowServer.guildName || flowServer.name || 'Serveur Discord')}</span>` : ''}
                      <span>${flow.blocks?.length || 0} bloc(s)</span>
                      <span>${links} connexion(s)</span>
                      <span>${fmt(flow.runs || 0)} exécution(s)</span>
                    </div>
                  </div>
                  <button class="switch ${flow.enabled ? 'on' : ''}" data-action="toggle-flow" data-id="${esc(bot.id)}" data-flow="${esc(flow.id)}" aria-label="Activer ${esc(flow.name)}"></button>
                  <a class="btn btn-sm btn-ghost" href="#/bots/${esc(bot.id)}/flows/${esc(flow.id)}">${icon('edit')} Ouvrir</a>
                  <button class="mini-btn danger" data-action="delete-flow" data-id="${esc(bot.id)}" data-flow="${esc(flow.id)}" title="Supprimer">${icon('trash')}</button>
                </div>`;
              })
              .join('')}</div>`
          : `<div class="empty" style="padding:38px 20px">
              <div class="ic">${icon('flow')}</div>
              <h3>Aucun flux sur ${esc(serverName)}</h3>
              <p>Un flux part d’un déclencheur puis enchaîne des blocs reliés entre eux.</p>
              <button class="btn btn-primary" data-action="new-flow" data-id="${esc(bot.id)}">Créer un premier flux</button>
            </div>`
      }
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* éditeur                                                             */
/* ------------------------------------------------------------------ */

function flowEnsureLoaded(botId, flowId) {
  if (flowEditor.flow?.id === flowId && flowEditor.botId === botId) return true;
  const bot = state.ws.bots.find((entry) => entry.id === botId);
  const flow = bot?.flows?.find((entry) => entry.id === flowId);
  if (!flow) return false;
  flowEditor.botId = botId;
  flowEditor.flow = flowClone(flow);
  for (const block of flowEditor.flow.blocks || []) {
    if (block.type === 'timer' && ['start', 'stop'].includes(block.action)) block.type = 'chrono';
  }
  flowEditor.dirty = false;
  flowEditor.view = null;
  flowEditor.editBlockId = null;
  flowEditor.messageEditorBlockId = null;
  flowEditor.sideOpen = typeof window === 'undefined' ? true : window.innerWidth > 1100;
  if (!flowEditor.flow.blocks.length) {
    const start = flowNewBlock('message', 220, 160);
    start.text = 'Bienvenue {{user.mention}} !';
    start.channel = '#général';
    flowEditor.flow.blocks.push(start);
    flowEditor.flow.start = start.id;
    flowEditor.dirty = true;
  }
  return true;
}

function flowCanvasStyle() {
  const value = appearanceSettings().canvasStyle;
  return ['dots', 'grid', 'aurora', 'plain'].includes(value) ? value : 'dots';
}


function viewFlowEditor(botId, flowId) {
  const bot = state.ws.bots.find((entry) => entry.id === botId);
  if (!bot) return emptyState('Bot introuvable', 'Ce bot a peut-être été supprimé.', 'Retour aux bots', 'go-bots');
  if (!flowEnsureLoaded(botId, flowId)) {
    return `<div class="empty">
      <div class="ic">${icon('flow')}</div>
      <h3>Flux introuvable</h3>
      <p>Ce flux a peut-être été supprimé.</p>
      <a class="btn btn-primary" href="#/bots/${esc(botId)}">Retour au bot</a>
    </div>`;
  }

  const flow = flowEditor.flow;
  const trigger = FLOW_TRIGGERS[flow.trigger?.type] || FLOW_TRIGGERS.slash;
  const view = flowEditor.view || { x: 40, y: 40, zoom: 1 };

  requestAnimationFrame(() => {
    initFlowCanvas();
  });

  return `<div class="flow-shell">
  <div class="flow-topbar">
  <div class="flow-head">
    <div class="fh-id">
      <span class="fl-ic lg">${icon(trigger.icon)}</span>
      <div class="fh-text">
        <input class="flow-name" id="flowName" value="${esc(flow.name)}" aria-label="Nom du flux" data-flow-name />
        <p>${esc(bot.name)} · ${flow.blocks.length} bloc(s)${flowEditor.dirty ? ' · <span class="fh-dirty">modifications non enregistrées</span>' : ''}</p>
      </div>
    </div>
    <div class="fh-actions">
      <button class="btn btn-primary btn-sm" data-action="flow-save">${icon('save')} Enregistrer et quitter</button>
    </div>
  </div>
  </div>
  <div class="flow-body">
  <div class="flow-layout${flowEditor.sideOpen ? ' side-open' : ''}" id="flowLayout">
    <section class="flow-canvas2d">
      <div class="canvas-toolbar">
        <button class="tool-btn" data-action="flow-toggle-side" title="Afficher ou masquer la palette, le déclencheur et les variables">${icon('layers')} Blocs</button>
        <div class="zoom-group">
          <button class="mini-btn" data-action="flow-zoom" data-dir="-1" title="Zoom arrière">−</button>
          <span class="zoom-label" id="flowZoomLabel">${Math.round(view.zoom * 100)} %</span>
          <button class="mini-btn" data-action="flow-zoom" data-dir="1" title="Zoom avant">+</button>
        </div>
        <button class="tool-btn" data-action="flow-fit" title="Recentrer">${icon('grid')} Recentrer</button>
        <button class="tool-btn" data-action="flow-auto" title="Ranger les blocs">${icon('flow')} Ranger</button>
      </div>
      <div class="canvas-viewport" id="flowViewport" data-canvas="${esc(flowCanvasStyle())}">
        <div class="canvas-world" id="flowWorld" style="transform: translate(${view.x}px, ${view.y}px) scale(${view.zoom})">
          <svg class="canvas-edges" id="flowEdges" aria-hidden="true"></svg>
          ${flow.blocks.map((block) => renderNode(block, flow)).join('')}
        </div>
        ${
          flow.blocks.length
            ? ''
            : `<div class="canvas-hint canvas-hint-empty">
                <div class="che-ic">${icon('flow')}</div>
                <h3>Votre flux est vide</h3>
                <p>Le déclencheur (commande, arrivée, réaction…) se règle dans « Palette &amp; réglages ». Ajoutez ensuite un bloc, reliez-le, puis testez.</p>
                <div class="che-actions">
                  <button class="btn btn-primary btn-sm" data-action="flow-quick-start">${icon('spark')} Créer un exemple</button>
                  <button class="btn btn-ghost btn-sm" data-action="flow-add-menu">${icon('plus')} Ajouter un bloc</button>
                  <button class="btn btn-ghost btn-sm" data-action="flow-toggle-side">${icon('gear')} Déclencheur</button>
                </div>
                <span class="che-steps">1. Déclencheur · 2. Blocs · 3. Connexions · 4. Test</span>
              </div>`
        }
      </div>
    </section>
    <aside class="flow-side" id="flowSide">
      <button class="btn btn-ghost btn-sm flow-drawer-close" data-action="flow-toggle-side">${icon('x')} Fermer</button>
      <details class="flow-guide" open>
        <summary>${icon('spark')} Guide rapide</summary>
        <ol>
          <li>Règle le déclencheur : commande, arrivée, réaction…</li>
          <li>Ajoute un bloc depuis la palette ci-dessous.</li>
          <li>Clique sur un bloc pour le modifier.</li>
          <li>Relie les points de sortie pour enchaîner les blocs.</li>
          <li>Enregistre, puis active le flux.</li>
        </ol>
      </details>
      ${renderPalette()}
      ${renderTriggerCard(flow)}
      ${renderVariablesCard(flow)}
    </aside>
  </div>
  </div>
  </div>`;
}

function renderTriggerCard(flow) {
  const trigger = flow.trigger || {};
  const type = trigger.type || 'slash';
  const discord = flowDiscord();
  const channelOptions = discord.channels
    .filter((channel) => channel.type !== 'voice')
    .map((channel) => `#${channel.name}`);
  let fields = '';

  if (type === 'slash') {
    fields = `<div class="field"><label>Commande</label>
      <div class="input-prefix"><span>/</span><input class="input" data-trigger="command" value="${esc(trigger.command || '')}" placeholder="mon-flux"></div></div>`;
  } else if (type === 'keyword') {
    fields = `<div class="field"><label>Mot-clé</label>
        <input class="input" data-trigger="keyword" value="${esc(trigger.keyword || '')}" placeholder="bonjour"></div>
      <div class="field"><label>Correspondance</label>
        <select class="select" data-trigger="match">
          <option value="contains" ${trigger.match === 'contains' ? 'selected' : ''}>Contient</option>
          <option value="startsWith" ${trigger.match === 'startsWith' ? 'selected' : ''}>Commence par</option>
          <option value="exact" ${trigger.match === 'exact' ? 'selected' : ''}>Exactement</option>
        </select></div>`;
  } else if (type === 'reaction') {
    fields = `<div class="field"><label>Emoji</label><input class="input" data-trigger="emoji" value="${esc(trigger.emoji || '')}" placeholder="🎉"></div>`;
  } else if (type === 'schedule') {
    fields = `<div class="field"><label>Fréquence</label><input class="input" data-trigger="schedule" value="${esc(trigger.schedule || '')}" placeholder="lundi 09:00"></div>`;
  } else if (type === 'botJoin') {
    fields = `<div class="field"><label>Nom du bot (optionnel)</label>
      <input class="input" data-trigger="botName" value="${esc(trigger.botName || '')}" placeholder="Tous les bots"></div>
      <p class="hint">Laissez vide pour réagir à l’arrivée de n’importe quel bot.</p>`;
  } else if (type === 'automation') {
    const options = [
      ['welcome', "Message d'accueil"],
      ['autorole', 'Rôle automatique'],
      ['levels', 'Niveaux et XP'],
      ['ticketPanel', 'Panneau de tickets'],
      ['moderation', 'Modération automatique'],
      ['antiSpam', 'Anti-spam'],
      ['autoMod', 'Auto-modération'],
      ['antiRaid', 'Anti-raid'],
      ['botGuard', 'Bouclier anti-bots'],
      ['repair', 'Réparation salons / rôles'],
      ['logs', 'Journaux de modération'],
      ['reminders', 'Rappels de formation'],
    ];
    fields = `<div class="field"><label>Automatisation déclencheuse</label>
      <select class="select" data-trigger="automationType">
        <option value="">Toutes les automatisations</option>
        ${options.map(([value, label]) => `<option value="${value}" ${trigger.automationType === value ? 'selected' : ''}>${label}</option>`).join('')}
      </select></div>
      <p class="hint">Le flux démarre quand cette automatisation est déclenchée (ou manuellement avec le bouton « Déclencher »).</p>`;
  }

  if (['slash', 'keyword', 'join', 'leave', 'reaction', 'button', 'booster'].includes(type)) {
    fields += `<div class="form-row">
      <div class="field"><label>Salon (optionnel)</label>
        <input class="input" data-trigger="channel" list="flowChannelSuggestions" value="${esc(trigger.channel || '')}" placeholder="#général">
      </div>
      <div class="field"><label>Catégorie (optionnel)</label>
        <input class="input" data-trigger="category" list="flowCategorySuggestions" value="${esc(trigger.category || '')}" placeholder="Accueil">
      </div>
    </div>
    <datalist id="flowChannelSuggestions">${channelOptions.map((item) => `<option value="${esc(item)}"></option>`).join('')}</datalist>
    <datalist id="flowCategorySuggestions">${discord.categories.map((item) => `<option value="${esc(item)}"></option>`).join('')}</datalist>
    <p class="hint">Choisissez un salon ou une catégorie dans la liste, ou saisissez le vôtre.</p>`;
  }

  return `<div class="panel flow-panel">
    <div class="panel-head"><h3>${icon('zap')} Déclencheur</h3></div>
    <div class="panel-body">
      <div class="field"><label>Quand le flux démarre</label>
        <select class="select" data-trigger="type">
          ${Object.entries(FLOW_TRIGGERS)
            .map(([key, value]) => `<option value="${key}" ${type === key ? 'selected' : ''}>${value.label}</option>`)
            .join('')}
        </select>
      </div>
      ${fields}
      <p class="hint">Variables : <code>{{user.name}}</code>, <code>{{user.mention}}</code>, <code>{{user.roles}}</code>, <code>{{server.name}}</code>, <code>{{message}}</code>.</p>
    </div>
  </div>`;
}

function renderVariablesCard(flow) {
  return `<div class="panel flow-panel">
    <div class="panel-head"><h3>${icon('variable')} Variables</h3>
      <div class="ph-actions"><button class="mini-btn" data-action="flow-add-var" title="Ajouter une variable">${icon('plus')}</button></div>
    </div>
    <div class="panel-body">
      ${
        flow.variables.length
          ? flow.variables
              .map(
                (variable, index) => `<div class="var-row">
                  <input class="input var-name" data-var="${index}" data-var-field="name" value="${esc(variable.name)}" placeholder="nom" />
                  <span class="var-eq">=</span>
                  <input class="input" data-var="${index}" data-var-field="value" value="${esc(variable.value)}" placeholder="valeur" />
                  <button class="mini-btn danger" data-action="flow-del-var" data-index="${index}" title="Supprimer">${icon('x')}</button>
                </div>`,
              )
              .join('')
          : '<p class="hint">Aucune variable. Utilisez <code>{{ma-variable}}</code> dans vos textes.</p>'
      }
    </div>
  </div>`;
}

function renderPalette() {
  return `<div class="panel flow-panel">
    <div class="panel-head"><h3>${icon('layers')} Blocs</h3><span class="pal-count">${Object.keys(FLOW_BLOCKS).length}</span></div>
    <div class="panel-body palette">
      ${FLOW_GROUPS.map(
        ([key, label]) => `<span class="pal-label">${label}</span>
          <div class="pal-grid">
            ${Object.entries(FLOW_BLOCKS)
              .filter(([, meta]) => meta.group === key)
              .map(
                ([type, meta]) => `<button class="pal-item" data-action="flow-add-node" data-type="${type}" title="${meta.hint}">
                  <span class="blk-ic tone-${meta.tone}">${icon(meta.icon)}</span>
                  <span class="pal-text"><b>${meta.label}</b><small>${meta.hint}</small></span>
                  <span class="pal-add">${icon('plus')}</span>
                </button>`,
              )
              .join('')}
          </div>`,
      ).join('')}
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* nœuds du canvas                                                     */
/* ------------------------------------------------------------------ */

function flowText(value, fallback = '—', max = 92) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function flowOptions(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const MAX_MODAL_FIELDS = 35;

const MODAL_FIELD_TYPES = {
  short: { label: 'Champ court', shortLabel: 'court', hint: 'Une ligne de texte' },
  paragraph: { label: 'Paragraphe', shortLabel: 'paragraphe', hint: 'Plusieurs lignes de texte' },
  select: { label: 'Liste déroulante', shortLabel: 'liste', hint: 'Un choix parmi les options' },
  checkbox: { label: 'Case à cocher', shortLabel: 'case', hint: 'Oui / non' },
  multi: { label: 'Cases multiples', shortLabel: 'multi', hint: 'Plusieurs choix possibles' },
  role: { label: 'Choisir un rôle', shortLabel: 'rôle', hint: 'Sélection d’un rôle du serveur' },
  user: { label: 'Choisir une personne', shortLabel: 'membre', hint: 'Sélection d’un membre du serveur' },
  info: { label: 'Informations', shortLabel: 'info', hint: 'Texte affiché dans le formulaire, sans saisie obligatoire' },
};

function modalFieldType(type) {
  return MODAL_FIELD_TYPES[type] ? type : 'short';
}

function formVarKey(label, index) {
  return String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `champ_${index + 1}`;
}

function modalFieldDefaultOptions(type) {
  if (type === 'checkbox') return 'Oui\nNon';
  if (type === 'select' || type === 'multi') return 'Option 1\nOption 2';
  return '';
}

function modalFieldOptionList(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function normalizeModalFields(block) {
  const raw = block?.fields;
  let list = Array.isArray(raw) ? raw : [];
  if (!Array.isArray(raw)) {
    list = String(raw || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, MAX_MODAL_FIELDS)
      .map((line) => {
        const [rawLabel, rawStyle, rawRequired, rawPlaceholder] = line.split('|').map((part) => part.trim());
        const style = String(rawStyle || '').toLowerCase();
        const type = /para|long/.test(style)
          ? 'paragraph'
          : /multi/.test(style)
            ? 'multi'
            : /select|liste|dropdown/.test(style)
              ? 'select'
              : /check|case/.test(style)
                ? 'checkbox'
                : /info|information/.test(style)
                  ? 'info'
                  : 'short';
        return {
          label: rawLabel,
          type,
          required: !/optionnel|optional|non|false/.test(String(rawRequired || '')),
          placeholder: rawPlaceholder || '',
          options: '',
          value: '',
        };
      });
  }
  if (!list.length) list = [{ label: 'Champ', type: 'short', required: true }];
  return list.slice(0, MAX_MODAL_FIELDS).map((entry, index) => {
    const type = modalFieldType(entry?.type);
    const options = Array.isArray(entry?.options)
      ? entry.options.join('\n')
      : String(entry?.options || '');
    return {
      id: entry?.id || flowUid(),
      label: String(entry?.label || `Champ ${index + 1}`).slice(0, 100),
      type,
      required: type === 'info' ? false : entry?.required !== false,
      placeholder: String(entry?.placeholder || '').slice(0, 100),
      options: options || modalFieldDefaultOptions(type),
      value: String(entry?.value || '').slice(0, 1000),
    };
  });
}

function flowSummaryRows(rows) {
  return rows.filter(([, value]) => value !== undefined && value !== null && value !== '');
}

function renderBlockSummary(block) {
  return flowBlockRows(block)
    .slice(0, 2)
    .map(([label, value]) => `<span class="node-chip"><span>${esc(label)}</span><b>${esc(flowText(value, '—', 52))}</b></span>`)
    .join('');
}

function flowBlockRows(block) {
  const variants = Array.isArray(block.variants) ? block.variants : [];
  const rules = Array.isArray(block.rules) ? block.rules : [];
  switch (block.type) {
    case 'message':
      return flowSummaryRows([
        ['Salon', block.channel || '#général'],
        ['Message', block.text],
        ['Mode', block.dm ? 'message privé' : block.ephemeral ? 'éphémère' : 'normal'],
        ['Boutons', `${Array.isArray(block.buttons) ? block.buttons.length : 0}`],
        ['Options', [block.reply ? 'réponse' : '', block.tts ? 'vocal' : '', block.silent ? 'silencieux' : '', block.suppressEmbeds ? 'sans embeds' : '', block.deleteAfter ? `supprimé après ${block.deleteAfter} s` : ''].filter(Boolean).join(' · ') || 'standard'],
      ]);
    case 'embed':
      return flowSummaryRows([['Titre', block.title || 'Sans titre'], ['Description', block.description], ['Auteur', block.author], ['Champs', `${(block.fields || []).length}`], ['Mode', block.dm ? 'message privé' : block.ephemeral ? 'éphémère' : 'normal'], ['Couleur', block.color]]);
    case 'dm':
      return flowSummaryRows([['Message privé', block.text], ['Destinataire', block.target || 'membre déclencheur'], ['Embed', block.embed ? 'oui' : 'non']]);
    case 'button': {
      const buttons = blockButtons(block);
      return flowSummaryRows([
        ['Boutons', `${buttons.length}`],
        ['Libellés', buttons.map((button) => button.label || 'Sans libellé').join(' · ')],
        ['Sorties', `${buttons.filter((button) => button.next).length}/${buttons.length}`],
        ['Action', buttons.some((button) => button.url) ? 'lien' : 'interaction'],
      ]);
    }
    case 'react':
      return flowSummaryRows([['Emoji', block.emoji || '👍']]);
    case 'random':
      return flowSummaryRows([
        ['Variantes', `${variants.length} texte(s)`],
        ['Sorties', `${variants.filter((variant) => variant.next).length}/${variants.length}`],
        ['Aperçu', variants[0]?.text],
        ['Salon', block.channel || '#général'],
        ['Mode', block.dm ? 'message privé' : block.ephemeral ? 'éphémère' : block.embed ? 'embed' : 'message'],
      ]);
    case 'role':
      return flowSummaryRows([
        ['Action', block.action === 'remove' ? 'retirer' : 'ajouter'],
        ['Rôle', block.role],
        ['Durée', block.duration > 0 ? `${block.duration} ${block.durationUnit || 'minutes'}` : 'permanent'],
      ]);
    case 'channel':
      return flowSummaryRows([['Salon', `#${block.name || 'nouveau-salon'}`], ['Type', block.kind || 'text'], ['Catégorie', block.category]]);
    case 'pin':
      return flowSummaryRows([['Action', block.unpin ? 'désépingler' : 'épingler']]);
    case 'delete':
      return flowSummaryRows([['Messages', `${block.count || 1}`], ...(block.channel ? [['Salon', block.channel]] : [])]);
    case 'setvar':
      return flowSummaryRows([['Variable', block.name], ['Valeur', block.value]]);
    case 'counter':
      return flowSummaryRows([['Variable', block.name], ['Opération', `${block.op || 'add'} ${block.value || 1}`]]);
    case 'condition':
      return flowSummaryRows([['Mode', block.mode === 'any' ? 'au moins une règle' : 'toutes les règles'], ['Règles', `${rules.length}`]]);
    case 'wait':
      return flowSummaryRows([['Attente', `${block.seconds || 3} s`]]);
    case 'timer':
      return flowSummaryRows([
        ['Type', 'compte à rebours'],
        ['Durée', `${block.duration || 5} ${block.unit || 'minutes'}`],
        ['Salon', block.channel || 'salon du déclencheur'],
        ['Mode', block.dm ? 'message privé' : block.ephemeral ? 'éphémère' : 'normal'],
      ]);
    case 'chrono':
      return flowSummaryRows([
        ['Action', block.action === 'stop' ? 'arrêter' : block.action === 'service' ? 'service actuel' : 'démarrer'],
        ...(block.action === 'service' ? [] : [['Variable', block.variable || 'chrono_start']]),
        ['Salon', block.channel || 'salon du déclencheur'],
        ['Mode', block.dm ? 'message privé' : block.ephemeral ? 'éphémère' : 'normal'],
      ]);
    case 'serviceStart':
      return flowSummaryRows([['Action', 'démarrer le service'], ['Salon', block.channel || 'salon du déclencheur'], ['Mode', block.dm ? 'message privé' : block.ephemeral ? 'éphémère' : 'normal']]);
    case 'serviceStop':
      return flowSummaryRows([['Action', 'arrêter le service'], ['Salon', block.channel || 'salon du déclencheur'], ['Mode', block.dm ? 'message privé' : block.ephemeral ? 'éphémère' : 'normal']]);
    case 'servicePenalty':
      return flowSummaryRows([['Action', 'ajouter une pénalité'], ['Saisie', 'membre + durée dans un formulaire']]);
    case 'serviceLeaderboard':
      return flowSummaryRows([['Action', 'classement du service'], ['Top', `${block.top || 10}`], ['Période', 'semaine / mois configuré']]);
    case 'serviceOnline':
      return flowSummaryRows([
        ['Action', 'chrono en ligne'],
        ['Actualisation', Number(block.interval) === 30 ? '30 secondes' : '60 secondes'],
        ['Lignes max', `${block.maxEntries || 25}`],
        ['Salon', block.channel || 'salon du déclencheur'],
      ]);
    case 'serviceConfig':
      return flowSummaryRows([
        ['Période', block.period === 'month' ? '1 mois' : '1 semaine'],
        ['Reset', `${['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'][(block.resetDay || 1) - 1]} à ${block.resetHour || 0} h`],
        ['Fuseau', block.timezone || 'Europe/Paris'],
      ]);
    case 'serviceReset':
      return flowSummaryRows([['Action', 'réinitialiser les compteurs'], ['Salon', block.channel || 'salon du déclencheur']]);
    case 'cooldown':
      return flowSummaryRows([['Anti-spam', `${block.seconds || 10} s`], ['Par', block.scope === 'channel' ? 'salon' : 'membre']]);
    case 'typing':
      return flowSummaryRows([['Saisie', `${block.seconds || 2} s`]]);
    case 'webhook':
      return flowSummaryRows([['Méthode', block.method || 'POST'], ['URL', block.url]]);
    case 'log':
      return flowSummaryRows([['Journal', block.text]]);
    case 'reply':
      return flowSummaryRows([['Salon', block.channel || '#général'], ['Réponse', block.text], ['Mention', block.ping ? 'oui' : 'non']]);
    case 'edit':
      return flowSummaryRows([['Message', block.messageRef || 'dernier'], ['Nouveau texte', block.text]]);
    case 'thread':
      return flowSummaryRows([['Fil', block.name], ['Archivage', block.archive === '10080' ? '7 jours' : block.archive === '4320' ? '3 jours' : block.archive === '1440' ? '24 h' : '1 h']]);
    case 'forum':
      return flowSummaryRows([['Titre', block.title], ['Étiquettes', block.tags]]);
    case 'forumAction':
      return flowSummaryRows([['Action', block.action === 'close' ? 'fermer le post' : 'envoyer un message'], ['Post', block.post || 'post actuel']]);
    case 'forumDelete':
      return flowSummaryRows([['Post', block.post || 'post actuel'], ['Message', block.message || 'dernier']]);
    case 'ai':
      return flowSummaryRows([
        ['Mode', block.provider === 'local' ? 'réponses intégrées' : block.provider === 'openai' ? 'OpenAI (clé serveur)' : 'automatique sans clé'],
        ['Modèle', block.model || 'gpt-4o-mini'],
        ['Invite', block.prompt],
        ['Variable', block.variable],
      ]);
    case 'image':
      return flowSummaryRows([['Image', block.url], ['Alt', block.alt]]);
    case 'music':
      return flowSummaryRows([['Action', block.action === 'stop' ? 'arrêter' : 'jouer'], ['Mode', block.mode === 'personal' ? 'privé' : 'vocal'], ['Source', block.url]]);
    case 'poll':
      return flowSummaryRows([['Question', block.question], ['Options', `${flowOptions(block.options).length}`], ['Durée', `${block.duration || 24} h`]]);
    case 'select':
      return flowSummaryRows([['Placeholder', block.placeholder], ['Options', `${flowOptions(block.options).length}`], ['Choix', `${block.min || 1}–${block.max || 1}`]]);
    case 'modal': {
      const fields = normalizeModalFields(block);
      return flowSummaryRows([
        ['Titre', block.title],
        ['Champs', `${fields.length} · ${fields.map((field) => MODAL_FIELD_TYPES[field.type].shortLabel).join(' / ')}`],
      ]);
    }
    case 'giveaway':
      return flowSummaryRows([['Lot', block.prize], ['Durée', `${block.duration || 24} h`], ['Gagnants', `${block.winners || 1}`]]);
    case 'await':
      return flowSummaryRows([['Interaction', block.kind || 'button'], ['Délai', `${block.timeout || 60} s`]]);
    case 'automationRun':
      return flowSummaryRows([['Automatisation', block.automationType || 'autoMod'], ['Journal', block.notify === false ? 'non' : 'oui']]);
    case 'accountCheck':
      return flowSummaryRows([
        ['Âge minimum', `${block.minAgeDays ?? 7} j`],
        ['Bots', block.blockBots ? 'bloqués' : 'autorisés'],
        ['Avatar', block.requireAvatar ? 'requis' : 'facultatif'],
      ]);
    case 'moderation':
      return flowSummaryRows([
        ['Action', block.action || 'warn'],
        ['Cible', block.target || 'membre déclencheur'],
        ['Raison', block.reason],
        ['Durée', ['timeout', 'ban', 'softban'].includes(block.action) ? `${block.duration || 10} ${block.durationUnit || 'minutes'}` : ''],
        ['Journal', block.logChannel],
      ]);
    case 'timeout':
      return flowSummaryRows([['Durée', `${block.duration || 10} min`], ['Raison', block.reason]]);
    case 'kick':
      return flowSummaryRows([['Raison', block.reason]]);
    case 'ban':
      return flowSummaryRows([['Raison', block.reason], ['Messages supprimés', `${block.deleteDays || 0} j`]]);
    case 'nickname':
      return flowSummaryRows([['Nouveau pseudo', block.nickname]]);
    case 'move':
      return flowSummaryRows([['Salon vocal', block.channel]]);
    case 'invite':
      return flowSummaryRows([
        ['Action', block.action === 'view' ? 'voir le lien' : 'créer une invitation'],
        block.action === 'view' ? ['Lien', block.invite] : ['Salon', block.channel],
        block.action === 'view' ? null : ['Utilisations', `${block.maxUses || '∞'}`],
        block.action === 'view' ? null : ['Expiration', `${block.maxAge || 24} h`],
        ['Livraison', block.delivery === 'dm' ? 'message privé' : block.delivery === 'none' ? 'aucune' : 'salon'],
      ].filter(Boolean));
    case 'note':
      return flowSummaryRows([['Titre', block.title || 'Note'], ['Texte', block.text]]);
    case 'ticket': {
      const buttons = ensureFlowButtons(block);
      return flowSummaryRows([
        ['Action', block.action || 'open'],
        ['Raison', block.reason],
        ...((block.action || 'open') === 'open'
          ? [
              ['Catégorie', block.category],
              ['Rôle staff', block.staffRole],
              ['Logs', block.logChannel],
              ['Tickets max', `${block.maxOpen || 1} par membre`],
              ['Boutons / sorties', buttons.length ? `${buttons.length} bouton(s) · ${buttons.length + 1} sortie(s) (base + boutons)` : 'aucun bouton · 1 sortie de base'],
              ['Fermeture', `${block.closeMode || 'delete'}${Number(block.closeDelay) ? ` · ${block.closeDelay} s` : ''}`],
              ['Options', [block.pingStaff !== false ? 'ping staff' : '', block.transcript ? 'transcript' : '', block.claimButton !== false ? 'réclamer' : '', block.closeButton !== false ? 'fermer' : ''].filter(Boolean).join(' · ') || 'standard'],
            ]
          : []),
      ]);
    }
    case 'level':
      return flowSummaryRows([['XP', `${block.amount || 10}`], ['Variable', block.variable]]);
    case 'randomNumber':
      return flowSummaryRows([['Bornes', `${block.min ?? 1}–${block.max ?? 100}`], ['Variable', block.variable]]);
    case 'string':
      return flowSummaryRows([['Opération', block.operation || 'upper'], ['Variable', block.variable], ['Source', block.source]]);
    case 'json':
      return flowSummaryRows([['Chemin', block.path], ['Variable', block.variable]]);
    case 'date':
      return flowSummaryRows([['Format', block.format], ['Variable', block.variable]]);
    case 'stop':
      return flowSummaryRows([['Raison', block.reason || 'fin du flux']]);
    case 'database':
      return flowSummaryRows([['Action', block.action === 'get' ? 'lire' : 'stocker'], ['Clé', block.key]]);
    case 'captcha':
      return flowSummaryRows([['Type', block.kind || 'button'], ['Délai', `${block.timeout || 120} s`]]);
    default:
      return [];
  }
}

function flowVariableGroups(block) {
  const flow = flowEditor.flow;
  if (!flow) return [];
  const groups = [];
  const seen = new Set();
  const add = (label, items) => {
    const unique = items.filter((item) => {
      if (!item.token || seen.has(item.token)) return false;
      seen.add(item.token);
      return true;
    });
    if (unique.length) groups.push({ label, items: unique });
  };

  add('Membre', [
    { label: 'Nom affiché', token: '{{user.name}}' },
    { label: 'Mention', token: '{{user.mention}}' },
    { label: 'Identifiant', token: '{{user.id}}' },
    { label: 'Rôles', token: '{{user.roles}}' },
  ]);
  add('Contexte', [
    { label: 'Serveur', token: '{{server.name}}' },
    { label: 'Salon', token: '{{channel}}' },
    { label: 'Message reçu', token: '{{message}}' },
    { label: 'Bot', token: '{{bot.name}}' },
  ]);

  const forms = [];
  for (const entry of flow.blocks || []) {
    if (entry.type !== 'modal' || entry.id === block?.id) continue;
    normalizeModalFields(entry).forEach((field, index) => {
      if (field.type === 'info') return;
      const key = formVarKey(field.label, index);
      const baseLabel = `${entry.title || 'Formulaire'} · ${field.label || `Champ ${index + 1}`}`;
      forms.push({
        label: baseLabel,
        token: `{{form.${key}}}`,
        hint: MODAL_FIELD_TYPES[field.type]?.label || field.type,
      });
      if (field.type === 'role' || field.type === 'user') {
        forms.push({ label: `${baseLabel} · identifiant`, token: `{{form.${key}_id}}` });
        forms.push({ label: `${baseLabel} · nom`, token: `{{form.${key}_name}}` });
      }
    });
  }
  add('Formulaires', forms);

  const hasButton = (flow.blocks || []).some((entry) => entry.type === 'button' || (entry.type === 'await' && entry.kind === 'button'));
  if (hasButton) {
    add('Boutons', [
      { label: 'Bouton cliqué', token: '{{button}}' },
      { label: 'Libellé du bouton', token: '{{button_label}}' },
      { label: 'Valeur du bouton', token: '{{button_value}}' },
      { label: 'Numéro du bouton', token: '{{button_index}}' },
      { label: 'Membre qui a cliqué', token: '{{clicker}}' },
      { label: 'Identifiant du cliqueur', token: '{{clicker_id}}' },
      { label: 'Mention du cliqueur', token: '{{clicker_mention}}' },
    ]);
  }
  if ((flow.blocks || []).some((entry) => entry.type === 'select')) {
    add('Menus', [
      { label: 'Choix du menu', token: '{{select}}' },
      { label: 'Tous les choix', token: '{{selection}}' },
    ]);
  }
  const awaits = (flow.blocks || []).filter((entry) => entry.type === 'await');
  const awaitItems = [];
  if (awaits.some((entry) => entry.kind === 'message')) {
    awaitItems.push({ label: 'Message reçu en attente', token: '{{response}}' });
  }
  if (awaits.some((entry) => entry.kind === 'reaction')) {
    awaitItems.push({ label: 'Réaction reçue', token: '{{reaction}}' });
  }
  add('Attentes', awaitItems);

  const chronoItems = [];
  if ((flow.blocks || []).some((entry) => entry.type === 'timer')) {
    chronoItems.push(
      { label: 'Fin relative', token: '{{time}}' },
      { label: 'Fin absolue', token: '{{timestamp}}' },
      { label: 'Durée formatée', token: '{{duration}}' },
    );
  }
  if ((flow.blocks || []).some((entry) => entry.type === 'chrono' && entry.action === 'stop')) {
    chronoItems.push({ label: 'Temps écoulé', token: '{{elapsed}}' });
  }
  if ((flow.blocks || []).some((entry) => entry.type === 'chrono' && entry.action === 'service')) {
    chronoItems.push(
      { label: 'Chrono du service actuel', token: '{{chrono}}' },
      { label: 'Temps écoulé du service', token: '{{elapsed}}' },
    );
  }
  add('Chrono', chronoItems);
  const serviceItems = [];
  const serviceTypes = new Set(['serviceStart', 'serviceStop', 'servicePenalty', 'serviceLeaderboard', 'serviceConfig', 'serviceReset']);
  if ((flow.blocks || []).some((entry) => serviceTypes.has(entry.type))) {
    serviceItems.push(
      { label: 'Membre du service', token: '{{member}}' },
      { label: 'Nom du membre', token: '{{member_name}}' },
      { label: 'Temps de service', token: '{{service}}' },
      { label: 'Pénalité totale', token: '{{penalty}}' },
      { label: 'Total service − pénalité', token: '{{total}}' },
      { label: 'Pénalité ajoutée', token: '{{penalty_added}}' },
      { label: 'Durée du service', token: '{{duration}}' },
      { label: 'En service depuis', token: '{{since}}' },
      { label: 'Chrono du service actuel', token: '{{chrono}}' },
      { label: 'Période', token: '{{period}}' },
      { label: 'Remise à zéro', token: '{{reset}}' },
    );
  }
  add('Service', serviceItems);
  const accountChecks = (flow.blocks || []).filter((entry) => entry.type === 'accountCheck');
  if (accountChecks.length) {
    add('Vérification du compte', [
      { label: 'Compte valide (oui/non)', token: `{{${accountChecks[0].variable || 'account_ok'}}}` },
      { label: 'Raisons du refus', token: '{{account_reasons}}' },
    ]);
  }

  const variables = [];
  for (const variable of flow.variables || []) {
    if (variable.name) variables.push({ label: `Variable · ${variable.name}`, token: `{{${variable.name}}}` });
  }
  const variableTypes = new Set(['setvar', 'counter', 'level', 'randomNumber', 'string', 'json', 'date', 'database', 'ai', 'chrono', 'accountCheck']);
  for (const entry of flow.blocks || []) {
    if (!variableTypes.has(entry.type)) continue;
    if (entry.type === 'timer') continue;
    if (entry.type === 'chrono' && entry.action === 'start') continue;
    const name = entry.name || entry.variable;
    if (name) variables.push({ label: `${FLOW_BLOCKS[entry.type]?.label || entry.type} · ${name}`, token: `{{${name}}}` });
  }
  add('Variables du flux', variables);

  return groups;
}

function renderFlowVariables(block) {
  const groups = flowVariableGroups(block);
  if (!groups.length) return '';
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  return `<details class="be-vars" open>
    <summary>${icon('variable')} Variables des blocs <span>${total}</span></summary>
    <p>Reprends une info d’un autre bloc. Clique dans un champ, puis sur une variable pour l’insérer.</p>
    <div class="be-vars-body">
      ${groups.map((group) => `<div class="be-var-group">
        <b>${esc(group.label)}</b>
        <div class="be-var-chips">
          ${group.items.map((item) => `<button type="button" class="be-var-chip" data-action="flow-insert-var" data-token="${esc(item.token)}" title="${esc(item.token)}${item.hint ? ` · ${esc(item.hint)}` : ''}">
            <span>${esc(item.label)}</span>
            <code>${esc(item.token)}</code>
          </button>`).join('')}
        </div>
      </div>`).join('')}
    </div>
  </details>`;
}

function closeFlowVarPicker() {
  if (flowVarPicker) flowVarPicker.remove();
  flowVarPicker = null;
  flowVarTarget = null;
}

function mentionNorm(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function closeRoleMention() {
  if (roleMentionPop) roleMentionPop.remove();
  roleMentionPop = null;
  roleMentionTarget = null;
  roleMentionStart = -1;
  roleMentionItems = [];
  roleMentionIndex = 0;
}

function roleMentionMatch(field) {
  if (!field || !field.isConnected) return null;
  if (!field.matches('.block-editor input.input, .block-editor textarea.textarea')) return null;
  if (field.selectionStart == null || field.selectionStart !== field.selectionEnd) return null;
  if (['number', 'color', 'range', 'file', 'checkbox', 'radio', 'hidden'].includes(field.type)) return null;
  if (field.dataset.field === 'variable' || field.dataset.varField === 'name') return null;
  if (['label', 'placeholder', 'options'].includes(field.dataset.formKey)) return null;
  const before = field.value.slice(0, field.selectionStart);
  const match = before.match(/(?:^|[\s(,.;:!?])@([^\n@]{0,60})$/);
  if (!match) return null;
  return { start: field.selectionStart - match[1].length - 1, query: match[1] };
}

function positionRoleMention() {
  if (!roleMentionPop || !roleMentionTarget) return;
  const rect = roleMentionTarget.getBoundingClientRect();
  const width = Math.min(320, window.innerWidth - 24);
  roleMentionPop.style.width = `${width}px`;
  roleMentionPop.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
  const estimated = Math.min(320, window.innerHeight - 24);
  roleMentionPop.style.top = `${rect.bottom + 6 + estimated > window.innerHeight ? Math.max(12, rect.top - estimated - 6) : rect.bottom + 6}px`;
}

function updateRoleMention(field) {
  const match = roleMentionMatch(field);
  if (!match) {
    closeRoleMention();
    return;
  }
  const seen = new Set();
  const query = mentionNorm(match.query.trim());
  const roles = flowDiscord().roles
    .filter((role) => role && role.name)
    .filter((role) => {
      const key = mentionNorm(role.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((role) => !query || mentionNorm(role.name).includes(query))
    .slice(0, 12);
  if (!roles.length) {
    closeRoleMention();
    return;
  }
  roleMentionTarget = field;
  roleMentionStart = match.start;
  roleMentionItems = roles;
  roleMentionIndex = 0;
  if (!roleMentionPop) {
    roleMentionPop = document.createElement('div');
    roleMentionPop.className = 'mention-pop';
    roleMentionPop.dataset.roleMention = '1';
    document.body.appendChild(roleMentionPop);
  }
  roleMentionPop.innerHTML = `<div class="mention-pop-head">${icon('users')} Rôles du serveur <span>${roles.length}</span></div>
    <div class="mention-pop-list">
      ${roles.map((role, index) => `<button type="button" class="mention-item ${index === 0 ? 'active' : ''}" data-action="flow-role-mention-pick" data-index="${index}">
        <span class="mention-dot" style="background:${esc(role.color || '#7c5cff')}"></span>
        <span class="mention-name">${esc(role.name)}</span>
        <span class="mention-at">@</span>
      </button>`).join('')}
    </div>
    <div class="mention-pop-foot">↑↓ pour choisir · Entrée pour insérer</div>`;
  positionRoleMention();
}

function moveRoleMention(delta) {
  if (!roleMentionPop || !roleMentionItems.length) return;
  roleMentionIndex = (roleMentionIndex + delta + roleMentionItems.length) % roleMentionItems.length;
  const items = roleMentionPop.querySelectorAll('.mention-item');
  items.forEach((item, index) => item.classList.toggle('active', index === roleMentionIndex));
  items[roleMentionIndex]?.scrollIntoView({ block: 'nearest' });
}

function pickRoleMention(index) {
  const role = roleMentionItems[index];
  const field = roleMentionTarget;
  if (!role || !field || roleMentionStart < 0) return;
  const caret = field.selectionStart ?? field.value.length;
  const token = /^\d{17,20}$/.test(String(role.id || '')) ? `<@&${role.id}>` : `@${role.name}`;
  const value = `${field.value.slice(0, roleMentionStart)}${token} ${field.value.slice(caret)}`;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.focus();
  const position = roleMentionStart + token.length + 1;
  field.setSelectionRange(position, position);
  closeRoleMention();
}

function decorateFlowVarFields() {
  const root = document.querySelector('#modalRoot .block-editor');
  if (!root) return;
  const controls = root.querySelectorAll('.be-fields input.input, .be-fields textarea.textarea');
  controls.forEach((control) => {
    if (control.dataset.varDecorated) return;
    if (['number', 'color', 'range', 'file', 'checkbox', 'radio', 'hidden', 'button'].includes(control.type)) return;
    if (control.dataset.varField === 'name' || control.dataset.field === 'variable') return;
    if (['label', 'placeholder', 'options'].includes(control.dataset.formKey)) return;
    if (control.closest('.be-vars') || control.dataset.varIgnore === 'true') return;
    const parent = control.parentElement;
    if (!parent) return;
    control.dataset.varDecorated = '1';
    const id = `flowVarField${++flowFieldVarSeq}`;
    control.dataset.varFieldId = id;
    parent.classList.add('has-field-var');
    control.style.paddingRight = '30px';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'field-var-btn';
    button.dataset.action = 'flow-field-vars';
    button.dataset.target = id;
    button.title = 'Insérer une variable';
    button.setAttribute('aria-label', 'Insérer une variable');
    button.innerHTML = icon('variable');
    parent.appendChild(button);
    const place = () => {
      if (!control.isConnected) return;
      button.style.left = `${control.offsetLeft + control.offsetWidth - 27}px`;
      button.style.top = `${control.offsetTop + (control.tagName === 'TEXTAREA' ? 8 : control.offsetHeight / 2)}px`;
      button.style.transform = control.tagName === 'TEXTAREA' ? 'none' : 'translateY(-50%)';
    };
    place();
    requestAnimationFrame(place);
  });
}

function openFlowVarPicker(button) {
  closeRoleMention();
  closeFlowVarPicker();
  const block = flowNode(flowEditor.editBlockId);
  const groups = flowVariableGroups(block);
  if (!groups.length) {
    toast('Aucune variable disponible dans ce flux.', 'error');
    return;
  }
  const target = document.querySelector(`[data-var-field-id="${button.dataset.target}"]`);
  if (!target) return;
  flowVarTarget = target;
  const pop = document.createElement('div');
  pop.className = 'field-var-pop';
  pop.dataset.varPop = '1';
  pop.innerHTML = `<div class="field-var-pop-head"><b>${icon('variable')} Insérer une variable</b><button type="button" class="mini-btn" data-action="flow-field-vars-close" title="Fermer">${icon('x')}</button></div>
    <div class="field-var-pop-body">
      ${groups.map((group) => `<div class="be-var-group">
        <b>${esc(group.label)}</b>
        <div class="be-var-chips">
          ${group.items.map((item) => `<button type="button" class="be-var-chip" data-action="flow-field-var-pick" data-token="${esc(item.token)}" title="${esc(item.token)}${item.hint ? ` · ${esc(item.hint)}` : ''}">
            <span>${esc(item.label)}</span>
            <code>${esc(item.token)}</code>
          </button>`).join('')}
        </div>
      </div>`).join('')}
    </div>`;
  document.body.appendChild(pop);
  flowVarPicker = pop;
  const width = Math.min(380, window.innerWidth - 24);
  const rect = button.getBoundingClientRect();
  pop.style.width = `${width}px`;
  pop.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
  const estimated = Math.min(430, window.innerHeight - 24);
  pop.style.top = `${rect.bottom + 8 + estimated > window.innerHeight ? Math.max(12, rect.top - estimated - 8) : rect.bottom + 8}px`;
}

function insertFlowToken(field, token) {
  if (!field || !field.isConnected) return;
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  if (typeof field.setRangeText === 'function') field.setRangeText(token, start, end, 'end');
  else field.value = `${field.value.slice(0, start)}${token}${field.value.slice(end)}`;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.focus();
  toast('Variable insérée.', 'success');
}

function openBlockEditor(blockId, { autoFocus = true } = {}) {
  const block = flowNode(blockId);
  if (!block) return;
  closeRoleMention();
  closeFlowVarPicker();
  const meta = FLOW_BLOCKS[block.type] || FLOW_BLOCKS.message;
  flowEditor.editBlockId = blockId;
  flowEditor.messageEditorBlockId = null;
  openModal({
    title: `Modifier · ${meta.label}`,
    subtitle: 'Enregistre et ferme avec le bouton en haut à droite.',
    fullscreen: true,
    hideFooter: true,
    autoFocus,
    body: `<div class="block-editor" data-edit-block="${block.id}">
      <div class="be-topbar">
        <div class="be-name">
          <label>Nom du bloc</label>
          <input data-node="${block.id}" data-field="customName" value="${esc(block.customName || '')}" placeholder="${esc(meta.label)}">
        </div>
        <div class="be-topbar-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="flow-node-edit-close">Annuler</button>
          <button type="button" class="btn btn-primary btn-sm" data-action="flow-node-edit-done">${icon('check')} Enregistrer et fermer</button>
        </div>
      </div>
      <div class="be-layout no-preview">
        <div class="be-fields">${renderFlowVariables(block)}${renderNodeFields(block)}</div>
      </div>
    </div>`,
  });
  requestAnimationFrame(decorateFlowVarFields);
  const root = document.getElementById('modalRoot');
  const close = () => {
    if (flowEditor.editBlockId !== blockId) return;
    closeRoleMention();
    closeFlowVarPicker();
    flowEditor.editBlockId = null;
    flowEditor.messageEditorBlockId = null;
    render();
  };
  root.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', close));
  const backdrop = root.querySelector('.modal-backdrop');
  backdrop?.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) close();
  });
}

function openMessageEditor(blockId, { autoFocus = true } = {}) {
  const block = flowNode(blockId);
  if (!block) return;
  closeRoleMention();
  closeFlowVarPicker();
  flowEditor.messageEditorBlockId = blockId;
  openModal({
    title: `Message · ${block.customName || 'Message'}`,
    subtitle: 'Personnalise le texte, les variantes et les boutons. Les réglages du bloc restent dans sa configuration.',
    fullscreen: true,
    hideFooter: true,
    autoFocus,
    body: `<div class="block-editor message-editor" data-edit-block="${block.id}">
      <div class="be-topbar">
        <div class="be-name">
          <label>Contenu envoyé</label>
          <b>${esc(messageSummary(block))}</b>
        </div>
        <div class="be-topbar-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="flow-message-editor-close">Fermer</button>
          <button type="button" class="btn btn-primary btn-sm" data-action="flow-message-editor-done">${icon('check')} Terminé</button>
        </div>
      </div>
      <div class="be-fields">${renderFlowVariables(block)}${renderMessageContent(block)}</div>
    </div>`,
  });
  requestAnimationFrame(decorateFlowVarFields);
  const root = document.getElementById('modalRoot');
  const close = () => {
    if (flowEditor.messageEditorBlockId === blockId) closeMessageEditor();
  };
  root.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', close));
  const backdrop = root.querySelector('.modal-backdrop');
  backdrop?.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) close();
  });
}

function closeMessageEditor({ notify = false } = {}) {
  const blockId = flowEditor.messageEditorBlockId;
  if (!blockId) {
    closeModal();
    return;
  }
  flowEditor.messageEditorBlockId = null;
  closeRoleMention();
  closeFlowVarPicker();
  closeModal();
  openBlockEditor(blockId, { autoFocus: false });
  if (notify) toast('Message mis à jour.', 'success');
}

function refreshBlockEditor(blockId) {
  if (flowEditor.messageEditorBlockId === blockId) {
    openMessageEditor(blockId, { autoFocus: false });
    return;
  }
  const body = document.querySelector('#modalRoot .modal-body');
  const backdrop = document.querySelector('#modalRoot .modal-backdrop');
  const scrollTop = body?.scrollTop || 0;
  const backdropTop = backdrop?.scrollTop || 0;
  const active = document.activeElement;
  const focused = active?.closest('#modalRoot') ? {
    action: active.dataset.action,
    formIndex: active.dataset.formIndex,
    formKey: active.dataset.formKey,
    embedIndex: active.dataset.embedIndex,
    embedKey: active.dataset.embedKey,
    field: active.dataset.field,
    button: active.dataset.button,
    buttonField: active.dataset.buttonField,
    rule: active.dataset.rule,
    ruleField: active.dataset.ruleField,
    variant: active.dataset.variant,
    variantField: active.dataset.variantField,
  } : null;
  const focusSelector = focused
    ? Object.entries(focused)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => `[data-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${String(value).replace(/"/g, '\\"')}"]`)
        .join('')
    : '';
  openBlockEditor(blockId, { autoFocus: false });
  const restoreScroll = () => {
    const nextBody = document.querySelector('#modalRoot .modal-body');
    const nextBackdrop = document.querySelector('#modalRoot .modal-backdrop');
    if (nextBody) nextBody.scrollTop = scrollTop;
    if (nextBackdrop) nextBackdrop.scrollTop = backdropTop;
  };
  restoreScroll();
  requestAnimationFrame(() => {
    const nextFocus = focusSelector ? document.querySelector(`#modalRoot ${focusSelector}`) : null;
    nextFocus?.focus({ preventScroll: true });
    restoreScroll();
  });
}

function renderNode(block, flow) {
  const meta = FLOW_BLOCKS[block.type] || FLOW_BLOCKS.message;
  const isStart = flow.start === block.id;
  const pairs = flowOutputPairs(block);
  const summary = renderBlockSummary(block);
  const outputClass = `node-outs${pairs.length > 1 ? ' multi' : ''}${block.type === 'condition' ? ' two' : ''}`;
  const outputs = `<div class="${outputClass}">
        ${pairs.map((pair) => `<button class="port out ${pair.branch === 'then' ? 'then' : pair.branch === 'else' ? 'else' : ''}" data-node="${block.id}" data-branch="${esc(pair.branch)}" title="${pair.label ? `${esc(pair.label)} — ` : ''}Glissez vers un bloc"><i></i>${pair.label ? `<span>${esc(pair.label)}</span>` : ''}</button>`).join('')}
      </div>`;

  return `<div class="node tone-${meta.tone}${isStart ? ' is-start' : ''}" data-node="${block.id}" data-type="${block.type}" style="left:${block.x}px;top:${block.y}px">
    <span class="port in" title="Entrée"></span>
    <div class="node-head" data-drag="${block.id}">
      <span class="node-grip" aria-hidden="true"></span>
      <span class="node-ic">${icon(meta.icon)}</span>
      <div class="node-heading">
        <div class="node-title-row">
          <span class="node-title">${esc(block.customName || meta.label)}</span>
          ${isStart ? '<span class="node-badge">départ</span>' : ''}
          ${block.type === 'ticket' ? `<span class="node-badge">${pairs.length} sortie${pairs.length > 1 ? 's' : ''}</span>` : ''}
        </div>
        <p class="node-desc">${esc(meta.hint)}</p>
      </div>
      <span class="node-tools">
        <button class="mini-btn node-edit-tool" data-action="flow-node-edit" data-id="${block.id}" title="Modifier le bloc">${icon('edit')}</button>
        <button class="mini-btn" data-action="flow-node-start" data-id="${block.id}" title="Définir comme départ">${icon('play')}</button>
        <button class="mini-btn" data-action="flow-node-dup" data-id="${block.id}" title="Dupliquer">${icon('duplicate')}</button>
        <button class="mini-btn danger" data-action="flow-node-del" data-id="${block.id}" title="Supprimer">${icon('trash')}</button>
      </span>
    </div>
    ${summary ? `<div class="node-body"><div class="node-meta">${summary}</div></div>` : ''}
    ${outputs}
    <button type="button" class="node-add-next" data-action="flow-add-after" data-id="${block.id}" title="Ajouter un bloc après">${icon('plus')}</button>
  </div>`;
}

function nodeField(label, inner, extra = '') {
  return `<label class="fld ${extra}"><span>${label}</span>${inner}</label>`;
}

function renderModalField(block, field, index) {
  const bind = (key) => `data-node="${block.id}" data-form-index="${index}" data-form-key="${key}"`;
  const choice = field.type === 'select' || field.type === 'multi';
  const isInfo = field.type === 'info';
  const note = field.type === 'checkbox'
    ? 'Case oui/non · pas de choix à saisir'
    : field.type === 'select'
      ? 'Une seule option pourra être choisie'
      : field.type === 'multi'
        ? 'Plusieurs options pourront être cochées'
        : MODAL_FIELD_TYPES[field.type].hint;
  return `<div class="form-field-card${field.required ? ' is-required' : ''}">
    <div class="form-field-top">
      <span class="form-field-index">${index + 1}</span>
      <input class="input form-field-label" ${bind('label')} value="${esc(field.label)}" placeholder="Libellé du champ" maxlength="100">
      <select class="select form-field-type" ${bind('type')}>
        ${Object.entries(MODAL_FIELD_TYPES).map(([key, meta]) => `<option value="${key}" ${field.type === key ? 'selected' : ''}>${meta.label}</option>`).join('')}
      </select>
      <button type="button" class="switch ${field.required ? 'on' : ''}" data-action="flow-form-required" data-id="${block.id}" data-index="${index}" title="Champ obligatoire" aria-label="Champ obligatoire"></button>
      <span class="form-field-req-text">${field.required ? 'requis' : 'optionnel'}</span>
      <button type="button" class="mini-btn danger" data-action="flow-del-form-field" data-id="${block.id}" data-index="${index}" title="Supprimer ce champ">${icon('x')}</button>
    </div>
    <div class="form-field-options${choice ? ' has-choice' : ''}">
      ${isInfo
        ? `<label class="form-field-choice"><span>Texte d’information <small>affiché dans le formulaire</small></span><textarea class="textarea" rows="2" ${bind('value')} placeholder="Ex : Ce formulaire sert à rejoindre le serveur.">${esc(field.value || '')}</textarea></label>`
        : `<input class="input" ${bind('placeholder')} value="${esc(field.placeholder)}" placeholder="Aide (optionnel)" maxlength="100">
      ${choice
        ? `<label class="form-field-choice"><span>Choix / variantes <small>une par ligne</small></span><textarea class="textarea" rows="2" ${bind('options')} placeholder="Option 1\nOption 2">${esc(field.options)}</textarea></label>`
        : `<span class="form-field-note">${note}</span>`}`}
    </div>
  </div>`;
}

function renderModalFields(block) {
  const fields = normalizeModalFields(block);
  return `<div class="form-field-editor">
    <div class="form-field-editor-head"><b>Champs du formulaire</b><span>${fields.length}/${MAX_MODAL_FIELDS} · type et choix par champ</span></div>
    ${fields.map((field, index) => renderModalField(block, field, index)).join('')}
    <button type="button" class="link-btn" data-action="flow-add-form-field" data-id="${block.id}" ${fields.length >= MAX_MODAL_FIELDS ? 'disabled' : ''}>${icon('plus')} Ajouter un champ</button>
  </div>`;
}

function renderEmbedFields(block) {
  const fields = Array.isArray(block.fields) ? block.fields : [];
  const bindField = (index, key) => `data-node="${block.id}" data-embed-index="${index}" data-embed-key="${key}"`;
  return `<div class="embed-fields-editor">
    <div class="button-editor-head"><b>Champs de l’embed (${fields.length}/5)</b><span>Nom · valeur · en ligne</span></div>
    ${fields.map((field, index) => `<div class="embed-field-row">
      <input class="input" ${bindField(index, 'name')} value="${esc(field.name || '')}" placeholder="Nom du champ">
      <input class="input" ${bindField(index, 'value')} value="${esc(field.value || '')}" placeholder="Valeur">
      <button class="switch ${field.inline ? 'on' : ''}" data-action="flow-embed-field-toggle" data-id="${block.id}" data-index="${index}" title="Afficher en ligne"></button>
      <button class="mini-btn danger" data-action="flow-del-embed-field" data-id="${block.id}" data-index="${index}" title="Supprimer">${icon('x')}</button>
    </div>`).join('')}
    <button class="link-btn" data-action="flow-add-embed-field" data-id="${block.id}">${icon('plus')} Ajouter un champ</button>
  </div>`;
}

function renderTicketButtons(block) {
  const buttons = ensureFlowButtons(block);
  const outputs = buttons.length + 1;
  const bindButton = (index, field) => `data-node="${block.id}" data-button="${index}" data-button-field="${field}"`;
  return `<div class="button-editor-head">
      <b>${buttons.length} bouton(s) · ${outputs} sortie(s)</b>
      <span>${buttons.length ? '1 sortie de base + 1 sortie par bouton' : 'Une seule sortie de base'}</span>
    </div>
    <div class="button-editor ticket-buttons">
      ${buttons.map((button, index) => `<div class="button-editor-row ticket-btn-row">
        <span class="variant-badge">B${index + 1}</span>
        <input class="input" ${bindButton(index, 'label')} value="${esc(button.label || '')}" placeholder="Libellé">
        <input class="input ticket-btn-emoji" ${bindButton(index, 'emoji')} value="${esc(button.emoji || '')}" placeholder="🙋">
        <select class="select" ${bindButton(index, 'style')}>
          <option value="primary" ${button.style === 'primary' ? 'selected' : ''}>Primaire</option>
          <option value="secondary" ${button.style === 'secondary' ? 'selected' : ''}>Secondaire</option>
          <option value="success" ${button.style === 'success' ? 'selected' : ''}>Succès</option>
          <option value="danger" ${button.style === 'danger' ? 'selected' : ''}>Danger</option>
        </select>
        ${flowTargetSelect(bindButton(index, 'next'), block.id, button.next)}
        <button class="mini-btn danger" data-action="flow-del-button" data-id="${block.id}" data-index="${index}" title="Supprimer">${icon('x')}</button>
      </div>`).join('')}
    </div>
    <button class="link-btn" data-action="flow-add-button" data-id="${block.id}" ${buttons.length >= 5 ? 'disabled' : ''}>${icon('plus')} Ajouter un bouton / une sortie</button>
    <p class="hint">La sortie de base « après ouverture » reste toujours présente. Chaque bouton ajouté crée une sortie en plus, à relier à la suite du flux. Les boutons Réclamer et Fermer restent toujours disponibles.</p>`;
}

function renderMessageButtons(block) {
  const buttons = Array.isArray(block.buttons) ? block.buttons : [];
  const bindButton = (index, field) => `data-node="${block.id}" data-button="${index}" data-button-field="${field}"`;
  return `<div class="message-buttons-editor">
    <div class="button-editor-head">
      <b>Boutons du message (${buttons.length}/5)</b>
      <span>Le message et ses boutons partent ensemble, comme sur BotGhost</span>
    </div>
    ${buttons.map((button, index) => `<div class="button-editor-row">
      <div class="be-row-head">
        <span class="variant-badge">B${index + 1}</span>
        <b>Bouton ${index + 1}</b>
        <button class="mini-btn danger" data-action="flow-del-button" data-id="${block.id}" data-index="${index}" title="Supprimer">${icon('x')}</button>
      </div>
      <div class="fld-row">
        ${nodeField('Libellé', `<input class="input" ${bindButton(index, 'label')} value="${esc(button.label || '')}" placeholder="Cliquez ici">`, 'grow')}
        ${nodeField('Emoji', `<input class="input" ${bindButton(index, 'emoji')} value="${esc(button.emoji || '')}" placeholder="✅">`, 'shrink')}
        ${nodeField('Style', `<select class="select" ${bindButton(index, 'style')}>
          <option value="primary" ${button.style === 'primary' ? 'selected' : ''}>Primaire</option>
          <option value="secondary" ${button.style === 'secondary' ? 'selected' : ''}>Secondaire</option>
          <option value="success" ${button.style === 'success' ? 'selected' : ''}>Succès</option>
          <option value="danger" ${button.style === 'danger' ? 'selected' : ''}>Danger</option>
          <option value="link" ${button.style === 'link' ? 'selected' : ''}>Lien</option>
        </select>`, 'shrink')}
      </div>
      <div class="fld-row">
        ${nodeField('URL (bouton lien)', `<input class="input" ${bindButton(index, 'url')} value="${esc(button.url || '')}" placeholder="https://… (vide pour un bouton interactif)">`, 'grow')}
        ${nodeField('Valeur', `<input class="input" ${bindButton(index, 'value')} value="${esc(button.value || '')}" placeholder="option_1">`, 'grow')}
      </div>
      <div class="fld-row">
        ${nodeField('Flux déclenché', `<input class="input" ${bindButton(index, 'target')} value="${esc(button.target || '')}" placeholder="nom du flux (optionnel)">`, 'grow')}
        ${nodeField('Sortie du bouton', flowTargetSelect(bindButton(index, 'next'), block.id, button.next), 'grow')}
      </div>
    </div>`).join('')}
    <button class="link-btn" data-action="flow-add-button" data-id="${block.id}" ${buttons.length >= 5 ? 'disabled' : ''}>${icon('plus')} Ajouter un bouton</button>
    <p class="hint">Un bouton sans URL attend un clic et reprend le flux à sa sortie. Un bouton avec URL ouvre simplement le lien.</p>
  </div>`;
}

function messageSummary(block) {
  const variants = Array.isArray(block.variants) ? block.variants : [];
  const buttons = Array.isArray(block.buttons) ? block.buttons : [];
  const text = block.variantMode
    ? `${variants.length} variante(s) aléatoire(s)`
    : flowText(block.text, 'Aucun texte', 90);
  return `${text}${buttons.length ? ` · ${buttons.length} bouton(s)` : ''}`;
}

function renderMessageContent(block) {
  const bind = (name) => `data-node="${block.id}" data-field="${name}"`;
  const variants = Array.isArray(block.variants) ? block.variants : (block.variants = []);
  const total = variants.reduce((sum, variant) => sum + (Number(variant.weight) || 1), 0);
  return `${block.variantMode
    ? `<p class="hint">Le texte est tiré au hasard parmi les variantes ci-dessous. Le poids règle la probabilité.</p>
      <div class="variant-editor-head">
        <b>${variants.length} variante(s)</b>
        <span>Total ${total} points</span>
      </div>
      <div class="variants">${variants
        .map((variant, index) => {
          const percent = total ? Math.round(((Number(variant.weight) || 1) / total) * 100) : 0;
          return `<div class="variant-row">
            <span class="variant-badge">V${index + 1}</span>
            <div class="variant-main">
              <textarea class="textarea" rows="2" data-node="${block.id}" data-variant="${index}" data-variant-field="text" placeholder="Texte de la variante">${esc(variant.text)}</textarea>
              <div class="variant-meta">
                <label>Poids <input class="input weight" type="number" min="1" max="100" data-node="${block.id}" data-variant="${index}" data-variant-field="weight" value="${variant.weight}"></label>
                <span class="variant-percent">${percent} %</span>
              </div>
            </div>
            <button class="mini-btn danger" data-action="flow-del-variant" data-id="${block.id}" data-index="${index}" title="Supprimer">${icon('x')}</button>
          </div>`;
        })
        .join('')}</div>
      <div class="variant-actions">
        <button class="link-btn" data-action="flow-add-variant" data-id="${block.id}">${icon('plus')} Ajouter une variante</button>
        <button class="link-btn" data-action="flow-variant-bank" data-id="${block.id}">${icon('shuffle')} Banque (48)</button>
        <button class="link-btn" data-action="flow-balance-variants" data-id="${block.id}">${icon('chart')} Répartir équitablement</button>
      </div>`
    : nodeField('Message', `<textarea class="textarea" rows="6" ${bind('text')} placeholder="Bienvenue {{user.mention}} !">${esc(block.text)}</textarea>`)}
    ${renderMessageButtons(block)}`;
}

function renderNodeFields(block) {
  return renderNodeFieldsDirect(block);
}

function renderNodeFieldsDirect(block) {
  const bind = (name) => `data-node="${block.id}" data-field="${name}"`;

  switch (block.type) {
    case 'message': {
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
          ${nodeField('Message privé', `<button class="switch ${block.dm ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="dm"></button>`, 'shrink')}
          ${nodeField('Variantes aléatoires', `<button class="switch ${block.variantMode ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="variantMode"></button>`, 'shrink')}
          ${nodeField('Supprimer après', `<input class="input" type="number" min="0" max="300" ${bind('deleteAfter')} value="${Number(block.deleteAfter) || 0}" placeholder="0">`, 'shrink')}
        </div>
        <p class="hint">Éphémère = seul le membre qui déclenche voit le message. Message privé = envoi en DM. Laisse les deux désactivés pour un message public.</p>
        <div class="be-content-card">
          <div class="be-content-main">
            <span class="be-content-kicker">Contenu envoyé</span>
            <b>${esc(messageSummary(block))}</b>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-action="flow-open-message-editor" data-id="${block.id}">${icon('edit')} Modifier le message</button>
        </div>
        <div class="fld-row">
          ${nodeField('Répondre au message', `<button class="switch ${block.reply ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="reply"></button>`, 'shrink')}
          ${nodeField('Vocal', `<button class="switch ${block.tts ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="tts"></button>`, 'shrink')}
          ${nodeField('Silencieux', `<button class="switch ${block.silent ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="silent"></button>`, 'shrink')}
          ${nodeField('Masquer les embeds', `<button class="switch ${block.suppressEmbeds ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="suppressEmbeds"></button>`, 'shrink')}
        </div>`;
    }
    case 'embed':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
          ${nodeField('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
          ${nodeField('Message privé', `<button class="switch ${block.dm ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="dm"></button>`, 'shrink')}
          ${nodeField('Silencieux', `<button class="switch ${block.silent ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="silent"></button>`, 'shrink')}
          ${nodeField('Supprimer après', `<input class="input" type="number" min="0" max="300" ${bind('deleteAfter')} value="${Number(block.deleteAfter) || 0}">`, 'shrink')}
        </div>
        <div class="fld-row">
          ${nodeField('Titre', `<input class="input" ${bind('title')} value="${esc(block.title || '')}">`, 'grow')}
          ${nodeField('Lien du titre', `<input class="input" ${bind('url')} value="${esc(block.url || '')}" placeholder="https://…">`, 'grow')}
          ${nodeField('Couleur', `<input class="input color-mini" type="color" ${bind('color')} value="${esc(block.color || '#7c5cff')}">`, 'shrink')}
        </div>
        ${nodeField('Description', `<textarea class="textarea" rows="3" ${bind('description')}>${esc(block.description || '')}</textarea>`)}
        <div class="fld-row">
          ${nodeField('Auteur', `<input class="input" ${bind('author')} value="${esc(block.author || '')}" placeholder="KyllBot Studio">`, 'grow')}
          ${nodeField('Icône auteur', `<input class="input" ${bind('authorIcon')} value="${esc(block.authorIcon || '')}" placeholder="https://…">`, 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Image', `<input class="input" ${bind('image')} value="${esc(block.image || '')}" placeholder="https://…">`, 'grow')}
          ${nodeField('Miniature', `<input class="input" ${bind('thumbnail')} value="${esc(block.thumbnail || '')}" placeholder="https://…">`, 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Pied de page', `<input class="input" ${bind('footer')} value="${esc(block.footer || '')}">`, 'grow')}
          ${nodeField('Icône du pied', `<input class="input" ${bind('footerIcon')} value="${esc(block.footerIcon || '')}" placeholder="https://…">`, 'grow')}
          ${nodeField('Horodatage', `<button class="switch ${block.timestamp ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="timestamp"></button>`, 'shrink')}
        </div>
        ${renderEmbedFields(block)}`;
    case 'dm':
      return `<div class="fld-row">
          ${nodeField('Destinataire', `<input class="input" ${bind('target')} value="${esc(block.target || '')}" placeholder="Vide = membre déclencheur, sinon ID ou mention">`, 'grow')}
          ${nodeField('Envoyer en embed', `<button class="switch ${block.embed ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="embed"></button>`, 'shrink')}
        </div>
        ${block.embed ? `<div class="fld-row">
          ${nodeField('Titre', `<input class="input" ${bind('title')} value="${esc(block.title || '')}" placeholder="Message privé">`, 'grow')}
          ${nodeField('Couleur', `<input class="input color-mini" type="color" ${bind('color')} value="${esc(block.color || '#7c5cff')}">`, 'shrink')}
        </div>
        ${nodeField('Description', `<textarea class="textarea" rows="3" ${bind('description')} placeholder="Salut {{user.name}} !">${esc(block.description || '')}</textarea>`)}` : nodeField('Message privé', `<textarea class="textarea" rows="3" ${bind('text')} placeholder="Salut {{user.name}} !">${esc(block.text)}</textarea>`)}
        <p class="hint">Le message privé n’est visible que par la personne concernée. Laisse le destinataire vide pour écrire au membre qui a déclenché le flux.</p>`;
    case 'button': {
      const buttons = blockButtons(block);
      const buttonBind = (index, field) => `data-node="${block.id}" data-button="${index}" data-button-field="${field}"`;
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
        </div>
        <div class="button-editor-head">
          <b>${buttons.length} bouton(s)</b>
          <span>Maximum 5 par ligne · 1 sortie par bouton</span>
        </div>
        <div class="button-editor">
          ${buttons.map((button, index) => `<div class="button-editor-row">
            <div class="be-row-head">
              <span class="variant-badge">B${index + 1}</span>
              <b>Bouton ${index + 1}</b>
              <button class="mini-btn danger" data-action="flow-del-button" data-id="${block.id}" data-index="${index}" title="Supprimer">${icon('x')}</button>
            </div>
            <div class="fld-row button-main-fields">
              ${nodeField('Libellé', `<input class="input" ${buttonBind(index, 'label')} value="${esc(button.label || '')}" placeholder="Cliquez ici">`, 'grow button-field-wide')}
              ${nodeField('Valeur', `<input class="input" ${buttonBind(index, 'value')} value="${esc(button.value || '')}" placeholder="option_1">`, 'grow button-field-wide')}
            </div>
            <div class="fld-row">
              ${nodeField('Style', `<select class="select" ${buttonBind(index, 'style')}>
                <option value="primary" ${button.style === 'primary' ? 'selected' : ''}>Primaire</option>
                <option value="secondary" ${button.style === 'secondary' ? 'selected' : ''}>Secondaire</option>
                <option value="success" ${button.style === 'success' ? 'selected' : ''}>Succès</option>
                <option value="danger" ${button.style === 'danger' ? 'selected' : ''}>Danger</option>
                <option value="link" ${button.style === 'link' ? 'selected' : ''}>Lien</option>
              </select>`, 'shrink')}
              ${nodeField('Emoji', `<input class="input" ${buttonBind(index, 'emoji')} value="${esc(button.emoji || '')}" placeholder="✅">`, 'shrink')}
              ${nodeField('Désactivé', `<button class="switch ${button.disabled ? 'on' : ''}" data-action="flow-button-toggle" data-id="${block.id}" data-index="${index}" data-field="disabled"></button>`, 'shrink')}
              ${nodeField('URL', `<input class="input" ${buttonBind(index, 'url')} value="${esc(button.url || '')}" placeholder="https://…">`, 'grow')}
            </div>
            ${nodeField('Flux déclenché', `<input class="input" ${buttonBind(index, 'target')} value="${esc(button.target || '')}" placeholder="nom du flux (optionnel)">`)}
            ${nodeField('Sortie du bouton', flowTargetSelect(buttonBind(index, 'next'), block.id, button.next))}
          </div>`).join('')}
        </div>
        <p class="hint">Le flux s’arrête après l’envoi et reprend quand un bouton est cliqué. « Flux déclenché » permet de lancer un autre flux.</p>
        <button class="link-btn" data-action="flow-add-button" data-id="${block.id}">${icon('plus')} Ajouter un bouton</button>`;
    }
    case 'react':
      return nodeField('Emoji', `<input class="input" ${bind('emoji')} value="${esc(block.emoji || '')}" placeholder="👍">`, 'shrink');
    case 'random':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
          ${nodeField('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
          ${nodeField('Message privé', `<button class="switch ${block.dm ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="dm"></button>`, 'shrink')}
          ${nodeField('Supprimer après', `<input class="input" type="number" min="0" max="300" ${bind('deleteAfter')} value="${Number(block.deleteAfter) || 0}">`, 'shrink')}
          ${nodeField('Silencieux', `<button class="switch ${block.silent ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="silent"></button>`, 'shrink')}
          ${nodeField('Répondre', `<button class="switch ${block.reply ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="reply"></button>`, 'shrink')}
          ${nodeField('Vocal', `<button class="switch ${block.tts ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="tts"></button>`, 'shrink')}
          ${nodeField('Masquer les embeds', `<button class="switch ${block.suppressEmbeds ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="suppressEmbeds"></button>`, 'shrink')}
        </div>
        <div class="fld-row">
          ${nodeField('Réponse en embed', `<button class="switch ${block.embed ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="embed"></button>`, 'grow')}
          ${nodeField('Couleur', `<input class="input color-mini" type="color" ${bind('color')} value="${esc(block.color || '#7c5cff')}">`, 'shrink')}
        </div>
        ${block.embed ? `${nodeField('Titre', `<input class="input" ${bind('title')} value="${esc(block.title || '')}" placeholder="Titre de l’embed">`)}
        ${nodeField('Description', `<textarea class="textarea" rows="2" ${bind('description')} placeholder="Laissez vide pour utiliser le texte de la variante.">${esc(block.description || '')}</textarea>`)}
        <div class="fld-row">
          ${nodeField('Auteur', `<input class="input" ${bind('author')} value="${esc(block.author || '')}" placeholder="KyllBot Studio">`, 'grow')}
          ${nodeField('Icône auteur', `<input class="input" ${bind('authorIcon')} value="${esc(block.authorIcon || '')}" placeholder="https://…">`, 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Image', `<input class="input" ${bind('image')} value="${esc(block.image || '')}" placeholder="https://…">`, 'grow')}
          ${nodeField('Miniature', `<input class="input" ${bind('thumbnail')} value="${esc(block.thumbnail || '')}" placeholder="https://…">`, 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Pied de page', `<input class="input" ${bind('footer')} value="${esc(block.footer || '')}" placeholder="KyllBot Studio">`, 'grow')}
          ${nodeField('Icône du pied', `<input class="input" ${bind('footerIcon')} value="${esc(block.footerIcon || '')}" placeholder="https://…">`, 'grow')}
          ${nodeField('Horodatage', `<button class="switch ${block.timestamp ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="timestamp"></button>`, 'shrink')}
        </div>
        ${renderEmbedFields(block)}` : ''}
        <p class="hint">Chaque variante utilise le salon, l’embed et les options ci-dessus. Le poids règle la probabilité de tirage.</p>
        <div class="variant-editor-head">
          <b>${block.variants.length} variante(s)</b>
          <span>Total ${block.variants.reduce((sum, variant) => sum + (Number(variant.weight) || 1), 0)} points</span>
        </div>
        <div class="variants">${block.variants
        .map((variant, index) => {
          const total = block.variants.reduce((sum, item) => sum + (Number(item.weight) || 1), 0);
          const percent = Math.round(((Number(variant.weight) || 1) / total) * 100);
          return `<div class="variant-row">
            <span class="variant-badge">V${index + 1}</span>
            <div class="variant-main">
              <textarea class="textarea" rows="2" data-node="${block.id}" data-variant="${index}" data-variant-field="text" placeholder="Texte de la variante">${esc(variant.text)}</textarea>
              <div class="variant-meta">
                <label>Poids <input class="input weight" type="number" min="1" max="100" data-node="${block.id}" data-variant="${index}" data-variant-field="weight" value="${variant.weight}"></label>
                <label class="variant-target">Sortie ${flowTargetSelect(`data-node="${block.id}" data-variant="${index}" data-variant-field="next"`, block.id, variant.next)}</label>
                <span class="variant-percent">${percent} %</span>
              </div>
            </div>
            <button class="mini-btn danger" data-action="flow-del-variant" data-id="${block.id}" data-index="${index}" title="Supprimer">${icon('x')}</button>
          </div>`;
        })
        .join('')}
        <div class="variant-actions">
          <button class="link-btn" data-action="flow-add-variant" data-id="${block.id}">${icon('plus')} Ajouter une variante</button>
          <button class="link-btn" data-action="flow-variant-bank" data-id="${block.id}">${icon('shuffle')} Banque (48)</button>
          <button class="link-btn" data-action="flow-balance-variants" data-id="${block.id}">${icon('chart')} Répartir équitablement</button>
        </div>
      </div>`;
    case 'reply':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
          ${nodeField('Mentionner', `<button class="switch ${block.ping ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ping"></button>`, 'shrink')}
        </div>
        ${nodeField('Réponse', `<textarea class="textarea" rows="3" ${bind('text')} placeholder="Merci {{user.name}} !">${esc(block.text)}</textarea>`)}
        <div class="fld-row">
          ${nodeField('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
          ${nodeField('Message privé', `<button class="switch ${block.dm ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="dm"></button>`, 'shrink')}
          ${nodeField('Supprimer après', `<input class="input" type="number" min="0" max="300" ${bind('deleteAfter')} value="${Number(block.deleteAfter) || 0}">`, 'shrink')}
        </div>`;
    case 'edit':
      return `<div class="fld-row">
          ${nodeField('Message', `<input class="input" ${bind('messageRef')} value="${esc(block.messageRef || '')}" placeholder="dernier">`, 'grow')}
          ${nodeField('Embed', `<button class="switch ${block.embed ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="embed"></button>`, 'shrink')}
        </div>
        ${nodeField('Nouveau texte', `<textarea class="textarea" rows="3" ${bind('text')} placeholder="Texte mis à jour">${esc(block.text)}</textarea>`)}
        ${block.embed ? `${nodeField('Titre', `<input class="input" ${bind('title')} value="${esc(block.title || '')}">`)}
        ${nodeField('Description', `<textarea class="textarea" rows="2" ${bind('description')}>${esc(block.description || '')}</textarea>`)}
        ${nodeField('Couleur', `<input class="input color-mini" type="color" ${bind('color')} value="${esc(block.color || '#7c5cff')}">`, 'shrink')}` : ''}`;
    case 'thread':
      return `<div class="fld-row">
          ${nodeField('Nom du fil', `<input class="input" ${bind('name')} value="${esc(block.name || '')}" placeholder="discussion">`, 'grow')}
          ${nodeField('Archivage', `<select class="select" ${bind('archive')}>
            <option value="60" ${block.archive === '60' ? 'selected' : ''}>1 heure</option>
            <option value="1440" ${block.archive === '1440' ? 'selected' : ''}>24 heures</option>
            <option value="4320" ${block.archive === '4320' ? 'selected' : ''}>3 jours</option>
            <option value="10080" ${block.archive === '10080' ? 'selected' : ''}>7 jours</option>
          </select>`, 'shrink')}
        </div>
        ${nodeField('Fil privé', `<button class="switch ${block.private ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="private"></button>`, 'shrink')}`;
    case 'forum':
      return `<div class="fld-row">
          ${nodeField('Salon forum', flowChannelSelect(bind('channel'), block.channel, { types: ['forum'], emptyLabel: 'Choisir un forum…' }), 'grow')}
        </div>
        ${nodeField('Titre du post', `<input class="input" ${bind('title')} value="${esc(block.title || '')}" placeholder="Nouveau post">`)}
        ${nodeField('Contenu', `<textarea class="textarea" rows="3" ${bind('content')} placeholder="Décrivez votre sujet…">${esc(block.content || '')}</textarea>`)}
        ${nodeField('Étiquettes', `<input class="input" ${bind('tags')} value="${esc(block.tags || '')}" placeholder="aide, discussion">`)}`;
    case 'forumAction': {
      const action = block.action === 'close' ? 'close' : 'message';
      return `<div class="fld-row">
          ${nodeField('Action', `<select class="select" ${bind('action')}>
            <option value="message" ${action === 'message' ? 'selected' : ''}>Envoyer un message</option>
            <option value="close" ${action === 'close' ? 'selected' : ''}>Fermer le post</option>
          </select>`, 'grow')}
          ${nodeField('Salon forum', flowChannelSelect(bind('channel'), block.channel, { types: ['forum', 'text'], emptyLabel: 'Post actuel' }), 'grow')}
        </div>
        ${nodeField('Post (nom ou ID)', `<input class="input" ${bind('post')} value="${esc(block.post || '')}" placeholder="Vide = post actuel">`)}
        ${nodeField(action === 'close' ? 'Message de fermeture' : 'Message', `<textarea class="textarea" rows="3" ${bind('content')} placeholder="${action === 'close' ? 'Ce post est fermé.' : 'Votre message…'}">${esc(block.content || '')}</textarea>`)}
        ${action === 'close' ? nodeField('Raison', `<input class="input" ${bind('reason')} value="${esc(block.reason || '')}" placeholder="Post fermé par le staff.">`) : ''}
        <p class="hint">Laisse « Post » vide pour utiliser le post de forum en cours. Sinon, indique son nom ou son identifiant.</p>`;
    }
    case 'forumDelete':
      return `<div class="fld-row">
          ${nodeField('Salon forum', flowChannelSelect(bind('channel'), block.channel, { types: ['forum', 'text'], emptyLabel: 'Post actuel' }), 'grow')}
        </div>
        ${nodeField('Post (nom ou ID)', `<input class="input" ${bind('post')} value="${esc(block.post || '')}" placeholder="Vide = post actuel">`)}
        ${nodeField('Message à supprimer', `<input class="input" ${bind('message')} value="${esc(block.message || 'last')}" placeholder="last, ID ou début du texte">`)}
        <p class="hint">« last » supprime le dernier message du post. Tu peux aussi mettre l’ID du message ou un morceau de son texte.</p>`;
    case 'ai': {
      const provider = ['auto', 'openai', 'local'].includes(block.provider) ? block.provider : 'auto';
      return `<div class="fld-row">
          ${nodeField('Mode IA', `<select class="select" ${bind('provider')}>
            <option value="auto" ${provider === 'auto' ? 'selected' : ''}>Automatique — sans clé</option>
            <option value="openai" ${provider === 'openai' ? 'selected' : ''}>OpenAI — clé serveur</option>
            <option value="local" ${provider === 'local' ? 'selected' : ''}>Local — réponses intégrées</option>
          </select>`, 'grow')}
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Modèle (mode OpenAI)', `<select class="select" ${bind('model')}>
            <option value="gpt-4o-mini" ${block.model !== 'gpt-4o' ? 'selected' : ''}>GPT-4o mini</option>
            <option value="gpt-4o" ${block.model === 'gpt-4o' ? 'selected' : ''}>GPT-4o</option>
          </select>`, 'grow')}
          ${nodeField('Variable', `<input class="input" ${bind('variable')} value="${esc(block.variable || '')}" placeholder="ia">`, 'shrink')}
        </div>
        ${nodeField('Invite / prompt', `<textarea class="textarea" rows="3" ${bind('prompt')} placeholder="{{message}}">${esc(block.prompt)}</textarea>`)}
        <div class="fld-row">
          ${nodeField('Tokens max', `<input class="input" type="number" min="50" max="4000" ${bind('maxTokens')} value="${block.maxTokens || 300}">`, 'shrink')}
        </div>
        <p class="hint">Le mode automatique répond à toutes les questions avec une IA gratuite, puis bascule sur Wikipédia et les réponses intégrées si le réseau est indisponible. Les questions courantes reçoivent une réponse immédiate et le bot garde le contexte des derniers messages du salon. Le mode OpenAI utilise la clé du serveur pour des réponses encore plus précises.</p>`;
    }
    case 'image':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
        </div>
        ${nodeField('URL de l’image ou du GIF', `<input class="input" ${bind('url')} value="${esc(block.url || '')}" placeholder="https://…">`)}
        ${nodeField('Texte alternatif', `<input class="input" ${bind('alt')} value="${esc(block.alt || '')}" placeholder="Description de l’image">`)}`;
    case 'music': {
      const action = block.action === 'stop' ? 'stop' : 'play';
      return `<div class="fld-row">
          ${nodeField('Action', `<select class="select" ${bind('action')}>
            <option value="play" ${action === 'play' ? 'selected' : ''}>Jouer un son</option>
            <option value="stop" ${action === 'stop' ? 'selected' : ''}>Arrêter et quitter</option>
          </select>`, 'grow')}
          ${nodeField('Mode', `<select class="select" ${bind('mode')}>
            <option value="voice" ${block.mode !== 'personal' ? 'selected' : ''}>Salon vocal</option>
            <option value="personal" ${block.mode === 'personal' ? 'selected' : ''}>Privé (moi seul)</option>
          </select>`, 'grow')}
        </div>
        ${action === 'play' ? nodeField('URL audio directe', `<input class="input" ${bind('url')} value="${esc(block.url || '')}" placeholder="https://…/musique.mp3">`) : ''}
        ${action === 'play' ? nodeField('Titre affiché', `<input class="input" ${bind('title')} value="${esc(block.title || '')}" placeholder="Ma musique">`) : ''}
        ${block.mode !== 'personal' ? nodeField('Salon vocal', flowChannelSelect(bind('channel'), block.channel, { types: ['voice'], emptyLabel: 'Vocal du membre' }), 'grow') : ''}
        ${action === 'play' ? `<div class="fld-row">
          ${nodeField('Volume (%)', `<input class="input" type="number" min="0" max="200" ${bind('volume')} value="${block.volume ?? 80}">`, 'shrink')}
          ${nodeField('Boucle', `<button class="switch ${block.loop ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="loop"></button>`, 'shrink')}
        </div>` : ''}
        <p class="hint">Mode vocal : le bot rejoint le salon et joue pour tout le monde. Mode privé : envoie le lien en éphémère ou en message privé, donc seule la personne qui a lancé le flux l’entend.</p>`;
    }
    case 'poll':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
        </div>
        ${nodeField('Question', `<input class="input" ${bind('question')} value="${esc(block.question || '')}" placeholder="Votre avis ?">`)}
        ${nodeField('Options (une par ligne)', `<textarea class="textarea" rows="3" ${bind('options')} placeholder="Oui\nNon">${esc(block.options || '')}</textarea>`)}
        <div class="fld-row">
          ${nodeField('Durée (heures)', `<input class="input" type="number" min="1" max="168" ${bind('duration')} value="${block.duration || 24}">`, 'shrink')}
          ${nodeField('Choix multiple', `<button class="switch ${block.multiple ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="multiple"></button>`, 'shrink')}
        </div>`;
    case 'select':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
        </div>
        ${nodeField('Placeholder', `<input class="input" ${bind('placeholder')} value="${esc(block.placeholder || '')}" placeholder="Choisissez…">`)}
        ${nodeField('Options (une par ligne)', `<textarea class="textarea" rows="3" ${bind('options')} placeholder="Option 1\nOption 2">${esc(block.options || '')}</textarea>`)}
        <div class="fld-row">
          ${nodeField('Min', `<input class="input" type="number" min="1" max="25" ${bind('min')} value="${block.min || 1}">`, 'shrink')}
          ${nodeField('Max', `<input class="input" type="number" min="1" max="25" ${bind('max')} value="${block.max || 1}">`, 'shrink')}
        </div>
        <p class="hint">Le flux attend le choix puis reprend avec <b>{{select}}</b> et <b>{{selection}}</b>.</p>`;
    case 'modal':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
        </div>
        ${nodeField('Titre', `<input class="input" ${bind('title')} value="${esc(block.title || '')}" placeholder="Formulaire">`)}
        ${renderModalFields(block)}
        ${nodeField('Bouton', `<input class="input" ${bind('submitLabel')} value="${esc(block.submitLabel || '')}" placeholder="Envoyer">`)}
        <p class="hint">Jusqu’à ${MAX_MODAL_FIELDS} champs. Discord affiche 5 champs par fenêtre : le formulaire passe automatiquement à la suite avec un bouton « Continuer ». Les titres peuvent aller jusqu’à 100 caractères ; Discord en affiche 45 en titre et le reste en description. Après validation, le flux continue avec <b>{{nom_du_champ}}</b> et <b>{{form.nom_du_champ}}</b>.</p>`;
    case 'giveaway':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
        </div>
        ${nodeField('Lot à gagner', `<input class="input" ${bind('prize')} value="${esc(block.prize || '')}" placeholder="Un mois de Nitro">`)}
        <div class="fld-row">
          ${nodeField('Durée (heures)', `<input class="input" type="number" min="1" max="720" ${bind('duration')} value="${block.duration || 24}">`, 'shrink')}
          ${nodeField('Gagnants', `<input class="input" type="number" min="1" max="50" ${bind('winners')} value="${block.winners || 1}">`, 'shrink')}
          ${nodeField('Emoji', `<input class="input" ${bind('emoji')} value="${esc(block.emoji || '🎉')}" placeholder="🎉">`, 'shrink')}
        </div>`;
    case 'await':
      return `<div class="fld-row">
          ${nodeField('Interaction', `<select class="select" ${bind('kind')}>
            <option value="button" ${block.kind === 'button' ? 'selected' : ''}>Bouton</option>
            <option value="reaction" ${block.kind === 'reaction' ? 'selected' : ''}>Réaction</option>
            <option value="message" ${block.kind === 'message' ? 'selected' : ''}>Message</option>
          </select>`, 'grow')}
          ${nodeField('Délai (s)', `<input class="input" type="number" min="5" max="3600" ${bind('timeout')} value="${block.timeout || 60}">`, 'shrink')}
        </div>`;
    case 'role':
      return `<div class="fld-row">
          ${nodeField('Action', `<select class="select" ${bind('action')}>
            <option value="add" ${block.action === 'add' ? 'selected' : ''}>Ajouter</option>
            <option value="remove" ${block.action === 'remove' ? 'selected' : ''}>Retirer</option>
          </select>`, 'shrink')}
          ${nodeField('Rôle', flowRoleSelect(bind('role'), block.role), 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Durée', `<div class="form-row">
            <input class="input" type="number" min="0" max="525600" ${bind('duration')} value="${block.duration || 0}">
            <select class="select" ${bind('durationUnit')}>
              <option value="minutes" ${(block.durationUnit || 'minutes') === 'minutes' ? 'selected' : ''}>Minutes</option>
              <option value="hours" ${block.durationUnit === 'hours' ? 'selected' : ''}>Heures</option>
              <option value="days" ${block.durationUnit === 'days' ? 'selected' : ''}>Jours</option>
            </select>
          </div>`, 'grow')}
          ${nodeField('Raison', `<input class="input" ${bind('reason')} value="${esc(block.reason || '')}" placeholder="Rôle temporaire">`, 'grow')}
        </div>
        <p class="hint">Durée <b>0</b> = rôle permanent. Une durée positive retire automatiquement le rôle à la fin.</p>
        <p class="hint">La cible est le membre qui a déclenché le flux : auteur du message, membre qui a cliqué le bouton ou validé le formulaire.</p>`;
    case 'channel':
      return `<div class="fld-row">
          ${nodeField('Nom', `<input class="input" ${bind('name')} value="${esc(block.name || '')}" placeholder="nouveau-salon">`, 'grow')}
          ${nodeField('Type', `<select class="select" ${bind('kind')}>
            <option value="text" ${block.kind === 'text' ? 'selected' : ''}>Textuel</option>
            <option value="voice" ${block.kind === 'voice' ? 'selected' : ''}>Vocal</option>
            <option value="forum" ${block.kind === 'forum' ? 'selected' : ''}>Forum</option>
          </select>`, 'shrink')}
        </div>
        <div class="fld-row">
          ${nodeField('Catégorie', flowCategorySelect(bind('category'), block.category), 'grow')}
          ${nodeField('NSFW', `<button class="switch ${block.nsfw ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="nsfw"></button>`, 'shrink')}
          ${nodeField('Mode lent (s)', `<input class="input" type="number" min="0" max="21600" ${bind('slowmode')} value="${block.slowmode || 0}">`, 'shrink')}
        </div>
        ${nodeField('Sujet', `<input class="input" ${bind('topic')} value="${esc(block.topic || '')}" placeholder="Sujet du salon">`)}`;
    default:
      return renderNodeFieldsB(block);
  }
}

function renderNodeFieldsB(block) {
  const bind = (name) => `data-node="${block.id}" data-field="${name}"`;

  switch (block.type) {
    case 'pin':
      return `${nodeField('Action', `<select class="select" ${bind('unpin')}>
          <option value="false" ${!block.unpin ? 'selected' : ''}>Épingler</option>
          <option value="true" ${block.unpin ? 'selected' : ''}>Désépingler</option>
        </select>`)}`;
    case 'delete':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel, { emptyLabel: 'Salon du déclencheur' }), 'grow')}
          ${nodeField('Nombre de messages', `<input class="input" type="number" min="1" max="100" ${bind('count')} value="${block.count || 1}">`, 'shrink')}
        </div>`;
    case 'setvar':
      return `<div class="fld-row">
          ${nodeField('Variable', `<input class="input" ${bind('name')} value="${esc(block.name || '')}" placeholder="score">`, 'shrink')}
          ${nodeField('Valeur', `<input class="input" ${bind('value')} value="${esc(block.value || '')}" placeholder="3">`, 'grow')}
        </div>`;
    case 'counter':
      return `<div class="fld-row">
          ${nodeField('Variable', `<input class="input" ${bind('name')} value="${esc(block.name || '')}" placeholder="score">`, 'grow')}
          ${nodeField('Opération', `<select class="select" ${bind('op')}>
            <option value="add" ${block.op === 'add' ? 'selected' : ''}>+</option>
            <option value="sub" ${block.op === 'sub' ? 'selected' : ''}>−</option>
            <option value="mul" ${block.op === 'mul' ? 'selected' : ''}>×</option>
            <option value="set" ${block.op === 'set' ? 'selected' : ''}>=</option>
          </select>`, 'shrink')}
          ${nodeField('Valeur', `<input class="input" ${bind('value')} value="${esc(block.value || '')}" placeholder="1">`, 'shrink')}
        </div>`;
    case 'wait':
      return nodeField('Durée (secondes)', `<input class="input" type="number" min="1" max="30" ${bind('seconds')} value="${block.seconds || 3}">`, 'shrink');
    case 'timer':
      return `<div class="fld-row">
          ${nodeField('Durée', `<input class="input" type="number" min="1" max="86400" ${bind('duration')} value="${block.duration || 5}">`, 'shrink')}
          ${nodeField('Unité', `<select class="select" ${bind('unit')}>
            <option value="seconds" ${block.unit === 'seconds' ? 'selected' : ''}>Secondes</option>
            <option value="minutes" ${block.unit === 'minutes' ? 'selected' : ''}>Minutes</option>
            <option value="hours" ${block.unit === 'hours' ? 'selected' : ''}>Heures</option>
          </select>`, 'grow')}
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
          ${nodeField('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
          ${nodeField('Message privé', `<button class="switch ${block.dm ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="dm"></button>`, 'shrink')}
        </div>
        ${nodeField('Message de départ', `<textarea class="textarea" rows="2" ${bind('startText')} placeholder="⏳ Fin {{time}}">${esc(block.startText || '')}</textarea>`)}
        ${nodeField('Message de fin', `<textarea class="textarea" rows="2" ${bind('endText')} placeholder="⏰ Temps écoulé !">${esc(block.endText || '')}</textarea>`)}
        ${nodeField('Attendre la fin avant de continuer', `<button class="switch ${block.wait ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="wait"></button>`, 'shrink')}
        <p class="hint">Envoie un message de départ, puis le message de fin après le délai. Utilise <code>{{time}}</code>, <code>{{timestamp}}</code> et <code>{{duration}}</code>.</p>`;
    case 'chrono': {
      const action = block.action === 'stop' ? 'stop' : block.action === 'service' ? 'service' : 'start';
      return `<div class="fld-row">
          ${nodeField('Action', `<select class="select" ${bind('action')}>
            <option value="start" ${action === 'start' ? 'selected' : ''}>Démarrer le chronomètre</option>
            <option value="stop" ${action === 'stop' ? 'selected' : ''}>Arrêter le chronomètre</option>
            <option value="service" ${action === 'service' ? 'selected' : ''}>Chrono du service actuel</option>
          </select>`, 'grow')}
          ${action === 'service'
            ? ''
            : nodeField('Variable du chrono', `<input class="input" ${bind('variable')} value="${esc(block.variable || 'chrono_start')}" placeholder="chrono_start">`, 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel), 'grow')}
          ${nodeField('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
          ${nodeField('Message privé', `<button class="switch ${block.dm ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="dm"></button>`, 'shrink')}
        </div>
        ${action === 'start'
          ? `${nodeField('Message de départ', `<textarea class="textarea" rows="2" ${bind('startText')} placeholder="⏱️ Chronomètre démarré.">${esc(block.startText || '')}</textarea>`)}
             <p class="hint">Enregistre l’heure de départ. Le bloc « Arrêter le chronomètre » avec la même variable calcule le temps écoulé, même dans un autre déclenchement.</p>`
          : action === 'service'
            ? `${nodeField('Message si le membre est en service', `<textarea class="textarea" rows="2" ${bind('serviceText')} placeholder="⏱️ {{member}} est en service depuis {{elapsed}}.">${esc(block.serviceText || '')}</textarea>`)}
               ${nodeField('Message si aucun service', `<textarea class="textarea" rows="2" ${bind('emptyServiceText')} placeholder="⚠️ Aucun service en cours pour {{member}}.">${esc(block.emptyServiceText || '')}</textarea>`)}
               <p class="hint">Affiche le chrono du service en cours pour ce membre, sans l’arrêter. Variables : <code>{{elapsed}}</code>, <code>{{chrono}}</code>, <code>{{member}}</code>, <code>{{service}}</code>, <code>{{penalty}}</code>, <code>{{total}}</code>.</p>`
            : `${nodeField('Message de fin', `<textarea class="textarea" rows="2" ${bind('stopText')} placeholder="⏱️ Temps écoulé : {{elapsed}}">${esc(block.stopText || '')}</textarea>`)}
               <p class="hint">Utilise <code>{{elapsed}}</code> pour afficher le temps écoulé. Le chrono doit avoir été démarré avec la même variable.</p>`}`;
    }
    case 'serviceStart':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel, { emptyLabel: 'Salon du déclencheur' }), 'grow')}
          ${nodeField('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
          ${nodeField('Message privé', `<button class="switch ${block.dm ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="dm"></button>`, 'shrink')}
        </div>
        ${nodeField('Message de démarrage', `<textarea class="textarea" rows="2" ${bind('startText')} placeholder="▶️ Service démarré pour {{member}}.">${esc(block.startText || '')}</textarea>`)}
        ${nodeField('Message si déjà en cours', `<textarea class="textarea" rows="2" ${bind('alreadyText')} placeholder="⚠️ Service déjà en cours depuis {{since}}.">${esc(block.alreadyText || '')}</textarea>`)}
        <p class="hint">Le service est suivi par membre. Variables : <code>{{member}}</code>, <code>{{chrono}}</code>, <code>{{service}}</code>, <code>{{penalty}}</code>, <code>{{total}}</code>, <code>{{period}}</code>.</p>`;
    case 'serviceStop':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel, { emptyLabel: 'Salon du déclencheur' }), 'grow')}
          ${nodeField('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
          ${nodeField('Message privé', `<button class="switch ${block.dm ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="dm"></button>`, 'shrink')}
        </div>
        ${nodeField('Message de fin', `<textarea class="textarea" rows="2" ${bind('stopText')} placeholder="⏹️ Service terminé : {{duration}} ajoutées.">${esc(block.stopText || '')}</textarea>`)}
        ${nodeField('Message si aucun service', `<textarea class="textarea" rows="2" ${bind('emptyText')} placeholder="⚠️ Aucun service en cours pour {{member}}.">${esc(block.emptyText || '')}</textarea>`)}
        <p class="hint">Ajoute le temps écoulé au total du membre. Variables : <code>{{duration}}</code>, <code>{{chrono}}</code>, <code>{{service}}</code>, <code>{{penalty}}</code>, <code>{{total}}</code>.</p>`;
    case 'servicePenalty':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel, { emptyLabel: 'Salon du déclencheur' }), 'grow')}
          ${nodeField('Titre du formulaire', `<input class="input" ${bind('title')} value="${esc(block.title || 'Pénalité de service')}" placeholder="Pénalité de service">`, 'grow')}
        </div>
        ${nodeField('Message de confirmation', `<textarea class="textarea" rows="3" ${bind('penaltyText')} placeholder="✅ Pénalité de {{penalty_added}} ajoutée à {{member}}.">${esc(block.penaltyText || '')}</textarea>`)}
        <p class="hint">À l’exécution, le bot ouvre un formulaire avec le membre et la durée. Durées acceptées : <code>30</code>, <code>30 min</code>, <code>1 h 30</code>, <code>90 min</code>, <code>2 jours</code>.</p>`;
    case 'serviceLeaderboard':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel, { emptyLabel: 'Salon du déclencheur' }), 'grow')}
          ${nodeField('Nombre de membres', `<input class="input" type="number" min="1" max="25" ${bind('top')} value="${block.top || 10}">`, 'shrink')}
        </div>
        ${nodeField('Titre', `<input class="input" ${bind('title')} value="${esc(block.title || 'Classement du service')}" placeholder="Classement du service">`)}
        ${nodeField('Réponse éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
        <p class="hint">Affiche le nom, le temps de service, la pénalité et le total. Le classement est trié par total décroissant.</p>`;
    case 'serviceOnline':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel, { emptyLabel: 'Salon du déclencheur' }), 'grow')}
          ${nodeField('Actualisation', `<select class="select" ${bind('interval')}>
            <option value="30" ${Number(block.interval) === 30 ? 'selected' : ''}>Toutes les 30 secondes</option>
            <option value="60" ${Number(block.interval) !== 30 ? 'selected' : ''}>Toutes les minutes</option>
          </select>`, 'grow')}
          ${nodeField('Lignes max', `<input class="input" type="number" min="1" max="50" ${bind('maxEntries')} value="${block.maxEntries || 25}">`, 'shrink')}
        </div>
        ${nodeField('Titre de l’encadré', `<input class="input" ${bind('title')} value="${esc(block.title || '🟢 Chrono en ligne')}" placeholder="🟢 Chrono en ligne">`)}
        ${nodeField('Message si personne n’est en service', `<textarea class="textarea" rows="2" ${bind('emptyText')} placeholder="Personne n’est en service pour le moment.">${esc(block.emptyText || '')}</textarea>`)}
        <p class="hint">Encadré foncé avec une ligne par personne en service : nom + temps en ligne. Le même message est actualisé sans être renvoyé. L’intervalle met à jour l’affichage, il ne remet pas le temps de service à zéro.</p>`;
    case 'serviceConfig':
      return `<div class="fld-row">
          ${nodeField('Période', `<select class="select" ${bind('period')}>
            <option value="week" ${block.period !== 'month' ? 'selected' : ''}>1 semaine</option>
            <option value="month" ${block.period === 'month' ? 'selected' : ''}>1 mois</option>
          </select>`, 'grow')}
          ${nodeField('Jour de remise à zéro', `<select class="select" ${bind('resetDay')}>
            ${['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day, index) => `<option value="${index + 1}" ${(block.resetDay || 1) === index + 1 ? 'selected' : ''}>${day}</option>`).join('')}
          </select>`, 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Heure de remise à zéro', `<input class="input" type="number" min="0" max="23" ${bind('resetHour')} value="${block.resetHour || 0}">`, 'shrink')}
          ${nodeField('Fuseau horaire', `<input class="input" ${bind('timezone')} value="${esc(block.timezone || 'Europe/Paris')}" placeholder="Europe/Paris">`, 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel, { emptyLabel: 'Salon du déclencheur' }), 'grow')}
          ${nodeField('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
          ${nodeField('Message privé', `<button class="switch ${block.dm ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="dm"></button>`, 'shrink')}
        </div>
        ${nodeField('Message de confirmation', `<textarea class="textarea" rows="2" ${bind('message')} placeholder="✅ Période du service : {{period}}.">${esc(block.message || '')}</textarea>`)}
        <p class="hint">Par défaut : une semaine, remise à zéro le lundi à 00:00 (Europe/Paris). Modifier la période réinitialise les compteurs.</p>`;
    case 'serviceReset':
      return `<div class="fld-row">
          ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel, { emptyLabel: 'Salon du déclencheur' }), 'grow')}
          ${nodeField('Éphémère', `<button class="switch ${block.ephemeral ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="ephemeral"></button>`, 'shrink')}
          ${nodeField('Message privé', `<button class="switch ${block.dm ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="dm"></button>`, 'shrink')}
        </div>
        ${nodeField('Message', `<textarea class="textarea" rows="2" ${bind('message')} placeholder="🧹 Les compteurs du service ont été réinitialisés.">${esc(block.message || '')}</textarea>`)}
        <p class="hint">Remet à zéro les temps de service et les pénalités de la période en cours.</p>`;
    case 'cooldown':
      return `<div class="fld-row">
          ${nodeField('Durée (s)', `<input class="input" type="number" min="1" max="3600" ${bind('seconds')} value="${block.seconds || 10}">`, 'shrink')}
          ${nodeField('Par', `<select class="select" ${bind('scope')}>
            <option value="member" ${block.scope === 'member' ? 'selected' : ''}>Membre</option>
            <option value="channel" ${block.scope === 'channel' ? 'selected' : ''}>Salon</option>
          </select>`, 'grow')}
        </div>`;
    case 'typing':
      return nodeField('Durée (secondes)', `<input class="input" type="number" min="1" max="15" ${bind('seconds')} value="${block.seconds || 2}">`, 'shrink');
    case 'webhook':
      return `<div class="fld-row">
          ${nodeField('Méthode', `<select class="select" ${bind('method')}>
            <option value="POST" ${block.method === 'POST' ? 'selected' : ''}>POST</option>
            <option value="GET" ${block.method === 'GET' ? 'selected' : ''}>GET</option>
            <option value="PATCH" ${block.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
          </select>`, 'shrink')}
          ${nodeField('URL', `<input class="input" ${bind('url')} value="${esc(block.url || '')}" placeholder="https://…">`, 'grow')}
        </div>
        ${nodeField('Corps JSON', `<textarea class="textarea" rows="2" ${bind('body')} placeholder='{"membre":"{{user.name}}"}'>${esc(block.body)}</textarea>`)}`;
    case 'log':
      return nodeField('Note de journal', `<input class="input" ${bind('text')} value="${esc(block.text || '')}" placeholder="Ticket créé par {{user.name}}">`);
    case 'note':
      return `<div class="fld-row">
          ${nodeField('Titre', `<input class="input" ${bind('title')} value="${esc(block.title || '')}" placeholder="Note">`, 'grow')}
        </div>
        ${nodeField('Texte', `<textarea class="textarea" rows="4" ${bind('text')} placeholder="Écris ici une note pour l’équipe…">${esc(block.text || '')}</textarea>`)}
        <p class="hint">Cette note est enregistrée avec le flux mais n’envoie rien sur Discord.</p>`;
    case 'automationRun':
      return `<div class="fld-row">
          ${nodeField('Automatisation à déclencher', `<select class="select" ${bind('automationType')}>
            ${[
              ['welcome', "Message d'accueil"], ['autorole', 'Rôle automatique'], ['levels', 'Niveaux et XP'],
              ['ticketPanel', 'Panneau de tickets'], ['moderation', 'Modération automatique'], ['antiSpam', 'Anti-spam'],
              ['autoMod', 'Auto-modération'], ['antiRaid', 'Anti-raid'], ['botGuard', 'Bouclier anti-bots'],
              ['logs', 'Journaux de modération'], ['reminders', 'Rappels de formation'], ['repair', 'Réparation salons / rôles'],
            ].map(([value, label]) => `<option value="${value}" ${block.automationType === value ? 'selected' : ''}>${label}</option>`).join('')}
          </select>`, 'grow')}
          ${nodeField('Journal', `<button class="switch ${block.notify !== false ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="notify"></button>`, 'shrink')}
        </div>
        <p class="hint">Le flux déclenche les réactions liées à cette automatisation sur le serveur courant.</p>`;
    case 'accountCheck':
      return `<div class="fld-row">
          ${nodeField('Âge minimum (jours)', `<input class="input" type="number" min="0" max="365" ${bind('minAgeDays')} value="${block.minAgeDays ?? 7}">`, 'shrink')}
          ${nodeField('Bloquer les bots', `<button class="switch ${block.blockBots ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="blockBots"></button>`, 'shrink')}
          ${nodeField('Exiger un avatar', `<button class="switch ${block.requireAvatar ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="requireAvatar"></button>`, 'shrink')}
        </div>
        <div class="fld-row">
          ${nodeField('Si le compte est suspect', `<select class="select" ${bind('failAction')}>
            <option value="stop" ${block.failAction !== 'continue' ? 'selected' : ''}>Arrêter le flux</option>
            <option value="continue" ${block.failAction === 'continue' ? 'selected' : ''}>Continuer quand même</option>
          </select>`, 'grow')}
          ${nodeField('Variable résultat', `<input class="input" ${bind('variable')} value="${esc(block.variable || 'account_ok')}" placeholder="account_ok">`, 'shrink')}
        </div>
        ${nodeField('Message d’échec', `<textarea class="textarea" rows="2" ${bind('failMessage')} placeholder="🚫 Ton compte est trop récent…">${esc(block.failMessage || '')}</textarea>`)}
        ${nodeField('Salon du message', flowChannelSelect(bind('channel'), block.channel, { emptyLabel: 'Salon du déclencheur' }), 'grow')}
        <p class="hint">Vérifie l’âge du compte, l’avatar et les comptes bots. Le résultat est aussi disponible dans <code>{{account_ok}}</code> et <code>{{account_reasons}}</code>.</p>`;
    case 'moderation': {
      const action = block.action || 'warn';
      const needsDuration = ['timeout', 'ban', 'softban'].includes(action);
      const needsDeleteDays = ['ban', 'softban'].includes(action);
      const needsAmount = action === 'purge';
      const needsSeconds = action === 'slowmode';
      const needsRole = ['roleAdd', 'roleRemove'].includes(action);
      const needsNickname = action === 'nickname';
      const needsChannel = ['purge', 'slowmode', 'lock', 'unlock', 'voiceMove', 'log'].includes(action);
      const needsNotify = ['warn', 'timeout', 'kick', 'ban', 'softban'].includes(action);
      return `<div class="fld-row">
          ${nodeField('Action', `<select class="select" ${bind('action')}>
            ${[
              ['warn', 'Avertir'], ['timeout', 'Exclure temporairement'], ['kick', 'Expulser'], ['ban', 'Bannir'],
              ['softban', 'Softban (ban + unban)'], ['unban', 'Débannir'], ['purge', 'Purger des messages'],
              ['slowmode', 'Ralentir le salon'], ['lock', 'Verrouiller le salon'], ['unlock', 'Déverrouiller le salon'],
              ['roleAdd', 'Ajouter un rôle'], ['roleRemove', 'Retirer un rôle'], ['nickname', 'Changer le pseudo'],
              ['voiceMute', 'Mute vocal'], ['voiceUnmute', 'Unmute vocal'], ['voiceDeafen', 'Mute casque'],
              ['voiceUndeafen', 'Unmute casque'], ['voiceMove', 'Déplacer en vocal'], ['dm', 'Message privé'],
              ['log', 'Journal de modération'],
            ].map(([value, label]) => `<option value="${value}" ${action === value ? 'selected' : ''}>${label}</option>`).join('')}
          </select>`, 'grow')}
          ${nodeField('Cible', `<input class="input" ${bind('target')} value="${esc(block.target || '')}" placeholder="Vide = membre déclencheur">`, 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Raison', `<input class="input" ${bind('reason')} value="${esc(block.reason || '')}" placeholder="Règles du serveur">`, 'grow')}
          ${needsDuration ? nodeField('Durée', `<input class="input" type="number" min="1" max="10080" ${bind('duration')} value="${block.duration || 10}">`, 'shrink') : ''}
          ${needsDuration ? nodeField('Unité', `<select class="select" ${bind('durationUnit')}>
            <option value="minutes" ${block.durationUnit !== 'hours' && block.durationUnit !== 'days' ? 'selected' : ''}>Minutes</option>
            <option value="hours" ${block.durationUnit === 'hours' ? 'selected' : ''}>Heures</option>
            <option value="days" ${block.durationUnit === 'days' ? 'selected' : ''}>Jours</option>
          </select>`, 'shrink') : ''}
          ${needsDeleteDays ? nodeField('Supprimer messages (j)', `<input class="input" type="number" min="0" max="7" ${bind('deleteDays')} value="${block.deleteDays || 0}">`, 'shrink') : ''}
          ${needsAmount ? nodeField('Nombre', `<input class="input" type="number" min="1" max="100" ${bind('amount')} value="${block.amount || 10}">`, 'shrink') : ''}
          ${needsSeconds ? nodeField('Secondes', `<input class="input" type="number" min="0" max="21600" ${bind('seconds')} value="${block.seconds || 10}">`, 'shrink') : ''}
          ${needsNickname ? nodeField('Nouveau pseudo', `<input class="input" ${bind('nickname')} value="${esc(block.nickname || '')}" placeholder="Nouveau pseudo">`, 'grow') : ''}
        </div>
        ${needsRole ? `<div class="fld-row">${nodeField('Rôle', `<input class="input" ${bind('role')} value="${esc(block.role || '')}" placeholder="Nom ou ID du rôle">`, 'grow')}</div>` : ''}
        ${needsChannel ? `<div class="fld-row">${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel, { emptyLabel: 'Salon du déclencheur' }), 'grow')}</div>` : ''}
        <div class="fld-row">
          ${nodeField('Prévenir en privé', `<button class="switch ${block.notify !== false ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="notify"></button>`, 'shrink')}
          ${nodeField('Journal', `<input class="input" ${bind('logChannel')} value="${esc(block.logChannel || '')}" placeholder="Salon de logs (optionnel)">`, 'grow')}
        </div>
        ${needsNotify ? nodeField('Message privé de notification', `<textarea class="textarea" rows="2" ${bind('notifyMessage')} placeholder="Tu as reçu une sanction : {{reason}}">${esc(block.notifyMessage || '')}</textarea>`) : ''}
        ${action === 'log' ? nodeField('Détail du journal', `<input class="input" ${bind('evidence')} value="${esc(block.evidence || '')}" placeholder="Contexte ou preuve">`) : ''}
        <p class="hint">La cible accepte un ID, une mention ou un pseudo. Le bot doit avoir les permissions nécessaires et être au-dessus du membre dans la hiérarchie.</p>`;
    }
    case 'timeout':
      return `<div class="fld-row">
          ${nodeField('Durée (minutes)', `<input class="input" type="number" min="1" max="10080" ${bind('duration')} value="${block.duration || 10}">`, 'shrink')}
          ${nodeField('Raison', `<input class="input" ${bind('reason')} value="${esc(block.reason || '')}" placeholder="Comportement contraire aux règles">`, 'grow')}
        </div>`;
    case 'kick':
      return nodeField('Raison', `<input class="input" ${bind('reason')} value="${esc(block.reason || '')}" placeholder="Règles non respectées">`);
    case 'ban':
      return `<div class="fld-row">
          ${nodeField('Raison', `<input class="input" ${bind('reason')} value="${esc(block.reason || '')}" placeholder="Règles non respectées">`, 'grow')}
          ${nodeField('Supprimer les messages (jours)', `<input class="input" type="number" min="0" max="7" ${bind('deleteDays')} value="${block.deleteDays || 0}">`, 'shrink')}
        </div>`;
    case 'nickname':
      return nodeField('Nouveau pseudo', `<input class="input" ${bind('nickname')} value="${esc(block.nickname || '')}" placeholder="{{user.name}}">`);
    case 'move':
      return nodeField('Salon vocal', flowChannelSelect(bind('channel'), block.channel, { types: ['voice'], emptyLabel: 'Choisir un vocal…' }));
    case 'invite': {
      const action = block.action === 'view' ? 'view' : 'create';
      return `<div class="fld-row">
          ${nodeField('Action', `<select class="select" ${bind('action')}>
            <option value="create" ${action === 'create' ? 'selected' : ''}>Créer une invitation</option>
            <option value="view" ${action === 'view' ? 'selected' : ''}>Voir le lien</option>
          </select>`, 'grow')}
          ${nodeField('Livraison', `<select class="select" ${bind('delivery')}>
            <option value="channel" ${block.delivery !== 'dm' && block.delivery !== 'none' ? 'selected' : ''}>Dans le salon</option>
            <option value="dm" ${block.delivery === 'dm' ? 'selected' : ''}>Message privé</option>
            <option value="none" ${block.delivery === 'none' ? 'selected' : ''}>Ne pas envoyer</option>
          </select>`, 'grow')}
        </div>
        ${action === 'view'
          ? nodeField('Lien ou code d’invitation', `<input class="input" ${bind('invite')} value="${esc(block.invite || '')}" placeholder="https://discord.gg/… ou code">`)
          : `<div class="fld-row">
              ${nodeField('Salon', flowChannelSelect(bind('channel'), block.channel, { types: ['text'], emptyLabel: 'Choisir un salon…' }), 'grow')}
              ${nodeField('Utilisations max', `<input class="input" type="number" min="0" max="100" ${bind('maxUses')} value="${block.maxUses || 0}">`, 'shrink')}
              ${nodeField('Expiration (heures)', `<input class="input" type="number" min="0" max="720" ${bind('maxAge')} value="${block.maxAge || 24}">`, 'shrink')}
              ${nodeField('Membre temporaire', `<button class="switch ${block.temporary ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="temporary"></button>`, 'shrink')}
            </div>`}
        ${block.delivery !== 'none' ? nodeField('Message envoyé', `<textarea class="textarea" rows="2" ${bind('message')} placeholder="Invitation : {{invite}}">${esc(block.message || '')}</textarea>`) : ''}
        ${nodeField('Variable du lien', `<input class="input" ${bind('variable')} value="${esc(block.variable || '')}" placeholder="invite">`, 'shrink')}
        <p class="hint">« Voir le lien » réutilise une invitation existante. « Message privé » envoie le lien uniquement à la personne concernée.</p>`;
    }
    case 'ticket': {
      const isOpen = !block.action || block.action === 'open';
      const closeMode = block.closeMode || 'delete';
      return `<div class="fld-row">
          ${nodeField('Action', `<select class="select" ${bind('action')}>
            <option value="open" ${block.action === 'open' ? 'selected' : ''}>Ouvrir un ticket</option>
            <option value="claim" ${block.action === 'claim' ? 'selected' : ''}>Réclamer le ticket</option>
            <option value="close" ${block.action === 'close' ? 'selected' : ''}>Fermer le ticket</option>
          </select>`, 'shrink')}
          ${nodeField('Raison / sujet', `<input class="input" ${bind('reason')} value="${esc(block.reason || '')}" placeholder="Demande de support">`, 'grow')}
        </div>
        ${isOpen
          ? `${renderTicketButtons(block)}
        ${nodeField('Catégorie du ticket', flowCategorySelect(bind('category'), block.category))}
        <div class="fld-row">
          ${nodeField('Rôle du staff', flowRoleSelect(bind('staffRole'), block.staffRole), 'grow')}
          ${nodeField('Salon des logs', flowChannelSelect(bind('logChannel'), block.logChannel, { emptyLabel: 'Aucun journal' }), 'grow')}
        </div>
        ${nodeField('Message d’accueil', `<textarea class="textarea" rows="3" ${bind('welcomeMessage')} placeholder="Ton ticket est ouvert, le staff arrive.">${esc(block.welcomeMessage || '')}</textarea>`)}
        <div class="fld-row">
          ${nodeField('Préfixe du salon', `<input class="input" ${bind('namePrefix')} value="${esc(block.namePrefix || 'ticket')}" placeholder="ticket" maxlength="20">`, 'grow')}
          ${nodeField('Tickets max par membre', `<input class="input" type="number" min="1" max="10" ${bind('maxOpen')} value="${block.maxOpen || 1}">`, 'shrink')}
        </div>
        ${nodeField('Modèle du sujet', `<input class="input" ${bind('topicTemplate')} value="${esc(block.topicTemplate || 'Ticket de {user} — {reason}')}" placeholder="Ticket de {user} — {reason}">`)}
        <p class="hint">Variables du sujet : <code>{user}</code>, <code>{reason}</code>, <code>{id}</code>.</p>
        <div class="fld-row">
          ${nodeField('Fermeture', `<select class="select" ${bind('closeMode')}>
            <option value="delete" ${closeMode === 'delete' ? 'selected' : ''}>Supprimer le salon</option>
            <option value="archive" ${closeMode === 'archive' ? 'selected' : ''}>Archiver le salon</option>
            <option value="keep" ${closeMode === 'keep' ? 'selected' : ''}>Garder le salon</option>
          </select>`, 'grow')}
          ${nodeField('Délai (secondes)', `<input class="input" type="number" min="0" max="300" ${bind('closeDelay')} value="${Number(block.closeDelay) || 0}">`, 'shrink')}
        </div>
        ${closeMode === 'archive' ? nodeField('Catégorie d’archive', flowCategorySelect(bind('archiveCategory'), block.archiveCategory, 'Aucune catégorie')) : ''}
        <div class="fld-row">
          ${nodeField('Prévenir le staff', `<button class="switch ${block.pingStaff !== false ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="pingStaff"></button>`, 'shrink')}
          ${nodeField('Transcript dans les logs', `<button class="switch ${block.transcript ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="transcript"></button>`, 'shrink')}
          ${nodeField('Bouton Réclamer', `<button class="switch ${block.claimButton !== false ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="claimButton"></button>`, 'shrink')}
          ${nodeField('Bouton Fermer', `<button class="switch ${block.closeButton !== false ? 'on' : ''}" data-action="flow-node-toggle" data-id="${block.id}" data-field="closeButton"></button>`, 'shrink')}
        </div>
        <p class="hint">Le salon est privé : le membre, le bot et le rôle staff peuvent le voir. Le salon de logs reçoit les ouvertures, fermetures et transcripts.</p>`
          : '<p class="hint">Cette action agit sur le ticket du salon actuel. La fermeture utilise le mode et le délai configurés à l’ouverture du ticket. Les boutons personnalisés et leurs sorties sont disponibles avec l’action « Ouvrir un ticket ».</p>'}`;
    }
    case 'level':
      return `<div class="fld-row">
          ${nodeField('XP', `<input class="input" type="number" min="-10000" max="10000" ${bind('amount')} value="${block.amount || 10}">`, 'shrink')}
          ${nodeField('Variable', `<input class="input" ${bind('variable')} value="${esc(block.variable || '')}" placeholder="xp">`, 'grow')}
        </div>`;
    case 'randomNumber':
      return `<div class="fld-row">
          ${nodeField('Minimum', `<input class="input" type="number" ${bind('min')} value="${block.min ?? 1}">`, 'shrink')}
          ${nodeField('Maximum', `<input class="input" type="number" ${bind('max')} value="${block.max ?? 100}">`, 'shrink')}
          ${nodeField('Variable', `<input class="input" ${bind('variable')} value="${esc(block.variable || '')}" placeholder="nombre">`, 'grow')}
        </div>`;
    case 'string':
      return `<div class="fld-row">
          ${nodeField('Opération', `<select class="select" ${bind('operation')}>
            <option value="upper" ${block.operation === 'upper' ? 'selected' : ''}>Majuscules</option>
            <option value="lower" ${block.operation === 'lower' ? 'selected' : ''}>Minuscules</option>
            <option value="trim" ${block.operation === 'trim' ? 'selected' : ''}>Supprimer les espaces</option>
            <option value="reverse" ${block.operation === 'reverse' ? 'selected' : ''}>Inverser</option>
            <option value="length" ${block.operation === 'length' ? 'selected' : ''}>Longueur</option>
            <option value="replace" ${block.operation === 'replace' ? 'selected' : ''}>Remplacer</option>
          </select>`, 'grow')}
          ${nodeField('Variable', `<input class="input" ${bind('variable')} value="${esc(block.variable || '')}" placeholder="texte">`, 'shrink')}
        </div>
        ${nodeField('Texte source', `<input class="input" ${bind('source')} value="${esc(block.source || '')}" placeholder="{{message}}">`)}
        ${block.operation === 'replace' ? `<div class="fld-row">
          ${nodeField('Rechercher', `<input class="input" ${bind('search')} value="${esc(block.search || '')}">`, 'grow')}
          ${nodeField('Remplacer par', `<input class="input" ${bind('replace')} value="${esc(block.replace || '')}">`, 'grow')}
        </div>` : ''}`;
    case 'json':
      return `${nodeField('JSON source', `<textarea class="textarea" rows="2" ${bind('source')} placeholder='{"data":{"value":"ok"}}'>${esc(block.source || '')}</textarea>`)}
        <div class="fld-row">
          ${nodeField('Chemin', `<input class="input" ${bind('path')} value="${esc(block.path || '')}" placeholder="data.value">`, 'grow')}
          ${nodeField('Variable', `<input class="input" ${bind('variable')} value="${esc(block.variable || '')}" placeholder="valeur">`, 'shrink')}
        </div>`;
    case 'date':
      return `<div class="fld-row">
          ${nodeField('Format', `<input class="input" ${bind('format')} value="${esc(block.format || '')}" placeholder="dd/MM/yyyy HH:mm">`, 'grow')}
          ${nodeField('Variable', `<input class="input" ${bind('variable')} value="${esc(block.variable || '')}" placeholder="date">`, 'shrink')}
        </div>`;
    case 'stop':
      return nodeField('Raison', `<input class="input" ${bind('reason')} value="${esc(block.reason || '')}" placeholder="Flux terminé">`);
    case 'database':
      return `<div class="fld-row">
          ${nodeField('Action', `<select class="select" ${bind('action')}>
            <option value="set" ${block.action === 'set' ? 'selected' : ''}>Stocker</option>
            <option value="get" ${block.action === 'get' ? 'selected' : ''}>Lire</option>
          </select>`, 'shrink')}
          ${nodeField('Clé', `<input class="input" ${bind('key')} value="${esc(block.key || '')}" placeholder="cle">`, 'grow')}
        </div>
        <div class="fld-row">
          ${nodeField('Valeur', `<input class="input" ${bind('value')} value="${esc(block.value || '')}" placeholder="Valeur à stocker">`, 'grow')}
          ${nodeField('Variable', `<input class="input" ${bind('variable')} value="${esc(block.variable || '')}" placeholder="valeur">`, 'shrink')}
        </div>`;
    case 'captcha':
      return `<div class="fld-row">
          ${nodeField('Type', `<select class="select" ${bind('kind')}>
            <option value="button" ${block.kind === 'button' ? 'selected' : ''}>Bouton</option>
            <option value="modal" ${block.kind === 'modal' ? 'selected' : ''}>Formulaire</option>
          </select>`, 'grow')}
          ${nodeField('Délai (s)', `<input class="input" type="number" min="10" max="3600" ${bind('timeout')} value="${block.timeout || 120}">`, 'shrink')}
        </div>
        ${nodeField('Rôle après vérification', flowRoleSelect(bind('role'), block.role), 'grow')}`;
    case 'condition':
      return renderConditionFields(block);
    default:
      return '';
  }
}

function renderConditionFields(block) {
  return `<div class="cond-top">
      <span>Vrai si</span>
      <select class="select slim" data-node="${block.id}" data-field="mode">
        <option value="all" ${block.mode === 'all' ? 'selected' : ''}>toutes les règles</option>
        <option value="any" ${block.mode === 'any' ? 'selected' : ''}>au moins une règle</option>
      </select>
    </div>
    <div class="rules">
      ${block.rules
        .map(
          (rule, index) => `<div class="rule-row">
            <input class="input" data-node="${block.id}" data-rule="${index}" data-rule-field="left" value="${esc(rule.left)}" placeholder="{{user.roles}}">
            <select class="select slim" data-node="${block.id}" data-rule="${index}" data-rule-field="op">
              ${Object.entries(FLOW_OPERATORS)
                .map(([key, label]) => `<option value="${key}" ${rule.op === key ? 'selected' : ''}>${label}</option>`)
                .join('')}
            </select>
            <input class="input" data-node="${block.id}" data-rule="${index}" data-rule-field="right" value="${esc(rule.right)}" placeholder="Membre">
            <button class="mini-btn danger" data-action="flow-del-rule" data-id="${block.id}" data-index="${index}" title="Supprimer">${icon('x')}</button>
          </div>`,
        )
        .join('')}
      <button class="link-btn" data-action="flow-add-rule" data-id="${block.id}">${icon('plus')} Règle</button>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* canvas : vue, zoom, liens                                           */
/* ------------------------------------------------------------------ */

function flowViewState() {
  if (!flowEditor.view) flowEditor.view = { x: 40, y: 40, zoom: 1 };
  return flowEditor.view;
}

function applyFlowView() {
  const world = document.getElementById('flowWorld');
  const label = document.getElementById('flowZoomLabel');
  const view = flowViewState();
  if (world) world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
  if (label) label.textContent = `${Math.round(view.zoom * 100)} %`;
}

function fitFlowView() {
  const viewport = document.getElementById('flowViewport');
  const blocks = flowEditor.flow?.blocks || [];
  if (!viewport) return;
  if (!blocks.length) {
    flowEditor.view = { x: 40, y: 40, zoom: 1 };
    applyFlowView();
    return;
  }
  const minX = Math.min(...blocks.map((block) => block.x));
  const minY = Math.min(...blocks.map((block) => block.y));
  const maxX = Math.max(...blocks.map((block) => block.x)) + 370;
  const maxY = Math.max(...blocks.map((block) => block.y)) + 340;
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const zoom = Math.min(1, Math.max(0.18, Math.min((viewport.clientWidth - 60) / width, (viewport.clientHeight - 60) / height)));
  flowEditor.view = {
    zoom,
    x: (viewport.clientWidth - width * zoom) / 2 - minX * zoom,
    y: (viewport.clientHeight - height * zoom) / 2 - minY * zoom,
  };
  applyFlowView();
}

function focusFlowView(zoom = 0.9) {
  const viewport = document.getElementById('flowViewport');
  const blocks = flowEditor.flow?.blocks || [];
  if (!viewport) return;
  if (!blocks.length) {
    flowEditor.view = { x: 40, y: 40, zoom: 1 };
    applyFlowView();
    return;
  }
  const start = blocks.find((block) => block.id === flowEditor.flow.start) || blocks[0];
  const width = 350;
  const height = 170;
  flowEditor.view = {
    zoom,
    x: viewport.clientWidth / 2 - (start.x + width / 2) * zoom,
    y: viewport.clientHeight / 2 - (start.y + height / 2) * zoom,
  };
  applyFlowView();
}

function drawFlowEdges() {
  const svg = document.getElementById('flowEdges');
  const world = document.getElementById('flowWorld');
  const viewport = document.getElementById('flowViewport');
  if (!svg || !world || !flowEditor.flow) return;

  const blocks = flowEditor.flow.blocks;
  const view = flowViewState();
  const worldRect = world.getBoundingClientRect();
  const box = (el) => {
    const rect = el.getBoundingClientRect();
    return {
      x: (rect.left - worldRect.left) / view.zoom,
      y: (rect.top - worldRect.top) / view.zoom,
      w: rect.width / view.zoom,
      h: rect.height / view.zoom,
    };
  };

  const maxX = blocks.reduce((max, block) => Math.max(max, block.x), 0) + 560;
  const maxY = blocks.reduce((max, block) => Math.max(max, block.y), 0) + 420;
  world.style.width = `${Math.max(maxX, viewport?.clientWidth || 0)}px`;
  world.style.height = `${Math.max(maxY, viewport?.clientHeight || 0)}px`;
  svg.setAttribute('width', String(Math.max(maxX, viewport?.clientWidth || 0)));
  svg.setAttribute('height', String(Math.max(maxY, viewport?.clientHeight || 0)));

  const paths = [];
  for (const block of blocks) {
    const node = world.querySelector(`.node[data-node="${block.id}"]`);
    if (!node) continue;
    const pairs = flowOutputPairs(block);

    for (const { branch, target: targetId, tone } of pairs) {
      if (!targetId) continue;
      const port = node.querySelector(`.port.out[data-branch="${branch}"]`);
      const target = world.querySelector(`.node[data-node="${targetId}"] .port.in`);
      if (!port || !target) continue;
      const a = box(port);
      const b = box(target);
      const x1 = a.x + a.w;
      const y1 = a.y + a.h / 2;
      const x2 = b.x;
      const y2 = b.y + b.h / 2;
      const dx = Math.max(50, Math.abs(x2 - x1) * 0.45);
      paths.push(
        `<path class="edge ${tone}" d="M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}" />`,
      );
    }
  }
  svg.innerHTML = paths.join('');
}

function canvasPoint(clientX, clientY) {
  const world = document.getElementById('flowWorld');
  const view = flowViewState();
  const rect = world.getBoundingClientRect();
  return { x: (clientX - rect.left) / view.zoom, y: (clientY - rect.top) / view.zoom };
}

/* ------------------------------------------------------------------ */
/* canvas : interactions                                               */
/* ------------------------------------------------------------------ */

function onCanvasResize() {
  drawFlowEdges();
}

function initFlowCanvas() {
  const viewport = document.getElementById('flowViewport');
  const world = document.getElementById('flowWorld');
  if (!viewport || !world) return;

  if (!flowEditor.view) fitFlowView();
  applyFlowView();
  drawFlowEdges();

  viewport.addEventListener('pointerdown', onCanvasDown);
  viewport.addEventListener('wheel', onCanvasWheel, { passive: false });
  window.removeEventListener('resize', onCanvasResize);
  window.addEventListener('resize', onCanvasResize);
}

function onCanvasDown(event) {
  const target = event.target;
  if (target.closest('.mini-btn, .switch, .link-btn, input, textarea, select')) return;

  const port = target.closest('.port.out');
  if (port) {
    event.preventDefault();
    startFlowConnect(event, port);
    return;
  }

  const nodeEl = target.closest('.node');
  if (nodeEl) {
    const head = target.closest('.node-head');
    if (head) {
      event.preventDefault();
      startNodeDrag(event, nodeEl);
    }
    return;
  }

  startCanvasPan(event);
}

function startNodeDrag(event, nodeEl) {
  const block = flowNode(nodeEl.dataset.node);
  if (!block) return;
  const zoom = flowViewState().zoom;
  const origin = { x: block.x, y: block.y };
  const start = { x: event.clientX, y: event.clientY };
  nodeEl.classList.add('dragging');
  nodeEl.style.zIndex = '30';

  const move = (moveEvent) => {
    block.x = Math.round(origin.x + (moveEvent.clientX - start.x) / zoom);
    block.y = Math.round(origin.y + (moveEvent.clientY - start.y) / zoom);
    nodeEl.style.left = `${block.x}px`;
    nodeEl.style.top = `${block.y}px`;
    drawFlowEdges();
  };
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    nodeEl.classList.remove('dragging');
    nodeEl.style.zIndex = '';
    flowEditor.dirty = true;
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

function startCanvasPan(event) {
  const viewport = document.getElementById('flowViewport');
  const view = flowViewState();
  const origin = { x: view.x, y: view.y };
  const start = { x: event.clientX, y: event.clientY };
  viewport.classList.add('panning');

  const move = (moveEvent) => {
    view.x = origin.x + (moveEvent.clientX - start.x);
    view.y = origin.y + (moveEvent.clientY - start.y);
    applyFlowView();
    drawFlowEdges();
  };
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    viewport.classList.remove('panning');
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

function startFlowConnect(event, port) {
  const svg = document.getElementById('flowEdges');
  const world = document.getElementById('flowWorld');
  const sourceId = port.dataset.node;
  const branch = port.dataset.branch;
  const source = flowNode(sourceId);
  if (!svg || !world || !source) return;

  const portRect = port.getBoundingClientRect();
  const worldRect = world.getBoundingClientRect();
  const zoom = flowViewState().zoom;
  const startX = (portRect.left - worldRect.left) / zoom + portRect.width / zoom;
  const startY = (portRect.top - worldRect.top) / zoom + portRect.height / (2 * zoom);

  const temp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  temp.setAttribute('class', 'edge temp');
  svg.appendChild(temp);
  port.classList.add('active');
  let hovered = null;
  let moved = false;

  const move = (moveEvent) => {
    if (Math.abs(moveEvent.clientX - event.clientX) + Math.abs(moveEvent.clientY - event.clientY) > 4) moved = true;
    const point = canvasPoint(moveEvent.clientX, moveEvent.clientY);
    const dx = Math.max(50, Math.abs(point.x - startX) * 0.45);
    temp.setAttribute('d', `M${startX},${startY} C${startX + dx},${startY} ${point.x - dx},${point.y} ${point.x},${point.y}`);

    const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
    const nodeEl = el?.closest('.node');
    if (nodeEl !== hovered) {
      hovered?.classList.remove('connect-target');
      hovered = nodeEl;
      if (hovered && hovered.dataset.node !== sourceId) hovered.classList.add('connect-target');
    }
  };

  const up = (upEvent) => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    port.classList.remove('active');
    hovered?.classList.remove('connect-target');
    temp.remove();

    const el = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
    const targetEl = el?.closest('.node');
    const targetId = targetEl?.dataset.node;
    const valid = targetId && targetId !== sourceId && flowNode(targetId);

    if (valid) {
      setFlowLink(source, branch, targetId);
    } else if (!moved) {
      setFlowLink(source, branch, null);
    } else {
      setFlowLink(source, branch, null);
    }
    flowEditor.dirty = true;
    drawFlowEdges();
  };

  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

function setFlowLink(block, branch, targetId) {
  if (branch === 'then') block.thenId = targetId;
  else if (branch === 'else') block.elseId = targetId;
  else if (branch.startsWith('button:')) {
    const button = ensureBlockButtons(block).find((entry) => entry.id === branch.slice(7));
    if (button) button.next = targetId;
  } else if (branch.startsWith('variant:')) {
    const variant = block.variants?.find((entry) => entry.id === branch.slice(8));
    if (variant) variant.next = targetId;
  } else block.next = targetId;
}

function onCanvasWheel(event) {
  event.preventDefault();
  const viewport = document.getElementById('flowViewport');
  const view = flowViewState();
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  const next = Math.min(1.8, Math.max(0.18, view.zoom * factor));
  const rect = viewport.getBoundingClientRect();
  const px = event.clientX - rect.left;
  const py = event.clientY - rect.top;
  view.x = px - ((px - view.x) / view.zoom) * next;
  view.y = py - ((py - view.y) / view.zoom) * next;
  view.zoom = next;
  applyFlowView();
  drawFlowEdges();
}

/* ------------------------------------------------------------------ */
/* actions                                                             */
/* ------------------------------------------------------------------ */

async function flowSave({ exit = false } = {}) {
  const flow = flowEditor.flow;
  try {
    const { flow: saved } = await api(`/api/bots/${flowEditor.botId}/flows/${flow.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: flow.name,
        enabled: flow.enabled,
        trigger: flow.trigger,
        variables: flow.variables,
        blocks: flow.blocks,
        start: flow.start,
      }),
    });
    const bot = state.ws.bots.find((entry) => entry.id === flowEditor.botId);
    const index = bot.flows.findIndex((entry) => entry.id === saved.id);
    if (index >= 0) bot.flows[index] = saved;
    flowEditor.flow = flowClone(saved);
    flowEditor.dirty = false;
    toast('Flux enregistré.');
    if (exit) {
      location.hash = `#/bots/${flowEditor.botId}`;
      return;
    }
    render();
  } catch (error) {
    toast(error.message, 'error');
  }
}

onAction('flow-save', () => flowSave({ exit: true }));

onAction('flow-add-node', (el) => {
  const fromPicker = Boolean(el.closest('#modalRoot'));
  const afterId = fromPicker ? flowEditor.addAfterId || null : null;
  const previous = afterId ? flowNode(afterId) : null;
  const viewport = document.getElementById('flowViewport');
  const view = flowViewState();
  const centerX = viewport ? (viewport.clientWidth / 2 - view.x) / view.zoom - 160 : 120;
  const centerY = viewport ? (viewport.clientHeight / 2 - view.y) / view.zoom - 80 : 120;
  const jitter = (flowEditor.flow.blocks.length % 6) * 26;
  const block = flowNewBlock(
    el.dataset.type,
    previous ? previous.x + 24 : Math.round(centerX + jitter),
    previous ? previous.y + 160 : Math.round(centerY + jitter),
  );
  flowEditor.flow.blocks.push(block);
  if (previous) previous.next = block.id;
  if (!flowEditor.flow.start) flowEditor.flow.start = block.id;
  flowEditor.addAfterId = null;
  flowEditor.dirty = true;
  render();
  if (fromPicker) closeModal();
  toast(`${FLOW_BLOCKS[block.type].label} ajouté${previous ? ' après le bloc' : ''}.`, 'info');
});

onAction('flow-quick-start', () => {
  const flow = flowEditor.flow;
  if (!flow || flow.blocks.length) return;
  const block = flowNewBlock('message', 140, 160);
  block.text = 'Bienvenue {{user.name}} sur {{server.name}} !';
  block.channel = flow.trigger?.channel || '';
  flow.blocks.push(block);
  flow.start = block.id;
  flowEditor.dirty = true;
  render();
  toast('Exemple ajouté. Clique sur le bloc pour le personnaliser, puis Enregistrer.', 'success');
});

function openBlockPicker(afterId = null) {
  flowEditor.addAfterId = afterId || null;
  openModal({
    title: afterId ? 'Ajouter après ce bloc' : 'Ajouter un bloc',
    subtitle: afterId ? 'Le nouveau bloc sera relié automatiquement à la suite.' : 'Le bloc apparaît au centre du canvas, puis vous le reliez.',
    hideFooter: true,
    body: `<div class="block-pick">
      ${FLOW_GROUPS.map(
        ([key, label]) => `<div class="bp-group"><span class="bp-label">${label}</span>
          <div class="bp-grid">${Object.entries(FLOW_BLOCKS)
            .filter(([, meta]) => meta.group === key)
            .map(
              ([type, meta]) => `<button type="button" class="bp-item" data-action="flow-add-node" data-type="${type}">
                <span class="blk-ic tone-${meta.tone}">${icon(meta.icon)}</span>
                <b>${meta.label}</b>
              </button>`,
            )
            .join('')}</div>
        </div>`,
      ).join('')}
    </div>`,
  });
}

onAction('flow-add-menu', () => openBlockPicker());
onAction('flow-add-after', (el) => openBlockPicker(el.dataset.id));

onAction('flow-node-del', (el) => {
  const id = el.dataset.id;
  const flow = flowEditor.flow;
  flow.blocks = flow.blocks.filter((block) => block.id !== id);
  for (const block of flow.blocks) {
    if (block.next === id) block.next = null;
    if (block.thenId === id) block.thenId = null;
    if (block.elseId === id) block.elseId = null;
    for (const button of block.buttons || []) if (button.next === id) button.next = null;
    for (const variant of block.variants || []) if (variant.next === id) variant.next = null;
  }
  if (flow.start === id) flow.start = flow.blocks[0]?.id || null;
  flowEditor.dirty = true;
  render();
});

onAction('flow-node-dup', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  flowEditor.flow.blocks.push(flowCloneBlock(block));
  flowEditor.dirty = true;
  render();
});

onAction('flow-node-start', (el) => {
  flowEditor.flow.start = el.dataset.id;
  flowEditor.dirty = true;
  render();
  toast('Point de départ mis à jour.', 'info');
});

onAction('flow-node-edit', (el) => openBlockEditor(el.dataset.id));

onAction('flow-open-message-editor', (el) => openMessageEditor(el.dataset.id));
onAction('flow-message-editor-close', () => closeMessageEditor());
onAction('flow-message-editor-done', () => closeMessageEditor({ notify: true }));

onAction('flow-insert-var', (el) => {
  const token = el.dataset.token || '';
  const usable = (field) => field && field.isConnected && !field.disabled && (field.tagName === 'TEXTAREA' || ['text', 'search', 'url', 'email', 'tel'].includes(field.type));
  const field = usable(flowLastField)
    ? flowLastField
    : [...document.querySelectorAll('.block-editor textarea, .block-editor input.input')].find(usable);
  if (!field) {
    toast('Clique d’abord dans un champ texte, puis choisis une variable.', 'error');
    return;
  }
  insertFlowToken(field, token);
});

onAction('flow-field-vars', (el) => openFlowVarPicker(el));

onAction('flow-field-var-pick', (el) => {
  const token = el.dataset.token || '';
  insertFlowToken(flowVarTarget, token);
  closeFlowVarPicker();
});

onAction('flow-role-mention-pick', (el) => pickRoleMention(Number(el.dataset.index)));

onAction('flow-field-vars-close', () => closeFlowVarPicker());

onAction('flow-node-edit-close', () => {
  closeRoleMention();
  closeFlowVarPicker();
  flowEditor.editBlockId = null;
  flowEditor.messageEditorBlockId = null;
  closeModal();
  render();
});

onAction('flow-node-edit-done', () => {
  closeRoleMention();
  closeFlowVarPicker();
  flowEditor.editBlockId = null;
  flowEditor.messageEditorBlockId = null;
  closeModal();
  render();
  toast('Bloc mis à jour.', 'success');
});

onAction('flow-node-toggle', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  block[el.dataset.field] = !block[el.dataset.field];
  if (el.dataset.field === 'variantMode' && block.variantMode && !Array.isArray(block.variants)) {
    block.variants = [];
  }
  if (el.dataset.field === 'variantMode' && block.variantMode && !block.variants.length) {
    block.variants.push({ id: flowUid(), text: block.text || 'Première variante', weight: 1, next: null });
    block.variants.push({ id: flowUid(), text: 'Deuxième variante', weight: 1, next: null });
  }
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-add-rule', (el) => {
  const block = flowNode(el.dataset.id);
  block.rules.push({ id: flowUid(), left: '{{message}}', op: 'contains', right: '' });
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-del-rule', (el) => {
  const block = flowNode(el.dataset.id);
  block.rules.splice(Number(el.dataset.index), 1);
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-add-var', () => {
  flowEditor.flow.variables.push({ id: flowUid(), name: '', value: '' });
  flowEditor.dirty = true;
  render();
});

onAction('flow-del-var', (el) => {
  flowEditor.flow.variables.splice(Number(el.dataset.index), 1);
  flowEditor.dirty = true;
  render();
});

onAction('flow-zoom', (el) => {
  const view = flowViewState();
  const viewport = document.getElementById('flowViewport');
  const factor = Number(el.dataset.dir) > 0 ? 1.15 : 1 / 1.15;
  const next = Math.min(1.8, Math.max(0.18, view.zoom * factor));
  const cx = viewport ? viewport.clientWidth / 2 : 0;
  const cy = viewport ? viewport.clientHeight / 2 : 0;
  view.x = cx - ((cx - view.x) / view.zoom) * next;
  view.y = cy - ((cy - view.y) / view.zoom) * next;
  view.zoom = next;
  applyFlowView();
  drawFlowEdges();
});

onAction('flow-fit', () => {
  fitFlowView();
  drawFlowEdges();
});

onAction('flow-auto', () => {
  flowLayout();
  render();
  requestAnimationFrame(() => {
    fitFlowView();
    drawFlowEdges();
  });
  flowEditor.dirty = true;
  toast('Blocs rangés.', 'info');
});

onAction('flow-add-embed-field', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  if (!Array.isArray(block.fields)) block.fields = [];
  if (block.fields.length >= 5) return toast('5 champs maximum par embed.', 'error');
  block.fields.push({ id: flowUid(), name: `Champ ${block.fields.length + 1}`, value: '', inline: true });
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-del-embed-field', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block || !Array.isArray(block.fields)) return;
  block.fields.splice(Number(el.dataset.index), 1);
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-embed-field-toggle', (el) => {
  const block = flowNode(el.dataset.id);
  const field = block?.fields?.[Number(el.dataset.index)];
  if (!field) return;
  field.inline = !field.inline;
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-add-form-field', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  const fields = normalizeModalFields(block);
  if (fields.length >= MAX_MODAL_FIELDS) return toast(`${MAX_MODAL_FIELDS} champs maximum par formulaire.`, 'error');
  fields.push({ id: flowUid(), label: `Champ ${fields.length + 1}`, type: 'short', required: false, placeholder: '', options: '', value: '' });
  block.fields = fields;
  flowEditor.dirty = true;
  refreshBlockEditor(block.id);
});

onAction('flow-del-form-field', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  const fields = normalizeModalFields(block);
  if (fields.length <= 1) return toast('Gardez au moins un champ.', 'error');
  fields.splice(Number(el.dataset.index), 1);
  block.fields = fields;
  flowEditor.dirty = true;
  refreshBlockEditor(block.id);
});

onAction('flow-form-required', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  const fields = normalizeModalFields(block);
  const field = fields[Number(el.dataset.index)];
  if (!field) return;
  field.required = !field.required;
  block.fields = fields;
  flowEditor.dirty = true;
  refreshBlockEditor(block.id);
});

onAction('flow-add-button', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  if (block.type === 'ticket' || block.type === 'message') {
    if (!Array.isArray(block.buttons)) block.buttons = [];
  } else if (!Array.isArray(block.buttons) || !block.buttons.length) {
    block.buttons = blockButtons(block);
  }
  if (block.buttons.length >= 5) return toast('5 boutons maximum par bloc.', 'error');
  block.buttons.push({ id: flowUid(), label: `Bouton ${block.buttons.length + 1}`, style: 'primary', emoji: '', disabled: false, url: '', target: '', next: null });
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-del-button', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  if (block.type === 'ticket' || block.type === 'message') {
    if (!Array.isArray(block.buttons) || !block.buttons.length) return;
  } else {
    if (!Array.isArray(block.buttons) || !block.buttons.length) block.buttons = blockButtons(block);
    if (block.buttons.length <= 1) return toast('Gardez au moins un bouton.', 'error');
  }
  block.buttons.splice(Number(el.dataset.index), 1);
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-button-toggle', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  if (!Array.isArray(block.buttons) || !block.buttons.length) block.buttons = blockButtons(block);
  const button = block.buttons[Number(el.dataset.index)];
  if (!button) return;
  button[el.dataset.field] = !button[el.dataset.field];
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-add-variant', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  if (!Array.isArray(block.variants)) block.variants = [];
  block.variants.push({ id: flowUid(), text: '', weight: 1, next: null });
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-del-variant', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  if (!Array.isArray(block.variants)) block.variants = [];
  if (block.variants.length <= 1) return toast('Gardez au moins une variante.', 'error');
  block.variants.splice(Number(el.dataset.index), 1);
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-balance-variants', (el) => {
  const block = flowNode(el.dataset.id);
  if (!block) return;
  if (!Array.isArray(block.variants)) block.variants = [];
  block.variants.forEach((variant) => (variant.weight = 1));
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id && document.getElementById('modalForm')) {
    refreshBlockEditor(block.id);
    return;
  }
  render();
});

onAction('flow-variant-bank', (el) => {
  const blockId = el.dataset.id;
  openModal({
    title: 'Banque de variantes',
    subtitle: '48 textes prêts à l’emploi, cliquez pour les ajouter.',
    hideFooter: true,
    wide: true,
    body: `<div class="variant-bank">
      ${VARIANT_BANK.map(
        (group, groupIndex) => `<div class="vb-theme">
          <div class="vb-head">
            <b>${group.theme}</b>
            <button class="link-btn" data-action="flow-bank-theme" data-id="${blockId}" data-group="${groupIndex}">Tout ajouter</button>
          </div>
          <div class="vb-items">
            ${group.items
              .map(
                (item, index) => `<button class="vb-item" data-action="flow-bank-add" data-id="${blockId}" data-group="${groupIndex}" data-index="${index}">${esc(item)}</button>`,
              )
              .join('')}
          </div>
        </div>`,
      ).join('')}
    </div>`,
  });
});

onAction('flow-bank-add', (el) => {
  const block = flowNode(el.dataset.id);
  const group = VARIANT_BANK[Number(el.dataset.group)];
  const text = group?.items[Number(el.dataset.index)];
  if (!block || !text) return;
  if (!Array.isArray(block.variants)) block.variants = [];
  block.variants.push({ id: flowUid(), text, weight: 1, next: null });
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id) {
    openBlockEditor(block.id);
  } else {
    closeModal();
    render();
  }
  toast('Variante ajoutée.', 'info');
});

onAction('flow-bank-theme', (el) => {
  const block = flowNode(el.dataset.id);
  const group = VARIANT_BANK[Number(el.dataset.group)];
  if (!block || !group) return;
  if (!Array.isArray(block.variants)) block.variants = [];
  const added = group.items;
  for (const text of added) block.variants.push({ id: flowUid(), text, weight: 1, next: null });
  flowEditor.dirty = true;
  if (flowEditor.editBlockId === block.id) {
    openBlockEditor(block.id);
  } else {
    closeModal();
    render();
  }
  toast(`${added.length} variante(s) ajoutée(s).`, 'info');
});

onAction('new-flow', (el) => {
  const botId = el.dataset.id;
  const bot = state.ws.bots.find((entry) => entry.id === botId);
  const server = activeBotServer(bot);
  const serverName = server?.guildName || server?.name || 'Aucun serveur pour l’instant';
  openModal({
    title: 'Nouveau flux',
    subtitle: 'Partez d’un modèle ou d’une page blanche.',
    submitLabel: 'Créer le flux',
    body: `<div class="field"><label>Serveur du flux</label><input class="input" value="${esc(serverName)}" disabled><div class="hint">${server ? 'Le flux sera créé uniquement sur ce serveur.' : 'Tu peux créer le flux maintenant : il sera activé dès que tu connecteras un serveur Discord au bot.'}</div></div>
      <div class="field"><label for="nfName">Nom du flux</label><input class="input" id="nfName" name="name" value="Nouveau flux" required></div>
      <div class="field"><label>Modèle</label>
        <div class="template-pick">
          ${FLOW_TEMPLATES.map(
            (template) => `<label class="tp-item">
              <input type="radio" name="template" value="${template.value}" ${template.value === 'welcome' ? 'checked' : ''}>
              <span><b>${template.label}</b><em>${template.hint}</em></span>
            </label>`,
          ).join('')}
        </div>
        <div class="hint">« Bienvenue » est sélectionné pour te montrer un exemple complet. Choisis « Flux vide » si tu veux tout construire toi-même.</div>
      </div>`,
    onSubmit: async (formData) => {
      const { flow } = await api(`/api/bots/${botId}/flows`, {
        method: 'POST',
        body: JSON.stringify({
          name: String(formData.get('name') || '').trim(),
          template: String(formData.get('template') || ''),
          serverId: server?.id || '',
        }),
      });
      const bot = state.ws.bots.find((entry) => entry.id === botId);
      bot.flows = [...(bot.flows || []), flow];
      closeModal();
      window.location.hash = `#/bots/${botId}/flows/${flow.id}`;
    },
  });
});

onAction('toggle-flow', async (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const flow = bot.flows.find((entry) => entry.id === el.dataset.flow);
  try {
    const { flow: saved } = await api(`/api/bots/${bot.id}/flows/${flow.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !flow.enabled }),
    });
    Object.assign(flow, saved);
    render();
  } catch (error) {
    toast(error.message, 'error');
  }
});

onAction('delete-flow', (el) => {
  const bot = state.ws.bots.find((entry) => entry.id === el.dataset.id);
  const flow = bot.flows.find((entry) => entry.id === el.dataset.flow);
  openModal({
    title: 'Supprimer ce flux ?',
    subtitle: `« ${flow.name} » sera définitivement supprimé.`,
    submitLabel: 'Supprimer',
    danger: true,
    body: '<p style="font-size:13px;color:var(--muted)">Cette action est immédiate et ne peut pas être annulée.</p>',
    onSubmit: async () => {
      await api(`/api/bots/${bot.id}/flows/${flow.id}`, { method: 'DELETE' });
      bot.flows = bot.flows.filter((entry) => entry.id !== flow.id);
      closeModal();
      toast('Flux supprimé.');
      render();
    },
  });
});

/* ------------------------------------------------------------------ */
/* saisie directe (sans re-render)                                     */
/* ------------------------------------------------------------------ */

document.addEventListener('dblclick', (event) => {
  const head = event.target.closest('.node-head[data-drag]');
  if (head) openBlockEditor(head.dataset.drag);
});

document.addEventListener('focusin', (event) => {
  const field = event.target;
  if (!field.closest('.block-editor') || !field.matches('input, textarea')) return;
  if (['number', 'color', 'range', 'file', 'button', 'checkbox', 'radio', 'hidden'].includes(field.type)) return;
  flowLastField = field;
});

document.addEventListener('pointerdown', (event) => {
  if (roleMentionPop && !event.target.closest('.mention-pop')) closeRoleMention();
  if (!flowVarPicker) return;
  if (event.target.closest('.field-var-pop') || event.target.closest('[data-action="flow-field-vars"]')) return;
  closeFlowVarPicker();
});

window.addEventListener('resize', () => closeRoleMention());
document.addEventListener('scroll', (event) => {
  if (event.target.closest?.('.mention-pop')) return;
  positionRoleMention();
}, true);

document.addEventListener('keydown', (event) => {
  if (roleMentionPop && event.target === roleMentionTarget) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveRoleMention(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      pickRoleMention(roleMentionIndex);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeRoleMention();
      return;
    }
  }
  if (event.key === 'Escape' && flowVarPicker) closeFlowVarPicker();
  if (event.key === 'Escape' && flowEditor.messageEditorBlockId) closeMessageEditor();
});

document.addEventListener('input', (event) => {
  const el = event.target;
  if (!el.matches('[data-flow-name], [data-trigger], [data-var], [data-node]')) return;

  if (el.matches('[data-flow-name]')) {
    flowEditor.flow.name = el.value;
    flowEditor.dirty = true;
    return;
  }
  if (el.matches('[data-trigger]')) {
    flowEditor.flow.trigger[el.dataset.trigger] = el.value;
    flowEditor.dirty = true;
    return;
  }
  if (el.matches('[data-var]')) {
    const variable = flowEditor.flow.variables[Number(el.dataset.var)];
    if (variable) variable[el.dataset.varField] = el.value;
    flowEditor.dirty = true;
    return;
  }

  const block = flowNode(el.dataset.node);
  if (!block) return;
  if (el.dataset.formIndex !== undefined) {
    const fields = normalizeModalFields(block);
    const field = fields[Number(el.dataset.formIndex)];
    if (field) field[el.dataset.formKey] = el.value;
    block.fields = fields;
  } else if (el.dataset.embedIndex !== undefined) {
    if (!Array.isArray(block.fields)) block.fields = [];
    const field = block.fields[Number(el.dataset.embedIndex)];
    if (field) field[el.dataset.embedKey] = el.value;
  } else if (el.dataset.button !== undefined) {
    if (!Array.isArray(block.buttons) || !block.buttons.length) block.buttons = blockButtons(block);
    const button = block.buttons[Number(el.dataset.button)];
    if (button) button[el.dataset.buttonField] = el.value;
  } else if (el.dataset.rule !== undefined) {
    block.rules[Number(el.dataset.rule)][el.dataset.ruleField] = el.value;
  } else if (el.dataset.variant !== undefined) {
    const variant = block.variants[Number(el.dataset.variant)];
    if (variant) {
      variant[el.dataset.variantField] =
        el.dataset.variantField === 'weight' ? Math.min(100, Math.max(1, Number(el.value) || 1)) : el.value;
    }
  } else if (el.dataset.field) {
    block[el.dataset.field] =
      el.dataset.field === 'seconds' || el.dataset.field === 'count' ? Number(el.value) || 1 : el.value;
  }
  flowEditor.dirty = true;
  if (el.dataset.buttonField === 'next' || el.dataset.variantField === 'next') requestAnimationFrame(drawFlowEdges);
  updateRoleMention(el);
});

document.addEventListener('change', (event) => {
  const el = event.target;
  if (!el.matches('[data-node], [data-trigger="type"]')) return;

  if (el.matches('[data-trigger="type"]')) {
    const previous = flowEditor.flow.trigger || {};
    flowEditor.flow.trigger = {
      type: el.value,
      command: previous.command || 'mon-flux',
      keyword: previous.keyword || '',
      match: previous.match || 'contains',
      channel: '',
      category: previous.category || '',
      schedule: '',
      emoji: '',
      botName: previous.botName || '',
      automationType: previous.automationType || '',
    };
    flowEditor.dirty = true;
    render();
    return;
  }

  const block = flowNode(el.dataset.node);
  if (!block) return;
  if (el.dataset.formIndex !== undefined) {
    const fields = normalizeModalFields(block);
    const field = fields[Number(el.dataset.formIndex)];
    if (field) {
      field[el.dataset.formKey] = el.value;
      if (el.dataset.formKey === 'type') {
        field.type = modalFieldType(el.value);
        if (['select', 'multi'].includes(field.type) && !field.options) field.options = modalFieldDefaultOptions(field.type);
      }
    }
    block.fields = fields;
    flowEditor.dirty = true;
    if (el.dataset.formKey === 'type') {
      refreshBlockEditor(block.id);
      return;
    }
  } else if (el.dataset.embedIndex !== undefined) {
    if (!Array.isArray(block.fields)) block.fields = [];
    const field = block.fields[Number(el.dataset.embedIndex)];
    if (field) field[el.dataset.embedKey] = el.value;
  } else if (el.dataset.button !== undefined) {
    if (!Array.isArray(block.buttons) || !block.buttons.length) block.buttons = blockButtons(block);
    const button = block.buttons[Number(el.dataset.button)];
    if (button) button[el.dataset.buttonField] = el.value;
  } else if (el.dataset.rule !== undefined) block.rules[Number(el.dataset.rule)][el.dataset.ruleField] = el.value;
  else if (el.dataset.field === 'unpin') block.unpin = el.value === 'true';
  else if (el.dataset.field === 'seconds' || el.dataset.field === 'count') block[el.dataset.field] = Number(el.value) || 1;
  else if (el.dataset.field) block[el.dataset.field] = el.value;
  flowEditor.dirty = true;
  if (['action', 'mode', 'delivery', 'closeMode'].includes(el.dataset.field)) {
    refreshBlockEditor(block.id);
    return;
  }
  if (el.dataset.buttonField === 'next' || el.dataset.variantField === 'next') requestAnimationFrame(drawFlowEdges);
});

onAction('flow-toggle-side', () => {
  flowEditor.sideOpen = !flowEditor.sideOpen;
  render();
});


