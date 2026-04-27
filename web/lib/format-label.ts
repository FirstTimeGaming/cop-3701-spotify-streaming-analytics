/** Title-case words (handles simple hyphenated / spaced genre names). */
export function toTitleCase(str: string): string {
  if (!str) return str;
  return str
    .split(/([\s-]+)/)
    .map((part) => {
      if (/^[\s-]+$/.test(part)) return part;
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

/** Snake_case API keys → label text for tables (e.g. avg_popularity → Avg Popularity). */
export function columnHeaderLabel(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function metricOptionLabel(metric: string): string {
  return toTitleCase(metric.replaceAll("_", " "));
}

/** Integers as-is; fractional numbers rounded for display to 2 decimal places. */
export function formatNumberMax2Decimals(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    if (value === null || value === undefined) return "";
    return String(value);
  }
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

/** Numeric axis ticks: integers unchanged, floats to 2 decimal places. */
export function formatAxisTick(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}
