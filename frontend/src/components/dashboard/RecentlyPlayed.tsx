import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SongItem } from "@/lib/songs";

const STORAGE_KEY = "recently_played_v1";

function loadRecentlyPlayed(): SongItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SongItem[];
    if (!Array.isArray(list)) return [];
    return list;
  } catch {
    return [];
  }
}

export function RecentlyPlayed({ onPlay }: { onPlay: (song: SongItem) => void }) {
  const [items, setItems] = useState<SongItem[]>([]);

  useEffect(() => {
    setItems(loadRecentlyPlayed().slice(0, 4));
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setItems(loadRecentlyPlayed().slice(0, 4));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (items.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-accent">⏱️</span>
            Recently played
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Your last 4 songs will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-accent">⏱️</span>
          Recently played
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {items.slice(0, 4).map((song) => (
            <button
              key={song.path || song.name}
              onClick={() => onPlay(song)}
              className="group relative flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/40 transition"
            >
              <img src={song.coverUrl} alt="cover" className="w-12 h-12 rounded object-cover" />
              <div className="min-w-0 text-left">
                <div className="text-white truncate">{song.name}</div>
                <div className="text-xs text-muted-foreground truncate">{song.movie}</div>
              </div>
              <div className="ml-auto w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <Play className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to push a song into the recently played list
export function pushRecentlyPlayed(song: SongItem) {
  try {
    const current = loadRecentlyPlayed();
    // Remove duplicates by path or name
    const filtered = current.filter(
      (s) => s.path !== song.path && s.audioUrl !== song.audioUrl && s.name !== song.name
    );
    const next = [song, ...filtered].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Trigger listeners
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch {
    // ignore
  }
}



