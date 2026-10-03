import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import Ajv from 'ajv';
import type { Ledger, Lang, Situation } from '../contracts/types';
import { checkOffline, redact, buildTrustCard, buildIncident, incidentToText, parseChat, prepare, waShareUrl } from '../engine';
import { runCheck } from '../engine/pipeline';
import { BANNED } from '../engine/llm';

const schema = JSON.parse(readFileSync('contracts/ledger.schema.json', 'utf8'));
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
let fails = 0;
const ok = (c: unknown, m: string) => { if (!c) { fails++; console.error('  FAIL', m); } else console.log('  ok  ', m); };
const strings = (o: unknown): string[] => typeof o === 'string' ? [o] : o && typeof o === 'object' ? Object.values(o).flatMap(strings) : [];
const read = (n: string) => readFileSync(`fixtures/inputs/${n}.txt`, 'utf8');

// golden fixtures: name, input, lang, situation  (also what B renders in mock mode)
const CASES: [string, string, Lang, Situation][] = [
  ['kavita_PREVENTION', 'kavita', 'hi', 'PREVENTION'], ['kavita_hi_PREVENTION', 'kavita_hi', 'hi', 'PREVENTION'],
  ['kavita_PAID', 'kavita', 'hi', 'PAID'], ['kavita_ATTEMPTED', 'kavita', 'en', 'ATTEMPTED'],
  ['praveen_ONGOING', 'praveen', 'hi', 'ONGOING'], ['legit_a_PREVENTION', 'legit_a', 'hi', 'PREVENTION'], ['legit_b_PREVENTION', 'legit_b', 'en', 'PREVENTION'],
];
const L: Record<string, Ledger> = {};
for (const [name, inp, lang, sit] of CASES) {
  console.log(name);
  const led = L[name] = checkOffline(read(inp), lang, sit);
  ok(validate(led), 'matches ledger.schema.json' + (validate.errors ? ' ' + JSON.stringify(validate.errors[0]) : ''));
  const all = strings(led).join('\n') + buildTrustCard(led, 'hi') + buildTrustCard(led, 'en');
  ok(!BANNED.test(all), 'no scam/fraud/safe/score wording anywhere');
  ok(!/people checked|\bchecked by\b/i.test(all), 'no counters / popularity numbers');
  ok(led.items.every((i) => i.label === 'AI_INTERPRETATION' || i.source), 'every item has source or AI tag');
  const g = `fixtures/ledgers/${name}.json`;
  if (process.env.UPDATE || !existsSync(g)) writeFileSync(g, JSON.stringify(led, null, 2) + '\n');
  else ok(JSON.stringify(JSON.parse(readFileSync(g, 'utf8'))) === JSON.stringify(led), 'equals golden ' + g);
}

console.log('behaviour');
const k = L.kavita_PREVENTION, kh = L.kavita_hi_PREVENTION, pv = L.praveen_ONGOING;
const ids = (l: Ledger) => l.items.map((i) => i.id);
ok(k.header === 'HIGH_CONCERN' && ids(k).includes('p1_ipo_upi') && ids(k).includes('p3_sebi_named_claims'), 'Kavita: HIGH, P1+P3 hard findings');
ok(k.items.find((i) => i.id === 'p2_payee_unverified')?.label === 'COULDNT_VERIFY', 'Kavita: payee = couldn\'t verify');
ok(k.items.find((i) => i.id === 'p6_reg_easy')?.forgeability === 'easy', 'Kavita: reg number is easy-to-fake');
ok(k.stage?.index === 4 && k.action_requested.amount === 20000 && k.action_requested.secrecy, 'Kavita: stage 4, ₹20,000, secrecy noted');
ok(kh.header === 'HIGH_CONCERN' && ids(kh).includes('p1_ipo_upi') && ids(kh).includes('p3_sebi_named_claims') && kh.stage?.index === 4, 'Kavita (Devanagari) gives same findings');
ok(k.next_steps.includes('verify_payee_sebi_check') && !L.kavita_PAID.next_steps.includes('verify_payee_sebi_check'), 'situation picker changes next steps');
ok(L.kavita_PAID.next_steps[0] === 'already_paid_flow' && pv.next_steps.includes('dont_pay_withdrawal_fee'), 'PAID/ONGOING next steps');
ok(pv.header === 'HIGH_CONCERN' && ids(pv).includes('p4_withdrawal_fee') && pv.stage?.index === 5, 'Praveen: stage 5 + P4');
ok(JSON.stringify(pv.stage?.progression) === '[1,2,3,4,4,5]' && pv.timeline?.filter((t) => t.is_transition).length === 1, 'Praveen: progression + one transition highlighted: ' + JSON.stringify(pv.stage?.progression));
ok(L.legit_a_PREVENTION.header !== 'HIGH_CONCERN' && L.legit_b_PREVENTION.header !== 'HIGH_CONCERN', 'legit controls not High concern');
ok(L.legit_a_PREVENTION.items.length === 0 && L.legit_b_PREVENTION.items.length === 0 && !L.legit_b_PREVENTION.stage, 'legit controls: no findings, no stage');
for (const l of Object.values(L)) ok(!l.items.some((i) => i.label === 'VERIFIED') , 'engine never emits VERIFIED by itself');
const sc = checkOffline(read('kavita'), 'en', 'PREVENTION', 'VERIFIED');
ok(sc.items.some((i) => i.id === 'sebi_check_user' && i.label === 'VERIFIED') && sc.header === 'HIGH_CONCERN', 'user SEBI Check confirmation = separate line, doesn\'t cancel process mismatch');

