# Phia Circle ✨

> **Your AI-powered personal fashion universe.**
> Swipe to discover. Chat to style. Share to connect.


Live Project URL - https://akriti-phia-hack.lovable.app/

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Service Layer](#service-layer)
- [Predictive Intelligence Engine](#predictive-intelligence-engine)
- [AI Concierge](#ai-concierge)

---

## Overview

Phia Circle is a full-stack AI fashion commerce platform built as a hackathon project. It solves four core problems in fashion discovery:

| Problem | Phia Circle's Answer |
|---------|---------------------|
| **Discovery overload** — endless scrolling with no taste filtering | Swipe Studio builds a real-time style DNA from your interactions |
| **No style memory** — cold-start on every session | Persistent style profile + AI Concierge memory chips |
| **Isolated shopping** — carts and wishlists are private silos | Shared Carts, Mood Boards, and community discovery feeds |
| **Impulse vs intent** — promotions feel random | Predictive engine surfaces deals tuned to your occasion and budget |

The platform's key innovation is running **six client-side predictive models** entirely in the browser — no extra ML infrastructure, no additional latency — while integrating Gemini for the conversational concierge.

---

## Features

### 🤖 AI Concierge
A multi-turn conversational fashion assistant powered by Gemini.

- **Streaming responses** via Supabase Edge Function (Server-Sent Events)
- **Persistent conversation history** — pick up where you left off across sessions
- **Memory chips** — saves your preferences (budget, style, upcoming events) and injects them into every prompt
- **Image upload** — upload an inspiration photo and Phia finds similar styles in the catalog
- **Outfit card rendering** — AI returns structured product sets that render as interactive swipeable cards with total pricing
- **"Hot or Not for Me"** — a 5-card inline swipe mini-session that generates personalised taste insights
- **Proactive nudge chips** — budget alerts, upcoming occasion suggestions, trending picks on the empty state
- **Cross-page Concierge Bridge** — any page can pre-fill a concierge prompt (e.g. Discover's "Style this with Phia" CTA)

### 💫 Swipe Studio
Tinder-style discovery that builds your style profile from engagement signals.

- **Four swipe directions**: right (like), left (skip), up (love), tap (save to board)
- **Swipe reason chips** — after each decision, optionally label why (color, fit, brand, price, style)
- **Real-time DerivedStyle computation** — six profile dimensions updated after every swipe
- **Dynamic deck rebuilding** — deck composition shifts as your taste evolves
- **Undo / history stack** — un-skip any recently skipped card
- **Cluster trending rail** — live feed of products trending in your aesthetic cluster

### 🌍 Discover
Multi-section social discovery powered by AI and community signals.

- Followed activity rail — items being saved by the people you follow
- Cluster trending rail — popular items in your style tribe
- Viral card highlights — items with spiking saves surfaced as featured cards
- Public mood boards gallery
- Upcoming event-aware product suggestions
- "Style this with Phia" bridge to the AI Concierge

### 👤 Style Profile
Your fashion DNA, visualised.

- Top categories, colour palette, aesthetic clusters, price tolerance
- Bold/Minimal and Casual/Formal spectrum scores
- Taste Evolution — shows how your style has shifted over time
- Outfit Builder — assemble complete looks from catalog pieces
- Brand affinity derived from positive swipe and engagement history

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         React SPA (Vite)                              │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐  │
│  │  Pages  │  │Components│  │  Stores  │  │  Hooks  │  │  Lib   │  │
│  │ (12+)   │  │(50+ comps│  │ (Zustand)│  │(React Q)│  │(engine)│  │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  └───┬────┘  │
│       └────────────┴─────────────┴──────────────┘           │        │
│                          Services Layer (16 modules)         │        │
│  ┌────────────────────────────────────────────────┐          │        │
│  │  swipeService · engagementService · moodBoard  │          │        │
│  │  sharedCart · concierge · points · voucher...  │          │        │
│  └────────────────────┬───────────────────────────┘          │        │
│                        │                            predictiveEngine  │
│                        │                            styleProfile      │
│                        │                            predictiveNudges  │
└────────────────────────┼─────────────────────────────────────────────┘
                         │
         ┌───────────────▼───────────────┐
         │         Supabase              │
         │  ┌──────────┐ ┌───────────┐  │
         │  │ Postgres  │ │   Auth    │  │
         │  │ (30+ tbls)│ │(JWT, RLS) │  │
         │  └──────────┘ └───────────┘  │
         │  ┌──────────────────────────┐ │
         │  │    Edge Functions (Deno) │ │
         │  │  ai-concierge (stream)   │ │
         │  │  ai-style-summary        │ │
         │  └──────────────────────────┘ │
         └───────────────────────────────┘
                         │
                  ┌──────▼──────┐
                  │   Gemini    │
                  └─────────────┘
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Bun / Node | Package management and toolchain |
| Build | Vite 5 | HMR dev server, ESM-first bundling |
| UI | React 18 + TypeScript | Strict mode, concurrent features |
| Styling | TailwindCSS 3 + shadcn/ui + Radix | Utility-first + accessible primitives |
| Routing | React Router v6 | Client-side navigation |
| Server State | Tanstack Query (React Query) | Fetching, caching, background sync |
| Client State | Zustand | Cart, memory chips, bridge, recently viewed |
| Database | Supabase Postgres | 30+ tables with Row-Level Security |
| Auth | Supabase Auth | Email/password; JWT in all requests |
| Edge Functions | Supabase Edge Functions (Deno) | Streaming AI endpoint |
| AI | Gemini | Conversational concierge |
| Hosting | Lovable.dev | Managed deploy + Supabase integration |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18 **or** Bun ≥ 1.0
- A [Supabase](https://supabase.com) project (free tier works)
- An [OpenAI](https://platform.openai.com) API key

### 1. Clone & Install

```bash
git clone https://github.com/your-org/akriti-phia-hack.git
cd akriti-phia-hack
npm install        # or bun install
```

### 2. Set Up Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) for details.

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migrations (see `supabase/` for schema files)
3. Deploy the Edge Functions:

```bash
supabase functions deploy ai-concierge
supabase functions deploy ai-style-summary
```

4. Set the OpenAI API key as a Supabase secret:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

### 4. Run Locally

```bash
npm run dev        # or bun dev
```

Open [http://localhost:5173](http://localhost:5173).

### 5. Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...            # anon/publishable key from Supabase dashboard
VITE_SUPABASE_PROJECT_ID=your-project-id
```

> **Note:** `VITE_SUPABASE_PUBLISHABLE_KEY` is the **anon** key (safe to expose in the frontend). All privileged operations go through Row-Level Security or Edge Functions with the service role key stored as a Supabase secret.


## Predictive Intelligence Engine

`src/lib/predictiveEngine.ts` implements six heuristic prediction models that run **entirely in the browser** over the local product catalog and Supabase-fetched signals. No serverside ML, no embedding models, no extra latency.

### Models

#### A — Next-Buy Predictor
```typescript
nextBuyPrediction(engagements, wishlist, recentlyViewedIds) → NextBuyResult
```
Aggregates category and tag weights from all signals, scores every catalog item, and returns the top 12 with a natural-language pitch and budget ceiling (avg spend × 1.25).

#### B — Occasion-Aware Discovery
```typescript
occasionSuggestions(events, birthday?) → OccasionSuggestion[]
```
Maps upcoming calendar events to occasion-specific tag sets and surfaces relevant products. Auto-synthesises a birthday event if the user's DOB is on file.

#### C — Budget-Smart Feed
```typescript
budgetSmartFeed(engagements) → BudgetSmartResult
```
Derives average purchase price and **sale sensitivity** (high wishlist:purchase ratio → user waits for deals → show value picks). Returns floor/ceiling-filtered items with behavioural pitch copy.

#### D — Style Progression Engine
```typescript
styleProgression(engagements) → StyleProgression
```
Splits engagement history in half chronologically, infers a Style Tribe per period, detects drift and generates a first-person narrative (e.g. "You used to lean Clean Girl, but lately you're shifting toward Quiet Luxury.").

#### E — Complete the Look
```typescript
completeTheLook(anchor) → CompletionResult
```
Uses a hard-coded tag complement map (`dress → [heels, bag, jewelry]`) to score the catalog by complementary tags, style family overlap and price ratio.

#### F — Trending in Your Circle + Viral Trends
```typescript
trendingInYourCircle(trending, myEngagements) → TrendingInCircle
viralTrends(trending) → ViralTrend[]
```
Boosts platform trending scores by tag overlap with the current user's history. Viral detection aggregates tag-level engagement scores across all trending rows.

### Style Tribes

| Tribe | Emoji | Styles | Key Tags |
|-------|-------|--------|----------|
| Quiet Luxury | 🤍 | minimal, editorial | cashmere, tailoring, wool, silk |
| Clean Girl | 🌿 | minimal | ribbed, basic, knit, jewelry |
| Downtown Vintage | 🖤 | streetwear, editorial | denim, leather, vintage |
| Soft Femme | 🌸 | romantic | floral, satin, silk, lace |
| Street Utility | 🛹 | streetwear, athleisure | cargo, puffer, sneakers, utility |
| Resort Minimal | 🌅 | boho, minimal | linen, vacation, resort, summer |

Tribe membership is inferred via `inferTribeFromEngagements()` which scores each tribe against the user's engagement tag history.

---

## AI Concierge

### How It Works

1. **User sends a message** (text and/or image) from `AIConcierge.tsx`
2. The message history + memory chip context is POSTed to the Supabase Edge Function at `/functions/v1/ai-concierge`
3. The Edge Function calls Gemini with a fashion-specialist system prompt and **streams the response** back via SSE
4. The client reads the SSE stream and updates the UI in real time
5. On completion, both the user and assistant messages are persisted to `concierge_messages`

### Outfit Card Rendering

The AI is prompted to return structured product suggestions using a special markdown syntax. `src/lib/conciergeCards.ts` parses this into `CardSection` objects, which render as horizontal scrollable `MiniProductCard` components with total pricing.

### Memory System

Memory chips (stored in `conciergeMemory`) are injected into every request as part of the system prompt:

```
User preferences: budget=$200, styles=minimal+editorial, upcoming=beach wedding
```

This gives the AI consistent context across all conversations without re-asking.

---

*Built for Phia Hack 2026

Made By : Akriti Agarwal
