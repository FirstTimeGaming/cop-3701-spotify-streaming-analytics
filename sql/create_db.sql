-- Create DB is handled by the start command.

-- Create Tables

-- Artist
CREATE TABLE artist (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Genre
CREATE TABLE genre (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Track
CREATE TABLE track (
    id SERIAL PRIMARY KEY,
    spotify_track_id VARCHAR(22) NOT NULL UNIQUE,
    genre_id INT NOT NULL,
    track_name VARCHAR(512) NOT NULL,
    duration_ms INT NOT NULL,

    FOREIGN KEY (genre_id) REFERENCES genre(id)
);

-- Track Artist
CREATE TABLE track_artist (
    track_id INT NOT NULL,
    artist_id INT NOT NULL,

    PRIMARY KEY (track_id, artist_id),
    FOREIGN KEY (track_id) REFERENCES track(id),
    FOREIGN KEY (artist_id) REFERENCES artist(id)
);

-- Track Stats
CREATE TABLE track_stats (
    track_id INT NOT NULL PRIMARY KEY,
    popularity FLOAT NOT NULL,
    acousticness FLOAT NOT NULL,
    danceability FLOAT NOT NULL,
    energy FLOAT NOT NULL,
    instrumentalness FLOAT NOT NULL,
    key VARCHAR(255) NOT NULL,
    liveness FLOAT NOT NULL,
    loudness FLOAT NOT NULL,
    mode VARCHAR(255) NOT NULL,
    speechiness FLOAT NOT NULL,
    tempo FLOAT NOT NULL,
    time_signature VARCHAR(255) NOT NULL,
    valence FLOAT NOT NULL,

    FOREIGN KEY (track_id) REFERENCES track(id)
);