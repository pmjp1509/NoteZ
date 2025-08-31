const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

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

// Middleware to check if user is content creator
const requireCreator = (req, res, next) => {
  if (req.user.role !== 'content_creator') {
    return res.status(403).json({ error: 'Content creator access required' });
  }
  next();
};

// Upload new song (Content Creator only)
router.post('/upload', authenticateToken, requireCreator, upload.single('audio'), async (req, res) => {
  try {
    const { title, artist, movie, categoryId, lyrics, isPublic } = req.body;
    const audioFile = req.file;

    if (!title || !artist || !categoryId || !audioFile) {
      return res.status(400).json({ error: 'Title, artist, category, and audio file are required' });
    }

    // Upload audio file to Supabase Storage
    const fileName = `${Date.now()}-${audioFile.originalname}`;
    const { data: audioData, error: audioError } = await supabase.storage
      .from('songs')
      .upload(fileName, audioFile.buffer, {
        contentType: audioFile.mimetype,
        cacheControl: '3600'
      });

    if (audioError) {
      return res.status(500).json({ error: 'Failed to upload audio file' });
    }

    // Get public URL for audio
    const { data: audioUrl } = supabase.storage
      .from('songs')
      .getPublicUrl(fileName);

    // Create song record in database
    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert({
        title,
        artist,
        movie: movie || null,
        category_id: categoryId,
        creator_id: req.user.userId,
        audio_url: audioUrl.publicUrl,
        lyrics: lyrics || null,
        is_public: isPublic !== 'false',
        duration: 0 // Will be updated later
      })
      .select(`
        *,
        song_categories(name, color),
        users(username, full_name)
      `)
      .single();

    if (songError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('songs').remove([fileName]);
      return res.status(500).json({ error: 'Failed to create song record' });
    }

    res.status(201).json({
      message: 'Song uploaded successfully',
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        movie: song.movie,
        category: song.song_categories,
        audioUrl: song.audio_url,
        lyrics: song.lyrics,
        isPublic: song.is_public,
        createdAt: song.created_at
      }
    });

  } catch (error) {
    console.error('Song upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all songs with search and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      category, 
      creator, 
      page = 1, 
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('songs')
      .select(`
        *,
        song_categories(name, color, description),
        users(username, full_name, avatar_url),
        creator:users!songs_creator_id_fkey(username, full_name, avatar_url)
      `)
      .eq('is_public', true);

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%,movie.ilike.%${search}%`);
    }

    // Apply category filter
    if (category) {
      query = query.eq('song_categories.name', category);
    }

    // Apply creator filter
    if (creator) {
      query = query.eq('creator.username', creator);
    }

    // Apply sorting
    if (sortBy === 'title') {
      query = query.order('title', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'artist') {
      query = query.order('artist', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'popularity') {
      // This would need a join with analytics table
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: sortOrder === 'asc' });
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: songs, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch songs' });
    }

    res.json({
      songs: songs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        movie: song.movie,
        category: song.song_categories,
        audioUrl: song.audio_url,
        coverUrl: song.cover_url,
        lyrics: song.lyrics,
        duration: song.duration,
        isPublic: song.is_public,
        creator: song.creator,
        createdAt: song.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || songs.length
      }
    });

  } catch (error) {
    console.error('Get songs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get song by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: song, error } = await supabase
      .from('songs')
      .select(`
        *,
        song_categories(name, color, description),
        creator:users!songs_creator_id_fkey(username, full_name, avatar_url, bio),
        song_analytics(play_count, listen_duration)
      `)
      .eq('id', id)
      .eq('is_public', true)
      .single();

    if (error || !song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        movie: song.movie,
        category: song.song_categories,
        audioUrl: song.audio_url,
        coverUrl: song.cover_url,
        lyrics: song.lyrics,
        duration: song.duration,
        isPublic: song.is_public,
        creator: song.creator,
        analytics: song.song_analytics,
        createdAt: song.created_at
      }
    });

  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update song (Creator only)
router.put('/:id', authenticateToken, requireCreator, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, artist, movie, categoryId, lyrics, isPublic } = req.body;

    // Check if song exists and belongs to user
    const { data: existingSong, error: checkError } = await supabase
      .from('songs')
      .select('id, creator_id')
      .eq('id', id)
      .single();

    if (checkError || !existingSong) {
      return res.status(404).json({ error: 'Song not found' });
    }

    if (existingSong.creator_id !== req.user.userId) {
      return res.status(403).json({ error: 'You can only update your own songs' });
    }

    // Update song
    const { data: song, error: updateError } = await supabase
      .from('songs')
      .update({
        title: title || undefined,
        artist: artist || undefined,
        movie: movie || undefined,
        category_id: categoryId || undefined,
        lyrics: lyrics || undefined,
        is_public: isPublic !== undefined ? isPublic : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        song_categories(name, color)
      `)
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update song' });
    }

    res.json({
      message: 'Song updated successfully',
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        movie: song.movie,
        category: song.song_categories,
        lyrics: song.lyrics,
        isPublic: song.is_public,
        updatedAt: song.updated_at
      }
    });

  } catch (error) {
    console.error('Update song error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete song (Creator only)
router.delete('/:id', authenticateToken, requireCreator, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if song exists and belongs to user
    const { data: song, error: checkError } = await supabase
      .from('songs')
      .select('id, creator_id, audio_url')
      .eq('id', id)
      .single();

    if (checkError || !song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    if (song.creator_id !== req.user.userId) {
      return res.status(403).json({ error: 'You can only delete your own songs' });
    }

    // Delete song from database
    const { error: deleteError } = await supabase
      .from('songs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete song' });
    }

    // Extract filename from audio_url and delete from storage
    if (song.audio_url) {
      const fileName = song.audio_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from('songs').remove([fileName]);
      }
    }

    res.json({ message: 'Song deleted successfully' });

  } catch (error) {
    console.error('Delete song error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get songs by creator
router.get('/creator/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { data: songs, error } = await supabase
      .from('songs')
      .select(`
        *,
        song_categories(name, color),
        song_analytics(play_count, listen_duration)
      `)
      .eq('creator_id', creatorId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch creator songs' });
    }

    res.json({
      songs: songs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        movie: song.movie,
        category: song.song_categories,
        audioUrl: song.audio_url,
        coverUrl: song.cover_url,
        duration: song.duration,
        analytics: song.song_analytics,
        createdAt: song.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: songs.length
      }
    });

  } catch (error) {
    console.error('Get creator songs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
