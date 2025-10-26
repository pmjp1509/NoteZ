const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

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