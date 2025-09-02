import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ListMusic, Users, Plus, Play, MoreHorizontal, X } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  movie?: string;
  audioUrl: string;
  coverUrl?: string;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  songCount: number;
  coverUrl?: string;
  isPublic: boolean;
}

interface Creator {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
}

interface LibraryProps {
  onPlay: (song: Song) => void;
  onPlaylistSelect?: (playlist: Playlist) => void;
}

export function Library({ onPlay, onPlaylistSelect }: LibraryProps) {
  const [activeTab, setActiveTab] = useState<'playlists' | 'creators'>('playlists');
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [followedCreators, setFollowedCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistPublic, setNewPlaylistPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchLibraryData();
    }
  }, [activeTab]);

  const fetchLibraryData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping data fetch');
        return;
      }

      console.log('Fetching library data...');
      if (activeTab === 'playlists') {
        try {
          // Fetch playlists first
          const playlistResponse = await fetch('http://localhost:3001/api/playlists/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (playlistResponse.ok) {
            const data = await playlistResponse.json();
            console.log('Playlists fetched:', data.playlists);
            setPlaylists(data.playlists || []);
          } else {
            console.error('Failed to fetch playlists:', await playlistResponse.text());
          }

          // Then fetch favorites
          const favoritesResponse = await fetch('http://localhost:3001/api/favorites', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (favoritesResponse.ok) {
            const data = await favoritesResponse.json();
            console.log('Favorites fetched:', data.favorites);
            setFavorites(data.favorites || []);
          } else {
            console.error('Failed to fetch favorites:', await favoritesResponse.text());
          }
        } catch (error) {
          console.error('Error fetching playlists or favorites:', error);
        }
      } else {
        try {
          await fetchFollowedCreators(token);
          console.log('Successfully fetched followed creators');
        } catch (error) {
          console.error('Error fetching followed creators:', error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch library data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFavorites = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  };

  const refreshPlaylists = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:3001/api/playlists/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Refreshing playlists:', data.playlists);
        setPlaylists(data.playlists || []);
      } else {
        console.error('Failed to refresh playlists:', await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const fetchFollowedCreators = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/users/following', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFollowedCreators(data.creators || []);
      }
    } catch (error) {
      console.error('Failed to fetch followed creators:', error);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Creating playlist:', { name: newPlaylistName.trim(), isPublic: newPlaylistPublic });
      
      const response = await fetch('http://localhost:3001/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newPlaylistName.trim(),
          description: '',
          isPublic: newPlaylistPublic
        })
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Playlist created successfully:', data);
        
        // Add the new playlist to the local state
        const newPlaylist = data.playlist;
        setPlaylists(prev => [...prev, newPlaylist]);
        
        // Set success message
        setCreateSuccess('Playlist created successfully!');
        setCreateError('');
        
        // Reset form and close modal
        setNewPlaylistName('');
        setShowCreatePlaylist(false);
        setNewPlaylistPublic(true);
        
        // Refresh the library data to ensure we have the latest playlists
        await fetchLibraryData();
        
        // Clear success message after 3 seconds
        setTimeout(() => setCreateSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        console.error('Failed to create playlist:', errorData);
        setCreateError(errorData.error || 'Failed to create playlist');
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const removeFavorite = async (songId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/favorites/${songId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setFavorites(prev => prev.filter(song => song.id !== songId));
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const handlePlaylistClick = (playlist: Playlist) => {
    if (onPlaylistSelect) {
      onPlaylistSelect(playlist);
    }
  };

  const renderPlaylists = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Your Playlists</h3>
        <Button
          size="sm"
          onClick={() => {
            setShowCreatePlaylist(true);
            setCreateError('');
            setCreateSuccess('');
            setNewPlaylistName('');
            setNewPlaylistPublic(true);
          }}
          className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Success Message */}
      {createSuccess && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-green-400 text-sm">{createSuccess}</p>
        </div>
      )}

      {/* Favorites as special playlist */}
      <div
        className="flex items-center space-x-3 p-3 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors group cursor-pointer"
        onClick={() => handlePlaylistClick({
          id: 'favorites',
          name: 'Favorites',
          description: 'Your favorite songs',
          songCount: favorites.length,
          coverUrl: undefined,
          isPublic: false
        })}
      >
        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate group-hover:text-red-300 transition-colors">
            Favorites
          </h4>
          <p className="text-gray-300 text-sm">Your favorite songs</p>
          <p className="text-gray-400 text-xs">{favorites.length} songs</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-white p-2 rounded-lg transition-all"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
      
      {playlists.length === 0 ? (
        <div className="text-center py-8">
          <ListMusic className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400">No playlists yet</p>
          <p className="text-sm text-gray-500">Create your first playlist</p>
        </div>
      ) : (
        playlists.map((playlist) => (
          <div
            key={playlist.id}
            className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors group cursor-pointer"
            onClick={() => handlePlaylistClick(playlist)}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              {playlist.coverUrl ? (
                <img
                  src={playlist.coverUrl}
                  alt="Cover"
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                <ListMusic className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                {playlist.name}
              </h4>
              {playlist.description && (
                <p className="text-gray-400 text-sm truncate">{playlist.description}</p>
              )}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-gray-500">{playlist.songCount} songs</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  playlist.isPublic 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {playlist.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-white p-2 rounded-lg transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        ))
      )}
    </div>
  );

  const renderFollowedCreators = () => (
    <div className="space-y-3">
      {followedCreators.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400">Not following anyone yet</p>
          <p className="text-sm text-gray-500">Follow content creators to see their updates</p>
        </div>
      ) : (
        followedCreators.map((creator) => (
          <div
            key={creator.id}
            className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-medium text-lg">
                  {creator.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                {creator.fullName || creator.username}
              </h4>
              <p className="text-gray-400 text-sm truncate">@{creator.username}</p>
              {creator.bio && (
                <p className="text-gray-500 text-xs truncate">{creator.bio}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-white p-2 rounded-lg transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Card className="bg-black/30 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white">Library</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Vertical Tab Navigation */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'playlists'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <ListMusic className="w-5 h-5" />
            <span>Playlists</span>
            <span className="px-2 py-1 text-xs bg-white/20 rounded-full">
              {playlists.length + 1}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('creators')}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'creators'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Following</span>
            <span className="px-2 py-1 text-xs bg-white/20 rounded-full">
              {followedCreators.length}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'playlists' && renderPlaylists()}
              {activeTab === 'creators' && renderFollowedCreators()}
            </>
          )}
        </div>
      </CardContent>

      {/* Create Playlist Modal */}
      {showCreatePlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-black/30 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl text-white">Create Playlist</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreatePlaylist(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error Display */}
              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{createError}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Playlist Name</label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Enter playlist name..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Privacy</label>
                <div className="flex space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={newPlaylistPublic}
                      onChange={() => setNewPlaylistPublic(true)}
                      className="text-purple-500"
                    />
                    <span className="text-white">Public</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!newPlaylistPublic}
                      onChange={() => setNewPlaylistPublic(false)}
                      className="text-purple-500"
                    />
                    <span className="text-white">Private</span>
                  </label>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  onClick={createPlaylist}
                  disabled={isCreating || !newPlaylistName.trim()}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                >
                  {isCreating ? 'Creating...' : 'Create Playlist'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreatePlaylist(false)}
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
