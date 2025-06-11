import { type NextRequest, NextResponse } from "next/server";

interface TrackMetadata {
    title: string;
    artist: string;
    album: string;
    duration?: number;
    releaseDate?: string;
    coverArtUrl?: string;
    musicbrainzId?: string;
}

export async function POST(request: NextRequest) {
    try {
        const { title, artist } = await request.json();
        if (!title || !artist) {
            return NextResponse.json(
                { error: "Title and artist are required" },
                { status: 400 }
            );
        }
        // Search MusicBrainz for recording
        const query = `recording:"${title}" AND artist:"${artist}"`;
        const encodedQuery = encodeURIComponent(query);
        const mbUrl = `https://musicbrainz.org/ws/2/recording/?query=${encodedQuery}&fmt=json&inc=releases+artist-credits+cover-art-archive`;
        try {
            const response = await fetch(mbUrl, {
                headers: {
                    "User-Agent": "MusicPlayer/1.0 (contact@example.com)",
                },
            });
            if (!response.ok) {
                return NextResponse.json({
                    metadata: { title, artist, album: "Unknown Album" },
                    source: "fallback",
                    message: `MusicBrainz API returned ${response.status}`,
                });
            }
            const data = await response.json();
            if (!data.recordings || data.recordings.length === 0) {
                return NextResponse.json({
                    metadata: { title, artist, album: "Unknown Album" },
                    source: "fallback",
                    message: "No metadata found in MusicBrainz",
                });
            }
            // Get the first recording with the best match
            const recording = data.recordings[0];
            const release = recording.releases?.[0];
            const metadata: TrackMetadata = {
                title: recording.title || title,
                artist: recording["artist-credit"]?.[0]?.name || artist,
                album: release?.title || "Unknown Album",
                duration: recording.length
                    ? recording.length / 1000
                    : undefined,
                releaseDate: release?.date,
                musicbrainzId: recording.id,
            };
            // Try all releases for cover art using Cover Art Archive
            let foundCover = false;
            if (recording.releases && recording.releases.length > 0) {
                for (const rel of recording.releases) {
                    if (rel.id) {
                        try {
                            // Always try to fetch cover art from Cover Art Archive
                            const coverArtUrl = `https://coverartarchive.org/release/${rel.id}/front-500.jpg`;
                            const artResponse = await fetch(coverArtUrl, {
                                method: "HEAD",
                            });
                            if (artResponse.ok) {
                                metadata.coverArtUrl = coverArtUrl;
                                metadata.album = rel.title || metadata.album;
                                foundCover = true;
                                break;
                            }
                        } catch {
                            // Ignore cover art errors
                        }
                    }
                }
            }
            return NextResponse.json({
                metadata,
                source: "musicbrainz",
                releaseId: foundCover ? metadata.musicbrainzId : release?.id,
            });
        } catch (fetchError) {
            return NextResponse.json({
                metadata: { title, artist, album: "Unknown Album" },
                source: "fallback",
                error: `MusicBrainz unavailable: ${
                    fetchError instanceof Error
                        ? fetchError.message
                        : String(fetchError)
                }`,
            });
        }
    } catch (error) {
        return NextResponse.json({
            metadata: {
                title: "Unknown",
                artist: "Unknown Artist",
                album: "Unknown Album",
            },
            source: "error",
            error: `Failed to process request: ${
                error instanceof Error ? error.message : String(error)
            }`,
        });
    }
}
