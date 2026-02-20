# Purpose

This file includes the entity list and ER diagram for this project

## Entities

### track

* track_id: string, unique, pk
* album_id: integer, fk
* genre_id: integer, fk
* track_name: string, not null
* duration_ms: integer, not null
* explicit: boolean, not null
* preview_url: string, null

### artist
* artist_id: integer, serial / auto-incrementing, unique, pk
* name: string, unique, not null

### track_artist
* track_id: string, pk, fk
* artist_id: integer, pk, fk

* unique on (track_id, artist_id)

### album
* album_id: integer, serial / auto-incrementing, unique, pk
* name: string, unqiue, not null

### genre
* genre_id: integer, serial / auto-incrementing, unique, pk
* name: string, unqiue, not null

### track_stats
* track_id, string, unique, pk, fk
* popularity: float, nullable
* acousticness: float, nullable
* danceability: float, nullable
* energy: float, nullable
* instrumentalness: float, nullable
* key: string, nullable
* liveness: float, nullable
* loudness: float, nullable
* mode: string, nullable
* speechiness: float, nullable
* tempo: float, nullable
* time_signature: string, nullable
* valence: float, nullable


## ER Diagram

<img width="1459" height="605" alt="image" src="https://github.com/user-attachments/assets/8edb55da-9d30-42e2-8e66-91ad5bb0a9e5" />

