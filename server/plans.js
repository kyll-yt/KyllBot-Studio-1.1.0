const plan = (id, price, tagline, limits, features, missing = []) => ({
  id,
  name: id,
  price,
  tagline,
  limits,
  features,
  missing,
});

export const PLANS = {
  Gratuit: plan(
    'Gratuit',
    0,
    'Pour découvrir le studio et publier un premier bot.',
    { bots: 3, courses: 3, learners: 100, members: 2, commandsPerBot: 50, apiKeys: 1 },
    [
      '3 bots Discord',
      '3 formations',
      '100 apprenants',
      '50 commandes par bot',
      '2 membres d’équipe · 1 clé API',
      'Récompense quotidienne en crédits',
      'Statistiques réelles',
    ],
    ['Certificats automatiques', 'Exports avancés', 'Webhooks', 'Marque blanche'],
  ),
  Essentiel: plan(
    'Essentiel',
    9,
    'Pour animer une communauté active.',
    { bots: 6, courses: 15, learners: 500, members: 5, commandsPerBot: 80, apiKeys: 3 },
    [
      '6 bots Discord',
      '15 formations',
      '500 apprenants',
      '80 commandes par bot',
      '5 membres d’équipe · 3 clés API',
      'Certificats automatiques',
      'Exports CSV / JSON',
    ],
    ['Webhooks illimités', 'Marque blanche', 'Support prioritaire'],
  ),
  Pro: plan(
    'Pro',
    19,
    'Pour les créateurs et les équipes qui montent en puissance.',
    { bots: 15, courses: 60, learners: 3000, members: 15, commandsPerBot: 150, apiKeys: 6 },
    [
      '15 bots Discord',
      '60 formations',
      '3 000 apprenants',
      '150 commandes par bot',
      '15 membres d’équipe · 6 clés API',
      'Certificats et exports avancés',
      'Webhooks et API',
      'Support sous 48 h',
    ],
    ['Marque blanche', 'Support prioritaire'],
  ),
  Studio: plan(
    'Studio',
    49,
    'Pour les studios et les organisations sans limite.',
    { bots: 999, courses: 999, learners: 999999, members: 100, commandsPerBot: 300, apiKeys: 10 },
    [
      'Bots et formations illimités',
      'Apprenants illimités',
      '300 commandes par bot',
      '100 membres d’équipe · 10 clés API',
      'Marque blanche',
      'Webhooks et API avancés',
      'Support prioritaire',
    ],
  ),
};

export const PLAN_NAMES = Object.keys(PLANS);

export const DEFAULT_PLAN = 'Gratuit';

export function normalizePlanName(value) {
  if (value === 'Starter') return 'Gratuit';
  return PLAN_NAMES.includes(value) ? value : DEFAULT_PLAN;
}

export function defaultAddons() {
  return {
    extraBots: 0,
    extraCourses: 0,
    extraLearners: 0,
    extraApiKeys: 0,
    whiteLabel: false,
    unlimitedCertificates: false,
  };
}

export function ensureAddons(ws) {
  ws.addons = { ...defaultAddons(), ...(ws.addons || {}) };
  return ws.addons;
}

export function effectiveLimits(ws) {
  const base = (PLANS[normalizePlanName(ws.plan)] || PLANS[DEFAULT_PLAN]).limits;
  const addons = ensureAddons(ws);
  return {
    ...base,
    bots: base.bots + addons.extraBots,
    courses: base.courses + addons.extraCourses,
    learners: base.learners + addons.extraLearners,
    apiKeys: base.apiKeys + addons.extraApiKeys,
  };
}

