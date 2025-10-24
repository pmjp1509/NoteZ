import { MoodRecommendations } from "@/components/dashboard/MoodRecommendations";
import { CommunityPlaylists } from "@/components/dashboard/CommunityPlaylists";
// import { LyricsPanel } from "@/components/dashboard/LyricsPanel";
import { Recommendations } from "@/components/dashboard/Recommendations";
import { RecentlyPlayed, pushRecentlyPlayed } from "@/components/dashboard/RecentlyPlayed";
import { RecommendationsSection } from "@/components/dashboard/RecommendationsSection";
import { TrendingSection } from "@/components/dashboard/TrendingSection";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { RightSidebar } from "@/components/dashboard/RightSidebar";
import { BottomPlayer } from "@/components/dashboard/BottomPlayer";
import { Search, X, Plus, ListPlus, Heart, Play, ArrowLeft, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type SongItem, normalizeSongItem } from "@/lib/songs";
import { AddToPlaylistDialog } from "./AddToPlaylistDialog";
import { supabase } from "@/config/supabase";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/toast";

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
  const [selectedMood, setSelectedMood] = useState<{ label: string; category: string; emoji: string; color: string } | null>(null);
  const [moodSongs, setMoodSongs] = useState<PlaylistSong[]>([]);
  const [isLoadingMoodSongs, setIsLoadingMoodSongs] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Flag ref to mark a user-play request so the loader effect knows to attempt play
  const playRequestedRef = useRef<boolean>(false);
  const { toasts, removeToast, showFavoriteAdded, showFavoriteRemoved, showError } = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[MainDashboard] fetching initial songs from backend');
        const response = await fetch(`http://localhost:3001/api/songs?limit=20`);
        const data = await response.json();
        const mapped: SongItem[] = await Promise.all((data.songs || []).map(normalizeSongItem));
        if (mounted && mapped.length) {
          setCurrentSong(mapped[0]);
          console.log('[MainDashboard] initial song name:', mapped[0].name, 'obj:', mapped[0]);
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
          // Normalize all songs to ensure fresh URLs
          const normalizedSongs = await Promise.all((data.songs || []).map(song => normalizeSongItem(song)));
          console.log('[MainDashboard] Loaded playlist songs (normalized):', normalizedSongs);
          // Convert normalized SongItem into the PlaylistSong shape UI expects (title, artist, movie...)
          const playlistEntries: PlaylistSong[] = normalizedSongs
            .filter(s => s.audioUrl)
            .map(s => ({
              id: s.id || s.path,
              title: s.name,
              artist: '',
              movie: s.movie || '',
              audioUrl: s.audioUrl,
              coverUrl: s.coverUrl || ''
            }));

          setPlaylistSongs(playlistEntries);
        } else {
          console.error('[MainDashboard] Failed to fetch playlist songs:', response.status);
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
  const loadAudio = async () => {
    if (!audioRef.current || !currentSong) return;

    try {
      // If this was a play request from playSong (we already normalized before setting currentSong)
      if (playRequestedRef.current && currentSong.audioUrl) {
        console.log('[MainDashboard] (playRequested) Setting audio source to:', currentSong.audioUrl);
        audioRef.current.src = currentSong.audioUrl;
        audioRef.current.load();
        audioRef.current.volume = volume / 100;
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (playError) {
          console.error('[MainDashboard] Failed to play after request:', playError);
          setIsPlaying(false);
        }
        playRequestedRef.current = false;
        return;
      }

      // Normal load: re-normalize the song to get fresh URLs if needed
      const normalizedSong = await normalizeSongItem(currentSong);
      if (!normalizedSong.audioUrl) {
        console.error('[MainDashboard] No valid audio URL found for song:', currentSong);
        return;
      }

      console.log('[MainDashboard] Setting audio source to:', normalizedSong.audioUrl);
      audioRef.current.src = normalizedSong.audioUrl;
      audioRef.current.load();
      audioRef.current.volume = volume / 100;

      if (isPlaying) {
        try {
          await audioRef.current.play();
        } catch (playError) {
          console.error('[MainDashboard] Failed to auto-play:', playError);
          setIsPlaying(false);
        }
      }
    } catch (error) {
      console.error('[MainDashboard] Error loading audio:', error);
      setIsPlaying(false);
    }
  };

  loadAudio();
}, [currentSong?.id, volume]);

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

  const playSong = async (song: SongItem) => {
    if (!audioRef.current) return;

    try {
      // Always re-normalize the song to ensure fresh URLs
      const normalizedSong = await normalizeSongItem(song);
      if (!normalizedSong.audioUrl) {
        console.error('[MainDashboard] No valid audio URL found for song:', song);
        return;
      }

      // Only update if it's a different song or URL
      if (currentSong?.id !== normalizedSong.id || currentSong?.audioUrl !== normalizedSong.audioUrl) {
        console.log('[MainDashboard] Setting new song name (play request):', normalizedSong.name, 'id:', normalizedSong.id);
        // mark that a user requested play so the loadAudio effect will attempt to play after setting src
        playRequestedRef.current = true;
        setCurrentSong(normalizedSong);
      }

      // set volume for next playback
      audioRef.current.volume = volume / 100;

      // push recently played immediately
      pushRecentlyPlayed(normalizedSong);

      // track play in database (fire-and-forget)
      if (normalizedSong.id) {
        trackSongPlay(normalizedSong.id).catch(() => {});
      }
    } catch (error) {
      console.error('[MainDashboard] Failed to play song:', error);
      setIsPlaying(false);
    }
  };

  // Track song play in listening history
  const trackSongPlay = async (songId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !songId) return;

      await fetch('http://localhost:3001/api/analytics/track-play', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ songId })
      });
      console.log('[MainDashboard] Song play tracked:', songId);
    } catch (error) {
      console.error('[MainDashboard] Failed to track song play:', error);
    }
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

  // Listen for AI DJ song play events
  useEffect(() => {
    const handlePlaySongFromAI = (event: CustomEvent) => {
      const songData = event.detail;
      playSong(songData);
    };

    window.addEventListener('playSongFromAI', handlePlaySongFromAI as EventListener);
    return () => {
      window.removeEventListener('playSongFromAI', handlePlaySongFromAI as EventListener);
    };
  }, []);

  // Listen for mood selection events
  useEffect(() => {
    const handleMoodSelected = (event: CustomEvent) => {
      const moodData = event.detail;
      setSelectedMood(moodData);
      fetchMoodSongs(moodData.category);
    };

    window.addEventListener('moodSelected', handleMoodSelected as EventListener);
    return () => {
      window.removeEventListener('moodSelected', handleMoodSelected as EventListener);
    };
  }, []);

  // Listen for global UI events from other components (recommendations/trending)
  useEffect(() => {
    const handleAddToQueue = (event: CustomEvent) => {
      const song = event.detail as SongItem;
      if (song) addToQueue(song);
    };

    const handleOpenAddToPlaylist = (event: CustomEvent) => {
      const song = event.detail as SongItem;
      if (song) addToPlaylist(song);
    };

    const handleToggleLike = (event: CustomEvent) => {
      const song = event.detail as SongItem;
      if (song) toggleLike(song);
    };

    window.addEventListener('addToQueue', handleAddToQueue as EventListener);
    window.addEventListener('openAddToPlaylist', handleOpenAddToPlaylist as EventListener);
    window.addEventListener('toggleLike', handleToggleLike as EventListener);

    return () => {
      window.removeEventListener('addToQueue', handleAddToQueue as EventListener);
      window.removeEventListener('openAddToPlaylist', handleOpenAddToPlaylist as EventListener);
      window.removeEventListener('toggleLike', handleToggleLike as EventListener);
    };
  }, [queue, likedIds]);

  // Listen for showLyrics event dispatched by BottomPlayer
  useEffect(() => {
    const handleShowLyrics = (e: CustomEvent) => {
      const { lyrics, title, artist } = e.detail || {};
      // Show lyrics in the middle of the dashboard by setting selectedMood-like state
      setSelectedMood({ label: 'Lyrics', category: 'lyrics', emoji: '🎤', color: 'from-purple-500 to-pink-500' });
      setMoodSongs([{ id: 'lyrics', title: title || '', artist: artist || '', movie: '', audioUrl: '', coverUrl: '', } as any]);
      // Replace the moodSongs content to contain lyrics as a single entry; MainDashboard will render accordingly
      // Store lyrics on the currentSong object to render when selectedMood is 'Lyrics'
      if (currentSong) {
        // attach lyrics temporarily
        currentSong.lyrics = lyrics || currentSong.lyrics;
      }
    };

    window.addEventListener('showLyrics', handleShowLyrics as EventListener);
    return () => window.removeEventListener('showLyrics', handleShowLyrics as EventListener);
  }, [currentSong]);

  const fetchMoodSongs = async (category: string) => {
    setIsLoadingMoodSongs(true);
    try {
      const response = await fetch(`http://localhost:3001/api/songs?category=${category}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        const songs = (data.songs || []).map((song: any) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          movie: song.movie,
          audioUrl: song.audio_url,
          coverUrl: song.cover_url
        }));
        setMoodSongs(songs);
      }
    } catch (error) {
      console.error('Failed to fetch mood songs:', error);
      setMoodSongs([]);
    } finally {
      setIsLoadingMoodSongs(false);
    }
  };

  const handleBackFromMood = () => {
    setSelectedMood(null);
    setMoodSongs([]);
  };

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
        showFavoriteRemoved(song.name);
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
        showFavoriteAdded(song.name);
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
      const mapped: SongItem[] = await Promise.all((data.songs || []).map(normalizeSongItem));
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
      
      <main className="space-y-4 min-w-0 overflow-hidden">
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

        {/* Mood Songs Display */}
        {selectedMood && (
          <div className="bg-black/30 rounded-lg border border-white/10 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBackFromMood}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <span className="text-2xl">{selectedMood.emoji}</span>
                    {selectedMood.label} Mood
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Top songs for your {selectedMood.label.toLowerCase()} vibe
                  </p>
                </div>
              </div>
            </div>
            
            {isLoadingMoodSongs ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : (selectedMood.category === 'lyrics') ? (
              // Lyrics special view
              <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                <h3 className="text-lg font-semibold text-white">{currentSong?.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{currentSong?.movie}</p>
                <div className="prose prose-invert max-h-[60vh] overflow-y-auto text-sm text-gray-300">
                  {currentSong?.lyrics || 'Lyrics not available.'}
                </div>
              </div>
            ) : moodSongs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No songs found for this mood</p>
              </div>
            ) : (
              <div className="space-y-3">
                {moodSongs.map((song) => (
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Content - New Layout */}
        {!showSearchResults && !selectedPlaylist && !selectedMood && (
          <div className="space-y-4">
            {/* 1. Recently Played */}
            <RecentlyPlayed 
              onPlay={(song) => playSong(song)} 
              onToggleFavorite={toggleLike}
              likedIds={likedIds}
            />
            
            {/* 2. Mood Vibes (Horizontal - Full Width) */}
            <MoodRecommendations />
            
            {/* 3. Recommendations Section (Songs, Albums, Playlists) */}
            <RecommendationsSection />
            
            {/* 4. Trending Section (Songs, Albums, Playlists with Filters) */}
            <TrendingSection />
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
        queueLength={queue.length}
        onTogglePlay={togglePlay}
        onSeekPct={seekToPct}
        onVolumePct={setVolumePct}
        onToggleFavorite={toggleCurrentFavorite}
        isFavorite={isCurrentFavorite}
        onReplay={handleReplay}
        onToggleQueue={() => {
          // Toggle showing queued songs in the main area
          // If selectedPlaylist is null, show a temporary "Queue" view by setting playlistSongs to queue
          if (queue.length === 0) return;
          setSelectedPlaylist({ id: 'queue', name: 'Queue', description: 'Up next', songCount: queue.length, coverUrl: '', creator: '', isPublic: false } as any);
          // Convert SongItem queue to PlaylistSong entries
          const qSongs = queue.map(q => ({ id: q.id || q.path, title: q.name, artist: q.movie || '', movie: q.movie || '', audioUrl: q.audioUrl || '', coverUrl: q.coverUrl || '' }));
          setPlaylistSongs(qSongs);
        }}
        onAddToPlaylist={() => {
          if (!currentSong) return;
          setSelectedSong(currentSong);
          setShowAddToPlaylist(true);
        }}
        onShowLyrics={() => {
          // Show lyrics panel in middle of dashboard: reuse existing selectedMood area by setting a state
          // Always allow opening lyrics; if missing, show "Lyrics not available"
          const lyricsText = currentSong?.lyrics || null;
          window.dispatchEvent(new CustomEvent('showLyrics', { detail: { lyrics: lyricsText, title: currentSong?.name || '', artist: currentSong?.movie || '' } }));
        }}
        onPrev={() => {
          // Previous: if playback > 3s -> restart current song, else play previous in queue if available
          const audio = audioRef.current;
          if (!audio) return;
          try {
            if ((audio.currentTime || 0) > 3) {
              audio.currentTime = 0;
              audio.play().catch(() => {});
              return;
            }
            // find current index in queue
            const idx = queue.findIndex(q => (q.id || q.path) === (currentSong?.id || currentSong?.path));
            if (idx > 0) {
              const prevSong = queue[idx - 1];
              playSong(prevSong);
            } else {
              // no previous in queue -> restart
              audio.currentTime = 0;
              audio.play().catch(() => {});
            }
          } catch (e) {
            console.error('onPrev failed', e);
          }
        }}
        onNext={() => {
          // Next: play next song in queue if available
          const idx = queue.findIndex(q => (q.id || q.path) === (currentSong?.id || currentSong?.path));
          if (idx === -1) {
            // current song isn't in the queue (random song) -> play first in queue if present
            if (queue.length > 0) playSong(queue[0]);
          } else if (idx >= 0 && idx < queue.length - 1) {
            const nextSong = queue[idx + 1];
            playSong(nextSong);
          } else if (currentSong == null && queue.length > 0) {
            // nothing playing, start from first
            playSong(queue[0]);
          } else {
            // at end of queue or no-op
          }
        }}
        onChangeRepeatMode={(mode) => {
          // Map mode to isRepeating flag and behavior
          if (mode === 'one') {
            setIsRepeating(true);
          } else {
            setIsRepeating(false);
          }
        }}
      />

      {/* Add to Playlist Dialog */}
      {selectedSong && (
        <AddToPlaylistDialog
          isOpen={showAddToPlaylist}
          onClose={handleCloseAddToPlaylist}
          songPath={selectedSong.path}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}


