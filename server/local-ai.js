const GREETINGS = /^(bonjour|salut|bonsoir|coucou|hello|hey|yo)\b/i;

const TOPICS = [
  {
    test: /ticket|support/,
    reply:
      'Pour un ticket : ajoute un bouton dans un flux, puis relie-le au bloc « Ticket ». Le bot crée un salon privé, ajoute le membre et le rôle staff, puis tu peux fermer le ticket depuis le même flux.',
  },
  {
    test: /giveaway|concours|tirage/,
    reply:
      'Pour un giveaway : ajoute le bloc « Giveaway », choisis le salon, le lot, la durée et le nombre de gagnants. Le bot publie le message avec la réaction et tire les gagnants automatiquement à la fin.',
  },
  {
    test: /r[oô]le|permission/,
    reply:
      'Pour les rôles : utilise le bloc « Rôle » dans un flux pour ajouter ou retirer un rôle. Vérifie aussi que le bot a la permission « Gérer les rôles » et que son rôle est au-dessus de celui qu’il doit attribuer.',
  },
  {
    test: /bienvenue|arriv[ée]e|welcome/,
    reply:
      'Pour les messages de bienvenue : crée un flux avec le déclencheur « Membre rejoint », puis ajoute un bloc « Message » ou « Embed ». Tu peux personnaliser le texte avec {{user.name}} et {{server.name}}.',
  },
  {
    test: /commande|slash/,
    reply:
      'Pour une commande : va dans l’onglet « Commandes » du bot, clique sur « Ajouter », choisis un modèle préfait ou écris ta réponse, puis active la commande. Tu peux ajouter jusqu’à 20 variantes de réponse par commande.',
  },
  {
    test: /flux|flow/,
    reply:
      'Pour un flux : clique sur « Nouveau flux », choisis un modèle (Bienvenue, Ticket, Quiz…) ou « Flux vide », puis relie les blocs entre eux. Le bouton « Tester » permet de vérifier le parcours avant de l’enregistrer.',
  },
  {
    test: /\bbot\b|token/,
    reply:
      'Pour connecter un bot : crée-le sur le portail développeur Discord, copie son token, puis dans KyllBot Studio ouvre « Mes bots » → « Nouveau bot » et colle le token. Le token est stocké chiffré et n’est jamais réaffiché.',
  },
  {
    test: /musique|music|vocal/,
    reply:
      'Pour la musique : ajoute le bloc « Musique », choisis le salon vocal et colle un lien pris en charge. Le bot doit être connecté au serveur et avoir accès au salon vocal.',
  },
  {
    test: /webhook|http|internet/,
    reply:
      'Pour un webhook : ajoute le bloc « HTTP » ou « Webhook », mets une adresse https publique et choisis la méthode. Les adresses locales ou privées sont refusées pour protéger le serveur.',
  },
  {
    test: /\bformation|\bcours|apprenant/,
    reply:
      'La section « Formations » sert à créer des parcours pour ton équipe : leçons, quiz, progression et certificats. C’est pratique pour former les modérateurs ou les nouveaux membres du staff.',
  },
  {
    test: /cr[ée]dit|r[ée]compense|quotidien/,
    reply:
      'Tu gagnes des crédits avec la récompense quotidienne et les activités du studio. Ils servent à activer des plans ou des options dans « Facturation ». Le plan gratuit reste disponible sans carte bancaire.',
  },
  {
    test: /salon|cat[ée]gorie/,
    reply:
      'Dans les blocs et les automatisations, tu peux choisir un salon ou une catégorie directement dans la liste, ou saisir son nom. Le bot utilise ce choix dès qu’il est connecté avec son token.',
  },
  {
    test: /mod[ée]ration|ban|kick|mute|timeout/,
    reply:
      'Pour la modération : utilise les blocs « Bannir », « Expulser », « Timeout » ou « Avertir ». Pense à configurer un salon de journal pour garder une trace des sanctions.',
  },
  {
    test: /statistique|stats|usage/,
    reply:
      'La page « Statistiques » affiche les vraies données du studio : commandes exécutées, membres, messages et activité des flux. Rien n’est inventé : les compteurs restent à zéro tant qu’il n’y a pas d’activité réelle.',
  },
  {
    test: /[ée]quipe|membre|inviter/,
    reply:
      'Dans « Équipe », tu peux inviter un membre seulement si son compte existe déjà. Le propriétaire ne peut pas être retiré, et chaque membre peut être supprimé avec le bouton « Retirer ».',
  },
  {
    test: /abonnement|\bplan\b|facturation|\bprix\b/,
    reply:
      'La page « Facturation » propose un plan gratuit, puis Essentiel, Pro et Studio. Tu peux activer un plan avec des crédits, sans carte bancaire, et revenir au gratuit à tout moment.',
  },
];

