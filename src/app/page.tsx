"use client";
import Image from "next/image";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Upload,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    Repeat,
    Shuffle,
    Maximize2,
    Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { LyricsDisplay } from "@/components/lyrics-display";
import { ThemeToggle } from "@/components/theme-toggle";

interface Track {
    id: string;
    file: File;
    url: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    albumArt?: string;
    releaseDate?: string;
    musicbrainzId?: string;
}

interface LyricLine {
    time: number;
    text: string;
}

type RepeatMode = "off" | "all" | "one";

export default function MusicPlayer() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState([75]);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
    const [isShuffled, setIsShuffled] = useState(false);
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
    const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
    const [lyricsSource, setLyricsSource] = useState("");
    const [lyricsError, setLyricsError] = useState<string | null>(null);
    const [metadataFetched, setMetadataFetched] = useState<Set<string>>(
        new Set()
    );
    const [hasUploadedTracks, setHasUploadedTracks] = useState(false);
    const [showLyrics, setShowLyrics] = useState(true);
    const [isFullscreenLyrics, setIsFullscreenLyrics] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Memoized fetchMetadata to avoid unnecessary re-creations
    const fetchMetadata = useCallback(
        async (title: string, artist: string) => {
            const trackKey = `${title}-${artist}`;
            setMetadataFetched((prev) => new Set(prev).add(trackKey));
            try {
                setIsLoadingMetadata(true);
                const response = await fetch("/api/metadata", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, artist }),
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log("Received metadata from API:", data.metadata);
                    if (data.metadata) {
                        setTracks((prevTracks) =>
                            prevTracks.map((track) =>
                                track.id === currentTrack?.id
                                    ? {
                                          ...track,
                                          title:
                                              data.metadata.title ||
                                              track.title,
                                          artist:
                                              data.metadata.artist ||
                                              track.artist,
                                          album:
                                              data.metadata.album ||
                                              track.album,
                                          albumArt:
                                              data.metadata.coverArtUrl ||
                                              track.albumArt,
                                          releaseDate:
                                              data.metadata.releaseDate,
                                          musicbrainzId:
                                              data.metadata.musicbrainzId,
                                      }
                                    : track
                            )
                        );
                        if (currentTrack) {
                            setCurrentTrack((prev) =>
                                prev
                                    ? {
                                          ...prev,
                                          title:
                                              data.metadata.title || prev.title,
                                          artist:
                                              data.metadata.artist ||
                                              prev.artist,
                                          album:
                                              data.metadata.album || prev.album,
                                          albumArt:
                                              data.metadata.coverArtUrl ||
                                              prev.albumArt,
                                          releaseDate:
                                              data.metadata.releaseDate,
                                          musicbrainzId:
                                              data.metadata.musicbrainzId,
                                      }
                                    : null
                            );
                        }
                    }
                } else {
                    console.error("Metadata API failed:", response.status);
                }
            } catch (error) {
                console.error("Failed to fetch metadata (background):", error);
            } finally {
                setIsLoadingMetadata(false);
            }
        },
        [currentTrack]
    );

    // Memoized fetchLyrics to avoid unnecessary re-creations
    const fetchLyrics = useCallback(
        async (
            title: string,
            artist: string,
            album?: string,
            duration?: number
        ) => {
            try {
                setIsLoadingLyrics(true);
                setLyrics([]);
                setCurrentLyricIndex(-1);
                setLyricsSource("");
                setLyricsError(null);
                const response = await fetch("/api/lyrics", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, artist, album, duration }),
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log("Received lyrics from API:", data.lyrics);
                    if (data.lyrics && data.lyrics.length > 0) {
                        setLyrics(data.lyrics);
                        setLyricsSource(data.source);
                        if (data.error) setLyricsError(data.error);
                    } else {
                        setLyrics([]);
                        setLyricsSource(data.source || "not_found");
                        if (data.error) setLyricsError(data.error);
                    }
                } else {
                    console.error("Lyrics API failed:", response.status);
                    setLyrics([
                        { time: 0, text: `♪ ${title} ♪` },
                        { time: 2, text: `by ${artist}` },
                        { time: 5, text: "Lyrics could not be loaded" },
                        { time: 8, text: "Enjoy the music!" },
                    ]);
                    setLyricsSource("error");
                    setLyricsError("API request failed");
                }
            } catch (error) {
                console.error("Failed to fetch lyrics (background):", error);
                setLyrics([
                    { time: 0, text: `♪ ${title} ♪` },
                    { time: 2, text: `by ${artist}` },
                    { time: 5, text: "Lyrics could not be loaded" },
                    { time: 8, text: "Enjoy the music!" },
                ]);
                setLyricsSource("error");
                setLyricsError(
                    error instanceof Error ? error.message : String(error)
                );
            } finally {
                setIsLoadingLyrics(false);
            }
        },
        []
    );

    // Memoize handleNext to fix dependency issues
    const handleNext = useCallback(() => {
        if (!currentTrack || tracks.length === 0) return;
        const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
        let nextIndex;
        if (repeatMode === "one") {
            nextIndex = currentIndex;
        } else if (isShuffled) {
            nextIndex = Math.floor(Math.random() * tracks.length);
        } else {
            nextIndex = (currentIndex + 1) % tracks.length;
        }
        setCurrentTrack(tracks[nextIndex]);
        setIsPlaying(true);
    }, [currentTrack, tracks, repeatMode, isShuffled]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => handleNext();

        audio.addEventListener("timeupdate", updateTime);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", updateTime);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [currentTrack, repeatMode, isShuffled, handleNext]);

    useEffect(() => {
        // Update current lyric based on time with more precise matching
        const currentLyric = lyrics.findIndex((lyric, index) => {
            const nextLyric = lyrics[index + 1];
            return (
                currentTime >= lyric.time &&
                (!nextLyric || currentTime < nextLyric.time)
            );
        });
        setCurrentLyricIndex(currentLyric);
    }, [currentTime, lyrics]);

    // Handle escape key to exit fullscreen lyrics
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isFullscreenLyrics) {
                setIsFullscreenLyrics(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isFullscreenLyrics]);

    // Preload metadata and lyrics for all tracks as soon as tracks are uploaded or changed, but do NOT change the current track or playback state
    useEffect(() => {
        if (tracks.length > 0) {
            tracks.forEach((track) => {
                const trackKey = `${track.title}-${track.artist}`;
                if (!metadataFetched.has(trackKey)) {
                    fetchMetadata(track.title, track.artist);
                }
                // Always refresh lyrics for each song
                fetchLyrics(
                    track.title,
                    track.artist,
                    track.album,
                    track.duration
                );
            });
        }
    }, [tracks, metadataFetched, fetchMetadata, fetchLyrics]);

    // When a song starts playing or the currentTrack changes (including after next/previous), re-fetch lyrics to ensure they are correct for the current track
    useEffect(() => {
        if (currentTrack && isPlaying) {
            setLyricsSource("");
            setLyricsError(null);
            fetchLyrics(
                currentTrack.title,
                currentTrack.artist,
                currentTrack.album,
                currentTrack.duration
            );
        }
    }, [currentTrack, isPlaying, fetchLyrics]);

    // Extract metadata from filename and audio duration only (no jsmediatags)
    const extractMetadata = async (file: File): Promise<Partial<Track>> => {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.src = URL.createObjectURL(file);

            audio.addEventListener("loadedmetadata", () => {
                const filename = file.name.replace(/\.[^/.]+$/, "");
                let title = filename;
                let artist = "Unknown Artist";
                const album = "Unknown Album";
                const duration = audio.duration;
                const albumArt: string | undefined = undefined;

                // Parse filename for common patterns: "Artist - Title" or "Title - Artist"
                if (filename.includes(" - ")) {
                    const parts = filename.split(" - ");
                    if (parts.length >= 2) {
                        artist = parts[0].trim();
                        title = parts.slice(1).join(" - ").trim();
                    }
                }

                resolve({ title, artist, album, duration, albumArt });
            });
        });
    };

    const getDeterministicId = async (file: File) => {
        // Use Web Crypto API in browser
        const data = new TextEncoder().encode(
            file.name + file.size + file.lastModified
        );
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    };

    const handleFileUpload = async (files: FileList) => {
        const newTracks: Track[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type === "audio/mpeg" || file.type === "audio/mp3") {
                const metadata = await extractMetadata(file);
                let finalMetadata = { ...metadata };
                if (!metadata.title || !metadata.artist || !metadata.album) {
                    const response = await fetch("/api/metadata", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            title: metadata.title || file.name,
                            artist: metadata.artist || "Unknown Artist",
                        }),
                    });
                    if (response.ok) {
                        const data = await response.json();
                        finalMetadata = {
                            ...finalMetadata,
                            title: finalMetadata.title || data.metadata.title,
                            artist:
                                finalMetadata.artist || data.metadata.artist,
                            album: finalMetadata.album || data.metadata.album,
                            albumArt:
                                finalMetadata.albumArt ||
                                data.metadata.coverArtUrl,
                            duration:
                                finalMetadata.duration ||
                                data.metadata.duration,
                        };
                    }
                }
                const id = await getDeterministicId(file);
                const track: Track = {
                    id,
                    file,
                    url: URL.createObjectURL(file),
                    title: finalMetadata.title || file.name,
                    artist: finalMetadata.artist || "Unknown Artist",
                    album: finalMetadata.album || "Unknown Album",
                    duration: finalMetadata.duration || 0,
                    albumArt:
                        finalMetadata.albumArt ||
                        "/placeholder.svg?height=96&width=96",
                };
                newTracks.push(track);
            }
        }
        setTracks((prev) => [...prev, ...newTracks]);
        if (newTracks.length > 0) {
            setHasUploadedTracks(true);
        }
        // Do NOT auto-play or auto-select a track here
    };

    const handlePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Removed duplicate handleNext function to avoid redeclaration error.

    const handlePrevious = () => {
        if (!currentTrack || tracks.length === 0) return;

        const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
        const prevIndex =
            currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;

        setCurrentTrack(tracks[prevIndex]);
        setIsPlaying(true);
    };

    const handleSeek = (value: number[]) => {
        if (audioRef.current && currentTrack) {
            const newTime = (value[0] / 100) * currentTrack.duration;
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        setVolume(value);
        if (audioRef.current) {
            audioRef.current.volume = value[0] / 100;
        }
    };

    const toggleRepeatMode = () => {
        const modes: RepeatMode[] = ["off", "all", "one"];
        const currentIndex = modes.indexOf(repeatMode);
        setRepeatMode(modes[(currentIndex + 1) % modes.length]);
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    // Fullscreen Lyrics Component
    const FullscreenLyrics = () => (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50">
                <div className="flex items-center gap-4">
                    {currentTrack && (
                        <>
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                <Image
                                    src={
                                        currentTrack.albumArt ||
                                        "/placeholder.svg?height=48&width=48"
                                    }
                                    alt={currentTrack.album}
                                    className="w-full h-full object-cover"
                                    width={48}
                                    height={48}
                                    unoptimized={currentTrack.albumArt?.startsWith(
                                        "blob:"
                                    )}
                                />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">
                                    {currentTrack.title}
                                </h2>
                                <p className="text-sm text-primary">
                                    {currentTrack.artist}
                                </p>
                            </div>
                        </>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsFullscreenLyrics(false)}
                    className="h-10 w-10"
                >
                    <Minimize2 className="h-5 w-5" />
                </Button>
            </div>

            {/* Fullscreen Lyrics Content */}
            <div className="flex-1 overflow-y-auto">
                <LyricsDisplay
                    lyrics={lyrics}
                    currentTime={currentTime}
                    currentLyricIndex={currentLyricIndex}
                    trackTitle={currentTrack?.title}
                    trackArtist={currentTrack?.artist}
                    onRefreshLyrics={() => {
                        if (currentTrack) {
                            setLyricsSource("");
                            setLyricsError(null);
                            fetchLyrics(
                                currentTrack.title,
                                currentTrack.artist,
                                currentTrack.album,
                                currentTrack.duration
                            );
                        }
                    }}
                    isLoading={isLoadingLyrics}
                    source={lyricsSource}
                    error={lyricsError}
                    isFullscreen={true}
                />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen dark-gradient-bg transition-colors">
            <div className="container mx-auto p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold gradient-text">
                        Music Player
                    </h1>
                    <ThemeToggle />
                </div>

                {/* Upload Area - Conditional Rendering */}
                {!hasUploadedTracks ? (
                    <Card className="upload-area p-12 mb-8">
                        <div
                            className="text-center cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={(e) => {
                                e.preventDefault();
                                handleFileUpload(e.dataTransfer.files);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <Upload className="mx-auto h-16 w-16 text-primary mb-6" />
                            <p className="text-xl mb-3 font-semibold">
                                Drop MP3 files here or click to upload
                            </p>
                            <p className="text-muted-foreground">
                                Supports MP3 format with automatic metadata
                                detection
                            </p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="audio/mp3,audio/mpeg"
                            className="hidden"
                            onChange={(e) =>
                                e.target.files &&
                                handleFileUpload(e.target.files)
                            }
                        />
                    </Card>
                ) : (
                    /* Small Upload Button in Corner */
                    <div className="fixed top-4 right-20 z-50">
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="enhanced-button rounded-full h-14 w-14"
                            size="icon"
                            title="Upload more music"
                        >
                            <Upload className="h-6 w-6" />
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="audio/mp3,audio/mpeg"
                            className="hidden"
                            onChange={(e) =>
                                e.target.files &&
                                handleFileUpload(e.target.files)
                            }
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Player */}
                    <div
                        className={
                            showLyrics ? "lg:col-span-2" : "lg:col-span-3"
                        }
                    >
                        <Card className="dark-gradient-card p-8">
                            {currentTrack ? (
                                <>
                                    {/* Album Art and Track Info */}
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="w-28 h-28 rounded-xl bg-muted flex items-center justify-center overflow-hidden relative shadow-2xl">
                                            {isLoadingMetadata && (
                                                <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                </div>
                                            )}
                                            <Image
                                                src={
                                                    currentTrack.albumArt ||
                                                    "/placeholder.svg?height=112&width=112"
                                                }
                                                alt={currentTrack.album}
                                                className="w-full h-full object-cover"
                                                width={112}
                                                height={112}
                                                unoptimized={currentTrack.albumArt?.startsWith(
                                                    "blob:"
                                                )}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-3xl font-bold mb-2 text-foreground">
                                                {currentTrack.title}
                                            </h2>
                                            <p className="text-xl text-primary mb-2 font-medium">
                                                {currentTrack.artist}
                                            </p>
                                            <p className="text-muted-foreground">
                                                {currentTrack.album}
                                            </p>
                                            {currentTrack.releaseDate && (
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Released:{" "}
                                                    {currentTrack.releaseDate}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Enhanced Progress Bar */}
                                    <div className="mb-8">
                                        <div
                                            className="relative w-full h-4 bg-muted rounded-full overflow-hidden cursor-pointer shadow-inner"
                                            onClick={(e) => {
                                                const rect =
                                                    e.currentTarget.getBoundingClientRect();
                                                const x = e.clientX - rect.left;
                                                const percentage =
                                                    (x / rect.width) * 100;
                                                handleSeek([
                                                    Math.max(
                                                        0,
                                                        Math.min(
                                                            100,
                                                            percentage
                                                        )
                                                    ),
                                                ]);
                                            }}
                                        >
                                            {/* Show loading shimmer if duration is missing or zero */}
                                            {!currentTrack.duration ||
                                            isNaN(currentTrack.duration) ||
                                            currentTrack.duration === 0 ? (
                                                <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 animate-pulse rounded-full" />
                                            ) : (
                                                <div
                                                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-200"
                                                    style={{
                                                        width: `${Math.max(
                                                            0,
                                                            Math.min(
                                                                100,
                                                                (currentTime /
                                                                    currentTrack.duration) *
                                                                    100
                                                            )
                                                        )}%`,
                                                        background:
                                                            "var(--primary, #6366f1)",
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div className="flex justify-between text-sm text-muted-foreground mt-3">
                                            <span className="font-mono">
                                                {formatTime(currentTime)}
                                            </span>
                                            <span className="font-mono">
                                                {formatTime(
                                                    currentTrack.duration
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Enhanced Controls */}
                                    <div className="flex justify-between items-center mb-8">
                                        {/* Volume Control - Left Side */}
                                        <div className="flex items-center gap-3 w-32">
                                            <Volume2 className="h-5 w-5 text-primary" />
                                            <Slider
                                                value={volume}
                                                onValueChange={
                                                    handleVolumeChange
                                                }
                                                max={100}
                                                step={1}
                                                className="w-24"
                                            />
                                        </div>

                                        {/* Main Controls - Centered */}
                                        <div className="flex items-center gap-6">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() =>
                                                    setIsShuffled(!isShuffled)
                                                }
                                                className={`h-12 w-12 transition-all ${
                                                    isShuffled
                                                        ? "bg-primary text-primary-foreground shadow-lg"
                                                        : "hover:bg-primary/20"
                                                }`}
                                            >
                                                <Shuffle className="h-5 w-5" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={handlePrevious}
                                                className="h-12 w-12 hover:bg-primary/20"
                                            >
                                                <SkipBack className="h-5 w-5" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                onClick={handlePlay}
                                                className="enhanced-button h-16 w-16"
                                            >
                                                {isPlaying ? (
                                                    <Pause className="h-8 w-8" />
                                                ) : (
                                                    <Play className="h-8 w-8" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={handleNext}
                                                className="h-12 w-12 hover:bg-primary/20"
                                            >
                                                <SkipForward className="h-5 w-5" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={toggleRepeatMode}
                                                className={`h-12 w-12 transition-all ${
                                                    repeatMode !== "off"
                                                        ? "bg-primary text-primary-foreground shadow-lg"
                                                        : "hover:bg-primary/20"
                                                }`}
                                            >
                                                <Repeat className="h-5 w-5" />
                                                {repeatMode === "one" && (
                                                    <span className="absolute text-xs font-bold">
                                                        1
                                                    </span>
                                                )}
                                            </Button>
                                        </div>

                                        {/* Right Side - Empty for balance */}
                                        <div className="w-32"></div>
                                    </div>

                                    {/* Lyrics Controls */}
                                    <div className="flex justify-center items-center gap-4 mb-6">
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                setShowLyrics(!showLyrics)
                                            }
                                            className="hover:bg-primary/20"
                                        >
                                            {showLyrics
                                                ? "Hide Lyrics"
                                                : "Show Lyrics"}
                                        </Button>
                                        {lyrics.length > 0 && (
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    setIsFullscreenLyrics(true)
                                                }
                                                className="hover:bg-primary/20"
                                            >
                                                <Maximize2 className="h-4 w-4 mr-2" />
                                                Fullscreen Lyrics
                                            </Button>
                                        )}
                                    </div>

                                    {/* Inline Lyrics - Only show if showLyrics is true */}
                                    {showLyrics && (
                                        <LyricsDisplay
                                            lyrics={lyrics}
                                            currentTime={currentTime}
                                            currentLyricIndex={
                                                currentLyricIndex
                                            }
                                            trackTitle={currentTrack?.title}
                                            trackArtist={currentTrack?.artist}
                                            onRefreshLyrics={() => {
                                                if (currentTrack) {
                                                    setLyricsSource("");
                                                    setLyricsError(null);
                                                    fetchLyrics(
                                                        currentTrack.title,
                                                        currentTrack.artist,
                                                        currentTrack.album,
                                                        currentTrack.duration
                                                    );
                                                }
                                            }}
                                            isLoading={isLoadingLyrics}
                                            source={lyricsSource}
                                            error={lyricsError}
                                        />
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="text-6xl mb-4">🎵</div>
                                    <p className="text-muted-foreground text-xl">
                                        Upload some music to get started
                                    </p>
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Playlist - Only show if lyrics are hidden */}
                    {!showLyrics && (
                        <div>
                            <Card className="dark-gradient-card p-6">
                                <h3 className="text-xl font-semibold mb-6 gradient-text">
                                    Playlist ({tracks.length})
                                </h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                                    {tracks.map((track) => (
                                        <div
                                            key={track.id}
                                            className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                                                currentTrack?.id === track.id
                                                    ? "bg-primary/20 text-primary shadow-lg transform scale-[1.02] border border-primary/30"
                                                    : "hover:bg-primary/10 hover:shadow-md hover:transform hover:scale-[1.01]"
                                            }`}
                                            onClick={() => {
                                                setCurrentTrack(track);
                                                setIsPlaying(true);
                                            }}
                                        >
                                            <div className="font-semibold truncate text-sm">
                                                {track.title}
                                            </div>
                                            <div className="text-xs opacity-75 truncate mt-1">
                                                {track.artist}
                                            </div>
                                            <div className="text-xs opacity-50 truncate">
                                                {track.album}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Playlist - Show on right when lyrics are visible */}
                    {showLyrics && (
                        <div>
                            <Card className="dark-gradient-card p-6">
                                <h3 className="text-xl font-semibold mb-6 gradient-text">
                                    Playlist ({tracks.length})
                                </h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                                    {tracks.map((track) => (
                                        <div
                                            key={track.id}
                                            className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                                                currentTrack?.id === track.id
                                                    ? "bg-primary/20 text-primary shadow-lg transform scale-[1.02] border border-primary/30"
                                                    : "hover:bg-primary/10 hover:shadow-md hover:transform hover:scale-[1.01]"
                                            }`}
                                            onClick={() => {
                                                setCurrentTrack(track);
                                                setIsPlaying(true);
                                            }}
                                        >
                                            <div className="font-semibold truncate text-sm">
                                                {track.title}
                                            </div>
                                            <div className="text-xs opacity-75 truncate mt-1">
                                                {track.artist}
                                            </div>
                                            <div className="text-xs opacity-50 truncate">
                                                {track.album}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            {/* Fullscreen Lyrics Overlay */}
            {isFullscreenLyrics && <FullscreenLyrics />}

            {/* Hidden Audio Element */}
            {currentTrack && (
                <audio
                    ref={audioRef}
                    src={currentTrack.url}
                    onLoadedData={() => {
                        if (audioRef.current) {
                            audioRef.current.volume = volume[0] / 100;
                            if (isPlaying) {
                                audioRef.current.play();
                            }
                        }
                    }}
                />
            )}
        </div>
    );
}
