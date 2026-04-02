import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_CSV = ROOT / "data" / "raw.csv"
CLEANED_CSV = ROOT / "data" / "cleaned.csv"

# Exclude mixes, podcasts, and ambient loops that skew duration statistics.
MAX_DURATION_MS = 10 * 60 * 1000


def _read_raw(raw_path: Path | None) -> pd.DataFrame:
    return pd.read_csv(raw_path or RAW_CSV, low_memory=False)


def _clean_frame(
    df: pd.DataFrame,
    *,
    drop_null_rows: bool = True,
    max_duration_ms: int | None = MAX_DURATION_MS,
) -> pd.DataFrame:
    if drop_null_rows:
        df = df.dropna(how="any")
    if max_duration_ms is not None:
        dur = pd.to_numeric(df["duration_ms"], errors="coerce")
        df = df.loc[dur.notna() & (dur <= max_duration_ms)].copy()
    return df


def load_cleaned(
    raw_path: Path | None = None,
    *,
    drop_null_rows: bool = True,
    max_duration_ms: int | None = MAX_DURATION_MS,
) -> pd.DataFrame:
    """Read the raw export, drop null rows, and drop tracks longer than max_duration_ms."""
    df = _read_raw(raw_path)
    return _clean_frame(
        df,
        drop_null_rows=drop_null_rows,
        max_duration_ms=max_duration_ms,
    )


def write_cleaned(
    df: pd.DataFrame,
    out_path: Path | None = None,
) -> Path:
    """Write cleaned frame to disk; does not modify the raw file."""
    path = out_path or CLEANED_CSV
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return path


def build_cleaned_csv(
    raw_path: Path | None = None,
    out_path: Path | None = None,
    *,
    max_duration_ms: int | None = MAX_DURATION_MS,
) -> tuple[pd.DataFrame, int]:
    """Load raw, apply cleaning rules, save cleaned.csv. Returns (cleaned_df, raw_row_count)."""
    df = _read_raw(raw_path)
    n_before = len(df)
    df = _clean_frame(df, max_duration_ms=max_duration_ms)
    write_cleaned(df, out_path)
    return df, n_before


if __name__ == "__main__":
    df, n_before = build_cleaned_csv()
    removed = n_before - len(df)
    print(f"raw rows: {n_before}")
    print(f"rows removed by cleaning: {removed}")
    print(f"cleaned rows written: {len(df)}")
    print(f"output: {CLEANED_CSV.resolve()}")
