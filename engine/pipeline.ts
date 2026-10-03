import type { CheckRequest, Ledger, Privacy, Signals } from '../contracts/types';
import { redact } from './redact';
import { extractSignals } from './signals';
import { checkRules, buildTimeline } from './rules';
import { parseChat } from './chat';
import { enhance, type LLMCall, anthropicCall } from './llm';
import type { Lang, RedactReport } from '../contracts/types';

/** Client-side prep: everything that runs on the device before any network call. */
export function prepare(raw: string, lang: Lang) {
  const { redacted, report } = redact(raw);
  return { redacted, report, signals: extractSignals(redacted, lang, report) };
}

/** Fully offline path (also what the browser uses if the network fails). */
export function checkOffline(raw: string, lang: Lang, situation: CheckRequest['situation'], sebi?: CheckRequest['sebi_check']): Ledger {
  const { redacted, signals } = prepare(raw, lang);
  const msgs = parseChat(redacted);
  return checkRules(signals, situation, { timeline: msgs.length > 1 ? buildTimeline(msgs, lang) : undefined, sebi_check: sebi });
}

/** Server path for POST /api/check. Never trusts client-computed signals except phone-class flags (phone values never leave the device). */
export async function runCheck(req: CheckRequest, opts: { llm?: LLMCall | null; timeoutMs?: number } = {}): Promise<Ledger> {
  const { redacted, report } = redact(String(req.redacted_text ?? '').slice(0, 8000)); // idempotent defensive pass
  const phones = Array.isArray(req.signals?.phones) ? req.signals!.phones!.map((p) => ({ is1600: !!p?.is1600 })).slice(0, 10) : [];
  const sg: Signals = extractSignals(redacted, req.lang, { phones: [...phones, ...(report as RedactReport).phones] });
  const msgs = parseChat(redacted);
  const base = checkRules(sg, req.situation, { timeline: msgs.length > 1 ? buildTimeline(msgs, req.lang) : undefined, sebi_check: req.sebi_check });
  const call = opts.llm === undefined ? (process.env.ANTHROPIC_API_KEY ? anthropicCall : null) : opts.llm;
  let out = base, usedLLM = false;
  if (call) { out = await enhance(base, redacted, sg, call, opts.timeoutMs); usedLLM = true; }
  out.privacy = privacy(usedLLM, out.mode === 'llm');
  return out;
}
/** The receipt describes the real flow: text always goes to our server; it goes to the LLM provider only if that call was attempted. */
function privacy(attempted: boolean, succeeded: boolean): Privacy {
  return { on_device: ['redaction', 'extraction'], sent: ['1 redacted text (no phone, email, OTP, ID numbers), 0 images', ...(attempted ? ['same redacted text to the LLM provider'] : [])],
    to: attempted ? 'SACH server, then LLM provider' + (succeeded ? '' : ' (no reply used)') : 'SACH server', stored: 'none' };
}
