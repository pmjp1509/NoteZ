import { Play, Pause, SkipBack, SkipForward, Heart, Share2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import type { SongItem } from "@/lib/songs";

const albumArt = "/assets/album-placeholder.jpg";

export function NowPlayingCard({
  song,
  isPlaying,
  progressPct,
  duration,
  volumePct,
  onTogglePlay,
  onSeekPct,
  onVolumePct,
}: {
  song?: SongItem;
  isPlaying: boolean;
  progressPct: number;
  duration: number;
  volumePct: number;
  onTogglePlay: () => void;
  onSeekPct: (pct: number) => void;
  onVolumePct: (pct: number) => void;
}) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <Card className="glass-card glow-primary h-full">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-6 h-full">
          <div className="relative group">
            <img
              src={albumArt}
              alt="Album Art"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover shadow-floating group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <Button
                size="icon"
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30"
                onClick={onTogglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-3 sm:space-y-4 w-full">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gradient-primary mb-1">
                {song?.name || "Select a song"}
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">{song?.movie || ""}</p>
              <p className="text-sm text-muted-foreground">{song ? "From Supabase" : ""}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span>{Math.floor((progressPct / 100) * (duration || 0) / 60).toString().padStart(1, '0') + ':' + Math.floor((progressPct / 100) * (duration || 0) % 60).toString().padStart(2, '0')}</span>
                <div className="flex-1">
                  <Slider value={[progressPct]} onValueChange={(v) => onSeekPct(v[0] ?? 0)} max={100} step={1} className="w-full" />
                </div>
                <span>{duration ? Math.floor(duration / 60).toString().padStart(1, '0') + ':' + Math.floor(duration % 60).toString().padStart(2, '0') : '0:00'}</span>
              </div>
              <div className="hidden sm:flex items-center justify-center gap-1 h-8">
                {Array.from({ length: 40 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-1 bg-gradient-accent rounded-full transition-all duration-300 ${
                      i < (progressPct / 100) * 40 ? "animate-wave" : "opacity-50"
                    }`}
                    style={{
                      height: `${Math.random() * 24 + 8}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="hover:scale-110 transition-transform duration-300">
                  <SkipBack className="w-5 h-5" />
                </Button>
                <Button size="icon" className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary hover:scale-110 transition-all duration-300 glow-primary" onClick={onTogglePlay}>
                  {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 sm:ml-1" />}
                </Button>
                <Button variant="ghost" size="icon" className="hover:scale-110 transition-transform duration-300">
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setIsLiked(!isLiked)} className={`hover:scale-110 transition-all duration-300 ${isLiked ? "text-accent" : ""}`}>
                  <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon" className="hover:scale-110 transition-transform duration-300">
                  <Share2 className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <Slider value={[volumePct]} onValueChange={(v) => onVolumePct(v[0] ?? 0)} max={100} step={1} className="w-24 sm:w-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


