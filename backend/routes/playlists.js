const express = require('express');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  console.log('Authenticating token:', token ? 'Token provided' : 'No token');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Token decoded successfully:', { userId: decoded.userId });
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Create new playlist
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, isPublic = true } = req.body;
    
    console.log('Creating playlist request:', { name, description, isPublic, userId: req.user.userId });

    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    console.log('Inserting playlist into database...');
    
    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        name,
        description,
        creator_id: req.user.userId,
        is_public: isPublic
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

    const { data: playlists, error } = await supabase
      .from('playlists')
      .select(`
        *,
        playlist_songs(count)
      `)
      .eq('creator_id', req.user.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch playlists' });
    }

    res.json({
      playlists: playlists.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        isPublic: playlist.is_public,
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
      .eq('creator_id', req.user.userId)
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

    if (existingPlaylist.creator_id !== req.user.userId) {
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

    if (playlist.creator_id !== req.user.userId) {
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

    if (playlist.creator_id !== req.user.userId) {
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

    if (playlist.creator_id !== req.user.userId) {
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

    if (playlist.creator_id !== req.user.userId) {
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
