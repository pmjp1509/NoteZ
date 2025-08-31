import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Plus, BarChart3, Music, Users, Heart, TrendingUp, Edit, Trash2, Eye } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  movie?: string;
  category: {
    name: string;
    color: string;
  };
  audioUrl: string;
  coverUrl?: string;
  lyrics?: string;
  isPublic: boolean;
  createdAt: string;
  analytics: {
    play_count: number;
    listen_duration: number;
  }[];
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
  description: string;
  color: string;
}

export function ContentCreatorDashboard() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    artist: '',
    movie: '',
    categoryId: '',
    lyrics: '',
    isPublic: true,
    audioFile: null as File | null,
    coverFile: null as File | null
  });

  useEffect(() => {
    fetchSongs();
    fetchCategories();
    fetchStats();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/songs/creator', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setSongs(data.songs || []);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        alert('Song uploaded successfully!');
        setShowUploadForm(false);
        setUploadForm({
          title: '',
          artist: '',
          movie: '',
          categoryId: '',
          lyrics: '',
          isPublic: true,
          audioFile: null,
          coverFile: null
        });
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
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
    return song.analytics.reduce((sum, a) => sum + (a.play_count || 0), 0);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Creator Dashboard</h1>
          <p className="text-gray-400">Manage your music and track performance</p>
        </div>
        <Button
          onClick={() => setShowUploadForm(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload Song
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-black/30 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
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

          <Card className="bg-black/30 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
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

          <Card className="bg-black/30 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Heart className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalFavorites}</p>
                  <p className="text-sm text-gray-400">Total Favorites</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/30 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-green-400" />
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

      {/* Upload Form Modal */}
      {showUploadForm && (
        <Card className="bg-black/50 border-white/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Upload New Song</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-white">Title *</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full mt-1 p-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-white">Artist *</label>
                  <input
                    type="text"
                    value={uploadForm.artist}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, artist: e.target.value }))}
                    className="w-full mt-1 p-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-white">Movie (Optional)</label>
                  <input
                    type="text"
                    value={uploadForm.movie}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, movie: e.target.value }))}
                    className="w-full mt-1 p-2 bg-white/5 border border-white/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-white">Category *</label>
                  <select
                    value={uploadForm.categoryId}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full mt-1 p-2 bg-white/5 border border-white/20 rounded-lg text-white"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-white">Audio File *</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setUploadForm(prev => ({ ...prev, audioFile: e.target.files?.[0] || null }))}
                  className="w-full mt-1 p-2 bg-white/5 border border-white/20 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-white">Lyrics (Optional)</label>
                <textarea
                  value={uploadForm.lyrics}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, lyrics: e.target.value }))}
                  rows={4}
                  className="w-full mt-1 p-2 bg-white/5 border border-white/20 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={uploadForm.isPublic}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isPublic" className="text-sm text-white">Make song public</label>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={isUploading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isUploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Song
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadForm(false)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Songs List */}
      <Card className="bg-black/30 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Your Songs</CardTitle>
        </CardHeader>
        <CardContent>
          {songs.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No songs uploaded yet</p>
              <p className="text-sm text-gray-500">Start by uploading your first song!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{song.title}</h3>
                      <p className="text-gray-400 text-sm">{song.artist}</p>
                      {song.movie && (
                        <p className="text-gray-500 text-xs">From: {song.movie}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className="px-2 py-1 text-xs rounded-full text-white"
                          style={{ backgroundColor: song.category.color }}
                        >
                          {song.category.name}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {new Date(song.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="text-white font-medium">{getTotalPlays(song)}</p>
                      <p className="text-gray-400 text-xs">Plays</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => deleteSong(song.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
