"use client";

import { NUMERIC_METRICS } from "@/lib/analytics-params";
import {
  columnHeaderLabel,
  formatAxisTick,
  formatNumberMax2Decimals,
  metricOptionLabel,
  toTitleCase,
} from "@/lib/format-label";
import * as Tabs from "@radix-ui/react-tabs";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type JsonRow = Record<string, unknown>;

/** Recharts default tooltip is low-contrast in dark UI; force legible fg/bg. */
const chartTooltipProps = {
  contentStyle: {
    backgroundColor: "#fafafa",
    border: "1px solid #d4d4d8",
    borderRadius: "8px",
    color: "#18181b",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  },
  labelStyle: {
    color: "#18181b",
    fontWeight: 600,
  },
  itemStyle: {
    color: "#27272a",
  },
} as const;

function chartTooltipFormatter(value: unknown) {
  return formatNumberMax2Decimals(value);
}

function RawDataPanel({ rows }: { rows: JsonRow[] | null }) {
  const [open, setOpen] = useState(false);
  if (rows === null) return null;
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No Rows Returned.</p>;
  }
  const keys = Object.keys(rows[0] ?? {});
  return (
    <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        Raw Query Data ({rows.length} Rows)
        <span className="text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="max-h-80 overflow-auto border-t border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900">
              <tr>
                {keys.map((k) => (
                  <th key={k} className="px-2 py-1 font-mono">
                    {columnHeaderLabel(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  {keys.map((k) => (
                    <td key={k} className="px-2 py-1 font-mono text-zinc-700 dark:text-zinc-300">
                      {k === "genre"
                        ? toTitleCase(String(row[k] ?? ""))
                        : typeof row[k] === "number"
                          ? formatNumberMax2Decimals(row[k])
                          : String(row[k] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RunButton({
  loading,
  onClick,
}: {
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {loading ? "Running…" : "Run Query"}
    </button>
  );
}

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
      {message}
    </p>
  );
}

export function AnalyticsDashboard() {
  const [genres, setGenres] = useState<string[]>([]);
  const [genreLoadError, setGenreLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analytics/genres");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? res.statusText);
        if (!cancelled) setGenres(data.names ?? []);
      } catch (e) {
        if (!cancelled) {
          setGenreLoadError(e instanceof Error ? e.message : "Failed to load genres");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const genreSelect = (
    value: string,
    onChange: (v: string) => void,
    opts: { required?: boolean; allowAll?: boolean },
  ) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">Genre</span>
      <select
        value={value}
        required={opts.required}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
      >
        {opts.allowAll && <option value="">All Genres</option>}
        {genres.map((g) => (
          <option key={g} value={g}>
            {toTitleCase(g)}
          </option>
        ))}
      </select>
    </label>
  );

  // --- Tab 1: Top tracks ---
  const [t1Limit, setT1Limit] = useState("25");
  const [t1Genre, setT1Genre] = useState("");
  const [t1Rows, setT1Rows] = useState<JsonRow[] | null>(null);
  const [t1Loading, setT1Loading] = useState(false);
  const [t1Err, setT1Err] = useState<string | null>(null);
  const runTopTracks = useCallback(async () => {
    setT1Loading(true);
    setT1Err(null);
    try {
      const q = new URLSearchParams({ limit: t1Limit });
      if (t1Genre) q.set("genre", t1Genre);
      const res = await fetch(`/api/analytics/top-tracks?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setT1Rows(data.rows);
    } catch (e) {
      setT1Err(e instanceof Error ? e.message : "Request failed");
      setT1Rows(null);
    } finally {
      setT1Loading(false);
    }
  }, [t1Limit, t1Genre]);

  // --- Tab 2: Artists ---
  const [t2Limit, setT2Limit] = useState("20");
  const [t2Min, setT2Min] = useState("3");
  const [t2Rows, setT2Rows] = useState<JsonRow[] | null>(null);
  const [t2Loading, setT2Loading] = useState(false);
  const [t2Err, setT2Err] = useState<string | null>(null);
  const runArtists = useCallback(async () => {
    setT2Loading(true);
    setT2Err(null);
    try {
      const q = new URLSearchParams({
        limit: t2Limit,
        min_tracks: t2Min,
      });
      const res = await fetch(`/api/analytics/artist-leaderboard?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setT2Rows(data.rows);
    } catch (e) {
      setT2Err(e instanceof Error ? e.message : "Request failed");
      setT2Rows(null);
    } finally {
      setT2Loading(false);
    }
  }, [t2Limit, t2Min]);

  // --- Tab 3: Genres ---
  const [t3Min, setT3Min] = useState("50");
  const [t3Rows, setT3Rows] = useState<JsonRow[] | null>(null);
  const [t3Loading, setT3Loading] = useState(false);
  const [t3Err, setT3Err] = useState<string | null>(null);
  const runGenres = useCallback(async () => {
    setT3Loading(true);
    setT3Err(null);
    try {
      const q = new URLSearchParams({ min_tracks: t3Min });
      const res = await fetch(`/api/analytics/genre-comparison?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setT3Rows(data.rows);
    } catch (e) {
      setT3Err(e instanceof Error ? e.message : "Request failed");
      setT3Rows(null);
    } finally {
      setT3Loading(false);
    }
  }, [t3Min]);

  // --- Tab 4: Scatter ---
  const [t4x, setT4x] = useState("danceability");
  const [t4y, setT4y] = useState("popularity");
  const [t4Genre, setT4Genre] = useState("");
  const [t4Limit, setT4Limit] = useState("800");
  const [t4Rows, setT4Rows] = useState<JsonRow[] | null>(null);
  const [t4Loading, setT4Loading] = useState(false);
  const [t4Err, setT4Err] = useState<string | null>(null);
  const runScatter = useCallback(async () => {
    setT4Loading(true);
    setT4Err(null);
    try {
      const q = new URLSearchParams({
        x: t4x,
        y: t4y,
        limit: t4Limit,
      });
      if (t4Genre) q.set("genre", t4Genre);
      const res = await fetch(`/api/analytics/feature-scatter?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setT4Rows(data.rows);
    } catch (e) {
      setT4Err(e instanceof Error ? e.message : "Request failed");
      setT4Rows(null);
    } finally {
      setT4Loading(false);
    }
  }, [t4x, t4y, t4Genre, t4Limit]);

  // --- Tab 5: Rolling ---
  const [t5Genre, setT5Genre] = useState("");
  const [t5Win, setT5Win] = useState("5");
  const [t5Limit, setT5Limit] = useState("40");
  const [t5Rows, setT5Rows] = useState<JsonRow[] | null>(null);
  const [t5Loading, setT5Loading] = useState(false);
  const [t5Err, setT5Err] = useState<string | null>(null);
  const runRolling = useCallback(async () => {
    setT5Loading(true);
    setT5Err(null);
    try {
      const genre = t5Genre || genres[0] || "";
      const q = new URLSearchParams({
        genre,
        window_size: t5Win,
        limit: t5Limit,
      });
      const res = await fetch(`/api/analytics/rolling-window?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setT5Rows(data.rows);
    } catch (e) {
      setT5Err(e instanceof Error ? e.message : "Request failed");
      setT5Rows(null);
    } finally {
      setT5Loading(false);
    }
  }, [t5Genre, t5Win, t5Limit, genres]);

  const rollingGenreValue = t5Genre || genres[0] || "";

  const metricSelect = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
      >
        {NUMERIC_METRICS.map((m) => (
          <option key={m} value={m}>
            {metricOptionLabel(m)}
          </option>
        ))}
      </select>
    </label>
  );

  const chartWrap = "h-80 w-full min-w-0";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Spotify Streaming Analytics
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Read-only views over the PostgreSQL schema loaded from the Ultimate Spotify
          Tracks dataset. Each tab runs one analytical query; charts and the table use
          the same JSON payload.
        </p>
        {genreLoadError && (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            Genre list unavailable ({genreLoadError}). Check{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">DATABASE_URL</code>{" "}
            and that the DB is running.
          </p>
        )}
      </header>

      <Tabs.Root defaultValue="top" className="flex flex-col gap-4">
        <Tabs.List className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
          {[
            ["top", "Top Tracks"],
            ["artists", "Artists"],
            ["genres", "Genres"],
            ["scatter", "Features"],
            ["rolling", "Rolling Avg"],
          ].map(([v, label]) => (
            <Tabs.Trigger
              key={v}
              value={v}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow dark:text-zinc-400 dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:text-zinc-50"
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="top" className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Top Tracks by Popularity
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Highest Spotify popularity score in the snapshot; optional genre filter.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Limit (Max 100)</span>
              <input
                type="number"
                min={1}
                max={100}
                value={t1Limit}
                onChange={(e) => setT1Limit(e.target.value)}
                className="w-24 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            {genreSelect(t1Genre, setT1Genre, { allowAll: true })}
            <RunButton loading={t1Loading} onClick={runTopTracks} />
          </div>
          <ErrorText message={t1Err} />
          {t1Rows && t1Rows.length > 0 && (
            <div className={chartWrap + " mt-6"}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={t1Rows.map((r) => ({
                    ...r,
                    label:
                      String(r.track_name ?? "").length > 36
                        ? `${String(r.track_name).slice(0, 34)}…`
                        : String(r.track_name ?? ""),
                  }))}
                  margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis type="number" dataKey="popularity" tickFormatter={formatAxisTick} />
                  <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip {...chartTooltipProps} formatter={chartTooltipFormatter} />
                  <Bar dataKey="popularity" fill="#059669" name="Popularity" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <RawDataPanel rows={t1Rows} />
        </Tabs.Content>

        <Tabs.Content value="artists" className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Artist Leaderboard
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Mean track popularity per artist, for artists with at least{" "}
            <em>N</em> tracks in the database.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Limit</span>
              <input
                type="number"
                min={1}
                max={100}
                value={t2Limit}
                onChange={(e) => setT2Limit(e.target.value)}
                className="w-24 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Min Tracks</span>
              <input
                type="number"
                min={1}
                value={t2Min}
                onChange={(e) => setT2Min(e.target.value)}
                className="w-24 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <RunButton loading={t2Loading} onClick={runArtists} />
          </div>
          <ErrorText message={t2Err} />
          {t2Rows && t2Rows.length > 0 && (
            <div className={chartWrap + " mt-6"}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={t2Rows.map((r) => ({
                    ...r,
                    label:
                      String(r.artist_name ?? "").length > 28
                        ? `${String(r.artist_name).slice(0, 26)}…`
                        : String(r.artist_name ?? ""),
                  }))}
                  margin={{ left: 8, right: 16, top: 8, bottom: 48 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="avg_popularity" tickFormatter={formatAxisTick} />
                  <Tooltip {...chartTooltipProps} formatter={chartTooltipFormatter} />
                  <Bar dataKey="avg_popularity" fill="#7c3aed" name="Avg Popularity" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <RawDataPanel rows={t2Rows} />
        </Tabs.Content>

        <Tabs.Content value="genres" className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Genre Comparison
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Average popularity (0–100 Spotify scale), plus energy and danceability scaled
            to 0–100 for comparison (genres with at least <em>N</em> tracks).
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Min Tracks per Genre</span>
              <input
                type="number"
                min={1}
                value={t3Min}
                onChange={(e) => setT3Min(e.target.value)}
                className="w-28 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <RunButton loading={t3Loading} onClick={runGenres} />
          </div>
          <ErrorText message={t3Err} />
          {t3Rows && t3Rows.length > 0 && (
            <div className={chartWrap + " mt-6"}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={t3Rows.map((r) => ({
                    ...r,
                    genre_label: toTitleCase(String(r.genre ?? "")),
                  }))}
                  margin={{ left: 8, right: 16, top: 8, bottom: 48 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis
                    dataKey="genre_label"
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    height={70}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tickFormatter={formatAxisTick} />
                  <Tooltip {...chartTooltipProps} formatter={chartTooltipFormatter} />
                  <Legend />
                  <Bar dataKey="avg_popularity" fill="#059669" name="Avg Popularity" />
                  <Bar dataKey="avg_energy" fill="#d97706" name="Avg Energy (0–100)" />
                  <Bar dataKey="avg_danceability" fill="#2563eb" name="Avg Danceability (0–100)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <RawDataPanel rows={t3Rows} />
        </Tabs.Content>

        <Tabs.Content value="scatter" className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Audio Features vs Popularity
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Scatter of two numeric metrics per track (sample capped for performance).
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            {metricSelect("X Axis", t4x, setT4x)}
            {metricSelect("Y Axis", t4y, setT4y)}
            {genreSelect(t4Genre, setT4Genre, { allowAll: true })}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Sample Limit (Max 2500)</span>
              <input
                type="number"
                min={1}
                max={2500}
                value={t4Limit}
                onChange={(e) => setT4Limit(e.target.value)}
                className="w-28 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <RunButton loading={t4Loading} onClick={runScatter} />
          </div>
          <ErrorText message={t4Err} />
          {t4Rows && t4Rows.length > 0 && (
            <div className={chartWrap + " mt-6"}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={metricOptionLabel(t4x)}
                    tickFormatter={formatAxisTick}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={metricOptionLabel(t4y)}
                    tickFormatter={formatAxisTick}
                  />
                  <Tooltip
                    {...chartTooltipProps}
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={chartTooltipFormatter}
                  />
                  <Scatter data={t4Rows} fill="#db2777" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
          <RawDataPanel rows={t4Rows} />
        </Tabs.Content>

        <Tabs.Content value="rolling" className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Rolling Average (Window)
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Tracks in one genre ordered by popularity; rolling mean uses a trailing window
            over that ordering (illustrates SQL window functions—not calendar time).
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            {genreSelect(rollingGenreValue, setT5Genre, { required: true })}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Window Size (Tracks)</span>
              <input
                type="number"
                min={2}
                max={100}
                value={t5Win}
                onChange={(e) => setT5Win(e.target.value)}
                className="w-28 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Rows to Show (Max 200)</span>
              <input
                type="number"
                min={1}
                max={200}
                value={t5Limit}
                onChange={(e) => setT5Limit(e.target.value)}
                className="w-28 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <RunButton loading={t5Loading} onClick={runRolling} />
          </div>
          <ErrorText message={t5Err} />
          {t5Rows && t5Rows.length > 0 && (
            <div className={chartWrap + " mt-6"}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={t5Rows.map((r, i) => ({
                    ...r,
                    idx: i + 1,
                  }))}
                  margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                  <XAxis dataKey="idx" name="Rank Slot" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={formatAxisTick} />
                  <Tooltip {...chartTooltipProps} formatter={chartTooltipFormatter} />
                  <Legend />
                  <Line type="monotone" dataKey="popularity" stroke="#059669" dot={false} name="Popularity" />
                  <Line type="monotone" dataKey="rolling_avg_popularity" stroke="#7c3aed" dot={false} name="Rolling Avg" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <RawDataPanel rows={t5Rows} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
