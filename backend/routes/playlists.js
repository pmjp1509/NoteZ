const express = require('express');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const router = express.Router();

// Middleware to verify Supabase access token and ensure user exists in users table
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Validate token format
  if (token.split('.').length !== 3) {
    return res.status(400).json({ error: 'Malformed token' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) throw error;

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user exists in users table
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    let dbUser = existingUser;
    if (userError || !existingUser) {
      // Create user if they don't exist
      const { data: newUser, error: createError } = await supabase.rpc('create_user_if_not_exists', {
        user_id: user.id,
        user_email: user.email,
        user_name: user.email?.split('@')[0],
        user_full_name: user.user_metadata?.full_name || user.user_metadata?.name,
        user_avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture
      });

      if (createError) {
        return res.status(500).json({ error: 'Failed to ensure user profile' });
      }

      dbUser = newUser;
    }

    req.user = { id: user.id, email: user.email, username: dbUser?.username || user.user_metadata?.user_name || user.email?.split('@')[0], dbUser };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Best-effort auth: attaches req.user if valid token present; otherwise continues unauthenticated
const tryAuthenticate = async (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || token.split('.').length !== 3) {
    return next();
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, username')
        .eq('id', user.id)
        .maybeSingle();
      req.user = { id: user.id, email: user.email, username: dbUser?.username };
    }
  } catch {}
  return next();
};

// Create new playlist
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, isPublic = true, isFavorites = false } = req.body;
    
    console.log('Creating playlist request:', { name, description, isPublic, isFavorites, userId: req.user.id });

    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    // Prevent creating multiple favorites playlists
    if (isFavorites) {
      const { data: existingFavorites, error: checkError } = await supabase
        .from('playlists')
        .select('id')
        .eq('creator_id', req.user.id)
        .eq('is_favorites', true)
        .single();
      
      if (!checkError && existingFavorites) {
        return res.status(400).json({ error: 'Favorites playlist already exists' });
      }
    }

    console.log('Inserting playlist into database...');
    
    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        name,
        description,
        creator_id: req.user.id,
        is_public: isPublic,
        is_favorites: isFavorites
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to create playlist' });
    }
    
    console.log('Playlist created successfully:', playlist);

    res.status(201).json({
      message: 'Playlist created successfully',
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        isPublic: playlist.is_public,
        coverUrl: playlist.cover_url,
        songCount: 0,
        createdAt: playlist.created_at,
        updatedAt: playlist.updated_at
      }
    });

  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's playlists
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    console.log('Fetching playlists for user:', req.user);
    
    const { data: playlists, error } = await supabase
      .from('playlists')
      .select(`
        *,
        playlist_songs(count)
      `)
      .eq('creator_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    console.log('Playlists fetched:', { playlists, error });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch playlists' });
    }

    res.json({
      playlists: playlists.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        isPublic: playlist.is_public,
        isFavorites: playlist.is_favorites,
        coverUrl: playlist.cover_url,
        songCount: playlist.playlist_songs[0]?.count || 0,
        createdAt: playlist.created_at,
        updatedAt: playlist.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: playlists.length
      }
    });

  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public playlists
