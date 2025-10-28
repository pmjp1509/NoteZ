const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();

async function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    req.user = {
      id: user.id,
      email: user.email,
      role: dbUser?.role
    };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
}

function requireCreator(req, res, next) {
  if (req.user.role !== 'content_creator') {
    return res.status(403).json({ error: 'Content creator access required' });
  }
  next();
}

router.get('/creator', authenticateToken, requireCreator, (req, res) => {
  supabase
    .from('playlists')
    .select(`
      *,
      playlist_songs(
        songs(
          id,
          title,
          artist,
          audio_url,
          cover_url
        )
      )
    `)
    .eq('creator_id', req.user.id)
    .order('created_at', { ascending: false })
    .then(({ data: playlists, error }) => {
      if (error) {
        console.error('Error fetching creator playlists:', error);
        return res.status(500).json({ error: 'Failed to fetch playlists' });
      }

      res.json({
        playlists: playlists.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          coverUrl: playlist.cover_url,
          createdAt: playlist.created_at,
          songCount: (playlist.playlist_songs || []).length
        }))
      });
    })
    .catch(error => {
      console.error('Error fetching creator playlists:', error);
      res.status(500).json({ error: 'Failed to fetch playlists' });
    });
});

// Get current user's playlists (including Favorites)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Ensure favorites playlist exists for the user (creates if missing)
    try {
      await supabase.rpc('ensure_favorites_playlist', { p_user_id: req.user.id });
    } catch (e) {
      // non-fatal: continue, we'll still attempt to fetch playlists
      console.warn('ensure_favorites_playlist RPC warning:', e?.message || e);
    }

    const { data: playlists, error } = await supabase
      .from('playlists')
      .select(`
        id,
        name,
        description,
        cover_url,
        is_public,
        is_favorites,
        created_at,
        songs:playlist_songs(count)
      `)
      .eq('creator_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user playlists:', error);
      return res.status(500).json({ error: 'Failed to fetch playlists' });
    }

    res.json({
      playlists: (playlists || []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        coverUrl: p.cover_url,
        isPublic: p.is_public,
        isFavorites: p.is_favorites,
        createdAt: p.created_at,
        songCount: p.songs?.[0]?.count || 0
      }))
    });
  } catch (error) {
    console.error('Get user playlists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search playlists (public only)
router.get('/search', tryAuthenticate, async (req, res) => {
  try {
    const { q = '', limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    if (!q || String(q).trim() === '') {
      return res.json({ playlists: [] });
    }

    let query = supabase
      .from('playlists')
      .select(`
        *,
        creator:users!playlists_creator_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .is('is_favorites', false)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: playlists, error } = await query;

    if (error) {
      console.error('Playlist search error:', error);
      return res.status(500).json({ error: 'Failed to search playlists' });
    }

    res.json({
      playlists: (playlists || []).map(pl => ({
        id: pl.id,
        name: pl.name,
        description: pl.description,
        coverUrl: pl.cover_url,
        createdAt: pl.created_at,
        creator: pl.creator ? {
          id: pl.creator.id,
          username: pl.creator.username,
          fullName: pl.creator.full_name,
          avatarUrl: pl.creator.avatar_url
        } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Playlist search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function tryAuthenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    authenticateToken(req, res, () => {
      req.user = req.user || { id: null };
      next();
    });
  } else {
    req.user = { id: null };
    next();
  }
}

module.exports = router;