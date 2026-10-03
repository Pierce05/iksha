# SACH — Situation Check

One Next.js project. `engine/` + `app/api/*` + `contracts/` are Person A's. `public/` (the static app) is Person B's.

## Run locally
    npm install
    cp .env.example .env.local      # optional: add ANTHROPIC_API_KEY. Without it the engine runs rules-only.
    npm run dev                      # http://localhost:3000 (rebuilds public/engine.bundle.js first)
    npm test                         # engine checks (A) + UI checks (B)

## Who edits what
| Folder | Owner |
|---|---|
| `engine/`, `app/api/`, `contracts/`, `fixtures/`, `eval/`, `next.config.mjs` | A |
| `public/` (except `engine.bundle.js`, which is generated), `scripts/check-ui.mjs`, `docs/` | B |

Contract changes: own PR, both review. Branches: `engine/<topic>` (A), `ui/<topic>` (B). Open a PR into `main`; every PR gets a Vercel preview URL.

## Quick API check
    curl -X POST http://localhost:3000/api/check -H "content-type: application/json" --data @scripts/sample-body.json

`public/engine.bundle.js` is generated and git-ignored. `npm run dev` and `npm run build` both rebuild it.
