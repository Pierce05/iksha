# Handoff: what B expects from A
- `POST /api/check {redacted_text, signals, situation, lang}` returns a Ledger exactly as `contracts/types.ts`. Header is one of HIGH_CONCERN | MIXED | LOW_CONCERN | CANT_VERIFY.
- Every non-AI item needs `source`; AI items use label AI_INTERPRETATION. A quoted registration number is always `easy`, never VERIFIED (the check script enforces id containing "reg").
- `timeline[]` only for multi-message input. `stage` is null when there is no payment/stage signal.
- `/api/tts {text,lang}` is optional: B falls back to browser speech synthesis.
- Run `node scripts/check.mjs` against A's output fixtures before merging.
