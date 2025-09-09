import { MoodRecommendations } from "@/components/dashboard/MoodRecommendations";
import { CommunityPlaylists } from "@/components/dashboard/CommunityPlaylists";
// import { LyricsPanel } from "@/components/dashboard/LyricsPanel";
import { Recommendations } from "@/components/dashboard/Recommendations";
import { RecentlyPlayed, pushRecentlyPlayed } from "@/components/dashboard/RecentlyPlayed";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightSidebar } from "@/components/dashboard/RightSidebar";
import { BottomPlayer } from "@/components/dashboard/BottomPlayer";
import { Search, X, Plus, ListPlus, Heart, Play, ArrowLeft, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type SongItem } from "@/lib/songs";
import { AddToPlaylistDialog } from "./AddToPlaylistDialog";
import { supabase } from "@/config/supabase";

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
  const [isRepeating, setIsRepeating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[MainDashboard] fetching initial songs from backend');
        const response = await fetch(`http://localhost:3001/api/songs?limit=20`);
        const data = await response.json();
        const mapped: SongItem[] = (data.songs || []).map((s: any) => ({
          movie: s.movie || "",
          name: s.title || s.name || "Unknown",
          path: s.id ? String(s.id) : s.audioUrl || "",
          id: s.id ? String(s.id) : undefined,
          coverUrl: s.coverUrl || s.cover_url || "/assets/album-placeholder.jpg",
          audioUrl: s.audioUrl || s.audio_url || "",
          lyrics: s.lyrics || undefined,
        }));
        if (mounted && mapped.length) {
          setCurrentSong(mapped[0]);
          console.log('[MainDashboard] initial song:', mapped[0]);
        }
      } catch (e) {
        console.error('[MainDashboard] initial songs fetch error', e);
      }
    })();
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
  
  // Pre-fetch favorites data when component mounts
  useEffect(() => {
    // This ensures favorites data is already loaded when user clicks on Favorites
    fetchFavorites();
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
        const favorites = data.favorites || [];
        console.log('Raw favorites data from API:', favorites);
        
        if (favorites.length > 0) {
          console.log('Sample favorite song object:', favorites[0]);
          console.log('Sample favorite song ID:', favorites[0].id);
          console.log('Sample favorite song songId:', favorites[0].songId);
        }
        
        setPlaylistSongs(favorites);
        
        // Update likedIds state with the fetched favorites
        const favoriteIds = new Set(favorites.map((song: any) => song.id));
        console.log('Updated favorite song IDs from fetchFavorites:', [...favoriteIds]);
        setLikedIds(favoriteIds as Set<string>);
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
      audioRef.current.addEventListener('ended', () => {
        if (isRepeating && currentSong) {
          // Restart the song from the beginning
          audioRef.current!.currentTime = 0;
          audioRef.current!.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          setIsPlaying(false);
        }
      });
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

  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  const addToPlaylist = (song: SongItem) => {
    setSelectedSong(song);
    setShowAddToPlaylist(true);
  };

  const handleCloseAddToPlaylist = () => {
    setShowAddToPlaylist(false);
    setSelectedSong(null);
  };

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Load liked songs when component mounts
  useEffect(() => {
    const fetchLikedSongIds = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch('http://localhost:3001/api/favorites', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Use id property which matches the database ID
          const favoriteIds = new Set(
            (data.favorites || []).map((song: any) => song.id)
          );
          console.log('Loaded favorite song IDs:', [...favoriteIds]);
          setLikedIds(favoriteIds as Set<string>);
        }
      } catch (error) {
        console.error('Failed to fetch liked song IDs:', error);
      }
    };

    fetchLikedSongIds();
  }, []);

  // Listen for favorites change events
  useEffect(() => {
    const handleFavoritesChanged = (event: CustomEvent) => {
      const { action, songId } = event.detail;
      
      setLikedIds(prev => {
        const next = new Set(prev);
        if (action === 'added') {
          next.add(songId);
        } else if (action === 'removed') {
          next.delete(songId);
        }
        return next;
      });
    };

    window.addEventListener('favoritesChanged', handleFavoritesChanged as EventListener);
    return () => {
      window.removeEventListener('favoritesChanged', handleFavoritesChanged as EventListener);
    };
  }, []);

  const toggleLike = async (song: SongItem) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No auth token found');
      return;
    }
    
    // Use the song.id which should match the database id for songs
    const songId = song.id;
    if (!songId) {
      console.error('No song ID found for:', song);
      return;
    }

    console.log('Toggling like for song:', songId);
    console.log('Full song object:', song);
    console.log('Current likedIds:', [...likedIds]);
    const isLiked = likedIds.has(songId);
    
    // Optimistic toggle
    setLikedIds(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(songId); else next.add(songId);
      return next;
    });

    try {
      if (isLiked) {
        const res = await fetch(`http://localhost:3001/api/favorites/${encodeURIComponent(songId)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to remove from favorites');
        }
        console.log('Successfully removed from favorites');
        window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: { action: 'removed', songId } }));
      } else {
        const res = await fetch(`http://localhost:3001/api/favorites`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId })
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to add to favorites');
        }
        console.log('Successfully added to favorites');
        window.dispatchEvent(new CustomEvent('favoritesChanged', { detail: { action: 'added', songId } }));
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
      // Revert on error
      setLikedIds(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(songId); else next.delete(songId);
        return next;
      });
    }
  };

  const isCurrentFavorite = currentSong?.id ? likedIds.has(currentSong.id) : false;
  const toggleCurrentFavorite = () => {
    if (currentSong) toggleLike(currentSong);
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
        id: s.id ? String(s.id) : undefined,
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

  // Remove song from playlist
  const removeSongFromPlaylist = async (songId: string) => {
    if (!selectedPlaylist) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:3001/api/playlists/${selectedPlaylist.id}/songs/${songId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remove song from local state
        setPlaylistSongs(prev => prev.filter(song => song.id !== songId));
        
        // If this is favorites playlist, also remove from likedIds and dispatch event
        if (selectedPlaylist.name === 'Favorites') {
          setLikedIds(prev => {
            const next = new Set(prev);
            next.delete(songId);
            return next;
          });
          window.dispatchEvent(new CustomEvent('favoritesChanged', { 
            detail: { action: 'removed', songId } 
          }));
        }
      } else {
        console.error('Failed to remove song from playlist');
      }
    } catch (error) {
      console.error('Error removing song from playlist:', error);
    }
  };

  const handleReplay = () => {
    setIsRepeating(!isRepeating);
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
                          className={`w-9 h-9 flex items-center justify-center rounded-md transition ${song.id && likedIds.has(song.id) ? 'bg-pink-600/20 text-pink-400 hover:bg-pink-600/30' : 'bg-white/10 hover:bg-white/15 text-white'}`}
                          onClick={() => toggleLike(song)}
                          disabled={!song.id}
                        >
                          <Heart className={`w-5 h-5 ${song.id && likedIds.has(song.id) ? 'fill-pink-500 text-pink-400' : ''}`} />
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
                      id: song.id,
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
                          id: song.id,
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
                          id: song.id,
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
                        className={`w-9 h-9 flex items-center justify-center rounded-md transition ${song.id && likedIds.has(song.id) ? 'bg-pink-600/20 text-pink-400 hover:bg-pink-600/30' : 'bg-white/10 hover:bg-white/15 text-white'}`}
                        onClick={() => toggleLike({
                          id: song.id,
                          path: song.id,
                          name: song.title,
                          movie: song.movie || '',
                          audioUrl: song.audioUrl,
                          coverUrl: song.coverUrl || ''
                        })}
                        disabled={!song.id}
                      >
                        <Heart className={`w-5 h-5 ${song.id && likedIds.has(song.id) ? 'fill-pink-500 text-pink-400' : ''}`} />
                      </button>
                      <button
                        aria-label="Remove from playlist"
                        className="w-9 h-9 flex items-center justify-center rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
                        onClick={() => removeSongFromPlaylist(song.id)}
                        title={`Remove from ${selectedPlaylist.name}`}
                      >
                        <Trash2 className="w-5 h-5" />
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
          <RecentlyPlayed 
            onPlay={(song) => playSong(song)} 
            onToggleFavorite={toggleLike}
            likedIds={likedIds}
          />
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
        onToggleFavorite={toggleCurrentFavorite}
        isFavorite={isCurrentFavorite}
        onReplay={handleReplay}
      />

      {/* Add to Playlist Dialog */}
      {selectedSong && (
        <AddToPlaylistDialog
          isOpen={showAddToPlaylist}
          onClose={handleCloseAddToPlaylist}
          songPath={selectedSong.path}
        />
      )}
    </div>
  );
}


