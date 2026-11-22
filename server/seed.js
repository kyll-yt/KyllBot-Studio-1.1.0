import { newId } from './db.js';
import { flowTemplate } from './flows.js';
import { defaultAddons } from './plans.js';
import { defaultDiscordServer } from './discord.js';

const iso = (daysAgo = 0, hoursAgo = 0) =>
  new Date(Date.now() - daysAgo * 864e5 - hoursAgo * 36e5).toISOString();

function lesson(title, type, duration, content = '') {
  return { id: newId(), title, type, duration, content };
}

function command(name, description, response, embed = null) {
  return {
    id: newId(),
    name,
    description,
    response,
    embed: embed || { title: '', description: '', color: '#6d5efc', footer: 'KyllBot Studio' },
    enabled: true,
    uses: 0,
    cooldown: 3,
  };
}

function automation(type, label, enabled, config = {}) {
  return { id: newId(), type, label, enabled, config };
}

export function seedWorkspace(user, { includeBots = true } = {}) {
  const c1 = newId();
  const c2 = newId();
  const c3 = newId();

  const bots = includeBots ? [
    {
      id: newId(),
      name: 'KyllBot Communauté',
      description: "Le bot principal du serveur : accueil, niveaux, tickets et animations.",
      prefix: '!',
      status: 'online',
      color: '#6d5efc',
      tags: ['Communauté', 'Niveaux', 'Tickets'],
      discord: defaultDiscordServer({ name: 'KyllBot Communauté', tags: ['Communauté', 'Niveaux', 'Tickets'] }),
      tokenHint: '••••••••3f9a',
      createdAt: iso(42),
      commands: [
        command('bienvenue', "Affiche le message d'accueil", "Bienvenue {user} sur **{server}** !", {
          title: 'Bienvenue chez nous ',
          description: 'Passe lire les règles, puis présente-toi dans #présentations !',
          color: '#6d5efc',
          footer: 'KyllBot Studio',
        }),
        command('rank', 'Affiche le niveau et l’XP', '{user} est niveau **{level}** avec **{xp} XP**.'),
        command('ticket', 'Ouvre un ticket de support', 'Ticket ouvert : un membre du staff arrive.'),
        command('giveaway', 'Lance un concours', 'Concours lancé ! Réagis avec pour participer.'),
        command('ping', 'Affiche la latence du bot', 'Pong ! Latence : **{latency} ms**.'),
        command('play', 'Joue une musique', 'Lecture de **{query}**.'),
      ],
      automations: [
        automation('welcome', "Message d'accueil", true, { channel: '#bienvenue', message: 'Bienvenue {user} !' }),
        automation('autorole', 'Rôle automatique', true, { role: 'Membre' }),
        automation('levels', 'Système de niveaux', true, { xpPerMessage: 15 }),
        automation('ticketPanel', 'Panneau de tickets', false, { category: 'Support' }),
        automation('moderation', 'Modération automatique', true, { antiSpam: true }),
      ],
      flows: [flowTemplate('welcome', 'KyllBot Communauté'), flowTemplate('ticket', 'KyllBot Communauté'), flowTemplate('quiz', 'KyllBot Communauté')],
      scheduledMessages: [],
      savedMessages: [],
    },
    {
      id: newId(),
      name: 'Modération Pro',
      description: 'Filtrage automatique, logs détaillés et sanctions graduées.',
      prefix: '?',
      status: 'offline',
      color: '#22d3ee',
      tags: ['Modération', 'Sécurité'],
      discord: defaultDiscordServer({ name: 'Modération Pro', tags: ['Modération', 'Sécurité'] }),
      tokenHint: '••••••••71bd',
      createdAt: iso(28),
      commands: [
        command('ban', 'Bannit un membre', '**{user}** a été banni. Raison : {reason}'),
        command('kick', 'Expulse un membre', '**{user}** a été expulsé.'),
        command('warn', 'Avertit un membre', 'Avertissement 1/3 pour **{user}**.'),
        command('clear', 'Supprime des messages', '**{count}** messages supprimés.'),
        command('slowmode', 'Définit le mode lent', 'Mode lent réglé sur **{seconds}s**.'),
      ],
      automations: [
        automation('antiSpam', 'Anti-spam', true, { threshold: 5 }),
        automation('autoMod', 'Auto-modération', true, { blockLinks: false }),
        automation('logs', 'Journal des sanctions', true, { channel: '#logs' }),
      ],
      flows: [flowTemplate('moderation', 'Modération Pro')],
      scheduledMessages: [],
      savedMessages: [],
    },
    {
      id: newId(),
      name: 'Kyll Learning Assistant',
      description: 'Bot pédagogique : quiz, rappels de cours et certificats.',
      prefix: '/',
      status: 'draft',
      color: '#f472b6',
      tags: ['Formation', 'Quiz'],
      discord: defaultDiscordServer({ name: 'Kyll Learning Assistant', tags: ['Formation', 'Quiz'] }),
      tokenHint: '••••••••0c4e',
      createdAt: iso(9),
      commands: [
        command('quiz', 'Lance un quiz de 5 questions', 'Quiz lancé ! Bonne chance.'),
        command('cours', 'Affiche le prochain module', 'Prochain module : **{module}**.'),
        command('certificat', 'Génère un certificat', 'Certificat disponible pour **{course}**.'),
      ],
      automations: [automation('reminders', 'Rappels de cours', true, { cron: 'lundi 09:00' })],
      flows: [flowTemplate('quiz', 'Kyll Learning Assistant')],
      scheduledMessages: [],
      savedMessages: [],
    },
  ] : [];

  const courses = [
    {
      id: c1,
      title: 'Créer son premier bot Discord',
      description: 'De la création de l’application à la première commande en production, pas à pas.',
      category: 'Discord',
      level: 'Débutant',
      status: 'published',
      cover: 0,
      createdAt: iso(35),
      modules: [
        {
          id: newId(),
          title: 'Les fondamentaux',
          lessons: [
            lesson('Anatomie d’un bot Discord', 'video', 12, 'Découvrez ce qu’est un bot, comment il se connecte à la passerelle et ce qu’il peut faire.'),
            lesson('Créer son application', 'text', 8, 'Rendez-vous sur le portail développeur Discord, créez une application et récupérez votre token.'),
            lesson('Quiz de validation', 'quiz', 5),
          ],
        },
        {
          id: newId(),
          title: 'Premières commandes',
          lessons: [
            lesson('Slash commands et permissions', 'video', 18, 'Structurez vos commandes avec les permissions et les options typées.'),
            lesson('Répondre avec des embeds', 'text', 15, 'Construisez des réponses riches : titres, couleurs, champs et images.'),
          ],
        },
        {
          id: newId(),
          title: 'Mise en production',
          lessons: [
            lesson('Hébergement et supervision', 'video', 22, 'Déployez votre bot sur un serveur, surveillez les erreurs et les redémarrages.'),
            lesson('Checklist de lancement', 'text', 10, 'Les 12 points à vérifier avant d’ouvrir votre bot au public.'),
          ],
        },
      ],
      quiz: [
        { id: newId(), question: 'Où crée-t-on une application Discord ?', options: ['Portail développeur', 'Le site Discord', 'Dans le client', 'Sur GitHub'], answer: 0, points: 1 },
        { id: newId(), question: 'Que faut-il garder secret ?', options: ['Le préfixe', 'Le token du bot', 'L’identifiant du serveur', 'Le nom du bot'], answer: 1, points: 1 },
        { id: newId(), question: 'À quoi sert un embed ?', options: ['À modérer', 'À afficher une réponse riche', 'À héberger le bot', 'À créer un rôle'], answer: 1, points: 1 },
      ],
    },
    {
      id: c2,
      title: 'Scénariser une formation engageante',
      description: 'Structure pédagogique, micro-learning et évaluation : la méthode complète.',
      category: 'Pédagogie',
      level: 'Intermédiaire',
      status: 'published',
      cover: 1,
      createdAt: iso(21),
      modules: [
        {
          id: newId(),
          title: 'Concevoir le parcours',
          lessons: [
            lesson('Objectifs pédagogiques', 'text', 10, 'Formulez des objectifs observables et mesurables pour chaque module.'),
            lesson('Découper en micro-modules', 'video', 14, 'Le bon grain : 5 à 10 minutes par séquence pour garder l’attention.'),
          ],
        },
        {
          id: newId(),
          title: 'Engager l’apprenant',
          lessons: [
            lesson('Scénarios et mises en situation', 'video', 16, 'Ancrez les apprentissages avec des cas concrets et des choix.'),
            lesson('Gamification raisonnée', 'text', 9, 'Badges, séries et progression : ce qui motive vraiment.'),
            lesson('Quiz interactif', 'quiz', 6),
          ],
        },
      ],
      quiz: [
        { id: newId(), question: 'Durée idéale d’une séquence ?', options: ['45 min', '5 à 10 min', '2 h', '1 journée'], answer: 1, points: 1 },
        { id: newId(), question: 'Un bon objectif pédagogique est…', options: ['Vague', 'Mesurable', 'Secret', 'Optionnel'], answer: 1, points: 1 },
      ],
    },
    {
      id: c3,
      title: 'Modération & sécurité communautaire',
      description: 'Protéger votre serveur : anti-raid, filtrage, sanctions et journalisation.',
      category: 'Modération',
      level: 'Avancé',
      status: 'draft',
      cover: 2,
      createdAt: iso(6),
      modules: [
        {
          id: newId(),
          title: 'Prévenir',
          lessons: [
            lesson('Durcir les permissions', 'text', 12, 'Le principe du moindre privilège appliqué aux rôles Discord.'),
            lesson('Anti-raid et vérification', 'video', 20, 'Détecter une attaque et activer les garde-fous.'),
          ],
        },
        {
          id: newId(),
          title: 'Réagir',
          lessons: [lesson('Sanctions graduées', 'video', 15, 'Échelle de sanctions cohérente et documentée.')],
        },
      ],
      quiz: [
        { id: newId(), question: 'Le principe du moindre privilège consiste à…', options: ['Donner admin à tous', 'Limiter les droits au strict nécessaire', 'Désactiver les logs', 'Bannir les nouveaux'], answer: 1, points: 1 },
      ],
    },
  ];

  // Aucune personne fictive : apprenants et équipe démarrent vides.
  const learners = [];
  const team = [];

  const apiKeys = [
    {
      id: newId(),
      label: 'Intégration site vitrine',
      prefix: 'kyll_live_',
      hint: 'a91f',
      createdAt: iso(11),
      lastUsed: iso(0, 5),
      scopes: ['bots:read', 'courses:read'],
    },
  ];

  const activity = [
    ...bots.map((bot) => ({ id: newId(), type: 'bot', message: `Le bot « ${bot.name} » a été créé`, at: bot.createdAt })),
    ...courses.map((course) => ({ id: newId(), type: 'course', message: `La formation « ${course.title} » a été créée`, at: course.createdAt })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  const events = [
    ...bots.map((bot) => ({ id: newId(), type: 'bot.created', botId: bot.id, at: bot.createdAt })),
    ...courses.map((course) => ({ id: newId(), type: 'course.created', courseId: course.id, at: course.createdAt })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  return {
    ownerId: user.id,
    studioName: 'KyllBot Studio',
    plan: 'Gratuit',
    bots,
    courses,
    learners,
    team,
    apiKeys,
    activity,
    events,
    credits: 30,
    dailyReward: { lastClaimAt: null, streak: 0, totalClaimed: 0 },
    addons: defaultAddons(),
    purchases: [],
    invoices: [],
    schemaVersion: 2,
    settings: {
      timezone: 'Europe/Paris',
      language: 'fr',
      notifications: { email: true, product: true, weekly: true },
      branding: { accent: '#6d5efc', darkMode: true },
    },
    createdAt: new Date().toISOString(),
  };
}
