import {
  optionalGenre,
  parseLimit,
} from "@/lib/analytics-params";
import { getPool } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseLimit(searchParams.get("limit"), 25, 100);
    const genre = optionalGenre(searchParams.get("genre"));

    const pool = getPool();
    const { rows } = await pool.query(
      `
      SELECT t.track_name AS track_name,
             g.name AS genre,
             ts.popularity::float AS popularity
      FROM track t
      JOIN genre g ON g.id = t.genre_id
      JOIN track_stats ts ON ts.track_id = t.id
      WHERE ($1::text IS NULL OR g.name = $1)
      ORDER BY ts.popularity DESC
      LIMIT $2
      `,
      [genre, limit],
    );

    return NextResponse.json({ rows });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
