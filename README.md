# 🎵 Next.js Music Player

A beautiful, modern music player built with Next.js, featuring:

-   **Synced lyrics** with precise timing (using `@stef-0012/synclyrics`)
-   **High-quality album art** and rich metadata (from MusicBrainz & Cover Art Archive)
-   **Drag & drop or click-to-upload** MP3s with instant metadata/lyrics prefetch
-   **Duplicate prevention** (no double songs by title-artist)
-   **Responsive progress bar** with loading state
-   **Modern, responsive UI** with dark/light themes

---

## ✨ Features

-   **Upload MP3s**: Drag & drop or click to upload. Metadata is auto-extracted and enhanced via MusicBrainz.
-   **Synced Lyrics**: Fetches and displays time-synced lyrics for each track, with smooth highlighting.
-   **Album Art**: Always attempts to fetch the highest-quality cover art from Cover Art Archive, falling back to a placeholder if not found.
-   **Metadata Prefetch**: All metadata and lyrics are fetched in the background as soon as a song is uploaded.
-   **No Duplicates**: Prevents adding the same song (by title-artist) more than once.
-   **Progress Bar**: Visually tracks playback, handles loading/unknown duration gracefully.
-   **Playlist**: Click any track to play instantly. Playlist updates as you upload more music.
-   **Lyrics Fullscreen**: Expand lyrics to fullscreen for karaoke-style experience.
-   **Dark/Light Theme**: Toggle between beautiful dark and light modes.

---

## 🚀 Getting Started

### 1. Install dependencies

```sh
npm install
```

### 2. Run the development server

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Project Structure

-   `src/app/page.tsx` — Main player UI, upload logic, progress bar, deduplication, lyrics/metadata prefetch
-   `src/app/api/lyrics/route.ts` — Lyrics API (uses `@stef-0012/synclyrics`, robust fallback parsing)
-   `src/app/api/metadata/route.ts` — Metadata API (fetches from MusicBrainz & Cover Art Archive)
-   `src/components/lyrics-display.tsx` — Lyrics rendering component
-   `public/placeholder.svg` — Fallback album art

---

## 🧠 How It Works

-   **On Upload:**
    -   Extracts basic metadata from the file name and audio tags
    -   Prefetches enhanced metadata (title, artist, album, cover art) from MusicBrainz
    -   Prefetches synced lyrics (LRC) using `@stef-0012/synclyrics` (with fallback manual parsing)
    -   Prevents duplicate tracks (by title-artist)
-   **On Play:**
    -   Displays album art, title, artist, album, and release date
    -   Shows a progress bar that updates in real time
    -   Renders synced lyrics, highlighting the current line
    -   Allows fullscreen lyrics mode

---

## 🖼️ Screenshots

![Music Player Screenshot](./public/placeholder.svg)

---

## ⚡ API Details

### `/api/lyrics`

-   POST `{ title, artist, album, duration }`
-   Returns: `{ lyrics: [{ time, text }], source, error? }`
-   Uses `@stef-0012/synclyrics` for best-in-class lyric sync

### `/api/metadata`

-   POST `{ title, artist }`
-   Returns: `{ metadata: { title, artist, album, coverArtUrl, releaseDate, musicbrainzId } }`
-   Loops through all releases, always attempts to fetch cover art from Cover Art Archive

---

## 📝 Customization & Extending

-   Add more audio formats by updating the upload logic
-   Style the UI by editing `globals.css` and component classes
-   Add more metadata fields or lyric sources as needed

---

## 🙏 Credits

-   [@stef-0012/synclyrics](https://www.npmjs.com/package/@stef-0012/synclyrics)
-   [MusicBrainz](https://musicbrainz.org/)
-   [Cover Art Archive](https://coverartarchive.org/)
-   [Next.js](https://nextjs.org/)

---

## 📄 License

MIT
