import type { Ledger, LedgerItem, Signals } from '../contracts/types';

// Output guardrails (§8 tone rules, §16): the LLM may reword findings and add clearly-labelled AI interpretations. Nothing else.
export const BANNED = /\b(?:scams?|scammers?|fraud(?:s|ster|sters|ulent)?|safe|safely|impossible|guilty|criminals?)\b|स्कैम|फ्रॉड|ठग|धोखेबाज़?|सुरक्षित|\d+\s?%|score\s?:?\s?\d/i;
const DEVANAGARI = /[\u0900-\u097F]/;

export const SYSTEM_PROMPT = `You explain findings. You may NOT add facts, verify anything, name people/firms as fraudsters, rate stocks, or give investment advice. Output JSON per schema only. Reading level: Class 6. Hindi in Devanagari, avoid jargon; explain 'intermediary' as 'SEBI se registered broker/advisor'. Never use the words scam, fraud, safe, impossible, and never give a number or percentage of risk. Say "matches these signals" or "does not match the standard flow described by SEBI".
Schema: {"items":[{"id":string,"why_en":string,"why_hi":string}],"ai_items":[{"id":"ai_urgency"|"ai_secrecy"|"ai_authority"|"ai_other","title_en":string,"title_hi":string,"why_en":string,"why_hi":string}],"stage":{"because_en":string,"because_hi":string}|null}
"items" must reuse ids from FINDINGS only. "ai_items" are your interpretation of pressure tactics (urgency, secrecy, borrowed authority) and are shown as AI opinion, not evidence. Max 3.`;

export function buildPrompt(redacted: string, ledger: Ledger, s: Signals): string {
  const findings = ledger.items.map((i) => ({ id: i.id, label: i.label, forgeability: i.forgeability, title_en: i.title_en, why_en: i.why_en }));
  return JSON.stringify({ message: redacted.slice(0, 8000), signals: { payee_type: s.payee?.type ?? null, amount: s.askAmount, deadlines: s.deadlines, phrases: Object.keys(s.phrases) }, FINDINGS: findings, stage: ledger.stage && { index: ledger.stage.index, name: ledger.stage.name } });
}

const okStr = (v: unknown, hi = false): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 500 && !BANNED.test(v) && (!hi || DEVANAGARI.test(v));

/** Validate + merge. Anything not traceable to findings[] is dropped; bad strings fall back to the template text. */
export function mergeLLM(base: Ledger, raw: unknown): Ledger {
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as any, out: Ledger = structuredClone(base);
  let touched = false;
  if (Array.isArray(r.items)) for (const x of r.items) {
    const it = out.items.find((i) => i.id === x?.id && i.label !== 'AI_INTERPRETATION'); // unknown ids are dropped
    if (it && okStr(x.why_en) && okStr(x.why_hi, true)) { it.why_en = x.why_en; it.why_hi = x.why_hi; it.rephrased_by_ai = true; touched = true; }
  }
  if (Array.isArray(r.ai_items)) for (const x of r.ai_items.slice(0, 3)) {
    if (typeof x?.id !== 'string' || !/^ai_[a-z]+$/.test(x.id) || out.items.some((i) => i.id === x.id)) continue;
    if (okStr(x.title_en) && okStr(x.title_hi, true) && okStr(x.why_en) && okStr(x.why_hi, true)) {
      out.items.push({ id: x.id, card: 'AI', label: 'AI_INTERPRETATION', forgeability: 'easy', title_en: x.title_en, title_hi: x.title_hi, why_en: x.why_en, why_hi: x.why_hi } as LedgerItem); touched = true;
    }
  }
  if (out.stage && r.stage && okStr(r.stage.because_en) && okStr(r.stage.because_hi, true)) { out.stage.because_en = r.stage.because_en; out.stage.because_hi = r.stage.because_hi; touched = true; }
  if (touched) out.mode = 'llm';
  // header, labels, forgeability, stage index, next_steps, payee are rules-owned and are never taken from the LLM.
  return out;
}

export type LLMCall = (system: string, user: string, signal: AbortSignal) => Promise<string>;
export const anthropicCall: LLMCall = async (system, user, signal) => {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) throw new Error('no key');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal, headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.LLM_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 1200, temperature: 0.2, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error('llm http ' + res.status);
  const j: any = await res.json(); return j.content?.[0]?.text ?? '';
};

/** 3 s budget (§9). Any failure => returns the rules-only ledger untouched. */
export async function enhance(base: Ledger, redacted: string, s: Signals, call: LLMCall = anthropicCall, timeoutMs = 3000): Promise<Ledger> {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const txt = await Promise.race([call(SYSTEM_PROMPT, buildPrompt(redacted, base, s), ac.signal), new Promise<never>((_, rej) => ac.signal.addEventListener('abort', () => rej(new Error('timeout'))))]);
    return mergeLLM(base, JSON.parse(txt.replace(/```json|```/g, '').trim()));
  } catch { return base; } finally { clearTimeout(t); }
}
