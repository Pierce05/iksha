import type { HandleType, Lang, Payee, PhraseClass, RedactReport, Signals, UrlSignal } from '../contracts/types';
import { BRANDS, DEADLINE_RE, PAY_VERB, PHRASES, PSP_SUFFIXES, REMOTE_RE } from './phrases';
import { UPI_RE } from './redact';

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd|t\.me|wa\.me)\/[^\s<>"']+/gi;
const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'rb.gy', 'is.gd']);

export function handleType(upi: string): HandleType {
  const u = upi.toLowerCase();
  if (/\.(?:brk|mf)@valid[a-z]+$/.test(u)) return 'validated_pattern'; // [VERIFY exact format on SEBI page]
  const [local, suffix] = u.split('@');
  if (/^\d{8,12}$/.test(local) || PSP_SUFFIXES.has(suffix)) return 'personal_style';
  return 'unknown';
}

function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const registrable = (host: string) => { const p = host.split('.'); return /^(?:co|gov|org|ac)$/.test(p[p.length - 2] ?? '') ? p.slice(-3).join('.') : p.slice(-2).join('.'); };

export function analyseUrl(raw: string): UrlSignal {
  const url = raw.replace(/[.,;:!?)\u0964]+$/, '');
  const host = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[\/?#]/)[0].toLowerCase();
  const flags: UrlSignal['flags'] = [];
  if (SHORTENERS.has(host)) flags.push('shortener');
  if (/^(?:t\.me|wa\.me)$/.test(host)) flags.push('messaging_invite');
  if (/\.apk(?:$|[?#])/i.test(url)) flags.push('apk');
  if (/^http:\/\//i.test(url)) flags.push('non_https');
  const reg = registrable(host);
  const official = Object.values(BRANDS).some((ds) => ds.includes(reg));
  if (!official && !flags.includes('messaging_invite') && !flags.includes('shortener')) {
    const label = reg.split('.')[0].replace(/-/g, '');
    for (const brand of Object.keys(BRANDS))
      if (host.replace(/[-.]/g, '').includes(brand) || (label.length >= 5 && lev(label, brand) <= 1)) { flags.push('lookalike'); break; }
  }
  return { url, host, flags };
}

const sentences = (t: string) => t.split(/(?:[.!?\u0964]+(?=\s|$)|\n)+/).map((s) => s.trim()).filter(Boolean);
function parseAmount(num: string, unit?: string): number {
  let n = parseFloat(num.replace(/,/g, ''));
  const u = (unit ?? '').toLowerCase();
  if (u === 'k') n *= 1e3; else if (/^(?:l|lakh|lac)$/.test(u)) n *= 1e5; else if (/^(?:cr|crore)$/.test(u)) n *= 1e7;
  return n;
}
function amountsIn(t: string): number[] {
  const out: number[] = [];
  for (const m of t.matchAll(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s?(k|lakh|lac|l|cr|crore)?\b/gi)) out.push(parseAmount(m[1], m[2]));
  for (const m of t.matchAll(/(?<![\d,.])([\d,]{3,}(?:\.\d+)?)\s*(?:rs\b\.?|rupees|रुपये|रुपए|\/-)/gi)) out.push(parseAmount(m[1]));
  return out.filter((n) => Number.isFinite(n) && n > 0);
}

export function extractSignals(redacted: string, lang: Lang, report?: Pick<RedactReport, 'phones'>): Signals {
  const text = redacted;
  const upiIds = [...new Set([...text.matchAll(UPI_RE)].map((m) => m[0]))];
  const accounts = [...new Set([...text.matchAll(/(?:a\/c|acct|account|खाता)[^\d\n]{0,15}(\d{9,18})/gi)].map((m) => m[1]))];
  const ifsc = [...new Set(text.match(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g) ?? [])];
  const payee: Payee | null = upiIds.length ? { value: upiIds[0], type: handleType(upiIds[0]), kind: 'upi' }
    : accounts.length ? { value: accounts[0], type: 'unknown', kind: 'account' } : null;

  const urls = [...new Set(text.match(URL_RE) ?? [])].map(analyseUrl);
  const regNumbers = [...new Set(text.match(/\bIN[A-Z]\d{9}\b/g) ?? [])]; // [VERIFY format]; extracted only, never "valid"

  const phrases: Signals['phrases'] = {};
  for (const [cls, res] of Object.entries(PHRASES) as [PhraseClass, RegExp[]][]) {
    const hits: string[] = [];
    for (const re of res) { const m = re.exec(text); if (m) hits.push(m[0].slice(0, 60)); }
    if (hits.length) phrases[cls] = hits;
  }
  const deadlines = DEADLINE_RE.flatMap((re) => [...text.matchAll(new RegExp(re.source, re.flags))].map((m) => m[0]));

  const amounts = amountsIn(text);
  const askSentences = sentences(text).filter((s) => (PAY_VERB.test(s) || new RegExp(UPI_RE.source).test(s)) && amountsIn(s).length);
  const askAmount = askSentences.length ? amountsIn(askSentences[askSentences.length - 1])[0] : null;

  const apk = urls.some((u) => u.flags.includes('apk')) || /\.apk\b/i.test(text);
  const paymentAsk = upiIds.length > 0 || accounts.length > 0 || (amounts.length > 0 && PAY_VERB.test(text));
  const platform = /t\.me|telegram/i.test(text) ? 'telegram' : /wa\.me|whatsapp/i.test(text) ? 'whatsapp' : 'unknown';

  return { lang, length: text.length, upiIds, accounts, ifsc, payee, urls, regNumbers, amounts, askAmount, deadlines,
    phrases, remoteAccess: REMOTE_RE.test(text), apk, paymentAsk, phones: report?.phones ?? [], platform };
}
