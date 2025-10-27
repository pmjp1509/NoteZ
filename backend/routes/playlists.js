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

module.exports = router;