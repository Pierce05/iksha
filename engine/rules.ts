import type { Header, Ledger, LedgerItem, Message, NextStep, Signals, Situation, Stage, TimelineEntry, Forgeability, Label } from '../contracts/types';
import { CARD_TEXT, STAGES, STAGE_REASON, type FindingText } from './cards';
import { extractSignals } from './signals';

const has = (s: Signals, ...c: (keyof Signals['phrases'])[]) => c.some((k) => (s.phrases[k]?.length ?? 0) > 0);
const item = (id: string, card: string, label: Label, forgeability: Forgeability, t: FindingText): LedgerItem => ({
  id, card, label, forgeability, title_hi: t.title_hi, title_en: t.title_en, why_hi: t.why_hi, why_en: t.why_en,
  source: t.source, ...(t.settle_en ? { settle_en: t.settle_en, settle_hi: t.settle_hi } : {}),
});

export interface CheckOpts { timeline?: TimelineEntry[]; sebi_check?: 'VERIFIED' | 'NOT_FOUND' | 'UNSURE' }

/** Rules-only ledger. Also the offline / LLM-down fallback. Deterministic. */
export function checkRules(s: Signals, situation: Situation, opts: CheckOpts = {}): Ledger {
  const hard: LedgerItem[] = [], cant: LedgerItem[] = [], easy: LedgerItem[] = [];
  const T = CARD_TEXT;

  // P1: IPO talk + payment to a third party
  if (has(s, 'ipo') && s.paymentAsk) hard.push(item('p1_ipo_upi', 'P1_IPO_UPI', 'CONTRADICTED', 'hard', T.P1_IPO_UPI));
  // P3: claims SEBI names as warning signs
  if (has(s, 'institutional') || (has(s, 'guaranteed') && has(s, 'ipo', 'profit_claim', 'broker_adv')))
    hard.push(item('p3_sebi_named_claims', 'P3_SEBI_NAMED_CLAIMS', 'CONTRADICTED', 'hard', T.P3_SEBI_NAMED_CLAIMS));
  // P4: fee to withdraw
  if (has(s, 'withdrawal_fee')) hard.push(item('p4_withdrawal_fee', 'P4_WITHDRAWAL_FEE', 'CONTRADICTED', 'hard', T.P4_WITHDRAWAL_FEE));
  // P7 hard flags
  if (s.apk) hard.push(item('p7_apk', 'P7_APK', 'CONTRADICTED', 'hard', T.P7_APK));
  if (s.remoteAccess) hard.push(item('p7_remote', 'P7_REMOTE', 'CONTRADICTED', 'hard', T.P7_REMOTE));
  // P5: channel / 1600 series
  if (has(s, 'call_claim')) {
    if (s.phones.some((p) => !p.is1600)) hard.push(item('p5_channel_call', 'P5_CHANNEL_CALL', 'CONTRADICTED', 'hard', T.P5_CHANNEL_CALL));
    else if (!s.phones.length) cant.push(item('p5_channel_call_unseen', 'P5_CHANNEL_CALL', 'COULDNT_VERIFY', 'hard', T.P5_CHANNEL_CALL_UNSEEN));
  }
  // P2: payee. Never VERIFIED by the engine; only the user's own SEBI Check confirmation can add that (below).
  if (s.payee && has(s, 'ipo', 'broker_adv', 'profit_claim', 'firm_claim', 'guaranteed', 'institutional', 'vip')) {
    cant.push(s.payee.type === 'validated_pattern'
      ? item('p2_payee_format_only', 'P2_BROKER_PAYMENT', 'COULDNT_VERIFY', 'hard', T.P2_PAYEE_FORMAT_ONLY)
      : item('p2_payee_unverified', 'P2_BROKER_PAYMENT', 'COULDNT_VERIFY', 'hard', T.P2_PAYEE_UNVERIFIED));
  }
  // P6: identity vs channel. A quoted reg number is ALWAYS "easy to fake", never a positive finding.
  const firmNamed = s.regNumbers.length > 0 || has(s, 'firm_claim');
  if (firmNamed) {
    easy.push(item('p6_reg_easy', 'P6_IDENTITY_VS_CHANNEL', 'COULDNT_VERIFY', 'easy', T.P6_REG_EASY));
    if (s.payee || s.urls.length || s.phones.length || has(s, 'call_claim'))
      cant.push(item('p6_identity_channel', 'P6_IDENTITY_VS_CHANNEL', 'COULDNT_VERIFY', 'hard', T.P6_IDENTITY_CHANNEL));
  }
  if (s.urls.some((u) => u.flags.some((f) => f === 'shortener' || f === 'lookalike' || f === 'non_https')))
    cant.push(item('p6_url_flags', 'P6_IDENTITY_VS_CHANNEL', 'COULDNT_VERIFY', 'hard', T.P6_URL_FLAGS));
  // P7 easy: screens/testimonials
  if (has(s, 'testimonial') || (has(s, 'profit_claim') && (s.apk || s.paymentAsk)))
    easy.push(item('p7_fake_env', 'P7_FAKE_ENVIRONMENT', 'COULDNT_VERIFY', 'easy', T.P7_FAKE_ENV));

  // User-confirmed SEBI Check hand-off (§7.5): a separate, clearly-labelled line. SACH never sees SEBI's response.
  const sc = opts.sebi_check;
  if (sc === 'VERIFIED' || sc === 'NOT_FOUND') {
    const found = sc === 'VERIFIED';
    hard.push({
      id: 'sebi_check_user', card: 'P2_BROKER_PAYMENT', label: found ? 'VERIFIED' : 'CONTRADICTED', forgeability: 'hard',
      title_en: found ? 'Confirmed by you on SEBI Check' : 'You did not find it on SEBI Check', title_hi: found ? 'आपने SEBI Check पर पुष्टि की' : 'आपको यह SEBI Check पर नहीं मिला',
      why_en: found ? 'You told us you found this on SEBI Check. SACH did not see the result. A listing shows the firm exists; still make sure this chat is really that firm.' : 'You told us you could not find this on SEBI Check. SACH did not see the result.',
      why_hi: found ? 'आपने बताया कि यह SEBI Check पर मिला। SACH ने नतीजा नहीं देखा। सूची में होने का मतलब कंपनी है; फिर भी पक्का करें कि यह चैट सच में उसी कंपनी की है।' : 'आपने बताया कि यह SEBI Check पर नहीं मिला। SACH ने नतीजा नहीं देखा।',
      source: T.P2_PAYEE_UNVERIFIED.source,
    });
  }

  const items = [...hard, ...cant, ...easy];
  const stage = overallStage(s, opts.timeline);
  const header: Header = s.length < 20 && !items.length ? 'CANT_VERIFY'
    : items.some((i) => i.label === 'CONTRADICTED') ? 'HIGH_CONCERN'
    : items.length ? 'MIXED_SIGNALS' : 'LOW_CONCERN';

  return {
    schema_version: 1, mode: 'rules_only', header, action_requested: actionRequested(s), items, stage,
    ...(opts.timeline && opts.timeline.length > 1 ? { timeline: opts.timeline } : {}),
    next_steps: nextSteps(situation, !!s.payee), payee: s.payee, situation,
    privacy: { on_device: ['redaction', 'extraction', 'rules'], sent: [], to: 'nobody (rules ran on this device)', stored: 'none' },
  };
}

