import { type NextRequest, NextResponse } from "next/server";
import { SyncLyrics } from "@stef-0012/synclyrics";

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

        try {
            // Fetch lyrics using SyncLyrics
            const syncLyrics = new SyncLyrics();
            const lyricsData = await syncLyrics.getLyrics({
                track: title,
                artist: artist,
                album: album,
                length: duration,
            });
            // Prefer line-synced, then plain
            const lineSynced = lyricsData.lyrics.lineSynced;
            if (lineSynced && lineSynced.lyrics) {
                // Debug: log the raw LRC and parsed output
                console.log("Raw lineSynced.lyrics:", lineSynced.lyrics);
                const parsedLines = lineSynced.parse(lineSynced.lyrics) || [];
                console.log("Parsed lines:", parsedLines);
                // If all times are 0, try to parse manually as fallback
                let lyrics: LyricLine[] = parsedLines.map(
                    (line: { time: number; text: string }) => ({
                        time:
                            line.time && !isNaN(line.time)
                                ? line.time // FIX: do not divide by 1000, already in seconds
                                : 0,
                        text: line.text,
                    })
                );
                const allZero = lyrics.every((l) => l.time === 0);
                if (allZero) {
                    // Try manual LRC parsing as fallback
                    lyrics = parseLRC(lineSynced.lyrics);
                }
                return NextResponse.json({
                    lyrics,
                    source: "synclyrics",
                });
            }
            // Fallback to plain lyrics
            const plain = lyricsData.lyrics.plain;
            if (plain && plain.lyrics) {
                const lyrics = convertPlainToTimedLyrics(
                    plain.lyrics,
                    duration ? Number(duration) : 180
                );
                return NextResponse.json({
                    lyrics,
                    source: "synclyrics_plain",
                });
            }
            // No lyrics found
            return NextResponse.json({
                lyrics: generateFallbackLyrics(title, artist),
                source: "fallback",
                message: "No lyrics available for this track",
            });
        } catch (fetchError) {
            console.error("SyncLyrics fetch error:", fetchError);
            return NextResponse.json({
                lyrics: generateFallbackLyrics(title, artist),
                source: "fallback",
                error: `SyncLyrics unavailable: ${
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

// Manual LRC parser fallback
function parseLRC(lrc: string): LyricLine[] {
    const lines = lrc.split(/\r?\n/);
    const result: LyricLine[] = [];
    const timeTag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
    for (const line of lines) {
        let match: RegExpExecArray | null;
        let text = line;
        let lastIndex = 0;
        while ((match = timeTag.exec(line)) !== null) {
            const min = parseInt(match[1], 10);
            const sec = parseInt(match[2], 10);
            const ms = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
            const time = min * 60 + sec + ms / 1000;
            lastIndex = timeTag.lastIndex;
            text = line.slice(lastIndex).trim();
            result.push({ time, text });
        }
    }
    // Sort by time
    return result.sort((a, b) => a.time - b.time);
}
