import { parseMinTracks } from "@/lib/analytics-params";
import { getPool } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const minTracks = parseMinTracks(searchParams.get("min_tracks"), 1);

    const pool = getPool();
    const { rows } = await pool.query(
      `
      SELECT g.name AS genre,
             COUNT(*)::int AS track_count,
             AVG(ts.popularity)::float AS avg_popularity,
             (AVG(ts.energy) * 100)::float AS avg_energy,
             (AVG(ts.danceability) * 100)::float AS avg_danceability
      FROM genre g
      JOIN track t ON t.genre_id = g.id
      JOIN track_stats ts ON ts.track_id = t.id
      GROUP BY g.id, g.name
      HAVING COUNT(*) >= $1
      ORDER BY avg_popularity DESC
      `,
      [minTracks],
    );

    return NextResponse.json({ rows });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
