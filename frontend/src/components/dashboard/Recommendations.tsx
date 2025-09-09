import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type SongItem, normalizeSongItem } from '@/lib/songs';

export function Recommendations({ onPlay }: { onPlay: (song: SongItem) => void }) {
  const [items, setItems] = useState<SongItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/songs?limit=6`);
        const data = await response.json();
        const mapped: SongItem[] = (data.songs || []).map(normalizeSongItem);
        if (mounted) setItems(mapped.slice(0, 2));
      } catch (e) {
        if (!mounted) return;
        setItems([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-accent">✨</span>
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((song) => (
            <div key={song.id || song.path || song.name} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
              <img src={song.coverUrl} alt="cover" className="w-10 h-10 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <div className="text-white truncate">{song.name}</div>
                <div className="text-xs text-muted-foreground truncate">{song.movie}</div>
              </div>
              <button
                aria-label="Play recommendation"
                onClick={() => song.audioUrl && onPlay(song)}
                disabled={!song.audioUrl}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


