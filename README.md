# Overflow — Ledger Core

SWC's Elite Coaching Growth Platform. This is Phase 1 of the build: the **Ledger Core** — the single source of truth every later module (The Gauntlet, Referral Flywheel, Coach Prep Briefs, Proof Engine, Founder's Circle) reads from and writes back to.

Ships in this phase:

- Client list + detail pages
- Manual activity logging (calls, prospecting, closes, referrals, etc.)
- Win logging, with an ad-ready flag for the future Proof Engine
- A rule-based Producer Score engine (Time Management / Prospecting / Closing / Accountability), computed per client per month
- 9 mock Elite/Founder's Circle clients with realistic seed data so the app is demoable immediately

No HubSpot integration yet — that's Phase 5, behind a `MOCK_HUBSPOT` flag, once a Private App token and custom contact properties are confirmed.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL

## Setup

### 1. Get a Postgres database

Free option: [neon.tech](https://neon.tech) → sign up → create a project → copy the `postgresql://...` connection string.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Paste your connection string into `.env` as `DATABASE_URL`.

### 3. Install dependencies, migrate, and seed

```bash
npm install
npm run db:migrate   # creates the schema (prisma migrate dev)
npm run db:seed      # loads 9 mock clients, coaches, activities, wins, and scores
```

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see a dashboard with active clients, an average Producer Score, and a top-producers list. Click into a client to see their score breakdown, log an activity, or log a win.

## Data model

See `prisma/schema.prisma`. The full Ledger schema from the master brief (Client, Activity, Win, Score, Coach, ReferralLink, GauntletEntry, FoundersCircleInvite) is defined up front so later phases don't require migrations on top of this one — only Client/Activity/Win/Score/Coach have UI and logic in this phase.

## Scoring engine

`lib/scoring.ts` is the pure scoring function (no I/O): it takes a client's activities for a period and returns a composite Producer Score plus a per-category breakdown. `lib/scoring-service.ts` wraps it with the Prisma calls that pull a client's activities for a period and persist the result to the `Score` table.

Category targets/weights are placeholders (`CATEGORY_TARGETS` in `lib/scoring.ts`) until real top-producer benchmarks are available — swap the numbers there once that data lands, no schema or call-site changes needed.

## Useful scripts

```bash
npm run db:seed     # reset + reseed mock data
npm run db:studio    # Prisma Studio — browse/edit the database directly
npm run lint
npm run build
```

## Deploying

```bash
npm install -g vercel
vercel
```

Add `DATABASE_URL` as an environment variable in the Vercel project settings so the deployed app connects to the same database.
