const QUESTION_START =
  /^(?:qui|que|quel(?:le|s|les)?|où|quand|pourquoi|comment|combien|est-ce que|peux-tu|tu peux|pourrais-tu|donne-moi|dis-moi|explique|raconte|traduis|résume|calcule|crée|créer|ajoute|supprime|modifie|configure|aide|merci|j['’]aimerais|je veux|je voudrais|je cherche|j['’]ai besoin|je n['’]arrive pas|je bloque|je suis bloqu[ée]|ça ne marche pas)\b/i;

const CAPITALS = new Map([
  ['france', 'Paris'],
  ['australie', 'Canberra'],
  ['canada', 'Ottawa'],
  ['japon', 'Tokyo'],
  ['italie', 'Rome'],
  ['espagne', 'Madrid'],
  ['allemagne', 'Berlin'],
  ['royaume-uni', 'Londres'],
  ['angleterre', 'Londres'],
  ['états-unis', 'Washington, D.C.'],
  ['etats-unis', 'Washington, D.C.'],
  ['usa', 'Washington, D.C.'],
  ['brésil', 'Brasília'],
  ['bresil', 'Brasília'],
  ['maroc', 'Rabat'],
  ['algérie', 'Alger'],
  ['algerie', 'Alger'],
  ['tunisie', 'Tunis'],
  ['belgique', 'Bruxelles'],
  ['suisse', 'Berne'],
  ['portugal', 'Lisbonne'],
  ['grèce', 'Athènes'],
  ['grece', 'Athènes'],
  ['turquie', 'Ankara'],
  ['russie', 'Moscou'],
  ['chine', 'Pékin'],
  ['inde', 'New Delhi'],
  ['mexique', 'Mexico'],
  ['argentine', 'Buenos Aires'],
  ['égypte', 'Le Caire'],
  ['egypte', 'Le Caire'],
  ['afrique du sud', 'Pretoria'],
  ['corée du sud', 'Séoul'],
  ['coree du sud', 'Séoul'],
  ['corée du nord', 'Pyongyang'],
  ['coree du nord', 'Pyongyang'],
  ['suède', 'Stockholm'],
  ['suede', 'Stockholm'],
  ['norvège', 'Oslo'],
  ['norvege', 'Oslo'],
  ['danemark', 'Copenhague'],
  ['finlande', 'Helsinki'],
  ['irlande', 'Dublin'],
  ['autriche', 'Vienne'],
  ['pays-bas', 'Amsterdam'],
  ['pologne', 'Varsovie'],
  ['ukraine', 'Kyiv'],
  ['arabie saoudite', 'Riyad'],
  ['qatar', 'Doha'],
  ['émirats arabes unis', 'Abou Dabi'],
  ['emirats arabes unis', 'Abou Dabi'],
  ['sénégal', 'Dakar'],
  ['senegal', 'Dakar'],
  ["côte d'ivoire", 'Yamoussoukro'],
  ['cameroun', 'Yaoundé'],
  ['madagascar', 'Antananarivo'],
  ['nigeria', 'Abuja'],
  ['kenya', 'Nairobi'],
  ['ghana', 'Accra'],
  ['israël', 'Jérusalem'],
  ['israel', 'Jérusalem'],
  ['iran', 'Téhéran'],
  ['irak', 'Bagdad'],
  ['vietnam', 'Hanoï'],
  ['thaïlande', 'Bangkok'],
  ['thailande', 'Bangkok'],
  ['indonésie', 'Jakarta'],
  ['indonesie', 'Jakarta'],
  ['philippines', 'Manille'],
  ['nouvelle-zélande', 'Wellington'],
  ['nouvelle-zelande', 'Wellington'],
]);

const BILLING_REPLY =
  'La page « Facturation » propose un plan gratuit, puis Essentiel, Pro et Studio. Tu peux activer un plan avec des crédits, sans carte bancaire, et revenir au gratuit à tout moment.';

const TOPICS = [
  {
    test: /(?:ticket|support).*(?:discord|bot|salon|flux|serveur|kyllbot)|(?:discord|bot|salon|flux|serveur|kyllbot).*(?:ticket|support)/i,
    reply:
      'Pour un ticket : ajoute un bouton dans un flux, puis relie-le au bloc « Ticket ». Le bot crée un salon privé, ajoute le membre et le rôle staff, puis tu peux fermer le ticket depuis le même flux.',
  },
  {
    test: /(?:giveaway|concours|tirage).*(?:discord|bot|salon|flux|serveur|kyllbot)|(?:discord|bot|salon|flux|serveur|kyllbot).*(?:giveaway|concours|tirage)/i,
    reply:
      'Pour un giveaway : ajoute le bloc « Giveaway », choisis le salon, le lot, la durée et le nombre de gagnants. Le bot publie le message avec la réaction et tire les gagnants automatiquement à la fin.',
  },
  {
    test: /(?:r[ôo]le|permission).*(?:discord|bot|salon|membre|serveur|attribuer|ajouter|retirer)|(?:discord|bot|salon|membre|serveur).*(?:r[ôo]le|permission)/i,
    reply:
      'Pour les rôles : utilise le bloc « Rôle » dans un flux pour ajouter ou retirer un rôle. Vérifie aussi que le bot a la permission « Gérer les rôles » et que son rôle est au-dessus de celui qu’il doit attribuer.',
  },
  {
    test: /(?:bienvenue|arriv[ée]e|welcome).*(?:discord|bot|salon|message|serveur)|(?:discord|bot|salon|serveur).*(?:bienvenue|arriv[ée]e|welcome)/i,
    reply:
      'Pour les messages de bienvenue : crée un flux avec le déclencheur « Membre rejoint », puis ajoute un bloc « Message » ou « Embed ». Tu peux personnaliser le texte avec {{user.name}} et {{server.name}}.',
  },
  {
    test: /(?:commande|slash).*(?:discord|bot|kyllbot|serveur|cr[ée]er|ajouter)|(?:discord|bot|kyllbot|serveur).*(?:commande|slash)/i,
    reply:
      'Pour une commande : va dans l’onglet « Commandes » du bot, clique sur « Ajouter », choisis un modèle préfait ou écris ta réponse, puis active la commande. Tu peux ajouter jusqu’à 20 variantes de réponse par commande.',
  },
  {
    test: /(?:flux|flow).*(?:discord|bot|kyllbot|bloc|[ée]diteur|cr[ée]er)|(?:discord|bot|kyllbot|[ée]diteur|cr[ée]er).*(?:flux|flow)/i,
    reply:
      'Pour un flux : clique sur « Nouveau flux », choisis un modèle (Bienvenue, Ticket, Quiz…) ou « Flux vide », puis relie les blocs entre eux. Le bouton « Tester » permet de vérifier le parcours avant de l’enregistrer.',
  },
  {
    test: /\bbot\b|token/i,
    reply:
      'Pour connecter un bot : crée-le sur le portail développeur Discord, copie son token, puis dans KyllBot Studio ouvre « Mes bots » → « Nouveau bot » et colle le token. Le token est stocké chiffré et n’est jamais réaffiché.',
  },
  {
    test: /(?:musique|music|vocal).*(?:discord|bot|salon|flux)|(?:discord|bot|salon|flux).*(?:musique|music|vocal)/i,
    reply:
      'Pour la musique : ajoute le bloc « Musique », choisis le salon vocal et colle un lien pris en charge. Le bot doit être connecté au serveur et avoir accès au salon vocal.',
  },
  {
    test: /\bwebhook\b|\bhttp\b/i,
    reply:
      'Pour un webhook : ajoute le bloc « HTTP » ou « Webhook », mets une adresse https publique et choisis la méthode. Les adresses locales ou privées sont refusées pour protéger le serveur.',
  },
  {
    test: /formation.*(?:kyllbot|studio|apprenant|quiz)|(?:kyllbot|studio).*formation/i,
    reply:
      'La section « Formations » sert à créer des parcours pour ton équipe : leçons, quiz, progression et certificats. C’est pratique pour former les modérateurs ou les nouveaux membres du staff.',
  },
  {
    test: /(?:cr[ée]dit|r[ée]compense|quotidien).*(?:kyllbot|studio|facturation|(?<![a-zà-ÿ])plans?(?![a-zà-ÿ])|bot)|(?:kyllbot|studio|facturation|(?<![a-zà-ÿ])plans?(?![a-zà-ÿ])).*(?:cr[ée]dit|r[ée]compense|quotidien)/i,
    reply:
      'Tu gagnes des crédits avec la récompense quotidienne et les activités du studio. Ils servent à activer des plans ou des options dans « Facturation ». Le plan gratuit reste disponible sans carte bancaire.',
  },
  {
    test: /(?:salon|cat[ée]gorie).*(?:discord|bot|flux|serveur)|(?:discord|bot|flux|serveur).*(?:salon|cat[ée]gorie)/i,
    reply:
      'Dans les blocs et les automatisations, tu peux choisir un salon ou une catégorie directement dans la liste, ou saisir son nom. Le bot utilise ce choix dès qu’il est connecté avec son token.',
  },
  {
    test: /\b(?:mod[ée]ration|bannir|ban|kick|expulser|mute|timeout|avertir)\b/i,
    reply:
      'Pour la modération : utilise les blocs « Bannir », « Expulser », « Timeout » ou « Avertir ». Pense à configurer un salon de journal pour garder une trace des sanctions.',
  },
  {
    test: /(?:statistique|stats|usage).*(?:kyllbot|studio|bot|serveur)|(?:kyllbot|studio|bot|serveur).*(?:statistique|stats|usage)/i,
    reply:
      'La page « Statistiques » affiche les vraies données du studio : commandes exécutées, membres, messages et activité des flux. Rien n’est inventé : les compteurs restent à zéro tant qu’il n’y a pas d’activité réelle.',
  },
  {
    test: /(?:[ée]quipe|membre|inviter).*(?:kyllbot|studio|bot|serveur)|(?:kyllbot|studio|bot|serveur).*(?:[ée]quipe|membre|inviter)/i,
    reply:
      'Dans « Équipe », tu peux inviter un membre seulement si son compte existe déjà. Le propriétaire ne peut pas être retiré, et chaque membre peut être supprimé avec le bouton « Retirer ».',
  },
  {
    test: /(?<![a-zà-ÿ])plans(?![a-zà-ÿ])/i,
    reply: BILLING_REPLY,
  },
  {
    test: /(?:abonnement|facturation|(?<![a-zà-ÿ])plans?(?![a-zà-ÿ])|prix).*(?:kyllbot|studio|cr[ée]dit|gratuit|essentiel|pro|studio)|(?:kyllbot|studio|cr[ée]dit|gratuit|essentiel|pro).*(?:abonnement|facturation|(?<![a-zà-ÿ])plans?(?![a-zà-ÿ])|prix)/i,
    reply: BILLING_REPLY,
  },
];

const GENERAL_TOPICS = [
  {
    test: /ciel.*bleu|bleu.*ciel/i,
    reply:
      'Le ciel paraît bleu à cause de la diffusion de Rayleigh : les petites molécules de l’atmosphère diffusent surtout la lumière bleue du Soleil dans toutes les directions. C’est cette lumière bleue que nos yeux captent le plus.',
  },
  {
    test: /plan[èe]te.*(?:plus (?:proche|éloign[ée]e|grande|petite|chaude)|soleil)|(?:plus (?:proche|éloign[ée]e|grande|petite|chaude)).*plan[èe]te/i,
    reply:
      'Mercure est la planète la plus proche du Soleil et la plus petite. Jupiter est la plus grande, Neptune la plus éloignée, et Vénus la plus chaude.',
  },
  {
    test: /syst[èe]me solaire|plan[èe]tes?/i,
    reply:
      'Le système solaire compte 8 planètes : Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus et Neptune. Pluton est classée comme planète naine depuis 2006.',
  },
  {
    test: /\b(?:oc[ée]ans?|mers?)\b/i,
    reply:
      'Il y a cinq océans : Pacifique, Atlantique, Indien, Austral et Arctique. Le Pacifique est le plus grand et le plus profond.',
  },
  {
    test: /\bcontinents?\b/i,
    reply:
      'Il y a sept continents : Afrique, Amérique du Nord, Amérique du Sud, Antarctique, Asie, Europe et Océanie.',
  },
  {
    test: /photosynth[èe]se/i,
    reply:
      'La photosynthèse est le processus par lequel les plantes utilisent la lumière du soleil, l’eau et le dioxyde de carbone pour produire du glucose et libérer de l’oxygène.',
  },
  {
    test: /gravit[ée]/i,
    reply:
      'La gravité est la force qui attire les objets ayant une masse les uns vers les autres. C’est elle qui garde les planètes en orbite et nous fait retomber sur Terre.',
  },
  {
    test: /arc[- ]en[- ]ciel/i,
    reply:
      'Un arc-en-ciel apparaît quand la lumière du Soleil traverse des gouttes de pluie. Les gouttes décomposent la lumière blanche et créent les couleurs visibles dans le ciel.',
  },
  {
    test: /pourquoi.*(?:pleut|pluie)|(?:pleut|pluie).*pourquoi/i,
    reply:
      'La pluie se forme quand la vapeur d’eau présente dans l’air se condense en petites gouttes. Ces gouttes s’assemblent dans les nuages et tombent quand elles deviennent trop lourdes.',
  },
  {
    test: /jour.*nuit|nuit.*jour/i,
    reply:
      'Le jour et la nuit existent parce que la Terre tourne sur elle-même en environ 24 heures. La partie éclairée par le Soleil est en jour, l’autre est en nuit.',
  },
  {
    test: /\bsaisons?\b/i,
    reply:
      'Les saisons viennent de l’inclinaison de la Terre sur son orbite. Selon la position de la Terre autour du Soleil, les rayons arrivent plus ou moins directement sur chaque hémisphère.',
  },
  {
    test: /eau bout|[ée]bullition/i,
    reply:
      'L’eau bout à 100 °C au niveau de la mer. En altitude, la pression est plus faible, donc elle bout à une température plus basse.',
  },
  {
    test: /\b(?:adn|g[èe]ne|g[ée]n[ée]tique)\b/i,
    reply:
      'L’ADN est la molécule qui contient l’information génétique. Elle est organisée en gènes et transmise de génération en génération.',
  },
  {
    test: /intelligence artificielle|\bia\b/i,
    reply:
      'L’intelligence artificielle regroupe des programmes capables d’apprendre, de comprendre du texte, de reconnaître des images ou de prendre des décisions. Elle fonctionne grâce à des modèles entraînés sur de grandes quantités de données.',
  },
  {
    test: /internet|\bweb\b/i,
    reply:
      'Internet est un réseau mondial d’ordinateurs connectés. Le Web est un service qui utilise Internet pour afficher des pages et des applications.',
  },
  {
    test: /ordinateur|\bpc\b/i,
    reply:
      'Un ordinateur traite des informations grâce à un processeur, de la mémoire et un stockage. Le système d’exploitation coordonne le matériel et les applications.',
  },
  {
    test: /\b(?:code|programmation|javascript|python|html|css|node)\b/i,
    reply:
      'Pour apprendre à coder, commence par un langage simple comme Python ou JavaScript, puis fais de petits projets. En cas de bug, lis le message d’erreur, isole la partie qui échoue et teste une modification à la fois.',
  },
  {
    test: /\b(?:sant[ée]|m[ée]decin|maladie|douleur|fi[èe]vre)(?![a-zà-ÿ])/i,
    reply:
      'Je ne suis pas médecin et je ne peux pas poser de diagnostic. Si les symptômes sont forts, persistants ou inquiétants, contacte un adulte et un professionnel de santé. En attendant, repose-toi et bois de l’eau.',
  },
  {
    test: /\b(?:triste|stress|anxi[ée]t[ée]|peur|seul)(?![a-zà-ÿ])/i,
    reply:
      'Je suis désolé que tu ressentes ça. Respire lentement, bois un peu d’eau et parle à une personne de confiance. Si ça dure ou si tu te sens en danger, demande de l’aide à un adulte ou à un professionnel.',
  },
  {
    test: /\b(?:recette|cuisine|g[âa]teau|cr[êe]pe|p[âa]tes)\b/i,
    reply:
      'Pour une recette simple de crêpes : mélange 250 g de farine, 3 œufs, 50 cl de lait, 1 pincée de sel et 1 cuillère de sucre. Laisse reposer 30 minutes, puis cuis une petite louche par crêpe dans une poêle chaude beurrée.',
  },
  {
    test: /\b(?:football|sport|match)\b/i,
    reply:
      'Le football se joue à 11 contre 11. Un match dure 90 minutes, en deux mi-temps de 45 minutes, avec un ballon rond et un but à chaque extrémité du terrain.',
  },
  {
    test: /\b(?:film|s[ée]rie|anime|manga|jeux?|gaming)\b/i,
    reply:
      'Dis-moi ce que tu aimes (action, aventure, humour, fantastique…) et je te propose quelque chose. Tu peux aussi me donner un titre et je t’explique l’histoire ou le style.',
  },
  {
    test: /\b(?:musique|chanson|artiste)\b/i,
    reply:
      'La musique se compose de mélodie, de rythme et souvent d’harmonie. Si tu me donnes un style ou un artiste, je peux te proposer des morceaux à écouter.',
  },
  {
    test: /\b(?:voyage|vacances|pays)\b/i,
    reply:
      'Pour préparer un voyage : choisis la destination et la date, vérifie les papiers nécessaires, réserve le transport et le logement, puis prépare un petit budget pour les repas et les activités.',
  },
  {
    test: /tradui|traduction/i,
    reply:
      'Donne-moi le texte à traduire et la langue voulue, et je te propose une traduction naturelle.',
  },
  {
    test: /r[ée]sum|r[ée]sumer/i,
    reply:
      'Colle-moi le texte à résumer. Je peux en faire un résumé court, garder les idées principales et te sortir les points clés.',
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

function percentAnswer(message) {
  const match = message.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:de|du|des)\s*(\d+(?:[.,]\d+)?)/i);
  if (!match) return null;
  const percent = Number(match[1].replace(',', '.'));
  const total = Number(match[2].replace(',', '.'));
  if (!Number.isFinite(percent) || !Number.isFinite(total)) return null;
  return `${match[1]} % de ${match[2]} = **${Number(((percent / 100) * total).toFixed(6))}**.`;
}

function normalizeCountry(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^(?:la|le|les|l['’]|des|du|de)\s+/i, '')
    .replace(/[?!.]+$/g, '')
    .trim();
}

function capitalAnswer(message) {
  if (/capitale\s+fran[çc]aise/i.test(message)) return 'La capitale de la France est **Paris**.';
  const match = message.match(/capitale\s+(?:de\s+la\s+|de\s+l['’]|du\s+|des\s+|de\s+)?([^?!.]+)/i);
  if (!match) return null;
  const country = normalizeCountry(match[1]);
  const capital = CAPITALS.get(country);
  return capital ? `La ${match[0].trim()} est **${capital}**${capital.endsWith('.') ? '' : '.'}` : null;
}

function trimText(value, max = 520) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return lastStop > max * 0.45 ? cut.slice(0, lastStop + 1) : `${cut.trim()}…`;
}

function conversationalFallback(message) {
  const short = message.length > 120 ? `${message.slice(0, 117)}…` : message;
  if (/^(?:qui|quand|où|combien|quel(?:le|s|les)?|qu['’]est[- ]ce que)\b/i.test(message)) {
    return 'Je n’ai pas trouvé de source fiable pour répondre à cette question. Reformule ou précise le sujet, et je réessaie — je préfère ne pas inventer.';
  }
  if (/\?|^(qui|que|qu['’]|quel|quelle|où|quand|pourquoi|comment|combien|est-ce que)\b/i.test(message)) {
    return `Bonne question ! Pour te répondre précisément sur « ${short} », donne-moi un petit détail de plus : tu veux une explication simple, un exemple ou des étapes ?`;
  }
  return 'Je t’écoute ! Pose-moi une question sur n’importe quel sujet, ou dis-moi ce que tu veux créer dans KyllBot Studio.';
}

export function localAIResponse(prompt, { fallback = true } = {}) {
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

  if (/^(bonjour|salut|bonsoir|coucou|hello|hey|yo)[ !,.…-]*$/i.test(message)) {
    return 'Salut ! 👋 Je suis KyllBot. Tu veux créer une commande, un flux, un ticket ou discuter d’un autre sujet ?';
  }
  if (/(qui es[- ]tu|ton nom|tu t['’]appelles|pr[ée]sente[- ]toi)/i.test(lower)) {
    return 'Je suis KyllBot, l’assistant intégré à KyllBot Studio. Je peux t’aider à créer des commandes, des flux, des tickets, des rôles et des giveaways, mais aussi répondre à tes questions sur plein d’autres sujets.';
  }
  const introduction = message.match(
    /(?:je m['’]appelle|mon pr[ée]nom est|mon nom est)\s+([A-Za-zÀ-ÖØ-öø-ÿ'’-]{2,30})/i,
  );
  if (introduction) {
    return `Salut ${capitalize(introduction[1])} ! Enchanté. Tu veux créer quelque chose sur ton serveur ou discuter d’un autre sujet ?`;
  }
  if (/([çc]a va|comment vas[- ]tu|comment tu vas|how are you)/i.test(lower)) {
    return 'Je vais très bien, merci ! Et toi ? Je suis prêt à discuter ou à t’aider sur ton serveur.';
  }
  if (/(que (peux|sais)[- ]tu faire|^aide$|^help$|besoin d['’]aide)/i.test(lower)) {
    return 'Je peux répondre à tes questions, expliquer un sujet, t’aider à apprendre à coder, ou te guider pour créer des commandes, des flux, des tickets, des giveaways et des rôles. Je peux aussi parler des plans, des crédits et de la connexion d’un bot Discord.';
  }
  if (/\b(?:triste|stress|anxi[ée]t[ée]|peur|seul)(?![a-zà-ÿ])/i.test(lower)) {
    return 'Je suis désolé que tu ressentes ça. Respire lentement, bois un peu d’eau et parle à une personne de confiance. Si ça dure ou si tu te sens en danger, demande de l’aide à un adulte ou à un professionnel.';
  }
  if (/\b(?:sant[ée]|m[ée]decin|maladie|douleur|fi[èe]vre)(?![a-zà-ÿ])|j['’]ai mal/i.test(lower)) {
    return 'Je ne suis pas médecin et je ne peux pas poser de diagnostic. Si les symptômes sont forts, persistants ou inquiétants, contacte un adulte et un professionnel de santé. En attendant, repose-toi et bois de l’eau.';
  }
  if (/^(?:merci(?: beaucoup| bien| bcp)?|thanks|thx)[ !,.…]*$/i.test(message)) return 'Avec plaisir ! Si tu as une autre question, je suis là. 😊';
  if (/^(?:au revoir|[àa] plus|bye|bonne nuit)[ !,.…]*$/i.test(message)) return 'À bientôt ! Bonne continuation sur ton serveur. 👋';
  if (/blague|joke|dr[ôo]le/i.test(lower)) return JOKES[Math.floor(Math.random() * JOKES.length)];
  if (/quelle heure|heure est-il|l['’]heure/i.test(lower)) return `Il est **${localTime()}** (heure de Paris).`;
  if (/quel jour|la date|aujourd['’]hui/i.test(lower)) return `Nous sommes le **${localDate()}**.`;
  if (/\b(?:m[ée]t[ée]o|quel temps|temps qu['’]il fait|il pleut|va-t-il pleuvoir|temp[ée]rature (?:dehors|ext[ée]rieure|actuelle|aujourd['’]hui))\b/i.test(lower)) {
    return 'Je n’ai pas la météo en direct. Pour une température fiable, regarde Météo-France ou une application météo : je préfère ne pas inventer de chiffres.';
  }

  const percent = percentAnswer(message);
  if (percent) return percent;
  const math = mathAnswer(message);
  if (math) return math;

  const capital = capitalAnswer(message);
  if (capital) return capital;

  const questionOrRequest = /\?/.test(message) || QUESTION_START.test(message) || /^qu['’]/i.test(message);
  if (questionOrRequest) {
    for (const topic of TOPICS) {
      if (topic.test.test(lower)) return topic.reply;
    }
    for (const topic of GENERAL_TOPICS) {
      if (topic.test.test(lower)) return topic.reply;
    }
  }

  if (!fallback) return null;
  return conversationalFallback(message);
}

const WIKI_CACHE = new Map();
const WIKI_TTL = 60 * 60 * 1000;

function buildWikiQuery(message) {
  const cleaned = message
    .replace(/^(bonjour|salut|bonsoir|coucou|hello|hey)[, ]*/i, '')
    .replace(/^(dis-moi|peux-tu me dire|tu peux me dire|sais-tu|est-ce que tu sais|j['’]aimerais savoir)\s+/i, '')
    .replace(/^qu['’]est[- ]ce que\s+/i, '')
    .replace(/^(quelle est|quel est|quels sont|quelles sont|qui est|qui a|quand a|où est|où se trouve|combien de|combien|pourquoi|comment)\s+/i, '')
    .replace(/[?!.]+$/g, '')
    .trim();
  return cleaned.length >= 3 ? cleaned : message.replace(/[?!.]+$/g, '').trim();
}

async function fetchWikiJSON(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'KyllBotStudio/1.1.5 (https://kyllbot-studio-1-1-0.onrender.com)',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(3500),
  });
  if (!response.ok) throw new Error(`Wikipedia ${response.status}`);
  return response.json();
}

async function fetchWikidataJSON(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'KyllBotStudio/1.1.5 (https://kyllbot-studio-1-1-0.onrender.com)',
      Accept: 'application/sparql-results+json',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Wikidata ${response.status}`);
  return response.json();
}

function leaderText(name, isPrimeMinister, message) {
  const feminine = /pr[ée]sidente|premi[èe]re ministre/i.test(message);
  if (isPrimeMinister) {
    return feminine
      ? `Le chef du gouvernement français est **${name}**.`
      : `Le Premier ministre de la France est **${name}**.`;
  }
  return feminine
    ? `Le chef de l’État français est **${name}**.`
    : `Le président de la France est **${name}**.`;
}

export async function wikidataLeaderAnswer(prompt) {
  const message = cleanAIPrompt(prompt);
  const franceOffice =
    /\b(?:pr[ée]sident(?:e)?|premi(?:er|ère) ministre)\s+(?:(?:actuel(?:le)?|en fonction)\s+)?(?:(?:de la |du |des |de l['’])?(?:france|r[ée]publique fran[cç]aise)|fran[cç]ais(?:e)?)\b/i;
  if (!message || !franceOffice.test(message)) return null;
  const office = '(?:pr[ée]sident(?:e)?|premi(?:er|ère) ministre)';
  const asksOffice =
    new RegExp(`\\b(?:qui est|quel(?:le)? est)\\s+(?:le |la )?${office}\\b`, 'i').test(message) ||
    new RegExp(`\\b(?:qui c['’]est|c['’]est qui)\\s+(?:le |la )?${office}\\b`, 'i').test(message) ||
    new RegExp(`\\b${office}\\b[^?]{0,30}\\b(?:c['’]est qui|qui est-ce|est qui|qui est-il|qui est-elle)\\b`, 'i').test(message);
  if (!asksOffice) return null;
  if (/(?<!en )(?<![a-zà-ÿ])(?:r[ôo]le|fonction|salaire|âge|parti|programme|femme|mari|épouse|époux|famille|fils|fille|enfant)(?![a-zà-ÿ])/i.test(message)) return null;
  if (/\b(?:était|ancien|ancienne|historique)\b/i.test(message) || /\ben (?:19|20)\d{2}\b/i.test(message)) return null;
  const isPrimeMinister = /premi(?:er|ère) ministre/i.test(message);
  const property = isPrimeMinister ? 'P6' : 'P35';
  const cacheKey = `leader:${property}`;
  const cached = WIKI_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < WIKI_TTL) {
    return cached.name ? leaderText(cached.name, isPrimeMinister, message) : null;
  }
  try {
    const query =
      `SELECT ?personLabel WHERE { wd:Q142 p:${property} ?statement . ?statement ps:${property} ?person . ` +
      'FILTER NOT EXISTS { ?statement pq:P582 ?end . } ' +
      'SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". ?person rdfs:label ?personLabel. } } LIMIT 1';
    const data = await fetchWikidataJSON(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
    );
    const name = String(data?.results?.bindings?.[0]?.personLabel?.value || '').trim();
    if (!name || /^Q\d+$/.test(name)) return null;
    WIKI_CACHE.set(cacheKey, { name, at: Date.now() });
    if (WIKI_CACHE.size > 300) WIKI_CACHE.delete(WIKI_CACHE.keys().next().value);
    return leaderText(name, isPrimeMinister, message);
  } catch {
    return null;
  }
}

const WIKI_STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'd', 'l', 'et', 'ou', 'a', 'au', 'aux',
  'en', 'dans', 'pour', 'sur', 'avec', 'sans', 'par', 'est', 'sont', 'etre', 'ete', 'avoir',
  'ai', 'as', 'ont', 'ce', 'cet', 'cette', 'ces', 'quel', 'quelle', 'quels', 'quelles', 'qui',
  'que', 'qu', 'quoi', 'dont', 'ou', 'quand', 'pourquoi', 'comment', 'combien', 'plus', 'moins',
  'tres', 'the', 'of', 'to', 'is', 'are', 'was', 'were', 'what', 'who', 'which', 'how', 'why',
  'when', 'where', 'an', 'and', 'or', 'in', 'on', 'for', 'with', 'from',
]);

function normalizeWikiText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wikiStem(word) {
  if (word.startsWith('franc')) return 'franc';
  if (word.startsWith('president')) return 'president';
  return word;
}

function wikiTokens(value) {
  const words = normalizeWikiText(value)
    .split(' ')
    .filter((word) => word.length >= 3 && !WIKI_STOPWORDS.has(word))
    .map(wikiStem);
  return [...new Set(words)];
}

function scoreWikiHit(hit, tokens) {
  const title = normalizeWikiText(hit?.title);
  const snippet = normalizeWikiText(hit?.snippet);
  let score = 0;
  for (const token of tokens) {
    if (title === token) score += 5;
    else if (title.includes(token)) score += 3;
    else if (snippet.includes(token)) score += 1;
  }
  if (title.startsWith('liste des ')) score -= 3;
  if (title.includes('homonymie')) score -= 3;
  if (/\(/.test(String(hit?.title || ''))) score -= 1;
  score -= title.split(' ').length * 0.2;
  return score;
}

export async function wikipediaAIResponse(prompt) {
  const message = cleanAIPrompt(prompt);
  if (!message || message.length < 4) return null;
  if (!/\?|^(qui|que|qu['’]|quel|quelle|où|quand|pourquoi|comment|combien|est-ce que)\b/i.test(message)) return null;

  const cacheKey = message.toLowerCase();
  const cached = WIKI_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < WIKI_TTL) return cached.text;

  const leader = await wikidataLeaderAnswer(message);
  if (leader) return leader;

  try {
    const query = buildWikiQuery(message);
    if (/(?:^|\s)(?:je|j['’]|mon|ma|mes|moi|tu|ton|ta|tes|toi|nous|notre|nos|vous|votre|vos)\b/i.test(query)) return null;
    if (/(?:pr[ée]nom|^nom\b|âge|adresse|qui suis[- ]je|que sais[- ]tu de moi)/i.test(query)) return null;
    const tokens = wikiTokens(query);
    if (!tokens.length) return null;
    const search = await fetchWikiJSON(
      `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=5&utf8=1`,
    );
    const ranked = (search?.query?.search || [])
      .map((hit) => ({ hit, score: scoreWikiHit(hit, tokens) }))
      .sort((a, b) => b.score - a.score)
      .filter((entry) => entry.score >= 2)
      .slice(0, 2);
    for (const { hit } of ranked) {
      const title = hit.title;
      const summary = await fetchWikiJSON(
        `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      );
      const extract = String(summary?.extract || '').trim();
      if (extract.length < 40 || /page d['’]homonymie|may refer to/i.test(extract)) continue;
      if (!tokens.some((token) => normalizeWikiText(extract).includes(token))) continue;
      const text = trimText(extract);
      WIKI_CACHE.set(cacheKey, { text, at: Date.now() });
      if (WIKI_CACHE.size > 300) WIKI_CACHE.delete(WIKI_CACHE.keys().next().value);
      return text;
    }
    return null;
  } catch {
    return null;
  }
}
