import { load, type Store } from '@tauri-apps/plugin-store';

const DEFAULT_MODEL = 'meta-llama/llama-3.3-8b-instruct:free';
const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash';

export type AIProvider = 'openrouter' | 'gemini';

// The AI assistant has two teaching modes, chosen by the user.
//  - socratic: never gives answers, only probing questions (the original behavior).
//  - tutor:    gives real answers AND the reasoning/mental model behind them.
export type AIMode = 'socratic' | 'tutor';

export const SOCRATIC_SYSTEM =
  'You are a Socratic programming tutor. DO NOT give direct answers. DO NOT write code for the user. ' +
  'Instead, ask probing questions that lead the user to figure out the answer themselves. Keep your responses short and concise.';

export const TUTOR_SYSTEM =
  "You are an expert C# programming tutor and mentor. Unlike a Socratic tutor, you DO give direct answers and working code — " +
  "but you always teach the reasoning so the user builds intuition instead of just copying.\n\n" +
  "When the user asks a conceptual 'which should I use / when do I use X vs Y' question (e.g. events vs async/await, " +
  "class vs record, interface vs abstract class), answer with:\n" +
  "1. A one-line direct answer / rule of thumb.\n" +
  "2. The mental model: what problem each tool actually solves, and the key question to ask yourself when deciding.\n" +
  "3. A short, concrete C# example (or a tiny side-by-side) that makes the distinction obvious.\n" +
  "4. Common mistakes / when NOT to use it.\n\n" +
  "For 'how do I' or debugging questions, give the correct answer or code, then briefly explain why it works. " +
  "Be clear and well-organized; prefer short code snippets over long ones. Use idiomatic modern C# (.NET 10 / C# 14).";

const DEFAULT_MODE: AIMode = 'socratic';

export async function getAIMode(): Promise<AIMode> {
  try {
    const store = await load('settings.json');
    const v = (await store.get<{ value: string }>('ai_mode'))?.value;
    return v === 'tutor' ? 'tutor' : 'socratic';
  } catch {
    return DEFAULT_MODE;
  }
}

export async function setAIMode(mode: AIMode): Promise<void> {
  try {
    const store = await load('settings.json');
    await store.set('ai_mode', { value: mode });
    await store.save();
  } catch { /* best effort — falls back to default next load */ }
}

// The active system prompt for the assistant drawer, optionally grounded in the
// current study/lesson context so answers are specific to what the user is on.
export function systemForMode(mode: AIMode, context?: string): string {
  const base = mode === 'tutor' ? TUTOR_SYSTEM : SOCRATIC_SYSTEM;
  const ctx = context?.trim();
  return ctx ? `${base}\n\nContext — the user is currently working on: ${ctx}.` : base;
}

export interface OrModel {
  id: string;
  name: string;
  promptPrice: number;      // USD per token (0 = free)
  completionPrice: number;
  isFree: boolean;
  context: number;
}

export interface GemModel { id: string; name: string; }
export interface ChatMsg { role: 'user' | 'assistant'; text: string; }

// A small curated fallback so the Gemini picker isn't empty before a key is entered.
// The live list is fetched from the API (fetchGeminiModels) once a key is present.
export const GEMINI_FALLBACK_MODELS: GemModel[] = [
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash — best free (recommended)' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite — fastest/cheapest' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro (paid — not on free tier)' },
];

// The single best free-tier model to recommend, per current benchmarks.
export const GEMINI_RECOMMENDED = 'gemini-3.5-flash';

// ─── OpenRouter model list (public — no key needed to list) ──────────────
export async function fetchModels(): Promise<OrModel[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const data = await res.json();
  const list: OrModel[] = (data.data ?? []).map((m: any) => {
    const p = parseFloat(m.pricing?.prompt ?? '0');
    const c = parseFloat(m.pricing?.completion ?? '0');
    return { id: m.id, name: m.name ?? m.id, promptPrice: p, completionPrice: c, isFree: p === 0 && c === 0, context: m.context_length ?? 0 };
  });
  return list.sort((a, b) => {
    if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
    if (a.promptPrice !== b.promptPrice) return a.promptPrice - b.promptPrice;
    return a.name.localeCompare(b.name);
  });
}

