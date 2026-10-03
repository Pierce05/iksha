import type { Incident, Lang, Ledger, Signals } from '../contracts/types';

/** Trust card (§7.8): pre-written message for a trusted person. No contact access; share via WhatsApp intent. */
export function buildTrustCard(l: Ledger, lang: Lang): string {
  const a = l.action_requested;
  const top = l.items.find((i) => i.label === 'CONTRADICTED') ?? l.items.find((i) => i.label !== 'AI_INTERPRETATION');
  const finding = top ? (lang === 'hi' ? top.title_hi : top.title_en) : null;
  if (lang === 'hi') {
    return `मुझे यह निवेश वाला संदेश आया है। वे मुझसे कह रहे हैं: ${a.text_hi}${finding ? ` SACH ने यह देखा: ${finding}।` : ''} क्या आप मेरे साथ इसे देख सकते हो, पैसे भेजने से पहले?`;
  }
  return `I got this investment message. They are asking me to: ${a.text_en}${finding ? ` SACH noticed: ${finding}.` : ''} Can you look at it with me before I send any money?`;
}
export const waShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** Incident summary (§7.7). `today` is injected so the function stays pure. */
export function buildIncident(l: Ledger, s: Signals, today = ''): Incident {
  return {
    date: today, amount: l.action_requested.amount, payee: l.payee?.value ?? null, urls: s.urls.map((u) => u.url),
    claim_en: l.action_requested.text_en, claim_hi: l.action_requested.text_hi,
    platform: s.platform === 'unknown' ? 'not sure' : s.platform, reg_numbers_quoted: s.regNumbers, situation: l.situation,
  };
}
export function incidentToText(i: Incident, lang: Lang): string {
  const L = lang === 'hi'
    ? ['घटना का सार', 'तारीख', 'रकम', 'जिसे पैसे भेजे/भेजने थे', 'लिंक', 'दावा', 'प्लेटफ़ॉर्म', 'बताए गए रजिस्ट्रेशन नंबर (जाँचे नहीं गए)']
    : ['Incident summary', 'Date', 'Amount', 'Payee', 'Links', 'Claim', 'Platform', 'Registration numbers quoted (not verified)'];
  return [L[0], `${L[1]}: ${i.date || '—'}`, `${L[2]}: ${i.amount ? '₹' + i.amount : '—'}`, `${L[3]}: ${i.payee ?? '—'}`,
    `${L[4]}: ${i.urls.join(', ') || '—'}`, `${L[5]}: ${lang === 'hi' ? i.claim_hi : i.claim_en}`, `${L[6]}: ${i.platform}`, `${L[7]}: ${i.reg_numbers_quoted.join(', ') || '—'}`].join('\n');
}
