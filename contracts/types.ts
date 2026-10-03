// SACH contract (PRD §8/§9/§17.2). Frozen: change only by PR reviewed by both A and B.
export type Lang = 'hi' | 'en';
export type Label = 'VERIFIED' | 'CONTRADICTED' | 'COULDNT_VERIFY' | 'AI_INTERPRETATION';
export type Forgeability = 'hard' | 'easy';
export type Header = 'HIGH_CONCERN' | 'MIXED_SIGNALS' | 'LOW_CONCERN' | 'CANT_VERIFY';
export type Situation = 'PREVENTION' | 'ATTEMPTED' | 'PAID' | 'ONGOING';
export type StageName = 'HOOK' | 'TRUST_BUILDING' | 'FAKE_PROOF' | 'DEPOSIT_PUSH' | 'WITHDRAWAL_BLOCKED';
export type HandleType = 'validated_pattern' | 'personal_style' | 'unknown';
export type NextStep =
  | 'stop_payment' | 'verify_payee_sebi_check' | 'ask_trusted_person'
  | 'dont_engage' | 'report_i4c_and_telecom' | 'keep_screenshots'
  | 'already_paid_flow' | 'call_1930' | 'report_cybercrime' | 'tell_bank' | 'report_scores'
  | 'stop_paying' | 'dont_pay_withdrawal_fee';

export type PhraseClass =
  | 'guaranteed' | 'insider' | 'institutional' | 'secrecy' | 'vip' | 'withdrawal_fee'
  | 'profit_claim' | 'testimonial' | 'ipo' | 'broker_adv' | 'call_claim' | 'firm_claim'
  | 'tip_call' | 'join' | 'free_tips';

export interface Source { name: string; url: string; date: string; verified: boolean } // verified=false => [VERIFY] still open
export interface Payee { value: string; type: HandleType; kind: 'upi' | 'account' }

export interface LedgerItem {
  id: string;
  card: string;                 // process card id, e.g. "P1_IPO_UPI", or "AI"
  label: Label;
  forgeability: Forgeability;
  title_hi: string; title_en: string;
  why_hi: string; why_en: string;
  source?: Source;              // required unless label = AI_INTERPRETATION
  settle_hi?: string; settle_en?: string; // "Isse kaise pata chalega" (required for COULDNT_VERIFY)
  rephrased_by_ai?: boolean;    // true only if the LLM reworded why_*; the finding itself is always rules-made
}

export interface TimelineEntry { sender: string; snippet: string; stage: number | null; is_payment_ask: boolean; is_transition: boolean }
export interface Stage {
  index: 1 | 2 | 3 | 4 | 5; name: StageName; name_hi: string; name_en: string;
  because_hi: string; because_en: string; progression?: (number | null)[];
}
export interface Privacy { on_device: string[]; sent: string[]; to: string; stored: 'none' }

export interface Ledger {
  schema_version: 1;
  mode: 'rules_only' | 'llm';
  header: Header;
  action_requested: { text_hi: string; text_en: string; amount: number | null; deadline: boolean; secrecy: boolean };
  items: LedgerItem[];
  stage: Stage | null;
  timeline?: TimelineEntry[];
  next_steps: NextStep[];
  payee: Payee | null;
  situation: Situation;
  privacy: Privacy;
}

export interface UrlSignal { url: string; host: string; flags: Array<'shortener' | 'apk' | 'non_https' | 'lookalike' | 'messaging_invite'> }
export interface RedactReport {
  phone: number; email: number; id: number; otp: number; senders: number;
  kept: string[];               // what was deliberately NOT redacted (needed for the check)
  phones: { is1600: boolean }[]; // phone VALUES never leave the device; only this class flag does
}
export interface Signals {
  lang: Lang; length: number;
  upiIds: string[]; accounts: string[]; ifsc: string[]; payee: Payee | null;
  urls: UrlSignal[]; regNumbers: string[];
  amounts: number[]; askAmount: number | null; deadlines: string[];
  phrases: Partial<Record<PhraseClass, string[]>>;
  remoteAccess: boolean; apk: boolean; paymentAsk: boolean;
  phones: { is1600: boolean }[];
  platform: 'whatsapp' | 'telegram' | 'unknown';
}
export interface Message { index: number; sender: string; time?: string; text: string }
export interface Incident {
  date: string; amount: number | null; payee: string | null; urls: string[]; claim_en: string; claim_hi: string;
  platform: string; reg_numbers_quoted: string[]; situation: Situation;
}
export interface CheckRequest { redacted_text: string; signals?: Partial<Signals>; situation: Situation; lang: Lang; sebi_check?: 'VERIFIED' | 'NOT_FOUND' | 'UNSURE' }
