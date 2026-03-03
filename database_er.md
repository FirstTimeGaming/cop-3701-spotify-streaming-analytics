# Spotify Streaming Analytics Database
This file documents the ER design (Part B) and the final relational schema + normalization notes (Part C).

---

## Part B: Entities (Conceptual)

### track
- track_id: string, UNIQUE, PK
- album_id: integer, FK
- genre_id: integer, FK
- track_name: string, NOT NULL
- duration_ms: integer, NOT NULL
- explicit: boolean, NOT NULL
- preview_url: string, NULL

### artist
- artist_id: integer, serial/auto-incrementing, UNIQUE, PK
- name: string, UNIQUE, NOT NULL

### track_artist
- track_id: string, PK, FK
- artist_id: integer, PK, FK
- UNIQUE(track_id, artist_id)

### album
- album_id: integer, serial/auto-incrementing, UNIQUE, PK
- name: string, UNIQUE, NOT NULL

### genre
- genre_id: integer, serial/auto-incrementing, UNIQUE, PK
- name: string, UNIQUE, NOT NULL

### track_stats
- track_id: string, UNIQUE, PK, FK
- popularity: float, NULL
- acousticness: float, NULL
- danceability: float, NULL
- energy: float, NULL
- instrumentalness: float, NULL
- key: string, NULL
- liveness: float, NULL
- loudness: float, NULL
- mode: string, NULL
- speechiness: float, NULL
- tempo: float, NULL
- time_signature: string, NULL
- valence: float, NULL

---

## ER Diagram

<img width="1459" height="605" alt="image" src="https://github.com/user-attachments/assets/8edb55da-9d30-42e2-8e66-91ad5bb0a9e5" />

---

# Part C: Final Relational Schema (BCNF)

## Relational Schema (table form)

| Relation | Primary Key | Foreign Keys | Other Attributes / Notes |
|---------|-------------|--------------|--------------------------|
| **track** | track_id | album_id → album(album_id); genre_id → genre(genre_id) | track_name, duration_ms, explicit, preview_url |
| **artist** | artist_id | — | name (UNIQUE) |
| **track_artist** | (track_id, artist_id) | track_id → track(track_id); artist_id → artist(artist_id) | associative entity for M:N |
| **album** | album_id | — | name (UNIQUE) |
| **genre** | genre_id | — | name (UNIQUE) |
| **track_stats** | track_id | track_id → track(track_id) | popularity, acousticness, danceability, energy, instrumentalness, key, liveness, loudness, mode, speechiness, tempo, time_signature, valence |

---

## Functional Dependencies (FDs) per relation

### track(track_id, album_id, genre_id, track_name, duration_ms, explicit, preview_url)
- **FD1:** track_id → album_id, genre_id, track_name, duration_ms, explicit, preview_url

### artist(artist_id, name)
- **FD1:** artist_id → name
- **FD2:** name → artist_id  *(because name is UNIQUE; name is a candidate key)*

### album(album_id, name)
- **FD1:** album_id → name
- **FD2:** name → album_id  *(because name is UNIQUE; name is a candidate key)*

### genre(genre_id, name)
- **FD1:** genre_id → name
- **FD2:** name → genre_id  *(because name is UNIQUE; name is a candidate key)*

### track_artist(track_id, artist_id)
- No FDs beyond the key.

### track_stats(track_id, popularity, acousticness, danceability, energy, instrumentalness, key, liveness, loudness, mode, speechiness, tempo, time_signature, valence)
- **FD1:** track_id → popularity, acousticness, danceability, energy, instrumentalness, key, liveness, loudness, mode, speechiness, tempo, time_signature, valence

---

## BCNF Checks

A relation is in BCNF if for every nontrivial FD X → Y, X is a superkey.

- **track:** FD determinant is track_id (PK) → BCNF
- **artist:** determinants are artist_id (PK) and name (candidate key) → BCNF
- **album:** determinants are album_id (PK) and name (candidate key) → BCNF
- **genre:** determinants are genre_id (PK) and name (candidate key) → BCNF
- **track_artist:** only the composite PK determines the tuple → BCNF
- **track_stats:** determinant is track_id (PK) → BCNF

Result: All relations satisfy BCNF; no decompositions required.

---