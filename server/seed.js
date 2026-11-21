import { newId } from './db.js';

const iso = (daysAgo = 0, hoursAgo = 0) =>
  new Date(Date.now() - daysAgo * 864e5 - hoursAgo * 36e5).toISOString();

function lesson(title, type, duration, content = '') {
  return { id: newId(), title, type, duration, content };
}

function command(name, description, response, uses = 0, embed = null) {
  return {
    id: newId(),
    name,
    description,
    response,
    embed: embed || { title: '', description: '', color: '#6d5efc', footer: 'KyllBot Studio' },
    enabled: true,
    uses,
    cooldown: 3,
  };
}

function automation(type, label, enabled, config = {}) {
  return { id: newId(), type, label, enabled, config };
}

export function seedWorkspace(user) {
  const c1 = newId();
  const c2 = newId();
  const c3 = newId();

  const bots = [
    {
      id: newId(),
      name: 'KyllBot Communauté',
      description: "Le bot principal du serveur : accueil, niveaux, tickets et animations.",
      prefix: '!',
      status: 'online',
      color: '#6d5efc',
      tags: ['Communauté', 'Niveaux', 'Tickets'],
      tokenHint: '••••••••3f9a',
      createdAt: iso(42),
      commands: [
        command('bienvenue', "Affiche le message d'accueil", "Bienvenue {user} sur **{server}** !", 4821, {
          title: 'Bienvenue chez nous ',
          description: 'Passe lire les règles, puis présente-toi dans #présentations !',
          color: '#6d5efc',
          footer: 'KyllBot Studio',
        }),
        command('rank', 'Affiche le niveau et l’XP', '{user} est niveau **{level}** avec **{xp} XP**.', 3102),
        command('ticket', 'Ouvre un ticket de support', 'Ticket ouvert : un membre du staff arrive.', 874),
        command('giveaway', 'Lance un concours', 'Concours lancé ! Réagis avec pour participer.', 231),
        command('ping', 'Affiche la latence du bot', 'Pong ! Latence : **{latency} ms**.', 1893),
        command('play', 'Joue une musique', 'Lecture de **{query}**.', 640),
      ],
      automations: [
        automation('welcome', "Message d'accueil", true, { channel: '#bienvenue', message: 'Bienvenue {user} !' }),
        automation('autorole', 'Rôle automatique', true, { role: 'Membre' }),
        automation('levels', 'Système de niveaux', true, { xpPerMessage: 15 }),
        automation('ticketPanel', 'Panneau de tickets', false, { category: 'Support' }),
        automation('moderation', 'Modération automatique', true, { antiSpam: true }),
      ],
    },
    {
      id: newId(),
      name: 'Modération Pro',
      description: 'Filtrage automatique, logs détaillés et sanctions graduées.',
      prefix: '?',
      status: 'offline',
      color: '#22d3ee',
      tags: ['Modération', 'Sécurité'],
      tokenHint: '••••••••71bd',
      createdAt: iso(28),
      commands: [
        command('ban', 'Bannit un membre', '**{user}** a été banni. Raison : {reason}', 96),
        command('kick', 'Expulse un membre', '**{user}** a été expulsé.', 143),
        command('warn', 'Avertit un membre', 'Avertissement 1/3 pour **{user}**.', 412),
        command('clear', 'Supprime des messages', '**{count}** messages supprimés.', 357),
        command('slowmode', 'Définit le mode lent', 'Mode lent réglé sur **{seconds}s**.', 88),
      ],
      automations: [
        automation('antiSpam', 'Anti-spam', true, { threshold: 5 }),
        automation('autoMod', 'Auto-modération', true, { blockLinks: false }),
        automation('logs', 'Journal des sanctions', true, { channel: '#logs' }),
      ],
    },
    {
      id: newId(),
      name: 'Kyll Learning Assistant',
      description: 'Bot pédagogique : quiz, rappels de cours et certificats.',
      prefix: '/',
      status: 'draft',
      color: '#f472b6',
      tags: ['Formation', 'Quiz'],
      tokenHint: '••••••••0c4e',
      createdAt: iso(9),
      commands: [
        command('quiz', 'Lance un quiz de 5 questions', 'Quiz lancé ! Bonne chance.', 74),
        command('cours', 'Affiche le prochain module', 'Prochain module : **{module}**.', 51),
        command('certificat', 'Génère un certificat', 'Certificat disponible pour **{course}**.', 12),
      ],
      automations: [automation('reminders', 'Rappels de cours', true, { cron: 'lundi 09:00' })],
    },
  ];

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

  const learners = [
    { id: newId(), name: 'Emma Petit', email: 'emma.petit@example.com', courseId: c1, progress: 92, score: 88, lastActive: iso(0, 2) },
    { id: newId(), name: 'Lucas Moreau', email: 'lucas.moreau@example.com', courseId: c1, progress: 64, score: 74, lastActive: iso(1) },
    { id: newId(), name: 'Sarah Benali', email: 'sarah.benali@example.com', courseId: c2, progress: 100, score: 96, lastActive: iso(0, 6) },
    { id: newId(), name: 'Hugo Lefèvre', email: 'hugo.lefevre@example.com', courseId: c2, progress: 45, score: 61, lastActive: iso(3) },
    { id: newId(), name: 'Inès Garnier', email: 'ines.garnier@example.com', courseId: c1, progress: 78, score: 82, lastActive: iso(2) },
    { id: newId(), name: 'Nathan Roy', email: 'nathan.roy@example.com', courseId: c2, progress: 23, score: 55, lastActive: iso(5) },
  ];

  const team = [
    { id: newId(), name: 'Léa Martin', email: 'lea.martin@example.com', role: 'Éditeur', status: 'active', joinedAt: iso(18) },
    { id: newId(), name: 'Noah Bernard', email: 'noah.bernard@example.com', role: 'Analyste', status: 'invited', joinedAt: iso(4) },
  ];

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
    { id: newId(), type: 'bot', message: 'KyllBot Communauté a traité 1 284 commandes aujourd’hui', at: iso(0, 1) },
    { id: newId(), type: 'learner', message: 'Sarah Benali a terminé « Scénariser une formation engageante »', at: iso(0, 4) },
    { id: newId(), type: 'course', message: 'Le module « Prévenir » a été ajouté à Modération & sécurité', at: iso(1, 3) },
    { id: newId(), type: 'team', message: 'Noah Bernard a reçu une invitation', at: iso(4) },
    { id: newId(), type: 'bot', message: 'Le panneau de tickets a été désactivé sur KyllBot Communauté', at: iso(2, 7) },
    { id: newId(), type: 'certificate', message: '3 certificats ont été générés cette semaine', at: iso(3) },
  ];

  return {
    ownerId: user.id,
    studioName: 'KyllBot Studio',
    plan: 'Pro',
    bots,
    courses,
    learners,
    team,
    apiKeys,
    activity,
    settings: {
      timezone: 'Europe/Paris',
      language: 'fr',
      notifications: { email: true, product: true, weekly: true },
      branding: { accent: '#6d5efc', darkMode: true },
    },
    createdAt: new Date().toISOString(),
  };
}