export function nextSteps(sit: Situation, hasPayee: boolean): NextStep[] {
  switch (sit) {
    case 'PREVENTION': return ['stop_payment', ...(hasPayee ? ['verify_payee_sebi_check' as const] : []), 'ask_trusted_person'];
    case 'ATTEMPTED': return ['dont_engage', 'report_i4c_and_telecom', 'keep_screenshots', 'ask_trusted_person'];
    case 'PAID': return ['already_paid_flow', 'call_1930', 'report_cybercrime', 'tell_bank', 'report_scores', 'keep_screenshots'];
    case 'ONGOING': return ['stop_paying', 'dont_pay_withdrawal_fee', 'call_1930', 'already_paid_flow'];
  }
}

const fmtINR = (n: number) => { const s = String(Math.round(n)); const l3 = s.slice(-3), r = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ','); return '₹' + (r ? r + ',' + l3 : l3); };
function actionRequested(s: Signals): Ledger['action_requested'] {
  const amount = s.askAmount, dl = s.deadlines.length > 0, sec = has(s, 'secrecy');
  const who_en = s.payee ? ({ personal_style: 'a personal-style UPI ID', validated_pattern: 'a UPI ID', unknown: s.payee.kind === 'account' ? 'a bank account' : 'a UPI ID' } as const)[s.payee.type] : '';
  const who_hi = s.payee ? ({ personal_style: 'किसी के निजी UPI पर', validated_pattern: 'एक UPI ID पर', unknown: s.payee.kind === 'account' ? 'एक बैंक खाते में' : 'एक UPI ID पर' } as const)[s.payee.type] : '';
  let en: string, hi: string;
  if (has(s, 'withdrawal_fee') && !s.payee) { en = `Pay a fee or tax${amount ? ' of ' + fmtINR(amount) : ''} to withdraw your money`; hi = `अपना पैसा निकालने के लिए${amount ? ' ' + fmtINR(amount) : ''} फ़ीस या टैक्स भरें`; }
  else if (s.paymentAsk) { en = `Send ${amount ? fmtINR(amount) + ' ' : 'money '}${who_en ? 'to ' + who_en : ''}${has(s, 'ipo') ? ' for IPO allotment' : ''}`.trim(); hi = `${amount ? fmtINR(amount) + ' ' : 'पैसे '}${who_hi || 'भेजें'}${has(s, 'ipo') ? ' (IPO अलॉटमेंट के लिए)' : ''}${who_hi ? ' भेजें' : ''}`.trim(); }
  else if (s.apk || s.remoteAccess) { en = 'Install an app from a link in the chat'; hi = 'चैट के लिंक से ऐप इंस्टॉल करें'; }
  else return { text_en: 'No payment request found in what you shared', text_hi: 'आपके भेजे संदेश में पैसे भेजने की कोई माँग नहीं मिली', amount: null, deadline: false, secrecy: false };
  if (dl) { en += ', today'; hi += ', आज ही'; }
  if (sec) { en += '; keep it secret'; hi += '; किसी को न बताएँ'; }
  return { text_en: en + '.', text_hi: hi + '।', amount, deadline: dl, secrecy: sec };
}

