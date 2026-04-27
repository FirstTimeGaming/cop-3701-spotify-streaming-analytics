import { getPool } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pool = getPool();
    const { rows } = await pool.query<{ name: string }>(
      `SELECT name FROM genre ORDER BY name`,
    );
    return NextResponse.json({ names: rows.map((r) => r.name) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
