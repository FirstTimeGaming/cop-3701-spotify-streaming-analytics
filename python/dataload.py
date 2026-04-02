"""
Load cleaned Spotify CSV into PostgreSQL (see sql/create_db.sql).

Connection defaults match scripts/start-db.bash (Docker postgres:16). Change DB_* below only if your container differs.
Rows are deduplicated by spotify track_id (highest popularity kept) because the same track
appears under multiple genres.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

ROOT = Path(__file__).resolve().parent.parent
CLEANED_CSV = ROOT / "data" / "cleaned.csv"
CHUNK = 4000

# --- database: keep in sync with scripts/start-db.bash ---
# POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB / -p host:container
DB_HOST = "localhost"
DB_PORT = 5432  # maps to -p 5432:5432
DB_USER = "postgres"
DB_PASSWORD = "postgres"
DB_NAME = "postgres"

# Set True before a full reload to avoid unique-key conflicts
TRUNCATE_BEFORE_LOAD = False

# Must match sql/create_db.sql (base tables only)
EXPECTED_PUBLIC_TABLES = frozenset(
    {"artist", "genre", "track", "track_artist", "track_stats"}
)


def _print_connection_context(cur) -> None:
    """Log which server/database/session Python is using (compare to DataGrip data source)."""
    cur.execute(
        """
        SELECT current_database(), current_user, current_setting('server_version_num')
        """
    )
    db, usr, ver = cur.fetchone()
    print(f"PostgreSQL session: database={db!r} user={usr!r} (version_num={ver})")


def _list_user_tables_all_schemas(cur) -> list[tuple[str, str]]:
    """Non-system ordinary tables (helps spot DDL run in another DB or schema)."""
    cur.execute(
        """
        SELECT n.nspname, c.relname
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND n.nspname NOT LIKE 'pg_toast%%'
        ORDER BY 1, 2
        """
    )
    return [(row[0], row[1]) for row in cur.fetchall()]


def verify_public_schema(cur) -> None:
    """List public.base tables and ensure required relations exist."""
    _print_connection_context(cur)

    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """
    )
    found = {row[0] for row in cur.fetchall()}
    print("public schema tables:", ", ".join(sorted(found)) if found else "(none)")
    missing = EXPECTED_PUBLIC_TABLES - found
    if missing:
        others = _list_user_tables_all_schemas(cur)
        if others:
            preview = ", ".join(f"{s}.{t}" for s, t in others[:20])
            more = f" … (+{len(others) - 20} more)" if len(others) > 20 else ""
            print(
                "User-visible tables in other schemas (not public or wrong database):",
                preview + more,
            )
        else:
            print(
                "No user tables in any schema on this database — "
                "often DB_NAME here does not match your DataGrip database, "
                "or create_db.sql was not applied here."
            )
        raise RuntimeError(
            "Missing required tables in public (see sql/create_db.sql): "
            f"{', '.join(sorted(missing))}. "
            "Set DB_NAME in dataload.py to match your DataGrip data source, "
            "then run the DDL on that database."
        )
    extra = found - EXPECTED_PUBLIC_TABLES
    if extra:
        print("note: extra tables in public (ignored):", ", ".join(sorted(extra)))


def connect():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME,
    )


def truncate_tables(cur) -> None:
    cur.execute(
        "TRUNCATE track_stats, track_artist, track, artist, genre "
        "RESTART IDENTITY CASCADE"
    )


def split_artist_field(value) -> list[str]:
    if pd.isna(value):
        return []
    return [p.strip() for p in str(value).split(",") if p.strip()]


def dedupe_tracks(df: pd.DataFrame) -> pd.DataFrame:
    """One row per Spotify track_id; keep the highest-popularity row (genre from that row)."""
    out = df.sort_values("popularity", ascending=False, kind="mergesort")
    return out.drop_duplicates(subset=["track_id"], keep="first").reset_index(drop=True)


def insert_genres(cur, names: list[str]) -> dict[str, int]:
    execute_values(
        cur,
        "INSERT INTO genre (name) VALUES %s ON CONFLICT DO NOTHING",
        [(n,) for n in names],
        page_size=CHUNK,
    )
    cur.execute("SELECT id, name FROM genre WHERE name = ANY(%s::text[])", (names,))
    return {row[1]: row[0] for row in cur.fetchall()}


def insert_artists(cur, names: list[str]) -> dict[str, int]:
    execute_values(
        cur,
        "INSERT INTO artist (name) VALUES %s ON CONFLICT DO NOTHING",
        [(n,) for n in names],
        page_size=CHUNK,
    )
    cur.execute("SELECT id, name FROM artist WHERE name = ANY(%s::text[])", (names,))
    return {row[1]: row[0] for row in cur.fetchall()}


