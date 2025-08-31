const express = require('express');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Get user's favorite songs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        created_at,
        songs(
          id,
          title,
          artist,
          movie,
          audio_url,
          cover_url,
          duration,
          song_categories(name, color),
          creator:users!songs_creator_id_fkey(username, full_name, avatar_url)
        )
      `)
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch favorites' });
    }

    res.json({
      favorites: favorites.map(fav => ({
        songId: fav.songs.id,
        title: fav.songs.title,
        artist: fav.songs.artist,
        movie: fav.songs.movie,
        audioUrl: fav.songs.audio_url,
        coverUrl: fav.songs.cover_url,
        duration: fav.songs.duration,
        category: fav.songs.song_categories,
        creator: fav.songs.creator,
        favoritedAt: fav.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: favorites.length
      }
    });

  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add song to favorites
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.body;

    if (!songId) {
      return res.status(400).json({ error: 'Song ID is required' });
    }

    // Check if song exists and is public
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id, title')
      .eq('id', songId)
      .eq('is_public', true)
      .single();

    if (songError || !song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Add to favorites
    const { error: favError } = await supabase
      .from('user_favorites')
      .insert({
        user_id: req.user.userId,
        song_id: songId
      });

    if (favError) {
      if (favError.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Song already in favorites' });
      }
      return res.status(500).json({ error: 'Failed to add to favorites' });
    }

    // Update creator stats (increment total_favorites)
    await supabase.rpc('increment_creator_favorites', { song_id: songId });

    res.json({ 
      message: 'Song added to favorites',
      song: {
        id: song.id,
        title: song.title
      }
    });

  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove song from favorites
router.delete('/:songId', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;

    // Remove from favorites
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', req.user.userId)
      .eq('song_id', songId);

    if (error) {
      return res.status(500).json({ error: 'Failed to remove from favorites' });
    }

    // Update creator stats (decrement total_favorites)
    await supabase.rpc('decrement_creator_favorites', { song_id: songId });

    res.json({ message: 'Song removed from favorites' });

  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if song is in user's favorites
router.get('/check/:songId', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;

    const { data: favorite, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', req.user.userId)
      .eq('song_id', songId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Failed to check favorite status' });
    }

    res.json({
      isFavorite: !!favorite,
      favoriteId: favorite?.id || null
    });

  } catch (error) {
    console.error('Check favorite status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's favorite songs by category
router.get('/category/:categoryName', authenticateToken, async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        created_at,
        songs(
          id,
          title,
          artist,
          movie,
          audio_url,
          cover_url,
          duration,
          song_categories(name, color),
          creator:users!songs_creator_id_fkey(username, full_name, avatar_url)
        )
      `)
      .eq('user_id', req.user.userId)
      .eq('songs.song_categories.name', categoryName)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch favorites by category' });
    }

    res.json({
      favorites: favorites.map(fav => ({
        songId: fav.songs.id,
        title: fav.songs.title,
        artist: fav.songs.artist,
        movie: fav.songs.movie,
        audioUrl: fav.songs.audio_url,
        coverUrl: fav.songs.cover_url,
        duration: fav.songs.duration,
        category: fav.songs.song_categories,
        creator: fav.songs.creator,
        favoritedAt: fav.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: favorites.length
      }
    });

  } catch (error) {
    console.error('Get favorites by category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's favorite songs by creator
router.get('/creator/:creatorId', authenticateToken, async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        created_at,
        songs(
          id,
          title,
          artist,
          movie,
          audio_url,
          cover_url,
          duration,
          song_categories(name, color),
          creator:users!songs_creator_id_fkey(username, full_name, avatar_url)
        )
      `)
      .eq('user_id', req.user.userId)
      .eq('songs.creator_id', creatorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch favorites by creator' });
    }

    res.json({
      favorites: favorites.map(fav => ({
        songId: fav.songs.id,
        title: fav.songs.title,
        artist: fav.songs.artist,
        movie: fav.songs.movie,
        audioUrl: fav.songs.audio_url,
        coverUrl: fav.songs.cover_url,
        duration: fav.songs.duration,
        category: fav.songs.song_categories,
        creator: fav.songs.creator,
        favoritedAt: fav.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: favorites.length
      }
    });

  } catch (error) {
    console.error('Get favorites by creator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's favorite songs count
router.get('/count', authenticateToken, async (req, res) => {
  try {
    const { data: count, error } = await supabase
      .from('user_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to get favorites count' });
    }

    res.json({
      count: count || 0
    });

  } catch (error) {
    console.error('Get favorites count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

