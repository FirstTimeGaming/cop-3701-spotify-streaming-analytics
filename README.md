# Spotify Music Streaming Analytics Database

## Project Statement
Design a music analytics database tracking tracks, artists, and popularity metrics. Must include trend evolution analysis and ranking by rolling popularity scores.

## Project Scope
The Spotify Music Streaming Analytics Database is a relational database system designed to analyze music streaming data from Spotify.

The primary goal of the database is to support analytical queries. Specifically, the system should enable:
* Tracking individual tracks and their associated artists and albums
* Storing popularity and audio feature metrics (e.g., popularity score, danceability, energy)
* Analyzing popularity trends over time
* Computing rolling popularity scores using window functions
* Ranking tracks and artists based on historical and recent performance

## Project Dataset
The database is populated using the [Ultimate Spotify Tracks Database](https://www.kaggle.com/datasets/zaheenhamidani/ultimate-spotify-tracks-db) from Kaggle

## Intended Users
The database is designed to support multiple types of users

#### 1. Data Analysts
Data analysts use the system to explore music trends and popularity patterns. Typical tasks include:
* Identifying top-ranked tracks or artists within a given time window
* Analyzing changes in popularity over time
* Running aggregate and window-based queries for reporting purposes

#### 2. Music Industry Researchers
Researchers can use the database to study broader industry trends, such as:
* Genre popularity evolution
* Artist longevity and performance over time
* Correlations between audio features and popularity

#### 3. Application Developers
Developers may use the database as a backend for:
* Dashboards displaying music rankings
* Reporting tools for streaming analytics
* Educational or prototype music-analytics applications

## Database Software

The database application I intend to use is [PostGreSQL](https://www.postgresql.org/) if permitted, otherwise I will use Oracle SQL.
PostGreSQL offers strong string manipulation functions built in, allowing for particular ease of navigating my database.
