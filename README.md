# IKSHA · ईक्षा

**Before you send, look. / देखिए, फिर भेजिए।**

A checkpoint for investment messages, built for the SANGYAN Investor Resilience Hackathon 2026 (SNTC IIT BHU with SEBI and NSDL).

- **Live demo:** (https://iksha-ten.vercel.app/welcome.html)
- **Demo video:** [VIDEO_URL_HERE](https://drive.google.com/drive/folders/17xHydNL2Sgl3rt4XVDbtX9iXGpCaYO1D?usp=drive_link)

## What it does

A user pastes or speaks an investment message from WhatsApp or Telegram. IKSHA compares the **process the sender claims** with the **action they ask the user to take** (for example, paying a personal UPI ID for an IPO application), then returns an **Evidence Ledger**.

Each ledger row is labelled `VERIFIED`, `CONTRADICTED`, `COULDN'T VERIFY` or `AI INTERPRETATION`, and tagged **hard to fake** or **easy to fake**. A registration number quoted in a chat is always easy to fake.

IKSHA gives **no score, no percentage and no verdict**. It points the user to official checks: SEBI Check, SEBI SCORES, 1930 and cybercrime.gov.in.

Also included:
- Hindi and English interface
- Voice input and output, where the browser supports it
- The five-stage road (Hook, Trust building, Fake proof or app, Deposit push, Withdrawal blocked or fee)
- An "Already paid?" path
- A trusted-person card
- A privacy receipt generated from the real data flow

## How it works

1. **On the device:** phone numbers, emails, OTPs and ID numbers are redacted. UPI IDs, links and amounts are kept. Signals are extracted, seven process cards run, and the ledger is built by deterministic rules. The core check works offline.
2. **Server (`POST /api/check`):** runs the same rules. An optional LLM step only rewords the explanation and labels it as AI opinion. It cannot add a finding or change a label. It has a 3 second budget and falls back to the rules-only result.
3. **Fallback order:** `/api/check` (3 s) → on-device engine → offline notice.

We do not store user messages.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm ci
cp .env.example .env.local   # optional: add keys for the AI wording step
npm run dev                  # builds the engine bundle, then starts Next.js
```

Open http://localhost:3000. The app works without any API key, in rules-only mode.

Other commands:

```bash
npm test            # engine tests
npm run build       # production build
npm run build:engine  # rebuild public/engine.bundle.js
npm run check:ui    # UI checks
```

## Project layout

| Path | What it is |
| --- | --- |
| `engine/` | Redaction, signal extraction, process cards, rules, chat parser, ledger builder, optional LLM layer |
| `contracts/` | Ledger types and JSON schema (the single source of truth) |
| `app/api/` | `/api/check` and `/api/tts` routes |
| `public/` | The static front end, welcome page and offline engine bundle |
| `scripts/` | Build and check scripts |
| `docs/` | Design and verification notes |

## Third-party components

- Next.js, React, TypeScript, esbuild
- Vercel (hosting)
- Anthropic API (optional wording step; the app runs without it)
- Sarvam text-to-speech (optional; falls back to browser speech synthesis)
- Browser speech recognition and synthesis (Web Speech API)
- Fonts: Mukta, Rozha One, IBM Plex Mono (Google Fonts)

## Limits (honest)

- Reworded pitches can avoid known phrases.
- Messages that exist only as an image can be missed.
- IKSHA cannot confirm who a person really is.
- SEBI Check is a guided hand-off, not a live API.
- Evaluation is in progress; results will be reported with raw counts.
- This is a prototype, not financial advice. IKSHA cannot promise any recovery of money.

## Licence and ownership

Submitted for SANGYAN 2026. Intellectual property terms follow the hackathon rules.
