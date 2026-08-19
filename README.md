# Overflow — Ledger Core + Modules 1-3

SWC's Elite Coaching Growth Platform. The **Ledger Core** (Phase 1) is the single source of truth every module reads from and writes back to. Three modules are built on top of it so far.

Ships so far:

- Client list + detail pages
- Manual activity logging (calls, prospecting, closes, referrals, etc.)
- Win logging, with an ad-ready flag for the future Proof Engine
- A rule-based Producer Score engine (Time Management / Prospecting / Closing / Accountability), computed per client per month
- **Module 1 — The Gauntlet**: a live leaderboard by weekly/monthly/quarterly period, a tiered rewards config (Bronze/Silver/Gold/Trip Winner — not winner-take-all), and a `tripEarned` flag once a client crosses the trip threshold
- **Module 2 — Referral Flywheel**: an auto-generated referral link once a client's Producer Score crosses a threshold, real click tracking via a public redirect route, and conversions that credit bonus points back into the Gauntlet
- **Module 3 — Coach Prep Briefs**: a one-page, rule-based (no AI/LLM) brief per client — score trend, focus areas, recent activity, wins, Gauntlet/Referral standing — surfaced from each coach's roster
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

## The Gauntlet

`/gauntlet` — a live leaderboard with tabs for weekly, monthly, and quarterly periods (`lib/periods.ts` handles the three period-key/bounds calculations; it's separate from `lib/scoring.ts`'s month-only helpers since Producer Score never needed the other granularities).

Points are a different formula from Producer Score on purpose: `lib/gauntlet.ts`'s `POINTS_BY_ACTIVITY_TYPE` weights activities by competitive impact (a close is worth far more than a single prospecting touch) rather than balancing across categories, so the two systems can rank clients differently — that's expected, not a bug. `lib/gauntlet-service.ts` computes every active client's points for a period, ranks them, and upserts `GauntletEntry` rows (recomputed on every page load — cheap at this client count).

`REWARD_TIERS` in `lib/gauntlet.ts` defines the tiered rewards (Bronze/Silver/Gold/Trip Winner) — thresholds are placeholders calibrated against seeded mock volume, pending the real leadership decision on the first trip threshold/reward (Master Brief Part 9). `tripEarned` is set once a client's points cross the top tier's threshold.

## Referral Flywheel

`/referrals` — every client whose current-period Producer Score crosses `REFERRAL_ELIGIBILITY_SCORE_THRESHOLD` (`lib/referral.ts`, placeholder pending calibration like everything else in this list) automatically gets a unique `/r/<slug>` link the moment `lib/scoring-service.ts` recomputes their score. Visiting `/referrals` also backfills links for anyone who crossed the threshold before this module existed.

- `/r/[slug]` is a real route (`app/r/[slug]/route.ts`) — visiting it increments `clicks` and redirects home. No mock click counter.
- There's no signup funnel yet (that's HubSpot, Phase 5), so `/referrals` has a "Simulate Conversion" button standing in for a real one. A conversion increments `conversions`, sets `rewardCredited`, and — per the brief's "credit rewards back into Gauntlet points" — creates a real `Activity` row sized so it adds exactly `REFERRAL_CONVERSION_BONUS_POINTS` to that client's Gauntlet total (`lib/referral-service.ts`). It flows through Activity rather than writing `GauntletEntry.points` directly because the Gauntlet leaderboard recomputes points from Activity on every view — a direct write would just get overwritten on the next page load.

## Coach Prep Briefs

`/clients/[id]/brief` — a one-page brief for a coach to read before a call, reachable from a client's page or from `/coaches/[id]`'s roster. `lib/coach-prep.ts` builds it: pure functions, string templates, and arithmetic over data already fetched from the Ledger (score trend, activity counts, wins, Gauntlet rank, referral stats). **No network call, database call, or LLM/AI call happens inside that file** — see the header comment there — matching the brief's explicit "no AI/LLM calls anywhere in v1." The page is marked not-client-facing and print-friendly (`print:` Tailwind variants hide the nav so "Print / Save as PDF" gives a clean one-pager).

## Useful scripts

```bash
npm run db:seed     # reset + reseed mock data
npm run db:studio    # Prisma Studio — browse/edit the database directly
npm run lint
npm run build
```

## Deploying to Vercel

Migrations and seeding run automatically as part of the build — no manual step needed on deploy. The `build` script is:

```
prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build
```

- `prisma migrate deploy` applies any pending migrations to whatever `DATABASE_URL` points at.
- The seed step is **safe to run on every build**: it checks for existing clients first and only loads mock data if the Ledger is empty. Your first deploy seeds the 9 mock clients; every deploy after that (once you've added real clients) leaves the data alone.
- To force a full reset back to mock data at any time, run `SEED_FORCE=true npm run build` (or just `npm run db:seed`, which sets that flag for you) against the target database.
- `vercel.json` pins this same command as the project's Build Command, so it's used even if a different one is set in the dashboard.
- Every page that queries the database is marked `export const dynamic = "force-dynamic"`, so Next.js never tries to query the database while statically generating pages at build time — only real requests do, after migrate+seed have already run.

If a build still fails with a "relation/table does not exist" error: open Vercel → Project Settings → Build & Development Settings and check whether **Build Command** has a manual override saved (some imports pre-fill and lock this to plain `next build`). Either clear the override or set it explicitly to the command above, then confirm `DATABASE_URL` is set for the environment (Production/Preview) that build is running under.

### One-time setup

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo. Vercel auto-detects Next.js — no config needed.
3. Before the first deploy, add an environment variable: `DATABASE_URL` = your Neon connection string (Production, Preview, and Development environments).
4. Deploy. Watch the build logs — you should see `Applying migration` and `Seeded 9 clients...` before the Next.js build starts.
5. Every future `git push` to this branch redeploys automatically and re-runs the same safe build chain.

Alternatively, from your own machine (with network access to Vercel):

```bash
npm install -g vercel
vercel login
vercel link      # connect this folder to the Vercel project
vercel env add DATABASE_URL   # paste your Neon connection string when prompted
vercel --prod
```
