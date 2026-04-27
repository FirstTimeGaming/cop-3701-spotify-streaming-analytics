import {
  metricColumnSql,
  optionalGenre,
  parseLimit,
} from "@/lib/analytics-params";
import { getPool } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const xMetric = searchParams.get("x") ?? "danceability";
    const yMetric = searchParams.get("y") ?? "popularity";
    const xCol = metricColumnSql(xMetric);
    const yCol = metricColumnSql(yMetric);
    if (!xCol || !yCol) {
      return NextResponse.json(
        { error: "Invalid x or y metric (use allowlisted numeric columns)" },
        { status: 400 },
      );
    }
    const genre = optionalGenre(searchParams.get("genre"));
    const limit = parseLimit(searchParams.get("limit"), 800, 2500);

    const pool = getPool();
    const { rows } = await pool.query(
      `
      SELECT t.track_name AS track_name,
             g.name AS genre,
             ${xCol}::float AS x,
             ${yCol}::float AS y
      FROM track t
      JOIN track_stats ts ON ts.track_id = t.id
      JOIN genre g ON g.id = t.genre_id
      WHERE ($1::text IS NULL OR g.name = $1)
      LIMIT $2
      `,
      [genre, limit],
    );

    return NextResponse.json({
      rows,
      xMetric,
      yMetric,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
