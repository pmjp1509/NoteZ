import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Pause, Play, RotateCcw, ListMusic, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import type { SongItem } from '@/lib/songs';

export function BottomPlayer({
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
  const [showLyrics, setShowLyrics] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    if (isMuted) {
      onVolumePct(volumePct);
      setIsMuted(false);
    } else {
      onVolumePct(0);
      setIsMuted(true);
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-gradient-to-r from-black/90 via-black/80 to-black/90 backdrop-blur-xl border-t border-white/20 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Navigation Controls Row (moved to top) */}
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <Button 
            size="icon" 
            variant="ghost" 
            className="w-9 h-9 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all hover:scale-105"
          >
            <SkipBack className="w-4.5 h-4.5" />
          </Button>
          
          <Button 
            size="icon" 
            className="w-9 h-9 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-lg transition-all transform hover:scale-105" 
            onClick={onTogglePlay}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>
          
          <Button 
            size="icon" 
            variant="ghost" 
            className="w-9 h-9 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all hover:scale-105"
          >
            <SkipForward className="w-4.5 h-4.5" />
          </Button>
        </div>

        {/* Main Player Controls */}
        <div className="flex items-center gap-4">
          {/* Song Cover & Info */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <img 
                src={song?.coverUrl || '/assets/album-placeholder.jpg'} 
                alt="cover" 
                className="w-10 h-10 rounded-lg object-cover shadow-lg transition-transform group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{song?.name || 'Select a song'}</p>
              <p className="text-xs text-gray-300 truncate">{song?.movie || 'Unknown Artist'}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-gray-400 w-10 text-right">
              {Math.floor((progressPct / 100) * (duration || 0) / 60).toString().padStart(1, '0') + ':' + Math.floor((progressPct / 100) * (duration || 0) % 60).toString().padStart(2, '0')}
            </span>
            <div className="flex-1 relative">
              <Slider 
                value={[progressPct]} 
                onValueChange={(v) => onSeekPct(v[0] ?? 0)} 
                max={100} 
                step={1} 
                className="w-full"
              />
            </div>
            <span className="text-xs text-gray-400 w-10">
              {duration ? Math.floor(duration / 60).toString().padStart(1, '0') + ':' + Math.floor(duration % 60).toString().padStart(2, '0') : '0:00'}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-10 h-10 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
              onClick={() => setShowLyrics(!showLyrics)}
            >
              <ListMusic className="w-5 h-5" />
            </Button>
            
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-10 h-10 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>

            <Button 
              size="icon" 
              variant="ghost" 
              className="w-10 h-10 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <ListMusic className="w-5 h-5" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 w-28">
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-7 h-7 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
              onClick={toggleMute}
            >
              {isMuted || volumePct === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider 
              value={[isMuted ? 0 : volumePct]} 
              onValueChange={(v) => {
                const newVolume = v[0] ?? 0;
                onVolumePct(newVolume);
                if (newVolume > 0) setIsMuted(false);
              }} 
              max={100} 
              step={1} 
              className="w-full"
            />
          </div>
        </div>

        

        {/* Lyrics Panel (Expandable) */}
        {showLyrics && (
          <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
            <div className="text-center text-sm text-gray-300">
              {song?.lyrics || "Lyrics not available for this song"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


