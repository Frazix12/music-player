import { type NextRequest, NextResponse } from "next/server"

interface MusicBrainzRecording {
  recordings?: Array<{
    id: string
    title: string
    length?: number
    "artist-credit"?: Array<{
      name: string
      artist: {
        id: string
        name: string
      }
    }>
    releases?: Array<{
      id: string
      title: string
      date?: string
      "cover-art-archive"?: {
        artwork: boolean
        count: number
        front: boolean
        back: boolean
      }
    }>
  }>
}

interface TrackMetadata {
  title: string
  artist: string
  album: string
  duration?: number
  releaseDate?: string
  coverArtUrl?: string
  musicbrainzId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { title, artist } = await request.json()

    if (!title || !artist) {
      return NextResponse.json({ error: "Title and artist are required" }, { status: 400 })
    }

    // Search MusicBrainz for recording
    const query = `recording:"${title}" AND artist:"${artist}"`
    const encodedQuery = encodeURIComponent(query)
    const mbUrl = `https://musicbrainz.org/ws/2/recording/?query=${encodedQuery}&fmt=json&inc=releases+artist-credits`

    console.log(`Searching MusicBrainz for: ${title} by ${artist}`)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // Reduced to 5 seconds

      const response = await fetch(mbUrl, {
        headers: {
          "User-Agent": "MusicPlayer/1.0 (contact@example.com)",
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId))

      if (!response.ok) {
        console.warn(`MusicBrainz API error: ${response.status}`)
        return NextResponse.json({
          metadata: {
            title,
            artist,
            album: "Unknown Album",
          },
          source: "fallback",
          message: `MusicBrainz API returned ${response.status}`,
        })
      }

      const data: MusicBrainzRecording = await response.json()

      if (!data.recordings || data.recordings.length === 0) {
        return NextResponse.json({
          metadata: {
            title,
            artist,
            album: "Unknown Album",
          },
          source: "fallback",
          message: "No metadata found in MusicBrainz",
        })
      }

      // Get the first recording with the best match
      const recording = data.recordings[0]
      const release = recording.releases?.[0]

      const metadata: TrackMetadata = {
        title: recording.title || title,
        artist: recording["artist-credit"]?.[0]?.name || artist,
        album: release?.title || "Unknown Album",
        duration: recording.length ? recording.length / 1000 : undefined,
        releaseDate: release?.date,
        musicbrainzId: recording.id,
      }

      // Try to get cover art if release has artwork
      if (release?.id && release["cover-art-archive"]?.front) {
        try {
          const coverArtUrl = `https://coverartarchive.org/release/${release.id}/front-500.jpg`

          // Test if cover art exists with shorter timeout
          const artController = new AbortController()
          const artTimeoutId = setTimeout(() => artController.abort(), 3000)

          const artResponse = await fetch(coverArtUrl, {
            method: "HEAD",
            signal: artController.signal,
          }).finally(() => clearTimeout(artTimeoutId))

          if (artResponse.ok) {
            metadata.coverArtUrl = coverArtUrl
          }
        } catch (artError) {
          if (artError && typeof artError === "object" && "message" in artError) {
            console.warn("Cover art fetch failed:", (artError as { message: string }).message)
          } else {
            console.warn("Cover art fetch failed:", artError)
          }
        }
      }

      return NextResponse.json({
        metadata,
        source: "musicbrainz",
        releaseId: release?.id,
      })
    } catch (fetchError) {
      console.error("MusicBrainz fetch error:", fetchError)

      return NextResponse.json({
        metadata: {
          title,
          artist,
          album: "Unknown Album",
        },
        source: "fallback",
        error: `MusicBrainz unavailable: ${
          typeof fetchError === "object" && fetchError && "message" in fetchError
            ? (fetchError as { message: string }).message
            : String(fetchError)
        }`,
      })
    }
  } catch (error) {
    console.error("Metadata API error:", error)

    return NextResponse.json({
      metadata: {
        title: "Unknown",
        artist: "Unknown Artist",
        album: "Unknown Album",
      },
      source: "error",
      error: `Failed to process request: ${
        typeof error === "object" && error && "message" in error
          ? (error as { message: string }).message
          : String(error)
      }`,
    })
  }
}
