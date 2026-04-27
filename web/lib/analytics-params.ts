/** Allowlisted track_stats numeric columns for scatter / dynamic selects */
export const NUMERIC_METRICS = [
  "popularity",
  "acousticness",
  "danceability",
  "energy",
  "instrumentalness",
  "liveness",
  "loudness",
  "speechiness",
  "tempo",
  "valence",
] as const;

export type NumericMetric = (typeof NUMERIC_METRICS)[number];

const METRIC_SQL: Record<NumericMetric, string> = {
  popularity: "ts.popularity",
  acousticness: "ts.acousticness",
  danceability: "ts.danceability",
  energy: "ts.energy",
  instrumentalness: "ts.instrumentalness",
  liveness: "ts.liveness",
  loudness: "ts.loudness",
  speechiness: "ts.speechiness",
  tempo: "ts.tempo",
  valence: "ts.valence",
};

export function metricColumnSql(m: string): string | null {
  if (NUMERIC_METRICS.includes(m as NumericMetric)) {
    return METRIC_SQL[m as NumericMetric];
  }
  return null;
}

export function parseLimit(
  raw: string | null,
  fallback: number,
  max: number,
): number {
  const n = raw === null || raw === "" ? fallback : Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function parseMinTracks(raw: string | null, fallback: number): number {
  const n = raw === null || raw === "" ? fallback : Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 10_000);
}

export function parseWindowSize(raw: string | null, fallback: number): number {
  const n = raw === null || raw === "" ? fallback : Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 2) return Math.max(2, fallback);
  return Math.min(n, 100);
}

export function optionalGenre(raw: string | null): string | null {
  if (raw === null || raw.trim() === "") return null;
  return raw.trim().slice(0, 255);
}
