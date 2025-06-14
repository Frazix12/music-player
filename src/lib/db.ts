import Database from "better-sqlite3";
import path from "path";

// Use a persistent file in the project root
const dbPath = path.join(process.cwd(), "music-metadata.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT,
  artist TEXT,
  album TEXT,
  duration REAL,
  releaseDate TEXT,
  coverArtUrl TEXT,
  musicbrainzId TEXT
);
`);

export default db;
