# CASEFILE

An investigation desk. The player is the detective. The authored case, character knowledge, and scoring stay on the server.

The first file is **The Tide Ledger** / **Մակընթացության մատյանը**: find Elena Voss. The grant books are optional.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first visit creates a guest session. Progress is stored for that browser. Create an account from Profile to keep the same files.

With no `DATABASE_URL`, the app uses embedded PostgreSQL (PGlite) in `.data/pglite` and applies `drizzle/` on startup. If that folder will not open, stop the app and delete `.data/pglite`; the next start creates it again. Guest files live in that database. For a server:

```bash
docker compose up -d
# set DATABASE_URL from .env.example
npm run dev
```

## Demo and live services

| Capability | Without keys | With keys |
| --- | --- | --- |
| Case, interviews, evidence, notes, board, timeline, scoring | Authored demo engine | Same rules |
| Free-text questions | Mapped when the sentence matches a known intent | OpenRouter may map a sentence onto the same allowlist, then phrase only the permitted reply |
| Transcription and spoken replies | Disabled, with the reason shown. Typing still works | Separate `SPEECH_API_KEY` only. OpenRouter text keys are never used for speech |
| Leaderboard | Real rows only. Empty until someone opts in | Same |

### OpenRouter (free-only by default)

1. Create an API key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Set `OPENROUTER_API_KEY` in `.env` (server-side only — never `NEXT_PUBLIC_`).
3. Keep `OPENROUTER_FREE_ONLY=true` and `OPENROUTER_PRIMARY_MODEL=openrouter/free`.
4. Optional: set `OPENROUTER_FALLBACK_MODELS` to explicit free model ids from the live catalog.
5. Set `OPENROUTER_ADMIN_TOKEN` to use diagnostics.

Live AI is used only for short character phrasing and optional free-text intent mapping. Notes, evidence, navigation, comparisons, scores, and discovery stay on the authored engine.

Free-only mode:
- Uses `openrouter/free` and/or catalog-verified zero-price models.
- Sends `provider.max_price` of zero for prompt/completion/request/image.
- Never uses `openrouter/auto` or paid fallbacks.
- Revalidates explicit model ids against `/api/v1/models` pricing metadata (`:free` suffix alone is not enough).
- On failure, quota, or timeout: authored demo replies are used, progress is saved, and the UI states that live AI was unavailable (never pretends a canned line was live).

Diagnostics (admin only):

```bash
npm run openrouter:diag
npm run openrouter:refresh
npm run openrouter:test   # opt-in; consumes free quota
```

Or open `/admin/openrouter` with header `x-casefile-admin: $OPENROUTER_ADMIN_TOKEN`.

Legacy `AI_API_KEY` / `AI_BASE_URL` remain available only when `OPENROUTER_FREE_ONLY=false` and no OpenRouter key is set.

## Auth and case library

Browser players register or sign in at `/auth` before opening a case. Guest browsing of the library is allowed; starting an investigation requires an account. Telegram Mini App players sign in with server-verified `initData` and only confirm a display name and terms—no password.

The archive ships **8 playable cases** with cover images and cast portraits under `public/covers` and `public/portraits` (Unsplash License; see `public/ASSETS.md`). Evidence cards show a one-line summary first; full documents expand on demand. Interviews use short authored replies and optional live rephrasing capped for length.

## Telegram Mini App

The same desk opens in a browser and inside Telegram. Telegram sign-in checks the raw `initData` on the server with the bot token (HMAC-SHA256, key `WebAppData`). Data older than 24 hours is rejected. The browser never stores `initData`, and `initDataUnsafe` is not treated as identity.

### Enable `/start` and Mini App sign-in on Vercel

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. In the Vercel project → **Settings → Environment Variables**, set for Production (and Preview if needed):
   - `TELEGRAM_BOT_TOKEN` — BotFather token
   - `TELEGRAM_WEBHOOK_SECRET` — long random secret you invent
   - `TELEGRAM_BOT_USERNAME` — bot username without `@` (optional but recommended)
   - `APP_URL` — `https://detectivegame-eta.vercel.app` (or your custom domain)
   - Keep `BETTER_AUTH_URL` equal to the same HTTPS origin