router.get('/public', async (req, res) => {
  try {
    const { page = 1, limit = 20, creator } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('playlists')
      .select(`
        *,
        creator:users!playlists_creator_id_fkey(username, full_name, avatar_url),
        playlist_songs(count)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (creator) {
      query = query.eq('creator.username', creator);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: playlists, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch public playlists' });
    }

    res.json({
      playlists: playlists.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        coverUrl: playlist.cover_url,
        creator: playlist.creator,
        songCount: playlist.playlist_songs[0]?.count || 0,
        createdAt: playlist.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: playlists.length
      }
    });

  } catch (error) {
    console.error('Get public playlists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search playlists: returns public playlists matching q; if authenticated, also returns requester's private playlists matching q
router.get('/search', tryAuthenticate, async (req, res) => {
  try {
    const { q = '', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!q || String(q).trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Public playlists matching q
    let publicQuery = supabase
      .from('playlists')
      .select(`
        *,
        creator:users!playlists_creator_id_fkey(username, full_name, avatar_url),
        playlist_songs(count)
      `)
      .eq('is_public', true)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const [{ data: publicPlaylists, error: pubErr }] = await Promise.all([publicQuery]);
    if (pubErr) return res.status(500).json({ error: 'Failed to search public playlists' });

    let results = publicPlaylists || [];

    // If authenticated, include own private playlists matching q
    if (req.user?.id) {
      const { data: mine, error: mineErr } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_songs(count)
        `)
        .eq('creator_id', req.user.id)
        .eq('is_public', false)
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      if (!mineErr && mine && mine.length) {
        const existing = new Set(results.map(p => p.id));
        mine.forEach(p => { if (!existing.has(p.id)) results.push(p); });
      }
    }

    res.json({
      playlists: results.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        coverUrl: playlist.cover_url,
        creator: playlist.creator,
        songCount: playlist.playlist_songs?.[0]?.count || 0,
        isPublic: playlist.is_public,
        createdAt: playlist.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: results.length
      }
    });

  } catch (error) {
    console.error('Search playlists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get playlist by ID (public playlists)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: playlist, error } = await supabase
      .from('playlists')
      .select(`
        *,
        creator:users!playlists_creator_id_fkey(username, full_name, avatar_url),
        playlist_songs(
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
        )
      `)
      .eq('id', id)
      .eq('is_public', true)
      .single();

    if (error || !playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Sort songs by position
    const sortedSongs = playlist.playlist_songs
      .sort((a, b) => a.position - b.position)
      .map(item => item.songs);

    res.json({
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        coverUrl: playlist.cover_url,
        creator: playlist.creator,
        isPublic: playlist.is_public,
        songs: sortedSongs,
        createdAt: playlist.created_at,
        updatedAt: playlist.updated_at
      }
    });

  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's own playlist by ID (with songs)
router.get('/me/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: playlist, error } = await supabase
      .from('playlists')
      .select(`
        *,
        playlist_songs(
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
        )
      `)
      .eq('id', id)
      .eq('creator_id', req.user.id)
      .single();

    if (error || !playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Sort songs by position
    const sortedSongs = playlist.playlist_songs
      .sort((a, b) => a.position - b.position)
      .map(item => item.songs);

    res.json({
      songs: sortedSongs
    });

  } catch (error) {
    console.error('Get user playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update playlist
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isPublic } = req.body;

    // Check if playlist exists and belongs to user
    const { data: existingPlaylist, error: checkError } = await supabase
      .from('playlists')
      .select('id, creator_id')
      .eq('id', id)
      .single();

    if (checkError || !existingPlaylist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (existingPlaylist.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own playlists' });
    }

    // Update playlist
    const { data: playlist, error: updateError } = await supabase
      .from('playlists')
      .update({
        name: name || undefined,
        description: description || undefined,
        is_public: isPublic !== undefined ? isPublic : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update playlist' });
    }

    res.json({
      message: 'Playlist updated successfully',
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        isPublic: playlist.is_public,
        updatedAt: playlist.updated_at
      }
    });

  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete playlist
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if playlist exists and belongs to user
    const { data: playlist, error: checkError } = await supabase
      .from('playlists')
      .select('id, creator_id')
      .eq('id', id)
      .single();

    if (checkError || !playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (playlist.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own playlists' });
    }

    // Delete playlist (cascade will handle playlist_songs)
    const { error: deleteError } = await supabase
      .from('playlists')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete playlist' });
    }

    res.json({ message: 'Playlist deleted successfully' });

  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add song to playlist
router.post('/:id/songs', authenticateToken, async (req, res) => {
  try {
    const { id: playlistId } = req.params;
    const { songId } = req.body;

    if (!songId) {
      return res.status(400).json({ error: 'Song ID is required' });
    }

    // Check if playlist exists and belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id, creator_id')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (playlist.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only modify your own playlists' });
    }

    // Check if song exists
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id')
      .eq('id', songId)
      .eq('is_public', true)
      .single();

    if (songError || !song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Get next position
    const { data: lastSong, error: positionError } = await supabase
      .from('playlist_songs')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = lastSong ? lastSong.position + 1 : 1;

    // Add song to playlist
    const { error: addError } = await supabase
      .from('playlist_songs')
      .insert({
        playlist_id: playlistId,
        song_id: songId,
        position: nextPosition
      });

    if (addError) {
      if (addError.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Song already in playlist' });
      }
      return res.status(500).json({ error: 'Failed to add song to playlist' });
    }

    res.json({ message: 'Song added to playlist successfully' });

  } catch (error) {
    console.error('Add song to playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove song from playlist
router.delete('/:id/songs/:songId', authenticateToken, async (req, res) => {
  try {
    const { id: playlistId, songId } = req.params;

    // Check if playlist exists and belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id, creator_id')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (playlist.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only modify your own playlists' });
    }

    // Remove song from playlist
    const { error: removeError } = await supabase
      .from('playlist_songs')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('song_id', songId);

    if (removeError) {
      return res.status(500).json({ error: 'Failed to remove song from playlist' });
    }

    res.json({ message: 'Song removed from playlist successfully' });

  } catch (error) {
    console.error('Remove song from playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder songs in playlist
router.put('/:id/songs/reorder', authenticateToken, async (req, res) => {
  try {
    const { id: playlistId } = req.params;
    const { songIds } = req.body; // Array of song IDs in new order

    if (!Array.isArray(songIds)) {
      return res.status(400).json({ error: 'Song IDs array is required' });
    }

    // Check if playlist exists and belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id, creator_id')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (playlist.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only modify your own playlists' });
    }

    // Update positions for all songs
    const updates = songIds.map((songId, index) => ({
      playlist_id: playlistId,
      song_id: songId,
      position: index + 1
    }));

    const { error: updateError } = await supabase
      .from('playlist_songs')
      .upsert(updates, { onConflict: 'playlist_id,song_id' });

    if (updateError) {
      return res.status(500).json({ error: 'Failed to reorder songs' });
    }

    res.json({ message: 'Playlist reordered successfully' });

  } catch (error) {
    console.error('Reorder playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
