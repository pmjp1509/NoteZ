import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Music, Album, ListMusic, User, Settings, Eye, Edit, Trash2 } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  movie?: string;
  category: { name: string; color: string };
  audioUrl: string;
  coverUrl?: string;
  lyrics?: string;
  isPublic: boolean;
  createdAt: string;
  analytics: { play_count: number; listen_duration: number }[];
}

interface Album {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  createdAt: string;
  songCount: number;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  createdAt: string;
  songCount: number;
}

interface CreatorProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  followersCount: number;
}

interface CreatorStats {
  totalSongs: number;
  totalListens: number;
  totalFavorites: number;
  monthlyListeners: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export function ContentCreatorDashboard() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [activeTab, setActiveTab] = useState<'songs' | 'albums' | 'playlists'>('songs');
  
  const [profileEditForm, setProfileEditForm] = useState({
    username: '',
    full_name: '',
    bio: ''
  });
  
  const [albumForm, setAlbumForm] = useState({
    title: '',
    description: '',
    coverUrl: '',
    releaseDate: '',
    isPublic: true
  });
  
  const [playlistForm, setPlaylistForm] = useState({
    name: '',
    description: '',
    isPublic: true
  });
  
  const [uploadForm, setUploadForm] = useState({
    title: '',
    artist: '',
    movie: '',
    categoryId: '',
    lyrics: '',
    isPublic: true,
    audioFile: null as File | null,
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProfile();
    fetchSongs();
    fetchAlbums();
    fetchPlaylists();
    fetchCategories();
    fetchStats();
  }, []);

