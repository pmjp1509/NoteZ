import { useEffect, useState } from "react";
import { Play, TrendingUp, Music2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type SongItem, normalizeSongItem } from '@/lib/songs';

interface Recommendation {
  id: string;
  title: string;
  artist: string;
  movie?: string;
  audioUrl: string;
  coverUrl?: string;
  category?: string;
  categoryColor?: string;
}

export function Recommendations({ onPlay }: { onPlay: (song: SongItem) => void }) {
  const [items, setItems] = useState<SongItem[]>([]);
  const [basedOn, setBasedOn] = useState<string>('popular');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Try to get personalized recommendations if user is logged in
        if (token) {
          const response = await fetch(`http://localhost:3001/api/recommendations?limit=5`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const recommendations: Recommendation[] = data.recommendations || [];
            
            // Convert to SongItem format
            const mapped: SongItem[] = recommendations.map(rec => ({
              id: rec.id,
              name: rec.title,
              movie: rec.artist,
              audioUrl: rec.audioUrl,
              coverUrl: rec.coverUrl || '/placeholder-cover.jpg',
              path: rec.id
            }));
            
            if (mounted) {
              setItems(mapped);
              setBasedOn(data.basedOn || 'popular');
            }
            return;
          }
        }
        
        // Fallback to regular songs if not logged in or error
        const response = await fetch(`http://localhost:3001/api/songs?limit=5`);
        const data = await response.json();
        const mapped: SongItem[] = (data.songs || []).map(normalizeSongItem);
        if (mounted) {
          setItems(mapped.slice(0, 5));
          setBasedOn('popular');
        }
      } catch (e) {
        console.error('Error fetching recommendations:', e);
        if (!mounted) return;
        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {basedOn === 'user_history' ? (
              <>
                <Music2 className="w-5 h-5 text-purple-400" />
                <span>For You</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5 text-pink-400" />
                <span>Trending</span>
              </>
            )}
          </div>
          <span className="text-xs text-gray-400 font-normal">
            {basedOn === 'user_history' ? 'Based on your taste' : 'Popular now'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Music2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recommendations available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((song) => (
              <div 
                key={song.id || song.path || song.name} 
                className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-all cursor-pointer group"
                onClick={() => song.audioUrl && onPlay(song)}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500">
                  {song.coverUrl && song.coverUrl !== '/placeholder-cover.jpg' ? (
                    <img src={song.coverUrl} alt="cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">{song.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{song.movie}</div>
                </div>
                <button
                  aria-label="Play recommendation"
                  onClick={(e) => {
                    e.stopPropagation();
                    song.audioUrl && onPlay(song);
                  }}
                  disabled={!song.audioUrl}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <Play className="w-4 h-4 fill-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


