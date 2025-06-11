"use client"

import { useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Music, Clock, AlertCircle, Database } from "lucide-react"

interface LyricLine {
  time: number
  text: string
}

interface LyricsDisplayProps {
  lyrics: LyricLine[]
  currentTime: number
  currentLyricIndex: number
  trackTitle?: string
  trackArtist?: string
  onRefreshLyrics?: () => void
  isLoading?: boolean
  source?: string
  error?: string | null
  isFullscreen?: boolean
}

export function LyricsDisplay({
  lyrics,
  currentTime,
  currentLyricIndex,
  trackTitle,
  trackArtist,
  onRefreshLyrics,
  isLoading = false,
  source = "",
  error = null,
  isFullscreen = false,
}: LyricsDisplayProps) {
  // Auto-scroll to current lyric
  useEffect(() => {
    const currentElement = document.getElementById(`lyric-${currentLyricIndex}`)
    if (currentElement) {
      currentElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [currentLyricIndex])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const getSourceDisplay = () => {
    switch (source) {
      case "lrclib":
        return {
          name: "LRCLIB",
          url: "https://lrclib.net",
          description: "Synchronized Lyrics",
          icon: <Database className="h-4 w-4" />,
        }
      case "lrclib_plain":
        return {
          name: "LRCLIB",
          url: "https://lrclib.net",
          description: "Plain Lyrics",
          icon: <Music className="h-4 w-4" />,
        }
      case "fallback":
        return {
          name: "Generated",
          url: null,
          description: "Generated Lyrics",
          icon: <Music className="h-4 w-4" />,
        }
      case "not_found":
        return {
          name: "Not Found",
          url: null,
          description: "No Lyrics Available",
          icon: <AlertCircle className="h-4 w-4" />,
        }
      case "error":
        return {
          name: "Error",
          url: null,
          description: "Failed to Load",
          icon: <AlertCircle className="h-4 w-4" />,
        }
      default:
        return {
          name: "Unknown",
          url: null,
          description: "Lyrics",
          icon: <Music className="h-4 w-4" />,
        }
    }
  }

  const sourceInfo = getSourceDisplay()

  const containerClass = isFullscreen ? "h-full p-8" : "dark-gradient-card p-6 mt-8"

  const contentHeight = isFullscreen ? "h-full" : "h-72"

  const textSize = isFullscreen ? "text-2xl leading-relaxed" : "text-sm"

  const timeSize = isFullscreen ? "text-lg" : "text-xs"

  return (
    <Card className={containerClass}>
      {!isFullscreen && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Music className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-semibold gradient-text">{sourceInfo.description}</h3>
            {source === "lrclib" && lyrics.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4" />
                Synced
              </div>
            )}
            {source === "lrclib_plain" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                Plain Text
              </div>
            )}
            {source === "fallback" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                Generated
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {onRefreshLyrics && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshLyrics}
                className="h-9 hover:bg-primary/20"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
            {sourceInfo.url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(sourceInfo.url, "_blank")}
                className="h-9 hover:bg-primary/20"
              >
                {sourceInfo.icon}
                <span className="ml-2">{sourceInfo.name}</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-muted/30 rounded-lg text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <span className="text-muted-foreground">{error}</span>
        </div>
      )}

      <div className={`${contentHeight} overflow-y-auto custom-scrollbar`}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg">Loading lyrics from LRCLIB...</p>
              {trackTitle && trackArtist && (
                <p className="text-sm mt-2 opacity-75">
                  Searching for "{trackTitle}" by {trackArtist}
                </p>
              )}
            </div>
          </div>
        ) : lyrics.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Music className="h-16 w-16 mx-auto mb-6 opacity-50" />
              <p className="text-xl mb-3">No lyrics found</p>
              <p className="text-sm opacity-75">
                {trackTitle && trackArtist
                  ? `No lyrics available for "${trackTitle}" by ${trackArtist}`
                  : "Upload a track to see lyrics"}
              </p>
            </div>
          </div>
        ) : (
          <div className={`space-y-${isFullscreen ? "6" : "2"} ${isFullscreen ? "max-w-4xl mx-auto" : ""}`}>
            {lyrics.map((lyric, index) => (
              <div
                key={index}
                id={`lyric-${index}`}
                className={`py-${isFullscreen ? "6" : "3"} px-${isFullscreen ? "8" : "4"} rounded-lg transition-all duration-300 ${
                  index === currentLyricIndex
                    ? `text-primary font-semibold bg-primary/10 scale-105 shadow-md border-l-4 border-primary ${isFullscreen ? "transform scale-110" : ""}`
                    : index < currentLyricIndex
                      ? "text-muted-foreground/60"
                      : "text-foreground hover:bg-muted/30"
                }`}
              >
                <div className={`flex items-center gap-${isFullscreen ? "6" : "4"}`}>
                  <span
                    className={`${timeSize} text-muted-foreground font-mono min-w-[${isFullscreen ? "60px" : "45px"}]`}
                  >
                    {formatTime(lyric.time)}
                  </span>
                  <span className={`flex-1 ${textSize} ${isFullscreen ? "leading-relaxed" : ""}`}>{lyric.text}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isFullscreen && source && (
        <div className="mt-6 pt-4 border-t border-border/50 text-xs text-muted-foreground text-center">
          {source === "lrclib" ? (
            <div className="flex items-center justify-center gap-2">
              <span>Synchronized lyrics from</span>
              <a
                href="https://lrclib.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                LRCLIB
              </a>
            </div>
          ) : source === "lrclib_plain" ? (
            <div className="flex items-center justify-center gap-2">
              <span>Plain lyrics from</span>
              <a
                href="https://lrclib.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                LRCLIB
              </a>
            </div>
          ) : source === "fallback" ? (
            <span>Generated lyrics - API unavailable</span>
          ) : source === "not_found" ? (
            <span>No lyrics found for this track</span>
          ) : source === "error" ? (
            <span>Failed to load lyrics - try refreshing</span>
          ) : (
            <span>Lyrics source: {source}</span>
          )}
        </div>
      )}
    </Card>
  )
}