def insert_tracks_chunked(
    cur,
    df: pd.DataFrame,
    genre_map: dict[str, int],
) -> dict[str, int]:
    """Insert tracks; return mapping spotify_track_id -> internal track.id."""
    spotify_to_pk: dict[str, int] = {}
    n = len(df)
    for start in range(0, n, CHUNK):
        part = df.iloc[start : start + CHUNK]
        spotify_ids = part["track_id"].astype(str).tolist()
        genre_ids = [genre_map[g] for g in part["genre"].astype(str)]
        names = part["track_name"].astype(str).tolist()
        durs = part["duration_ms"].astype(int).tolist()
        cur.execute(
            """
            INSERT INTO track (
                spotify_track_id, genre_id, track_name, duration_ms
            )
            SELECT * FROM unnest(
                %s::varchar[],
                %s::int[],
                %s::varchar[],
                %s::int[]
            ) AS t(
                spotify_track_id, genre_id, track_name, duration_ms
            )
            RETURNING id, spotify_track_id
            """,
            (
                spotify_ids,
                genre_ids,
                names,
                durs,
            ),
        )
        for pk, sid in cur.fetchall():
            spotify_to_pk[sid] = pk
    return spotify_to_pk


def insert_track_artists_chunked(
    cur,
    df: pd.DataFrame,
    spotify_to_pk: dict[str, int],
    artist_map: dict[str, int],
) -> None:
    pairs: list[tuple[int, int]] = []
    seen: set[tuple[int, int]] = set()
    for _, row in df.iterrows():
        pk = spotify_to_pk[str(row["track_id"])]
        for aname in split_artist_field(row["artist_name"]):
            aid = artist_map[aname]
            key = (pk, aid)
            if key not in seen:
                seen.add(key)
                pairs.append(key)
    for start in range(0, len(pairs), CHUNK):
        chunk = pairs[start : start + CHUNK]
        execute_values(
            cur,
            "INSERT INTO track_artist (track_id, artist_id) VALUES %s ON CONFLICT DO NOTHING",
            chunk,
            page_size=len(chunk),
        )


def insert_track_stats_chunked(cur, df: pd.DataFrame, spotify_to_pk: dict[str, int]) -> None:
    n = len(df)
    for start in range(0, n, CHUNK):
        part = df.iloc[start : start + CHUNK]
        tids = [spotify_to_pk[str(s)] for s in part["track_id"]]
        popularity = part["popularity"].astype(float).tolist()
        acousticness = part["acousticness"].astype(float).tolist()
        danceability = part["danceability"].astype(float).tolist()
        energy = part["energy"].astype(float).tolist()
        instrumentalness = part["instrumentalness"].astype(float).tolist()
        key = part["key"].astype(str).tolist()
        liveness = part["liveness"].astype(float).tolist()
        loudness = part["loudness"].astype(float).tolist()
        mode = part["mode"].astype(str).tolist()
        speechiness = part["speechiness"].astype(float).tolist()
        tempo = part["tempo"].astype(float).tolist()
        time_signature = part["time_signature"].astype(str).tolist()
        valence = part["valence"].astype(float).tolist()
        cur.execute(
            """
            INSERT INTO track_stats (
                track_id, popularity, acousticness, danceability, energy,
                instrumentalness, key, liveness, loudness, mode,
                speechiness, tempo, time_signature, valence
            )
            SELECT * FROM unnest(
                %s::int[],
                %s::double precision[],
                %s::double precision[],
                %s::double precision[],
                %s::double precision[],
                %s::double precision[],
                %s::varchar[],
                %s::double precision[],
                %s::double precision[],
                %s::varchar[],
                %s::double precision[],
                %s::double precision[],
                %s::varchar[],
                %s::double precision[]
            ) AS s(
                track_id, popularity, acousticness, danceability, energy,
                instrumentalness, key, liveness, loudness, mode,
                speechiness, tempo, time_signature, valence
            )
            """,
            (
                tids,
                popularity,
                acousticness,
                danceability,
                energy,
                instrumentalness,
                key,
                liveness,
                loudness,
                mode,
                speechiness,
                tempo,
                time_signature,
                valence,
            ),
        )


def load_all(csv_path: Path | None = None) -> None:
    path = csv_path or CLEANED_CSV
    if not path.exists():
        raise FileNotFoundError(f"Missing cleaned CSV: {path}")

    df = pd.read_csv(path, low_memory=False)
    deduped = dedupe_tracks(df)

    genre_names = sorted(deduped["genre"].astype(str).unique().tolist())
    artist_names: set[str] = set()
    for cell in deduped["artist_name"]:
        artist_names.update(split_artist_field(cell))
    artist_name_list = sorted(artist_names)

    conn = connect()
    try:
        with conn:
            with conn.cursor() as cur:
                verify_public_schema(cur)

                if TRUNCATE_BEFORE_LOAD:
                    truncate_tables(cur)
                    print("Truncated existing tables (TRUNCATE_BEFORE_LOAD=True).")

                print(f"Inserting {len(genre_names)} genres…")
                genre_map = insert_genres(cur, genre_names)

                print(f"Inserting {len(artist_name_list)} artists…")
                artist_map = insert_artists(cur, artist_name_list)

                print(f"Inserting {len(deduped)} tracks (deduped from {len(df)} rows)…")
                spotify_to_pk = insert_tracks_chunked(cur, deduped, genre_map)

                print("Inserting track_artist links…")
                insert_track_artists_chunked(cur, deduped, spotify_to_pk, artist_map)

                print("Inserting track_stats…")
                insert_track_stats_chunked(cur, deduped, spotify_to_pk)

        print("Load complete.")
    finally:
        conn.close()


if __name__ == "__main__":
    try:
        load_all()
    except (psycopg2.Error, RuntimeError) as e:
        print(e, file=sys.stderr)
        sys.exit(1)