  useEffect(() => {
    if (profile) {
      setProfileEditForm({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || ''
      });
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      let followersCount = 0;
      try {
        const followersRes = await fetch(`http://localhost:3001/api/users/followers/${data.user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (followersRes.ok) {
          const followersData = await followersRes.json();
          followersCount = followersData.count || 0;
        }
      } catch {}
      
      setProfile({ ...data.user, followersCount });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchSongs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/songs/creator', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSongs(data.songs || []);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
    }
  };

  const fetchAlbums = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/albums/creator', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAlbums(data.albums || []);
    } catch (error) {
      console.error('Failed to fetch albums:', error);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/playlists/creator', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/analytics/creator', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data.overview);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.audioFile || !uploadForm.title || !uploadForm.artist || !uploadForm.categoryId) {
      alert('Please fill in all required fields and select an audio file');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('audio', uploadForm.audioFile);
    formData.append('title', uploadForm.title);
    formData.append('artist', uploadForm.artist);
    formData.append('categoryId', uploadForm.categoryId);
    formData.append('movie', uploadForm.movie);
    formData.append('lyrics', uploadForm.lyrics);
    formData.append('isPublic', uploadForm.isPublic.toString());

    try {
      const response = await fetch('http://localhost:3001/api/songs/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        alert('Song uploaded successfully!');
        setShowUploadForm(false);
        setUploadForm({ title: '', artist: '', movie: '', categoryId: '', lyrics: '', isPublic: true, audioFile: null });
        fetchSongs();
        fetchStats();
      } else {
        const error = await response.json();
        alert(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteSong = async (songId: string) => {
    if (!confirm('Are you sure you want to delete this song?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/songs/${songId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Song deleted successfully!');
        fetchSongs();
        fetchStats();
      } else {
        const error = await response.json();
        alert(error.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed');
    }
  };

  const getTotalPlays = (song: Song) => {
    return song.analytics?.reduce((sum, a) => sum + (a.play_count || 0), 0) || 0;
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/api/users/me', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: profileEditForm.username,
          fullName: profileEditForm.full_name,
          bio: profileEditForm.bio
        })
      });

      if (response.ok) {
        alert('Profile updated successfully!');
        setShowProfileEdit(false);
        fetchProfile();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile');
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/api/albums', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: albumForm.title,
          description: albumForm.description,
          cover_url: albumForm.coverUrl,
          release_date: albumForm.releaseDate || null,
          isPublic: albumForm.isPublic
        })
      });

      if (response.ok) {
        alert('Album created successfully!');
        setShowCreateAlbum(false);
        setAlbumForm({ title: '', description: '', coverUrl: '', releaseDate: '', isPublic: true });
        fetchAlbums();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create album');
      }
    } catch (error) {
      console.error('Create album error:', error);
      alert('Failed to create album');
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3001/api/playlists', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: playlistForm.name,
          description: playlistForm.description,
          isPublic: playlistForm.isPublic
        })
      });

      if (response.ok) {
        alert('Playlist created successfully!');
        setShowCreatePlaylist(false);
        setPlaylistForm({ name: '', description: '', isPublic: true });
        fetchPlaylists();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create playlist');
      }
    } catch (error) {
      console.error('Create playlist error:', error);
      alert('Failed to create playlist');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      {/* Profile Section */}
      {profile && (
        <Card className="bg-black/40 border-white/20 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <img 
                src={profile.avatar_url || '/default-avatar.png'} 
                alt={profile.username}
                className="w-20 h-20 rounded-full"
              />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{profile.username}</h2>
                {profile.full_name && <p className="text-gray-400">{profile.full_name}</p>}
                {profile.bio && <p className="text-sm text-gray-300 mt-2">{profile.bio}</p>}
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-sm text-gray-400">
                    <strong className="text-white">{profile.followersCount}</strong> Followers
                  </span>
                </div>
        </div>
              <Button variant="outline" className="border-white/20 text-white" onClick={() => setShowProfileEdit(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
      </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-black/40 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Music className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalSongs}</p>
                  <p className="text-sm text-gray-400">Total Songs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Eye className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalListens}</p>
                  <p className="text-sm text-gray-400">Total Listens</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Eye className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalFavorites}</p>
                  <p className="text-sm text-gray-400">Total Favorites</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <User className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.monthlyListeners}</p>
                  <p className="text-sm text-gray-400">Monthly Listeners</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === 'songs' ? 'default' : 'outline'}
          onClick={() => setActiveTab('songs')}
          className={activeTab === 'songs' ? 'bg-purple-500' : 'border-white/20 text-white'}
        >
          <Music className="w-4 h-4 mr-2" />
          Songs
        </Button>
        <Button
          variant={activeTab === 'albums' ? 'default' : 'outline'}
          onClick={() => setActiveTab('albums')}
          className={activeTab === 'albums' ? 'bg-purple-500' : 'border-white/20 text-white'}
        >
          <Album className="w-4 h-4 mr-2" />
          Albums
        </Button>
        <Button
          variant={activeTab === 'playlists' ? 'default' : 'outline'}
          onClick={() => setActiveTab('playlists')}
          className={activeTab === 'playlists' ? 'bg-purple-500' : 'border-white/20 text-white'}
        >
          <ListMusic className="w-4 h-4 mr-2" />
          Playlists
        </Button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'songs' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Your Songs</h3>
            <Button onClick={() => setShowUploadForm(true)} className="bg-gradient-to-r from-purple-500 to-pink-500">
              <Plus className="w-4 h-4 mr-2" /> Upload Song
            </Button>
          </div>
          <Card className="bg-black/40 border-white/20">
            <CardContent className="p-4">
              {songs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No songs yet</div>
              ) : (
                <div className="space-y-3">
                  {songs.map((song) => (
                    <div key={song.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Music className="w-8 h-8 text-purple-400" />
                        <div>
                          <h4 className="text-white font-medium">{song.title}</h4>
                          <p className="text-sm text-gray-400">{song.artist}</p>
                          <p className="text-xs text-gray-500">{getTotalPlays(song)} plays</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-white/20">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-white/20" onClick={() => deleteSong(song.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'albums' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Your Albums</h3>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500" onClick={() => setShowCreateAlbum(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Album
            </Button>
          </div>
          <Card className="bg-black/40 border-white/20">
            <CardContent className="p-4">
              {albums.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No albums yet</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {albums.map((album) => (
                    <div key={album.id} className="p-4 bg-white/5 rounded-lg">
                      <img src={album.coverUrl || '/placeholder-album.jpg'} alt={album.title} className="w-full aspect-square rounded-lg mb-2" />
                      <h4 className="text-white font-medium">{album.title}</h4>
                      <p className="text-sm text-gray-400">{album.songCount} songs</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'playlists' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Your Playlists</h3>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500" onClick={() => setShowCreatePlaylist(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Playlist
            </Button>
          </div>
          <Card className="bg-black/40 border-white/20">
            <CardContent className="p-4">
              {playlists.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No playlists yet</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {playlists.map((playlist) => (
                    <div key={playlist.id} className="p-4 bg-white/5 rounded-lg">
                      <img src={playlist.coverUrl || '/placeholder-playlist.jpg'} alt={playlist.name} className="w-full aspect-square rounded-lg mb-2" />
                      <h4 className="text-white font-medium">{playlist.name}</h4>
                      <p className="text-sm text-gray-400">{playlist.songCount || 0} songs</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl bg-black/90 border-white/30">
          <CardHeader>
            <CardTitle className="text-white">Upload New Song</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Title *"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="p-2 bg-white/5 border border-white/20 rounded text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Artist *"
                    value={uploadForm.artist}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, artist: e.target.value }))}
                    className="p-2 bg-white/5 border border-white/20 rounded text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Movie (Optional)"
                    value={uploadForm.movie}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, movie: e.target.value }))}
                    className="p-2 bg-white/5 border border-white/20 rounded text-white"
                  />
                  <select
                    value={uploadForm.categoryId}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="p-2 bg-white/5 border border-white/20 rounded text-white"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setUploadForm(prev => ({ ...prev, audioFile: e.target.files?.[0] || null }))}
                  className="p-2 bg-white/5 border border-white/20 rounded text-white"
                  required
                />
                <textarea
                  placeholder="Lyrics (Optional)"
                  value={uploadForm.lyrics}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, lyrics: e.target.value }))}
                  rows={4}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded text-white"
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={isUploading} className="bg-purple-500">
                    {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
                  <Button type="button" onClick={() => setShowUploadForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
            </div>
          )}

      {/* Edit Profile Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl bg-black/90 border-white/30">
            <CardHeader>
              <CardTitle className="text-white">Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={profileEditForm.username}
                  onChange={(e) => setProfileEditForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={profileEditForm.full_name}
                  onChange={(e) => setProfileEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded text-white"
                />
                <textarea
                  placeholder="Bio"
                  value={profileEditForm.bio}
                  onChange={(e) => setProfileEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded text-white"
                />
                <div className="flex gap-2">
                  <Button type="submit" className="bg-purple-500">Save</Button>
                  <Button type="button" onClick={() => setShowProfileEdit(false)} variant="outline">Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Album Modal */}
      {showCreateAlbum && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl bg-black/90 border-white/30">
            <CardHeader>
              <CardTitle className="text-white">Create Album</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAlbum} className="space-y-4">
                <input
                  type="text"
                  placeholder="Album Title *"
                  value={albumForm.title}
                  onChange={(e) => setAlbumForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded text-white"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={albumForm.description}
                  onChange={(e) => setAlbumForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded text-white"
                />
                <input
                  type="text"
                  placeholder="Cover Image URL"
                  value={albumForm.coverUrl}
                  onChange={(e) => setAlbumForm(prev => ({ ...prev, coverUrl: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded text-white"
                />
                <input
                  type="date"
                  placeholder="Release Date"
                  value={albumForm.releaseDate}
                  onChange={(e) => setAlbumForm(prev => ({ ...prev, releaseDate: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded text-white"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="albumPublic"
                    checked={albumForm.isPublic}
                    onChange={(e) => setAlbumForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                  />
                  <label htmlFor="albumPublic" className="text-white">Make album public</label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-purple-500">Create</Button>
                  <Button type="button" onClick={() => setShowCreateAlbum(false)} variant="outline">Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylist && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl bg-black/90 border-white/30">
            <CardHeader>
              <CardTitle className="text-white">Create Playlist</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePlaylist} className="space-y-4">
                <input
                  type="text"
                  placeholder="Playlist Name *"
                  value={playlistForm.name}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded text-white"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={playlistForm.description}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded text-white"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="playlistPublic"
                    checked={playlistForm.isPublic}
                    onChange={(e) => setPlaylistForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                  />
                  <label htmlFor="playlistPublic" className="text-white">Make playlist public</label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-purple-500">Create</Button>
                  <Button type="button" onClick={() => setShowCreatePlaylist(false)} variant="outline">Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
