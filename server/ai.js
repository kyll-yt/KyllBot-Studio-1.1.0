import { cleanAIPrompt, localAIResponse, wikipediaAIResponse, wikidataLeaderAnswer } from './local-ai.js';

const AI_SYSTEM_PROMPT =
  'Tu es KyllBot, un assistant francophone amical, polyvalent et naturel. ' +
  'Tu réponds à toutes les questions, même très variées ou hors sujet Discord. ' +
  'Quand la question demande un fait, donne la réponse directement, sans tourner autour du pot. ' +
  'Sois chaleureux et concis (2 à 4 phrases). ' +
  'Si tu n’es pas sûr d’un fait précis, dis-le et propose de vérifier au lieu d’inventer. ' +
  'Ne réponds jamais par une formule vide du type « j’ai bien noté » : apporte une vraie réponse ou une piste concrète. ' +
  'Ne parle jamais de clé API, de mode local, de limitations techniques ou de service externe.';

const WIKI_FIRST =
  /^(?:qui a (?:peint|invent[ée]e?|d[ée]couvert[e]?|[ée]crit[e]?|compos[ée]e?|r[ée]alis[ée]e?|fond[ée]e?|cr[ée][ée]e?)|quand (?:a|est|ont|eu)|où (?:est|se trouve|se situe)|combien (?:de|d['’]|mesure|p[èe]se|co[ûu]te)|qu['’]est[- ]ce que|quel(?:le)? (?:est|sont) (?:la|le|les|l['’])?(?:capitale|plus|nombre|superficie|population|longueur|hauteur|dur[ée]e|date|origine|r[ôo]le|fonction))/i;

const LEADER_QUESTION = /(?:pr[ée]sident(?:e)?|premi(?:er|ère) ministre)/i;

const AI_CACHE = new Map();
const AI_CACHE_TTL = 10 * 60 * 1000;
const AI_HISTORY = new Map();
const AI_HISTORY_TTL = 30 * 60 * 1000;
const AI_HISTORY_LIMIT = 8;

function aiHistoryKey({ bot, guild, channel, member, interaction }) {
  const userId = member?.id || interaction?.user?.id || 'anon';
  return `${bot?.id || 'bot'}:${guild?.id || 'dm'}:${channel?.id || 'none'}:${userId}`;
}

function readAIHistory(key) {
  const entry = AI_HISTORY.get(key);
  if (!entry || Date.now() - entry.updatedAt > AI_HISTORY_TTL) {
    AI_HISTORY.delete(key);
    return [];
  }
  return entry.messages;
}

function rememberAIMessage(key, role, content) {
  const text = String(content || '').trim().slice(0, 1200);
  if (!text) return;
  const entry = AI_HISTORY.get(key);
  const messages = entry && Date.now() - entry.updatedAt <= AI_HISTORY_TTL ? entry.messages : [];
  messages.push({ role, content: text });
  if (messages.length > AI_HISTORY_LIMIT) messages.splice(0, messages.length - AI_HISTORY_LIMIT);
  AI_HISTORY.set(key, { messages, updatedAt: Date.now() });
  if (AI_HISTORY.size > 500) AI_HISTORY.delete(AI_HISTORY.keys().next().value);
}

function readAICache(key) {
  const entry = AI_CACHE.get(key);
  if (!entry || Date.now() - entry.at > AI_CACHE_TTL) {
    AI_CACHE.delete(key);
    return null;
  }
  return entry.text;
}

function writeAICache(key, text) {
  if (!text) return text;
  AI_CACHE.set(key, { text, at: Date.now() });
  if (AI_CACHE.size > 300) AI_CACHE.delete(AI_CACHE.keys().next().value);
  return text;
}

function aiMessages(history, userPrompt) {
  return [
    { role: 'system', content: AI_SYSTEM_PROMPT },
    ...history.slice(-AI_HISTORY_LIMIT),
    { role: 'user', content: userPrompt },
  ];
}

function aiResponseText(data) {
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}

async function callOpenAI({ key, model, messages, maxTokens }) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        max_tokens: Math.min(Math.max(Number(maxTokens) || 300, 50), 4000),
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`API IA ${response.status}`);
    return aiResponseText(await response.json());
  } catch {
    return null;
  }
}

async function callFreeAI({ messages, maxTokens }) {
  const limit = Math.min(Math.max(Number(maxTokens) || 300, 200), 1000);
  const attempts = [
    {
      url: 'https://text.pollinations.ai/openai',
      body: { model: 'openai-fast', messages, max_tokens: Math.max(limit, 600), temperature: 0.4 },
    },
    {
      url: 'https://api.llm7.io/v1/chat/completions',
      body: { model: 'gpt-oss:20b', messages, max_tokens: Math.max(limit, 900), temperature: 0.4 },
    },
  ];
  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt.body),
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) continue;
      const text = aiResponseText(await response.json());
      if (text) return text;
    } catch {
      // Try the next free provider.
    }
  }
  return null;
}

