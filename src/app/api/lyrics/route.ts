import { type NextRequest, NextResponse } from "next/server";
import { Client } from "lrclib-api";

interface LyricLine {
    time: number;
    text: string;
}

export async function POST(request: NextRequest) {
    try {
        const { title, artist, album, duration } = await request.json();

        if (!title || !artist) {
            return NextResponse.json(
                { error: "Title and artist are required" },
                { status: 400 }
            );
        }

        const client = new Client();
        // Use correct Query type for lrclib-api
        const query = {
            track_name: title,
            artist_name: artist,
            ...(album ? { album_name: album } : {}),
            ...(duration ? { duration: Number(duration) * 1000 } : {}), // duration in ms
        };

        try {
            // Get synced lyrics using lrclib-api npm package
            const syncedLyrics = await client.getSynced(query);

            if (Array.isArray(syncedLyrics) && syncedLyrics.length > 0) {
                // Convert ms to seconds for your LyricLine interface
                const lyrics: LyricLine[] = syncedLyrics.map((line) => ({
                    time: line.startTime ? line.startTime / 1000 : 0,
                    text: line.text,
                }));
                return NextResponse.json({
                    lyrics,
                    source: "lrclib",
                });
            }

            // Fallback to unsynced/plain lyrics
            const unsyncedLyrics = await client.getUnsynced(query);
            if (Array.isArray(unsyncedLyrics) && unsyncedLyrics.length > 0) {
                const lyrics = convertPlainToTimedLyrics(
                    unsyncedLyrics.map((l) => l.text).join("\n"),
                    duration ? Number(duration) : 180
                );
                return NextResponse.json({
                    lyrics,
                    source: "lrclib_plain",
                });
            }

            // No lyrics found
            return NextResponse.json({
                lyrics: generateFallbackLyrics(title, artist),
                source: "fallback",
                message: "No lyrics available for this track",
            });
        } catch (fetchError) {
            console.error("LRCLIB fetch error:", fetchError);
            return NextResponse.json({
                lyrics: generateFallbackLyrics(title, artist),
                source: "fallback",
                error: `LRCLIB unavailable: ${
                    fetchError instanceof Error
                        ? fetchError.message
                        : String(fetchError)
                }`,
            });
        }
    } catch (error) {
        console.error("Lyrics API error:", error);
        return NextResponse.json({
            lyrics: generateFallbackLyrics("Unknown", "Unknown"),
            source: "error",
            error: `Failed to process request: ${
                error instanceof Error ? error.message : String(error)
            }`,
        });
    }
}

function convertPlainToTimedLyrics(
    plainLyrics: string,
    duration: number
): LyricLine[] {
    const lines = plainLyrics.split("\n").filter((line) => line.trim());
    const lyrics: LyricLine[] = [];

    const timePerLine = lines.length > 0 ? duration / lines.length : duration;

    lines.forEach((line, index) => {
        lyrics.push({
            time: index * timePerLine,
            text: line.trim(),
        });
    });

    return lyrics;
}

function generateFallbackLyrics(title: string, artist: string): LyricLine[] {
    return [
        { time: 0, text: `♪ ${title} ♪` },
        { time: 2, text: `by ${artist}` },
        { time: 5, text: "" },
        { time: 8, text: "Music fills the silence" },
        { time: 12, text: "When words are not enough" },
        { time: 16, text: "Let the rhythm guide you" },
        { time: 20, text: "Through the highs and lows" },
        { time: 24, text: "" },
        { time: 26, text: "Every note tells a story" },
        { time: 30, text: "Every beat has meaning" },
        { time: 34, text: "Listen with your heart" },
        { time: 38, text: "And feel the emotion" },
        { time: 42, text: "" },
        { time: 45, text: "🎵 Enjoy the music 🎵" },
    ];
}