export const SHOP = [
  {
    id: 'bots_3',
    label: '+3 bots',
    detail: 'Ajoute 3 emplacements de bots à votre plan actuel.',
    credits: 120,
    icon: 'bot',
    apply: (ws) => {
      ensureAddons(ws).extraBots += 3;
    },
  },
  {
    id: 'courses_10',
    label: '+10 formations',
    detail: 'Ajoute 10 emplacements de formations.',
    credits: 90,
    icon: 'book',
    apply: (ws) => {
      ensureAddons(ws).extraCourses += 10;
    },
  },
  {
    id: 'learners_500',
    label: '+500 apprenants',
    detail: 'Ajoute 500 places d’apprenants suivis.',
    credits: 100,
    icon: 'users',
    apply: (ws) => {
      ensureAddons(ws).extraLearners += 500;
    },
  },
  {
    id: 'api_5',
    label: '+5 clés API',
    detail: 'Ajoute 5 clés API pour vos intégrations.',
    credits: 50,
    icon: 'key',
    apply: (ws) => {
      ensureAddons(ws).extraApiKeys += 5;
    },
  },
  {
    id: 'certificates',
    label: 'Certificats illimités',
    detail: 'Débloque les certificats sans limite sur toutes vos formations.',
    credits: 250,
    icon: 'award',
    once: true,
    apply: (ws) => {
      ensureAddons(ws).unlimitedCertificates = true;
    },
    owned: (ws) => ensureAddons(ws).unlimitedCertificates,
  },
  {
    id: 'white_label',
    label: 'Marque blanche',
    detail: 'Retirez la mention KyllBot des certificats et des exports.',
    credits: 600,
    icon: 'spark',
    once: true,
    apply: (ws) => {
      ensureAddons(ws).whiteLabel = true;
    },
    owned: (ws) => ensureAddons(ws).whiteLabel,
  },
  {
    id: 'plan_essentiel',
    label: '1 mois Essentiel',
    detail: 'Active le plan Essentiel pendant 30 jours avec vos crédits.',
    credits: 300,
    icon: 'card',
    plan: 'Essentiel',
  },
  {
    id: 'plan_pro',
    label: '1 mois Pro',
    detail: 'Active le plan Pro pendant 30 jours avec vos crédits.',
    credits: 600,
    icon: 'card',
    plan: 'Pro',
  },
  {
    id: 'plan_studio',
    label: '1 mois Studio',
    detail: 'Active le plan Studio pendant 30 jours avec vos crédits.',
    credits: 1200,
    icon: 'card',
    plan: 'Studio',
  },
];

export function publicShop(ws) {
  return SHOP.map((item) => ({
    id: item.id,
    label: item.label,
    detail: item.detail,
    credits: item.credits,
    icon: item.icon,
    once: Boolean(item.once),
    plan: item.plan || null,
    owned: item.owned ? Boolean(item.owned(ws)) : false,
  }));
}

export function publicPlans(ws) {
  const limits = effectiveLimits(ws);
  return Object.values(PLANS).map((entry) => ({
    ...entry,
    limits: entry.id === normalizePlanName(ws.plan) ? { ...entry.limits, ...limits } : entry.limits,
    current: entry.id === normalizePlanName(ws.plan),
  }));
}

export const DAILY_BASE = 25;
export const DAILY_STEP = 10;
export const DAILY_MAX = 100;

const REWARD_TIME_ZONE = process.env.APP_TIMEZONE || 'Europe/Paris';

const dayKey = (date = new Date()) => {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REWARD_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsed);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};

export function dailyRewardStatus(ws) {
  const reward = ws.dailyReward || {};
  const today = dayKey();
  const lastDay = reward.lastClaimAt ? dayKey(reward.lastClaimAt) : null;
  const claimedToday = lastDay === today;
  const yesterday = dayKey(new Date(Date.now() - 864e5));
  const streak = Number(reward.streak) || 0;
  const nextStreak = claimedToday ? streak : lastDay === yesterday ? streak + 1 : 1;
  const amount = Math.min(DAILY_MAX, DAILY_BASE + Math.min(nextStreak, 7) * DAILY_STEP);
  return {
    claimedToday,
    streak,
    nextStreak,
    amount,
    lastClaimAt: reward.lastClaimAt || null,
    totalClaimed: Number(reward.totalClaimed) || 0,
  };
}