// ---- stages (§7.6): rules choose; the LLM may only word the "because" ----
export function stageOf(s: Signals): { index: 1 | 2 | 3 | 4 | 5; reasons: string[] } | null {
  if (has(s, 'withdrawal_fee')) return { index: 5, reasons: ['withdrawal_fee'] };
  if (s.paymentAsk) return { index: 4, reasons: ['payment_ask'] };
  if (has(s, 'testimonial') || s.apk || (has(s, 'profit_claim') && s.urls.length)) return { index: 3, reasons: ['fake_proof'] };
  if (has(s, 'tip_call')) return { index: 2, reasons: ['expert_call'] };
  if (has(s, 'guaranteed', 'insider', 'institutional', 'join', 'free_tips', 'vip')) return { index: 1, reasons: ['hook'] };
  return null;
}
function overallStage(s: Signals, tl?: TimelineEntry[]): Stage | null {
  const prog = tl && tl.length > 1 ? tl.map((t) => t.stage) : undefined;
  const top = prog ? Math.max(0, ...prog.map((x) => x ?? 0)) : 0;
  const w = prog && top ? { index: top as 1 | 2 | 3 | 4 | 5, reasons: [top === 5 ? 'withdrawal_fee' : top === 4 ? 'payment_ask' : top === 3 ? 'fake_proof' : top === 2 ? 'expert_call' : 'hook'] } : stageOf(s);
  if (!w) return null;
  const st = STAGES[w.index], r = STAGE_REASON[w.reasons[0]];
  return { index: w.index, name: st.name, name_hi: st.hi, name_en: st.en,
    because_en: `This looks like the "${st.en.toLowerCase()}" stage because ${r.en}.`,
    because_hi: `यह "${st.hi}" वाले चरण जैसा लगता है क्योंकि ${r.hi}।`, ...(prog ? { progression: prog } : {}) };
}

export function buildTimeline(msgs: Message[], lang: 'hi' | 'en' = 'hi'): TimelineEntry[] {
  let seenAsk = false;
  return msgs.map((m) => {
    const sg = extractSignals(m.text, lang);
    const st = stageOf(sg);
    const transition = !seenAsk && sg.paymentAsk;
    if (sg.paymentAsk) seenAsk = true;
    return { sender: m.sender, snippet: m.text.replace(/\s+/g, ' ').slice(0, 80), stage: st?.index ?? null, is_payment_ask: sg.paymentAsk, is_transition: transition };
  });
}