// ─── Gemini model list (needs the user's key) ────────────────────────────
export async function fetchGeminiModels(apiKey: string): Promise<GemModel[]> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Could not list Gemini models');
  const list: GemModel[] = (data.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m: any) => ({ id: String(m.name).replace(/^models\//, ''), name: m.displayName || String(m.name).replace(/^models\//, '') }))
    // newest / flash first is a reasonable default ordering
    .sort((a: GemModel, b: GemModel) => b.id.localeCompare(a.id));
  return list;
}

// OpenRouter exposes no quality score, so "Best" uses a curated ranking of known
// strong model families (higher = better). Update as the frontier moves.
// Curated quality ranking (higher = better), refreshed July 2026. Used for the
// "Best" sort and the ★ badge; among free models the highest-ranked one is the
// "best free" pick. Order the strong open/free coders high so they surface on top.
// Family regexes so new point-releases (e.g. Claude Opus 4.8, GLM-5.2) match too.
const RANK: [RegExp, number][] = [
  [/anthropic\/claude.*opus/i, 100],               // Claude Opus 4.7 / 4.8
  [/openai\/(gpt-5|o[0-9])/i, 98],
  [/google\/gemini.*3.*pro/i, 97],
  [/anthropic\/claude.*(sonnet|4)/i, 96],          // Claude Sonnet 4.6
  [/deepseek.*v4.*pro/i, 95],                      // DeepSeek V4 Pro (1.6T MoE, frontier)
  [/google\/gemini.*3\.5.*flash/i, 93],            // strong coder, free tier
  [/(z-ai|zhipu|thudm).*glm-?5|glm-?5/i, 91],      // GLM-5.x (open, top SWE-bench)
  [/minimax.*m[0-9]/i, 90],                        // MiniMax M3
  [/moonshot|kimi.*k[0-9]/i, 90],                  // Kimi K2.x
  [/xiaomi.*mimo|\bmimo-v[0-9]/i, 89],             // Xiaomi MiMo v2.5
  [/deepseek.*(v4|r[0-9])/i, 88],                  // DeepSeek V4 Flash / R-series
  [/tencent.*hy[0-9]|hunyuan/i, 87],               // Tencent Hunyuan 3
  [/nvidia.*nemotron/i, 86],                       // NVIDIA Nemotron 3
  [/openai\/gpt-oss/i, 86],                        // GPT-OSS (strong free coder)
  [/qwen.*coder/i, 84],                            // Qwen3-Coder
  [/stepfun|\bstep-[0-9]/i, 82],                   // StepFun Step 3.x
  [/google\/gemini.*(2\.5.*pro|3.*flash-lite|3\.1.*flash)/i, 82],
  [/anthropic\/claude.*haiku/i, 80],
  [/meta-llama\/llama-4/i, 78],
  [/qwen.*(2\.5|3).*(72b|235b|max|480b)/i, 76],
  [/mistral.*large/i, 72],
  [/google\/gemini.*flash/i, 70],
  [/deepseek/i, 66],
  [/qwen/i, 60],
  [/meta-llama\/llama-3/i, 56],
  [/mistral|mixtral/i, 52],
  [/gemma/i, 46],
];
export function modelRank(id: string): number {
  for (const [re, score] of RANK) if (re.test(id)) return score;
  return 30;
}

// ─── provider + selection helpers ────────────────────────────────────────
async function readProvider(store: Store): Promise<AIProvider> {
  const p = await store.get<{ value: string }>('ai_provider');
  return p?.value === 'gemini' ? 'gemini' : 'openrouter';
}

export async function getProvider(): Promise<AIProvider> {
  try { return await readProvider(await load('settings.json')); } catch { return 'openrouter'; }
}

export async function getSelectedModel(): Promise<string> {
  try {
    const store = await load('settings.json');
    if ((await readProvider(store)) === 'gemini')
      return (await store.get<{ value: string }>('gemini_model'))?.value || GEMINI_DEFAULT_MODEL;
    return (await store.get<{ value: string }>('openrouter_model'))?.value || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

// Used by cost-conscious features (Supercompile) to avoid surprise paid calls.
export async function isSelectedModelFree(): Promise<boolean> {
  const provider = await getProvider();
  const model = await getSelectedModel();
  // Gemini free tier covers Flash/Flash-Lite; Pro tiers can incur cost.
  if (provider === 'gemini') return !/pro/i.test(model);
  return model.endsWith(':free');
}

// ─── chat dispatch (multi-turn, provider-aware) ──────────────────────────
export async function askAIChat(systemPrompt: string, messages: ChatMsg[]): Promise<string> {
  const store = await load('settings.json');
  if ((await readProvider(store)) === 'gemini') return geminiChat(store, systemPrompt, messages);
  return openRouterChat(store, systemPrompt, messages);
}

// Single-turn convenience used by Refine / Note clean-up / Supercompile.
export async function askAI(systemPrompt: string, userPrompt: string): Promise<string> {
  return askAIChat(systemPrompt, [{ role: 'user', text: userPrompt }]);
}

// Provider-agnostic: retry the call when the model is transiently unavailable
// (Gemini "high demand"/503, OpenRouter rate-limits, 429/5xx) with a short backoff.
const TRANSIENT = /overload|high demand|rate.?limit|resource.?exhausted|too many|temporarily|try again|unavailable|\b(429|500|502|503|504)\b/i;
export async function askAIWithRetry(systemPrompt: string, userPrompt: string, tries = 3, delayMs = 1500): Promise<string> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try { return await askAI(systemPrompt, userPrompt); }
    catch (e: any) {
      lastErr = e;
      if (i < tries - 1 && TRANSIENT.test(e?.message || '')) { await new Promise(r => setTimeout(r, delayMs * (i + 1))); continue; }
      throw e;
    }
  }
  throw lastErr;
}

// Back-compat: existing callers import askOpenRouter — it now routes by provider.
export const askOpenRouter = askAI;

async function openRouterChat(store: Store, system: string, messages: ChatMsg[]): Promise<string> {
  const apiKey = (await store.get<{ value: string }>('openrouter_key'))?.value;
  const model = (await store.get<{ value: string }>('openrouter_model'))?.value || DEFAULT_MODEL;
  if (!apiKey) throw new Error('Please set your OpenRouter API key in the Settings (⚙️) first.');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:1420',
      'X-Title': 'Facet Socratic Tutor',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages.map(m => ({ role: m.role, content: m.text }))],
    }),
  });
  const data = await res.json();
  if (data.choices && data.choices[0] && data.choices[0].message) return data.choices[0].message.content;
  throw new Error(data.error?.message || 'Unknown error from OpenRouter');
}

async function geminiChat(store: Store, system: string, messages: ChatMsg[]): Promise<string> {
  const apiKey = (await store.get<{ value: string }>('gemini_key'))?.value;
  const model = (await store.get<{ value: string }>('gemini_model'))?.value || GEMINI_DEFAULT_MODEL;
  if (!apiKey) throw new Error('Please set your Google Gemini API key in the Settings (⚙️) first.');

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })),
    }),
  });
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('');
  if (text) return text;
  if (data?.promptFeedback?.blockReason) throw new Error(`Gemini blocked the request (${data.promptFeedback.blockReason}).`);
  throw new Error(data?.error?.message || 'Empty or unknown response from Gemini.');
}
