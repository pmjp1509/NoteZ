import { NowPlayingCard } from "@/components/dashboard/NowPlayingCard";
import { MoodRecommendations } from "@/components/dashboard/MoodRecommendations";
import { CommunityPlaylists } from "@/components/dashboard/CommunityPlaylists";
import { LyricsPanel } from "@/components/dashboard/LyricsPanel";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightSidebar } from "@/components/dashboard/RightSidebar";
import { useEffect, useRef, useState } from "react";
import { fetchRandomSongs, type SongItem } from "@/lib/songs";

export function MainDashboard() {
  const [currentSong, setCurrentSong] = useState<SongItem | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let mounted = true;
    console.log('[MainDashboard] fetching initial random song');
    fetchRandomSongs(1).then((songs) => {
      if (mounted) setCurrentSong(songs[0]);
      console.log('[MainDashboard] initial song:', songs[0]);
    }).catch((e) => {
      console.error('[MainDashboard] fetchRandomSongs error', e);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!audioRef.current || !currentSong?.audioUrl) return;
    audioRef.current.src = currentSong.audioUrl;
    audioRef.current.load();
    audioRef.current.volume = volume / 100;
    console.log('[MainDashboard] audio src set to currentSong');
  }, [currentSong?.audioUrl]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (!audioRef.current) return;
        setDuration(audioRef.current.duration || 0);
      });
      audioRef.current.addEventListener('timeupdate', () => {
        if (!audioRef.current) return;
        const pct = Math.min(100, (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
        setProgressPct(pct);
      });
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const playSong = (song: SongItem) => {
    if (!audioRef.current) return;
    if (currentSong?.audioUrl !== song.audioUrl) {
      setCurrentSong(song);
      audioRef.current.src = song.audioUrl;
    }
    audioRef.current.volume = volume / 100;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((e) => {
        console.error('[MainDashboard] audio play() failed', e);
        setIsPlaying(false);
      });
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => { console.error('[MainDashboard] togglePlay play() failed', e); setIsPlaying(false); });
    }
  };

  const seekToPct = (pct: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = (pct / 100) * (audio.duration || 0);
    setProgressPct(pct);
  };

  const setVolumePct = (pct: number) => {
    setVolume(pct);
    if (audioRef.current) audioRef.current.volume = pct / 100;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr,320px] gap-4 sm:gap-6 p-3 sm:p-6 overflow-y-auto">
      <LeftSidebar />
      <main className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="md:col-span-2 lg:col-span-2">
            <NowPlayingCard
              song={currentSong}
              isPlaying={isPlaying}
              progressPct={progressPct}
              duration={duration}
              volumePct={volume}
              onTogglePlay={togglePlay}
              onSeekPct={seekToPct}
              onVolumePct={setVolumePct}
            />
          </div>
          <div className="space-y-4">
            <MoodRecommendations />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <CommunityPlaylists onPlay={(song) => playSong(song)} />
          <LyricsPanel />
        </div>
      </main>
      <RightSidebar />
    </div>
  );
}