3. Redeploy.
4. Register webhook + menu button:

```bash
# with the same env values locally, or:
curl -X POST "https://YOUR_APP/api/admin/telegram" \
  -H "content-type: application/json" \
  -H "x-casefile-admin: $OPENROUTER_ADMIN_TOKEN" \
  -d '{"action":"setup"}'
```

5. In BotFather, set the Mini App / Web App URL to `APP_URL`. Open the bot and send `/start`.

Launch values are only `home`, `case`, `case_tide-ledger`, `daily`, `ref_<code>`, and `link_<code>`. A run id in that value opens nothing private.

```bash
# BotFather: create the bot, set the Mini App URL to APP_URL, and optionally a short name.
# Then, with APP_URL on HTTPS:
npm run telegram:setup
```

`telegram:setup` calls `setWebhook`, `setMyCommands`, and `setChatMenuButton`. The webhook expects `X-Telegram-Bot-Api-Secret-Token`. Openings:

- Menu button and `/start`, `/play`, `/continue` open the Mini App.
- `https://t.me/<bot>?startapp=case` and `https://t.me/<bot>/<short-name>?startapp=daily` pass a start parameter.
- `/settings` turns reminders on or off. Reminders do not describe the case.
- Voice messages sent to the bot are not added to a case.

`CASEFILE_TELEGRAM_DEV=1` shows a labeled mock sign-in outside production. It is refused when `NODE_ENV` is production. Microphone recording uses the WebView `MediaRecorder` when the client allows it. Telegram does not provide a Mini App recording API. If recording is unavailable, the player can type or carry the account to a browser with a one-time code that is not put in a URL.

Deleting an account removes its investigations, notes, and public ranking rows.

## Privacy note (AI)

When live mode is enabled, short prompts (allowed character facts + the player’s line) are sent to OpenRouter and then to the selected free upstream model. Full secret reconstructions are not included in those prompts. Do not log complete conversations by default. Provider data handling is governed by OpenRouter’s terms and the upstream model provider.

## Deploy (Vercel + GitHub)

Repository: [github.com/Lyowww/DetectiveGame](https://github.com/Lyowww/DetectiveGame)

Production: [https://detectivegame-eta.vercel.app](https://detectivegame-eta.vercel.app)

Production needs a real Postgres URL. On Vercel, PGlite (`.data/pglite`) is not durable across serverless instances. This project is linked to Vercel (`detectivegame`) with a Neon store (`casefile-db`) that injects `DATABASE_URL`.

1. Import the GitHub repo in [Vercel](https://vercel.com/new) (or use the linked CLI project).
2. Add a Neon (or other) Postgres store and set `DATABASE_URL` for Production / Preview / Development.
3. Set at least:

| Variable | Notes |
| --- | --- |
| `BETTER_AUTH_SECRET` | Long random secret (required in production) |
| `BETTER_AUTH_URL` | Production origin, e.g. `https://your-app.vercel.app` |
| `APP_URL` | Same HTTPS origin (Telegram / absolute links) |
| `OPENROUTER_API_KEY` | Optional; free-only dialogue when set |
| `OPENROUTER_FREE_ONLY` | `true` |
| `OPENROUTER_PRIMARY_MODEL` | `openrouter/free` |
| `OPENROUTER_ADMIN_TOKEN` | Optional; protects `/admin/openrouter` |

4. Redeploy after env changes. Copy values from `.env.example`; never commit real secrets.

```bash
vercel link --yes --project detectivegame
vercel git connect https://github.com/Lyowww/DetectiveGame.git
vercel env pull   # optional local sync
vercel --prod
```

## Verification

```bash
npm test
npm run lint
npm run build
```

Tests cover solvability, disclosure limits, bluffs, notes, travel comparisons, hidden case text, ownership, idempotent actions, and server-side scores.
