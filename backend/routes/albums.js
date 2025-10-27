const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Full authentication middleware
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  if (token.split('.').length !== 3) return res.status(400).json({ error: 'Malformed token' });
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(403).json({ error: 'Invalid token' });
    
    // Get user role
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();
    
    req.user = { id: user.id, email: user.email, role: dbUser?.role };
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Optional authentication middleware
const tryAuthenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || token.split('.').length !== 3) {
    return next();
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      req.user = { id: user.id };
    }
  } catch {}
  next();
};

// Middleware to check if user is content creator
const requireCreator = (req, res, next) => {
  if (req.user?.role !== 'content_creator') {
    return res.status(403).json({ error: 'Content creator access required' });
  }
  next();
};

// Get creator's albums
router.get('/creator', authenticateToken, requireCreator, async (req, res) => {
  try {
    // First get albums
    const { data: albums, error } = await supabase
      .from('albums')
      .select(`
        *,
        users!creator_id(username, avatar_url),
        song_count:songs(count)
      `)
      .eq('creator_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch albums' });

    // Ensure song counts are accurate. Prefer total_songs (maintained by DB triggers),
    // but if it's zero or missing, compute a fallback count from album_songs.
    const enhancedAlbums = await Promise.all((albums || []).map(async (alb) => {
      let computedCount = alb.total_songs || 0;
      if (!computedCount || computedCount === 0) {
        try {
          const { count } = await supabase
            .from('album_songs')
            .select('id', { count: 'exact', head: true })
            .eq('album_id', alb.id);
          computedCount = count || 0;
        } catch (e) {
          computedCount = 0;
        }
      }
      // Keep compatibility with frontend expectations: provide song_count as array with count
      return {
        ...alb,
        total_songs: computedCount,
        song_count: [{ count: computedCount }]
      };
    }));

    res.json({ albums: enhancedAlbums });
  } catch (error) {
    console.error('Get creator albums error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create album
router.post('/', authenticateToken, requireCreator, async (req, res) => {
  try {
    const { title, description, cover_url, release_date, isPublic = true } = req.body;
    
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const { data: album, error } = await supabase
      .from('albums')
      .insert({
        title,
        description,
        cover_url,
        release_date,
        is_public: isPublic,
        creator_id: req.user.id
      })
      .select('*, users!creator_id(username, avatar_url)')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to create album' });
    res.status(201).json({ album });
  } catch (error) {
    console.error('Create album error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update album
router.put('/:id', authenticateToken, requireCreator, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, cover_url, release_date, isPublic } = req.body;

    // Check ownership
    const { data: existing } = await supabase
      .from('albums')
      .select('id')
      .eq('id', id)
      .eq('creator_id', req.user.id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Album not found' });

    const { data: album, error } = await supabase
      .from('albums')
      .update({
        title,
        description,
        cover_url,
        release_date,
        is_public: isPublic,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, users!creator_id(username, avatar_url)')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update album' });
    res.json({ album });
  } catch (error) {
    console.error('Update album error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete album
router.delete('/:id', authenticateToken, requireCreator, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const { data: existing } = await supabase
      .from('albums')
      .select('id')
      .eq('id', id)
      .eq('creator_id', req.user.id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Album not found' });

    const { error } = await supabase.from('albums').delete().eq('id', id);

    if (error) return res.status(500).json({ error: 'Failed to delete album' });
    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    console.error('Delete album error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add song to album
router.post('/:id/songs', authenticateToken, requireCreator, async (req, res) => {
  try {
    const { id: albumId } = req.params;
    const { songId } = req.body;

    // Check ownership
    const { data: album } = await supabase
      .from('albums')
      .select('id')
      .eq('id', albumId)
      .eq('creator_id', req.user.id)
      .single();

    if (!album) return res.status(404).json({ error: 'Album not found' });

    // Get next position
    const { data: last } = await supabase
      .from('album_songs')
      .select('position')
      .eq('album_id', albumId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const position = last ? last.position + 1 : 1;

    const { data, error } = await supabase
      .from('album_songs')
      .insert({ album_id: albumId, song_id: songId, position })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to add song to album' });

    // Update total_songs
    await supabase.rpc('increment', {
      table_name: 'albums',
      column_name: 'total_songs',
      row_id: albumId
    });

    res.json({ albumSong: data });
  } catch (error) {
    console.error('Add song to album error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove song from album
router.delete('/:id/songs/:songId', authenticateToken, requireCreator, async (req, res) => {
  try {
    const { id: albumId, songId } = req.params;

    // Check ownership
    const { data: album } = await supabase
      .from('albums')
      .select('id')
      .eq('id', albumId)
      .eq('creator_id', req.user.id)
      .single();

    if (!album) return res.status(404).json({ error: 'Album not found' });

    const { error } = await supabase
      .from('album_songs')
      .delete()
      .eq('album_id', albumId)
      .eq('song_id', songId);

    if (error) return res.status(500).json({ error: 'Failed to remove song' });

    // Update total_songs
    await supabase.rpc('increment', {
      table_name: 'albums',
      column_name: 'total_songs',
      row_id: albumId,
      amount: -1
    });

    res.json({ message: 'Song removed from album' });
  } catch (error) {
    console.error('Remove song from album error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search albums (with optional filters)
router.get('/search', tryAuthenticate, async (req, res) => {
  try {
    const { q = '', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!q || String(q).trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Build query to search albums and include creator info
    let query = supabase
      .from('albums')
      .select(`
        id,
        title,
        description,
        cover_url,
        release_date,
        total_songs,
        total_listens,
        created_at,
        creator:users!albums_creator_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .order('total_listens', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: albums, error, count } = await query;

    if (error) {
      console.error('Album search error:', error);
      return res.status(500).json({ error: 'Failed to search albums' });
    }

    res.json({
      albums: albums.map(album => ({
        id: album.id,
        title: album.title,
        description: album.description,
        coverUrl: album.cover_url,
        releaseDate: album.release_date,
        songCount: album.total_songs,
        totalListens: album.total_listens,
        createdAt: album.created_at,
        creator: album.creator ? {
          id: album.creator.id,
          username: album.creator.username,
          fullName: album.creator.full_name,
          avatarUrl: album.creator.avatar_url
        } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || albums.length
      }
    });

  } catch (error) {
    console.error('Album search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get album songs
router.get('/:id/songs', tryAuthenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // First check if album exists
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('id, title, description, cover_url, is_public')
      .eq('id', id)
      .eq('is_public', true)
      .single();

    if (albumError || !album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    // Get all songs in this album
    const { data: songs, error: songsError } = await supabase
      .from('album_songs')
      .select(`
        position,
        songs(
          id,
          title,
          artist,
          movie,
          audio_url,
          cover_url,
          duration,
          song_categories(name, color)
        )
      `)
      .eq('album_id', id)
      .order('position', { ascending: true });

    if (songsError) {
      console.error('Error fetching album songs:', songsError);
      return res.status(500).json({ error: 'Failed to fetch album songs' });
    }

    // Sort songs by position and extract song data
    const sortedSongs = (songs || [])
      .sort((a, b) => a.position - b.position)
      .map(item => item.songs)
      .filter(Boolean);

    res.json({
      album: {
        id: album.id,
        title: album.title,
        description: album.description,
        coverUrl: album.cover_url
      },
      songs: sortedSongs
    });

  } catch (error) {
    console.error('Get album songs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;