console.log('redaction');
const r = redact('Call 9876543210 or a@b.com. OTP is 482913. Aadhaar 1234 5678 9012. a/c 123456789012. pay x.9876543210@ybl at http://x.example.com/a?b=1. 1600123456 se call');
ok(!/9876543210(?!@)|a@b\.com|482913|1234 5678/.test(r.redacted), 'phone/email/OTP/Aadhaar removed');
ok(/x\.9876543210@ybl/.test(r.redacted) && /123456789012/.test(r.redacted) && /http:\/\/x\.example\.com\/a\?b=1/.test(r.redacted), 'UPI, a/c number, URL kept');
ok(r.report.phones.length === 2 && r.report.phones[1].is1600 && !r.report.phones[0].is1600, 'phone class flags kept, values not');
const cr = redact(read('praveen'));
ok(!/Arjun|Meena|Praveen:/.test(cr.redacted) && cr.report.senders === 3 && parseChat(cr.redacted).length === 6, 'chat export senders anonymised, 6 messages parsed');
ok(parseChat('just one paste').length === 1, 'non-export falls back to single message');

console.log('builders');
const tc = buildTrustCard(k, 'hi');
ok(/20,000/.test(tc) && /निजी UPI/.test(tc) && waShareUrl(tc).startsWith('https://wa.me/?text='), 'trust card has facts + WhatsApp URL');
const inc = buildIncident(k, prepare(read('kavita'), 'hi').signals, '2026-10-03');
ok(inc.amount === 20000 && inc.payee?.includes('@okaxis') && /₹20000/.test(incidentToText(inc, 'en')), 'incident summary populated');

console.log('llm layer');
const noLLM = await runCheck({ redacted_text: read('kavita'), situation: 'PREVENTION', lang: 'hi' }, { llm: null });
ok(noLLM.mode === 'rules_only' && noLLM.header === 'HIGH_CONCERN' && noLLM.privacy.sent.length === 1, 'LLM off => rules-only ledger, receipt shows no LLM');
const evil = JSON.stringify({ items: [{ id: 'p1_ipo_upi', why_en: 'This is a scam.', why_hi: 'यह स्कैम है' }, { id: 'p_invented', why_en: 'x', why_hi: 'य' }, { id: 'p3_sebi_named_claims', why_en: 'Reworded plainly.', why_hi: 'आसान शब्दों में।' }],
  ai_items: [{ id: 'ai_urgency', title_en: 'Pressure to act today', title_hi: 'आज ही करने का दबाव', why_en: 'Deadlines push you to skip checking.', why_hi: 'समय की सीमा जाँच से रोकती है।' }, { id: 'ai_secrecy', title_en: 'Safe plan', title_hi: 'x', why_en: 'ok', why_hi: 'ok' }], header: 'LOW_CONCERN' });
const llm = await runCheck({ redacted_text: read('kavita'), situation: 'PREVENTION', lang: 'hi' }, { llm: async () => evil });
ok(llm.mode === 'llm' && llm.header === 'HIGH_CONCERN', 'LLM cannot change header');
ok(llm.items.find((i) => i.id === 'p1_ipo_upi')?.rephrased_by_ai !== true && !llm.items.some((i) => i.id === 'p_invented'), 'banned wording rejected, invented finding dropped');
ok(llm.items.find((i) => i.id === 'p3_sebi_named_claims')?.rephrased_by_ai === true && llm.items.filter((i) => i.label === 'AI_INTERPRETATION').length === 1, 'valid rewording + 1 valid AI item kept, invalid AI item dropped');
ok(validate(llm), 'LLM-merged ledger still matches schema');
const slow = await runCheck({ redacted_text: read('kavita'), situation: 'PREVENTION', lang: 'hi' }, { llm: () => new Promise(() => {}), timeoutMs: 200 });
ok(slow.mode === 'rules_only', 'LLM timeout => rules-only fallback');
const broken = await runCheck({ redacted_text: read('kavita'), situation: 'PREVENTION', lang: 'hi' }, { llm: async () => 'not json' });
ok(broken.mode === 'rules_only', 'LLM garbage => rules-only fallback');

console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0);