async function askAI({ model, prompt, maxTokens, provider = 'auto', history = [] }) {
  const key = process.env.OPENAI_API_KEY;
  const userPrompt = cleanAIPrompt(prompt);
  if (!userPrompt) return localAIResponse(userPrompt);

  const quick = localAIResponse(userPrompt, { fallback: false });
  if (quick) return quick;

  const historyText = history.map((item) => item.content || '').join(' ');
  const nameMatch = `${historyText} ${userPrompt}`.match(
    /(?:je m['’]appelle|mon pr[ée]nom est|mon nom est)\s+([A-Za-zÀ-ÖØ-öø-ÿ'’-]{2,30})/i,
  );
  const asksName =
    /(?:quel(?:le)? (?:est|sont)|comment (?:je )?m['’]appelle|qui suis[- ]je|mon pr[ée]nom|tu (?:connais|sais|te souviens)|sais[- ]tu|connais[- ]tu|rappelle.*pr[ée]nom)/i.test(
      userPrompt,
    );
  if (asksName && nameMatch) return `Tu t’appelles **${nameMatch[1]}**.`;

  const mode = provider === 'local' ? 'local' : key ? 'openai' : 'free';
  if (mode === 'local') {
    return asksName
      ? 'Je ne connais pas encore ton prénom. Dis-moi « Je m’appelle ... » et je m’en souviendrai pour la suite de la conversation.'
      : localAIResponse(userPrompt);
  }

  const cacheKey = `${mode}|${model || 'auto'}|${userPrompt}|${history.slice(-2).map((item) => item.content).join('|')}`;
  const cached = readAICache(cacheKey);
  if (cached) return cached;

  if (mode === 'free' && LEADER_QUESTION.test(userPrompt)) {
    const leader = await wikidataLeaderAnswer(userPrompt);
    if (leader) return writeAICache(cacheKey, leader);
  }
  if (mode === 'free' && WIKI_FIRST.test(userPrompt)) {
    const wikiFirst = await wikipediaAIResponse(userPrompt);
    if (wikiFirst) return writeAICache(cacheKey, wikiFirst);
  }

  const messages = aiMessages(history, userPrompt);
  if (mode === 'openai') {
    const answer = await callOpenAI({ key, model, messages, maxTokens });
    if (answer) return writeAICache(cacheKey, answer);
  }

  const freeAnswer = await callFreeAI({ messages, maxTokens });
  if (freeAnswer) return writeAICache(cacheKey, freeAnswer);

  const wikiAnswer = await wikipediaAIResponse(userPrompt);
  if (wikiAnswer) return writeAICache(cacheKey, wikiAnswer);

  if (asksName) {
    return 'Je ne connais pas encore ton prénom. Dis-moi « Je m’appelle ... » et je m’en souviendrai pour la suite de la conversation.';
  }

  return localAIResponse(userPrompt);
}

export { aiHistoryKey, askAI, readAIHistory, rememberAIMessage };
