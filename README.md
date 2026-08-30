# Phia Circle

AI-powered fashion discovery: swipe to learn taste, chat to style, and share carts and boards with your circle.

**Live app:** [https://phia-circle.vercel.app](https://phia-circle.vercel.app)  
**Source:** [github.com/AkritiAgarwal09/Phiahack](https://github.com/AkritiAgarwal09/Phiahack)

Built as a hackathon product (Phia Hack 2026): Vite frontend on Vercel, auth/data/AI on Supabase, Gemini for the concierge.

## Start here (code sample)

These files are the product logic, not UI scaffold:

| File | What it does |
|---|---|
| [`src/lib/predictiveEngine.ts`](src/lib/predictiveEngine.ts) | Six in-browser recommendation heuristics (next-buy, occasions, budget, style drift, complete-the-look, viral/circle trends) |
| [`supabase/functions/ai-concierge/index.ts`](supabase/functions/ai-concierge/index.ts) | Streaming Gemini concierge that returns structured outfit cards |
| [`src/lib/googleIdentity.ts`](src/lib/googleIdentity.ts) | Google ID-token sign-in that returns to `/auth` (not `supabase.co`) |
| [`src/pages/SwipeStudio.tsx`](src/pages/SwipeStudio.tsx) + [`src/services/swipeService.ts`](src/services/swipeService.ts) | Swipe loop that writes style DNA |

`src/components/ui/` is shadcn/Radix primitives. Skip it unless you are looking at styling.

---

## Overview

Phia Circle is a full-stack fashion commerce demo. It targets four discovery problems:

| Problem | What the app does |
|---------|-------------------|
| Discovery overload | Swipe Studio builds a style profile from likes, skips, and saves |
| No style memory | Persistent profile plus concierge memory chips |
| Isolated shopping | Shared carts, mood boards, and a public discover feed |
| Random promotions | Client-side predictors rank deals by occasion and budget |

Six predictive models run **in the browser** over the local catalog and engagement rows. Gemini is used only for the conversational concierge.

---

## Architecture

```
React SPA (Vite)  →  Vercel
  pages / components / Zustand stores / TanStack Query
  services (swipe, boards, carts, points, …)
  predictiveEngine + styleProfile   (no extra ML service)

Supabase
  Postgres + RLS
  Auth (email/password + Google ID token)
  Edge Functions: ai-concierge (SSE), ai-style-summary

Gemini  ←  API keys stored as Supabase secrets (not in Vercel)
```

**Why this split:** Vercel only serves the static app. Login, tables, and AI HTTP stay on Supabase. Google Cloud is not a host — it only issues the OAuth client for “Sign in with Google.”

---

## Tech stack

| Layer | Technology |
|-------|------------|
| App | React 18, TypeScript, Vite 5, Tailwind, shadcn/ui |
| State | TanStack Query, Zustand |
| Backend | Supabase (Postgres, Auth, Edge Functions) |
| AI | Gemini `gemini-2.5-flash` via Google’s OpenAI-compatible API |
| Hosting | Vercel (frontend) |

---

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A Google OAuth **Web** client (for Google sign-in)
- Gemini API keys stored as Supabase secrets (not in `.env`)

### Install

```bash
git clone https://github.com/AkritiAgarwal09/Phiahack.git
cd Phiahack
npm install
cp .env.example .env
```

Fill `.env` from `.env.example`. Never commit `.env`.

### Database and functions

1. Create a Supabase project.
2. Run the SQL in `supabase/migrations/` (or `supabase/bootstrap_new_project.sql` if you are bootstrapping a new project).
3. Deploy functions and set Gemini secrets:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy ai-concierge --no-verify-jwt
npx supabase functions deploy ai-style-summary --no-verify-jwt
npx supabase secrets set GEMINI_API_KEY=AIza...
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

Google Cloud must allow:

- Origin: `http://localhost:8080`
- Redirect: `http://localhost:8080/auth`

### Checks

```bash
npm run lint
npm test
npm run build
```

---

## Environment variables

Frontend (`.env` and Vercel project settings):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

`VITE_SUPABASE_PUBLISHABLE_KEY` is the anon/publishable key (safe in the browser). Privileged work goes through RLS or Edge Functions.

Gemini keys (`GEMINI_API_KEY`, optional `_2` / `_3`) belong only in [Supabase function secrets](https://supabase.com/dashboard/project/_/settings/functions).

---

## Production (Vercel)

The frontend is deployed from this GitHub repo. After the first deploy:

1. Set the four `VITE_*` variables on Vercel and redeploy if you added them late.
2. In Supabase Auth URL config, add `https://phia-circle.vercel.app/auth` and `https://phia-circle.vercel.app/**`.
3. In Google Cloud, add origin `https://phia-circle.vercel.app` and redirect `https://phia-circle.vercel.app/auth`.

`vercel.json` rewrites all routes to `index.html` so `/auth` and `/app` work after Google redirects.

---

## Predictive engine (summary)

`src/lib/predictiveEngine.ts` scores the local catalog from engagement, wishlist, and recents. There is no embedding model and no extra latency.

- **Next-buy** — category/tag weights → top 12 with a budget ceiling  
- **Occasions** — calendar events → tag-mapped products  
- **Budget-smart** — sale sensitivity from wishlist:purchase ratio  
- **Style progression** — tribe drift between first and second half of history  
- **Complete the look** — complement tags around an anchor item  
- **Circle / viral** — boost platform trending by overlap with the user  

Style tribes: Quiet Luxury, Clean Girl, Downtown Vintage, Soft Femme, Street Utility, Resort Minimal.

---

## AI concierge

1. The client POSTs history + memory chips to `/functions/v1/ai-concierge`.
2. The function calls Gemini and streams SSE.
3. Structured ` ```cards ` blocks are parsed in `src/lib/conciergeCards.ts` into product carousels.

---

## License

MIT. See [LICENSE](LICENSE). How to contribute: [CONTRIBUTING.md](CONTRIBUTING.md).
