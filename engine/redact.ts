import type { RedactReport } from '../contracts/types';
import { HEADER_RE } from './chat';

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd|t\.me|wa\.me)\/[^\s<>"']+/gi;
export const UPI_RE = /(?<![\w.\-@])[\w.\-]{2,}@[a-zA-Z][a-zA-Z0-9]{1,}(?![\w@]|\.[a-zA-Z])/g;
const EMAIL_RE = /[\w.+\-]+@[\w\-]+\.[\w.\-]+/g;
const PHONE_RE = /(?<![\d@])(?:\+?91[\s-]?|0)?(?:1600[\s-]?\d{2,3}[\s-]?\d{3,4}|[6-9]\d{4}[\s-]?\d{5})(?!\d)/g;
const ACCT_CTX = /(?:a\/c|acct|account|खाता)[^\d\n]{0,15}$/i;

/** Client-side, before any network call. Keeps UPI IDs, URLs, amounts, bank a/c numbers (needed for the check). */
export function redact(input: string): { redacted: string; report: RedactReport } {
  const report: RedactReport = { phone: 0, email: 0, id: 0, otp: 0, senders: 0, kept: ['UPI IDs', 'links', 'amounts', 'bank account numbers'], phones: [] };
  let text = input.replace(/\r\n/g, '\n');

  // 1. chat-export sender names -> Sender A/B/C
  const names = new Map<string, string>();
  text = text.split('\n').map((line) => {
    const m = HEADER_RE.exec(line);
    if (!m) return line;
    const n = m[2].trim();
    if (/^Sender [A-Z]\d?$/.test(n)) return line;
    if (!names.has(n)) { const i = names.size; names.set(n, `Sender ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`); }
    return `${m[1]}${names.get(n)}: ${m[3]}`;
  }).join('\n');
  report.senders = names.size;

  // 2. protect URLs and UPI IDs from the regexes below (emails first so "a@b.com" isn't read as UPI)
  const kept: string[] = [];
  const hold = (s: string) => `\uE000${kept.push(s) - 1}\uE001`;
  text = text.replace(URL_RE, hold);
  text = text.replace(EMAIL_RE, () => { report.email++; return '[EMAIL]'; });
  text = text.replace(UPI_RE, hold);

  // 3. OTP-like codes near the word OTP
  text = text.replace(/((?:otp|ओटीपी)[^\d\n]{0,20})(\d{4,6})(?!\d)/gi, (_, a) => { report.otp++; return `${a}[OTP]`; });
  text = text.replace(/(?<!\d)(\d{4,6})(?!\d)(?=[^\n]{0,12}(?:is|hai|है)?[^\n]{0,8}(?:otp|ओटीपी))/gi, () => { report.otp++; return '[OTP]'; });

  // 4. Aadhaar-like: grouped 4-4-4, or 12 digits right after the word aadhaar
  text = text.replace(/(?<!\d)\d{4}[\s-]\d{4}[\s-]\d{4}(?!\d)/g, () => { report.id++; return '[ID]'; });
  text = text.replace(/((?:aadh?aa?r|आधार)[^\d\n.]{0,15})(\d{12})(?!\d)/gi, (_, a) => { report.id++; return `${a}[ID]`; });

  // 5. phones (skip numbers that are clearly bank a/c numbers); record only the 1600-series class
  text = text.replace(PHONE_RE, (m, offset: number, whole: string) => {
    if (ACCT_CTX.test(whole.slice(Math.max(0, offset - 20), offset))) return m;
    report.phone++;
    report.phones.push({ is1600: /^(?:\+?91[\s-]?|0)?1600/.test(m) });
    return '[PHONE]';
  });

  text = text.replace(/\uE000(\d+)\uE001/g, (_, i) => kept[+i]);
  return { redacted: text, report };
}