const JOKES = [
  'Pourquoi les bots ne se perdent-ils jamais ? Parce qu’ils suivent toujours le bon canal. 😄',
  'Un développeur demande à un bot : « Tu peux faire une pause ? » Le bot répond : « Non, je suis en boucle. » 😅',
  'Pourquoi Discord est-il calme le matin ? Parce que les salons sont encore en train de se réveiller. ☕',
];

function capitalize(value) {
  const text = String(value || '').trim();
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

export function cleanAIPrompt(value) {
  let text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  text = text.replace(
    /^(?:r[ée]ponds?|r[ée]pond|answer|say)\s+(?:[àa]\s+)?(?:la question|le message|ce message)?\s*[:\-–—]?\s*/i,
    '',
  );
  text = text.replace(/^[«"'](.+)[»"']$/s, '$1').trim();
  return text;
}

function localTime() {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function localDate() {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

function mathAnswer(message) {
  const match = message.match(/(-?\d+(?:[.,]\d+)?)\s*([+\-*/x×])\s*(-?\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const left = Number(match[1].replace(',', '.'));
  const right = Number(match[3].replace(',', '.'));
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  let result;
  if (match[2] === '+') result = left + right;
  else if (match[2] === '-') result = left - right;
  else if (match[2] === '*' || match[2] === 'x' || match[2] === '×') result = left * right;
  else if (right === 0) return 'On ne peut pas diviser par zéro. 😅';
  else result = left / right;
  return `Ça fait **${Number(result.toFixed(6))}**.`;
}

export function localAIResponse(prompt) {
  const message = cleanAIPrompt(prompt);
  const lower = message.toLowerCase();
  if (!message) return 'Je t’écoute ! Pose-moi ta question ou dis-moi ce que tu veux créer.';

  const repeat = message.match(/^(dis|dit|[ée]cris|r[ée]p[èe]te|say)\s+(.+)$/i);
  if (repeat) {
    const verb = repeat[1].toLowerCase();
    const words = repeat[2].trim().replace(/^apr[èe]s moi\s+/i, '');
    const greeting = words.match(/^(salut|bonjour|bonsoir|coucou|hello|hey)\b\s*(.*)$/i);
    const quoted = words.match(/^[«"'](.+)[»"']$/);
    if (greeting) return `${capitalize(greeting[1])}${greeting[2] ? ` ${greeting[2]}` : ''} ! 👋`;
    if (quoted) return capitalize(quoted[1]);
    if (/^r[ée]p/.test(verb) || verb === 'say') return capitalize(words);
  }

  if (GREETINGS.test(message)) {
    return 'Salut ! 👋 Je suis KyllBot. Tu veux créer une commande, un flux, un ticket ou configurer ton serveur ?';
  }
  if (/(qui es[- ]tu|ton nom|tu t['’]appelles|pr[ée]sente[- ]toi)/i.test(lower)) {
    return 'Je suis KyllBot, l’assistant intégré à KyllBot Studio. Je t’aide à créer des commandes, des flux, des tickets, des rôles et des giveaways pour ton serveur Discord.';
  }
  if (/([çc]a va|comment vas[- ]tu|comment tu vas|how are you)/i.test(lower)) {
    return 'Je vais très bien, merci ! Et toi ? Je suis prêt à t’aider sur ton serveur.';
  }
  if (/(que (peux|sais)[- ]tu faire|^aide$|^help$|besoin d['’]aide)/i.test(lower)) {
    return 'Je peux t’aider à créer des commandes, des flux, des tickets, des giveaways, des rôles et des messages de bienvenue. Je peux aussi t’expliquer les plans, les crédits et la connexion d’un bot Discord.';
  }
  if (/(merci|thanks|thx)/i.test(lower)) return 'Avec plaisir ! Si tu as une autre question, je suis là. 😊';
  if (/(au revoir|[àa] plus|bye|bonne nuit)/i.test(lower)) return 'À bientôt ! Bonne continuation sur ton serveur. 👋';
  if (/blague|joke|dr[ôo]le/i.test(lower)) return JOKES[Math.floor(Math.random() * JOKES.length)];
  if (/quelle heure|heure est-il|l['’]heure/i.test(lower)) return `Il est **${localTime()}** (heure de Paris).`;
  if (/quel jour|la date|aujourd['’]hui/i.test(lower)) return `Nous sommes le **${localDate()}**.`;

  const math = mathAnswer(message);
  if (math) return math;

  for (const topic of TOPICS) {
    if (topic.test.test(lower)) return topic.reply;
  }

  const preview = message.length > 160 ? `${message.slice(0, 157)}…` : message;
  return `J’ai bien noté : « ${preview} ». Dis-moi ce que tu veux obtenir exactement — une commande, un flux, un ticket, un rôle ou un giveaway — et je te donne les étapes précises dans KyllBot Studio.`;
}
