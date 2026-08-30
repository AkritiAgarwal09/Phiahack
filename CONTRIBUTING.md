# Contributing

## Workflow

1. Create a branch from `main` (`feature/…`, `fix/…`, or `chore/…`).
2. Keep the change focused — one concern per pull request.
3. Run checks locally before you open a PR:

```bash
npm ci
npm run lint
npm test
npm run build
```

4. Open a pull request into `main` that explains **what** changed, **why**, and **how you tested it**.

Do not push generated files, `.env`, API keys, or editor junk.

## Secrets

Frontend keys go in `.env` locally and in the Vercel project settings in production. Gemini keys stay in Supabase Edge Function secrets. Never commit either.

## Where to change code

| Area | Start here |
|---|---|
| Recommendation heuristics | `src/lib/predictiveEngine.ts` |
| AI concierge | `supabase/functions/ai-concierge/index.ts` |
| Google sign-in | `src/lib/googleIdentity.ts` |
| Swipe discovery | `src/pages/SwipeStudio.tsx`, `src/services/swipeService.ts` |
| Product catalog | `src/data/shopProducts.ts` |
