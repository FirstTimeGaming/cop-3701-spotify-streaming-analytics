# Spotify Streaming Analytics (Web Dashboard)

Next.js dashboard with read-only analytics over the project PostgreSQL schema. Each tab runs one analytical query; charts and raw tables share the same API payload.

---

## Install Node.js, npm, and pnpm

Anyone running this app needs **Node.js** (which includes **npm**), then **pnpm** as the package manager for this repo.

1. **Install Node.js (LTS)**  
   Download and install from [https://nodejs.org/](https://nodejs.org/).  
   This installs both `node` and `npm`. Confirm in a terminal:

   ```bash
   node -v
   npm -v
   ```

2. **Install pnpm**  
   Using npm:

   ```bash
   npm install -g pnpm
   ```

   On recent Node versions you can use Corepack instead:

   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

   Confirm:

   ```bash
   pnpm -v
   ```

---

## Run the app locally

1. **Install dependencies** (from this `web/` directory):

   ```bash
   cd web
   pnpm install
   ```

2. **Configure the database**  
   Copy [.env.example](./.env.example) to `.env.local` and set `DATABASE_URL` to your PostgreSQL instance—the same database where [../sql/create_db.sql](../sql/create_db.sql) was applied and data was loaded (e.g. via [../python/dataload.py](../python/dataload.py)).  
   The root project README Docker example may use database `spotify_streaming_analytics`, while your loader might use `postgres`; the URL must match the DB that actually has the tables.

3. **Start the dev server:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

**Production build (optional):**

```bash
pnpm build
pnpm start
```

---

## Database analysis queries

The five queries below are exposed by this app. Each maps to goals in the project [README.md](../README.md): rankings for analysts, cross-sectional genre and feature work for researchers, and a small HTTP API for developers.

---

### Query 1 — Top tracks by popularity

**Idea:** Surface the most popular tracks in the current dataset, optionally restricted to one genre.

**Parameters:** `limit` (capped at 100), optional `genre`.

**Flow vs project README:** Supports *“Identifying top-ranked tracks or artists within a given time window”* — here the “window” is **top-N on the snapshot**, not a date range.

**SQL shape:** Join `track`, `genre`, `track_stats`; filter by genre when provided; `ORDER BY popularity DESC LIMIT …`.

**API:** `GET /api/analytics/top-tracks`

---

### Query 2 — Artist leaderboard (mean popularity)

**Idea:** Rank artists by **average** popularity of their linked tracks, requiring a minimum track count so one-hit wonders do not dominate.

**Parameters:** `limit`, `min_tracks`.

**Flow vs project README:** Supports *“Ranking tracks and artists based on historical and recent performance”* at the level of **one snapshot**: aggregate across each artist’s tracks today.

**SQL shape:** Join `artist`, `track_artist`, `track_stats`; `GROUP BY` artist; `HAVING COUNT(*) >= min_tracks`; `ORDER BY AVG(popularity) DESC`.

**API:** `GET /api/analytics/artist-leaderboard`

---

### Query 3 — Genre comparison

**Idea:** Compare genres by average popularity and selected audio features (energy, danceability), hiding genres with very few tracks if desired. Energy and danceability are stored on a 0–1 scale in `track_stats`; the API multiplies their averages by **100** so they align visually with Spotify popularity (0–100) on the chart and in raw JSON.

**Parameters:** `min_tracks` (per genre).

**Flow vs project README:** Relates to *“Genre popularity evolution”* as **cross-genre comparison** on the current load; true evolution over time needs dated observations.

**SQL shape:** Join `genre`, `track`, `track_stats`; `GROUP BY` genre; `HAVING COUNT(*) >= min_tracks`; `AVG(energy)*100`, `AVG(danceability)*100`; order by average popularity.

**API:** `GET /api/analytics/genre-comparison`

---

### Query 4 — Feature scatter

**Idea:** Explore relationships between two numeric metrics from `track_stats` (e.g. danceability vs popularity), optionally within one genre. Metrics are **allowlisted** in code to avoid SQL injection.

**Parameters:** `x`, `y` (metric names), optional `genre`, `limit` (capped sample size for the browser).

**Flow vs project README:** Directly supports *“Correlations between audio features and popularity”* as an exploratory view (not a formal statistical test).

**SQL shape:** Join `track`, `track_stats`, `genre`; dynamic **allowlisted** columns for x/y; optional genre filter; `LIMIT`.

**API:** `GET /api/analytics/feature-scatter`

---

### Query 5 — Rolling average with window functions

**Idea:** Within a chosen genre, order tracks by popularity descending and compute a **trailing rolling average** of popularity over that ordering using `AVG(…) OVER (ROWS BETWEEN … PRECEDING AND CURRENT ROW)`.

**Parameters:** `genre` (required), `window_size` (2–100), `limit` (how many rows to return, capped).

**Flow vs project README:** Implements *“Computing rolling popularity scores using window functions”* in the sense of **analytic** rolling windows. It is **not** a rolling time series; it illustrates window semantics on ranked rows until temporal data exists.

**API:** `GET /api/analytics/rolling-window`

---

### Supporting API

**Genre list** (for dropdowns): `GET /api/analytics/genres` → `{ names: string[] }`.

All analytics handlers use the Node.js runtime (`pg` requires Node, not Edge).

---
