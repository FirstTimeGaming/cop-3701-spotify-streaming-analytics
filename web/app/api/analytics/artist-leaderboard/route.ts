import { parseLimit, parseMinTracks } from "@/lib/analytics-params";
import { getPool } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseLimit(searchParams.get("limit"), 20, 100);
    const minTracks = parseMinTracks(searchParams.get("min_tracks"), 1);

    const pool = getPool();
    const { rows } = await pool.query(
      `
      SELECT a.name AS artist_name,
             COUNT(*)::int AS track_count,
             AVG(ts.popularity)::float AS avg_popularity
      FROM artist a
      JOIN track_artist ta ON ta.artist_id = a.id
      JOIN track_stats ts ON ts.track_id = ta.track_id
      GROUP BY a.id, a.name
      HAVING COUNT(*) >= $1
      ORDER BY avg_popularity DESC
      LIMIT $2
      `,
      [minTracks, limit],
    );

    return NextResponse.json({ rows });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
