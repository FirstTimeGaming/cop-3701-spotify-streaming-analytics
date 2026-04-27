import {
  optionalGenre,
  parseLimit,
  parseWindowSize,
} from "@/lib/analytics-params";
import { getPool } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const genre = optionalGenre(searchParams.get("genre"));
    if (!genre) {
      return NextResponse.json(
        { error: "genre is required" },
        { status: 400 },
      );
    }
    const windowSize = parseWindowSize(searchParams.get("window_size"), 5);
    const limit = parseLimit(searchParams.get("limit"), 40, 200);
    const preceding = windowSize - 1;

    const pool = getPool();
    const { rows } = await pool.query(
      `
      WITH ordered AS (
        SELECT t.track_name AS track_name,
               ts.popularity::float AS popularity,
               AVG(ts.popularity) OVER (
                 ORDER BY ts.popularity DESC
                 ROWS BETWEEN ${preceding} PRECEDING AND CURRENT ROW
               )::float AS rolling_avg_popularity
        FROM track t
        JOIN track_stats ts ON ts.track_id = t.id
        JOIN genre g ON g.id = t.genre_id
        WHERE g.name = $1
      )
      SELECT * FROM ordered
      ORDER BY popularity DESC
      LIMIT $2
      `,
      [genre, limit],
    );

    return NextResponse.json({ rows, windowSize });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
