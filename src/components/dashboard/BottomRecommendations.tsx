import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Heart, Volume2, Music, ListMusic } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchRandomSongs, type SongItem } from "@/lib/songs";
import { getPublicPlaylists, type Playlist } from "@/lib/database";

export function BottomRecommendations({
  currentSong,
  isPlaying,
  progressPct,
  duration,
  volumePct,
  onTogglePlay,
  onSeekPct,
  onVolumePct,
  onPlay,
}: {
  currentSong?: SongItem;
  isPlaying: boolean;
  progressPct: number;
  duration: number;
  volumePct: number;
  onTogglePlay: () => void;
  onSeekPct: (pct: number) => void;
  onVolumePct: (pct: number) => void;
  onPlay?: (song: SongItem) => void;
}) {
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  async function loadRecommendations() {
    try {
      const [songsData, playlistsData] = await Promise.all([
        fetchRandomSongs(6),
        getPublicPlaylists(6)
      ]);
      setSongs(songsData);
      setPlaylists(playlistsData);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10">
      {/* Now Playing Bar */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-4">
          {/* Song Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={currentSong?.coverUrl || "/assets/album-placeholder.jpg"}
              alt="Album Art"
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-white truncate">
                {currentSong?.name || "Select a song"}
              </h4>
              <p className="text-xs text-muted-foreground truncate">
                {currentSong?.movie || ""}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={onTogglePlay} className="bg-primary hover:bg-primary/90">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <span className="text-xs text-muted-foreground">
              {Math.floor((progressPct / 100) * (duration || 0) / 60)}:{Math.floor((progressPct / 100) * (duration || 0) % 60).toString().padStart(2, '0')}
            </span>
            <Slider 
              value={[progressPct]} 
              onValueChange={(v) => onSeekPct(v[0] ?? 0)} 
              max={100} 
              step={1} 
              className="flex-1" 
            />
            <span className="text-xs text-muted-foreground">
              {duration ? Math.floor(duration / 60) + ':' + Math.floor(duration % 60).toString().padStart(2, '0') : '0:00'}
            </span>
          </div>

          {/* Volume & Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsLiked(!isLiked)}
              className={isLiked ? "text-accent" : ""}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            </Button>
            <div className="hidden lg:flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <Slider 
                value={[volumePct]} 
                onValueChange={(v) => onVolumePct(v[0] ?? 0)} 
                max={100} 
                step={1} 
                className="w-20" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="px-4 py-3 space-y-3">
        {/* Song Recommendations */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-white">Recommended Songs</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {songs.map((song, index) => (
              <div 
                key={index}
                className="flex-shrink-0 w-48 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                onClick={() => onPlay?.(song)}
              >
                <div className="flex items-center gap-2">
                  <img 
                    src={song.coverUrl || "/assets/album-placeholder.jpg"} 
                    alt="cover" 
                    className="w-8 h-8 rounded object-cover" 
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">{song.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.movie}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Playlist Recommendations */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ListMusic className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-medium text-white">Recommended Playlists</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {playlists.map((playlist) => (
              <div 
                key={playlist.id}
                className="flex-shrink-0 w-48 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <ListMusic className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">{playlist.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{playlist.song_count} songs</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}