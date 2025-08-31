import { MoodRecommendations } from "@/components/dashboard/MoodRecommendations";
import { CommunityPlaylists } from "@/components/dashboard/CommunityPlaylists";
// import { LyricsPanel } from "@/components/dashboard/LyricsPanel";
import { Recommendations } from "@/components/dashboard/Recommendations";
import { RecentlyPlayed, pushRecentlyPlayed } from "@/components/dashboard/RecentlyPlayed";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightSidebar } from "@/components/dashboard/RightSidebar";
import { BottomPlayer } from "@/components/dashboard/BottomPlayer";
import { Search, X, Plus, ListPlus, Heart, Play, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchRandomSongs, type SongItem } from "@/lib/songs";

interface Playlist {
  id: string;
  name: string;
  description?: string;
  songCount: number;
  coverUrl?: string;
  isPublic: boolean;
}

interface PlaylistSong {
  id: string;
  title: string;
  artist: string;
  movie?: string;
  audioUrl: string;
  coverUrl?: string;
}

type ExternalSearchProps = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchResults: SongItem[];
  isSearching: boolean;
  showSearchResults: boolean;
  onSearch: () => void;
  onClear: () => void;
};

export function MainDashboard({ external }: { external?: ExternalSearchProps }) {
  const [currentSong, setCurrentSong] = useState<SongItem | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SongItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [queue, setQueue] = useState<SongItem[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
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

  // Listen for playlist selection events
  useEffect(() => {
    const handlePlaylistSelected = (event: CustomEvent) => {
      const playlist = event.detail as Playlist;
      setSelectedPlaylist(playlist);
      if (playlist.id === 'favorites') {
        fetchFavorites();
      } else {
        fetchPlaylistSongs(playlist.id);
      }
    };

    window.addEventListener('playlistSelected', handlePlaylistSelected as EventListener);
    return () => {
      window.removeEventListener('playlistSelected', handlePlaylistSelected as EventListener);
    };
  }, []);

  const fetchFavorites = async () => {
    setIsLoadingPlaylist(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlaylistSongs(data.favorites || []);
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setIsLoadingPlaylist(false);
    }
  };

  const fetchPlaylistSongs = async (playlistId: string) => {
    setIsLoadingPlaylist(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/playlists/me/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlaylistSongs(data.songs || []);
      }
    } catch (error) {
      console.error('Failed to fetch playlist songs:', error);
    } finally {
      setIsLoadingPlaylist(false);
    }
  };

  const handleBackToMain = () => {
    setSelectedPlaylist(null);
    setPlaylistSongs([]);
  };

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
    // Track recently played locally
    pushRecentlyPlayed(song);
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

  const addToQueue = (song: SongItem) => {
    setQueue((prev) => [...prev, song]);
  };

  const addToPlaylist = (song: SongItem) => {
    console.log('[MainDashboard] addToPlaylist clicked for', song);
    alert('Add to playlist: coming soon');
  };

  const likeSong = (song: SongItem) => {
    console.log('[MainDashboard] likeSong clicked for', song);
    alert('Favorite song: coming soon');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams({ search: searchQuery });
      const response = await fetch(`http://localhost:3001/api/songs?${params}`);
      const data = await response.json();
      const mapped: SongItem[] = (data.songs || []).map((s: any) => ({
        movie: s.movie || "",
        name: s.title || s.name || "Unknown",
        path: s.id ? String(s.id) : s.audioUrl || "",
        coverUrl: s.coverUrl || "/assets/album-placeholder.jpg",
        audioUrl: s.audioUrl || "",
      }));
      setSearchResults(mapped);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Derive effective search state/handlers (use external if provided)
  const effectiveSearchQuery = external ? external.searchQuery : searchQuery;
  const setEffectiveSearchQuery = external ? external.setSearchQuery : setSearchQuery;
  const effectiveSearchResults = external ? external.searchResults : searchResults;
  const effectiveIsSearching = external ? external.isSearching : isSearching;
  const effectiveShowSearchResults = external ? external.showSearchResults : showSearchResults;
  const triggerSearch = external ? external.onSearch : handleSearch;
  const triggerClear = external ? external.onClear : clearSearch;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr,320px] gap-3 sm:gap-4 p-3 sm:p-4 pb-36 sm:pb-40">
      <div className="space-y-3">
        <LeftSidebar />
      </div>
      
      <main className="space-y-4">
        {/* Search Bar (hidden when external search is provided) */}
        {!external && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search songs, artists, or movies..."
                value={effectiveSearchQuery}
                onChange={(e) => setEffectiveSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={triggerSearch}
              disabled={effectiveIsSearching}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all disabled:opacity-50"
            >
              {effectiveIsSearching ? 'Searching...' : 'Search'}
            </button>
            
            {effectiveSearchQuery && (
              <button
                onClick={triggerClear}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Search Results */}
        {effectiveShowSearchResults && (
          <div className="bg-black/30 rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Search Results ({effectiveSearchResults.length})
                <span className="ml-3 text-sm text-gray-400">Queue: {queue.length}</span>
              </h3>
              <button
                onClick={triggerClear}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {effectiveSearchResults.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No songs found matching your search.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {effectiveSearchResults.map((song) => (
                  <div
                    key={song.path || song.audioUrl || song.name}
                    onClick={() => playSong(song)}
                    className="p-4 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg font-bold">
                          {song.name?.charAt(0) || 'M'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                          {song.name}
                        </h4>
                        <p className="text-gray-400 text-sm truncate">{song.movie}</p>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          aria-label="Add to queue"
                          className="w-9 h-9 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/15 text-white transition"
                          onClick={() => addToQueue(song)}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <button
                          aria-label="Add to playlist"
                          className="w-9 h-9 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/15 text-white transition"
                          onClick={() => addToPlaylist(song)}
                        >
                          <ListPlus className="w-5 h-5" />
                        </button>
                        <button
                          aria-label="Like"
                          className="w-9 h-9 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/15 text-white transition"
                          onClick={() => likeSong(song)}
                        >
                          <Heart className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Playlist Display */}
        {selectedPlaylist && (
          <div className="bg-black/30 rounded-lg border border-white/10 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBackToMain}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedPlaylist.name}</h2>
                  <p className="text-gray-400 text-sm">
                    {selectedPlaylist.description || `${selectedPlaylist.songCount} songs`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedPlaylist.isPublic 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {selectedPlaylist.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
            
            {isLoadingPlaylist ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : playlistSongs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No songs in this playlist</p>
              </div>
            ) : (
              <div className="space-y-3">
                {playlistSongs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors group cursor-pointer"
                    onClick={() => playSong({
                      path: song.id,
                      name: song.title,
                      movie: song.movie || '',
                      audioUrl: song.audioUrl,
                      coverUrl: song.coverUrl || ''
                    })}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      {song.coverUrl ? (
                        <img
                          src={song.coverUrl}
                          alt="Cover"
                          className="w-full h-full rounded-lg object-cover"
                        />
                      ) : (
                        <span className="text-white text-lg font-bold">
                          {song.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                        {song.title}
                      </h4>
                      <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                      {song.movie && (
                        <p className="text-gray-500 text-xs truncate">From: {song.movie}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        aria-label="Add to queue"
                        className="w-9 h-9 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/15 text-white transition"
                        onClick={() => addToQueue({
                          path: song.id,
                          name: song.title,
                          movie: song.movie || '',
                          audioUrl: song.audioUrl,
                          coverUrl: song.coverUrl || ''
                        })}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button
                        aria-label="Add to playlist"
                        className="w-9 h-9 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/15 text-white transition"
                        onClick={() => addToPlaylist({
                          path: song.id,
                          name: song.title,
                          movie: song.movie || '',
                          audioUrl: song.audioUrl,
                          coverUrl: song.coverUrl || ''
                        })}
                      >
                        <ListPlus className="w-5 h-5" />
                      </button>
                      <button
                        aria-label="Like"
                        className="w-9 h-9 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/15 text-white transition"
                        onClick={() => likeSong({
                          path: song.id,
                          name: song.title,
                          movie: song.movie || '',
                          audioUrl: song.audioUrl,
                          coverUrl: song.coverUrl || ''
                        })}
                      >
                        <Heart className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recently Played at the top */}
        {!showSearchResults && !selectedPlaylist && (
          <RecentlyPlayed onPlay={(song) => playSong(song)} />
        )}

        {/* Main Content */}
        {!showSearchResults && !selectedPlaylist && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-3">
              <MoodRecommendations />
              {/* <RecentlyPlayed onPlay={(song) => playSong(song)} /> <-- Remove this line */}
              <CommunityPlaylists onPlay={(song) => playSong(song)} />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <Recommendations onPlay={(song) => playSong(song)} />
            </div>
          </div>
        )}
      </main>
      
      <div className="hidden lg:block"><RightSidebar /></div>
      
      <BottomPlayer
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
  );
}


