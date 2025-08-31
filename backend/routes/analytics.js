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

// Middleware to check if user is content creator
const requireCreator = (req, res, next) => {
  if (req.user.role !== 'content_creator') {
    return res.status(403).json({ error: 'Content creator access required' });
  }
  next();
};

// Get creator analytics dashboard
router.get('/creator', authenticateToken, requireCreator, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const userId = req.user.userId;

    // Get creator stats
    const { data: stats, error: statsError } = await supabase
      .from('creator_stats')
      .select('*')
      .eq('creator_id', userId)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to fetch creator stats' });
    }

    // Get songs with analytics
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select(`
        id,
        title,
        artist,
        created_at,
        song_analytics(
          play_count,
          listen_duration,
          last_played
        )
      `)
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (songsError) {
      return res.status(500).json({ error: 'Failed to fetch songs' });
    }

    // Calculate period-based analytics
    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - parseInt(period));

    const periodSongs = songs.filter(song => 
      new Date(song.created_at) >= periodDate
    );

    const periodAnalytics = periodSongs.reduce((acc, song) => {
      const analytics = song.song_analytics || [];
      const totalPlays = analytics.reduce((sum, a) => sum + (a.play_count || 0), 0);
      const totalDuration = analytics.reduce((sum, a) => sum + (a.listen_duration || 0), 0);
      
      return {
        totalPlays: acc.totalPlays + totalPlays,
        totalDuration: acc.totalDuration + totalDuration,
        songCount: acc.songCount + 1
      };
    }, { totalPlays: 0, totalDuration: 0, songCount: 0 });

    // Get recent activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('song_analytics')
      .select(`
        play_count,
        listen_duration,
        last_played,
        songs!inner(
          id,
          title,
          artist,
          creator_id
        )
      `)
      .eq('songs.creator_id', userId)
      .gte('last_played', periodDate.toISOString())
      .order('last_played', { ascending: false })
      .limit(10);

    if (activityError) {
      return res.status(500).json({ error: 'Failed to fetch recent activity' });
    }

    // Get top performing songs
    const topSongs = songs
      .map(song => {
        const analytics = song.song_analytics || [];
        const totalPlays = analytics.reduce((sum, a) => sum + (a.play_count || 0), 0);
        const totalDuration = analytics.reduce((sum, a) => sum + (a.listen_duration || 0), 0);
        
        return {
          id: song.id,
          title: song.title,
          artist: song.artist,
          totalPlays,
          totalDuration,
          avgDuration: totalPlays > 0 ? totalDuration / totalPlays : 0
        };
      })
      .sort((a, b) => b.totalPlays - a.totalPlays)
      .slice(0, 5);

    res.json({
      overview: {
        totalSongs: stats?.total_songs || 0,
        totalListens: stats?.total_listens || 0,
        totalFavorites: stats?.total_favorites || 0,
        monthlyListeners: stats?.monthly_listeners || 0
      },
      periodAnalytics: {
        period: `${period} days`,
        totalPlays: periodAnalytics.totalPlays,
        totalDuration: periodAnalytics.totalDuration,
        songCount: periodAnalytics.songCount,
        avgPlaysPerSong: periodAnalytics.songCount > 0 ? periodAnalytics.totalPlays / periodAnalytics.songCount : 0
      },
      topSongs,
      recentActivity: recentActivity.map(activity => ({
        songTitle: activity.songs.title,
        songArtist: activity.songs.artist,
        playCount: activity.play_count,
        listenDuration: activity.listen_duration,
        lastPlayed: activity.last_played
      })),
      songs: songs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        createdAt: song.created_at,
        analytics: song.song_analytics || []
      }))
    });

  } catch (error) {
    console.error('Get creator analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get song-specific analytics
router.get('/song/:songId', authenticateToken, requireCreator, async (req, res) => {
  try {
    const { songId } = req.params;
    const userId = req.user.userId;

    // Verify song belongs to creator
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id, title, artist, creator_id')
      .eq('id', songId)
      .eq('creator_id', userId)
      .single();

    if (songError || !song) {
      return res.status(404).json({ error: 'Song not found or access denied' });
    }

    // Get song analytics
    const { data: analytics, error: analyticsError } = await supabase
      .from('song_analytics')
      .select(`
        play_count,
        listen_duration,
        last_played,
        users(username, full_name)
      `)
      .eq('song_id', songId)
      .order('last_played', { ascending: false });

    if (analyticsError) {
      return res.status(500).json({ error: 'Failed to fetch song analytics' });
    }

    // Calculate totals
    const totalPlays = analytics.reduce((sum, a) => sum + (a.play_count || 0), 0);
    const totalDuration = analytics.reduce((sum, a) => sum + (a.listen_duration || 0), 0);
    const uniqueListeners = analytics.length;
    const avgDuration = totalPlays > 0 ? totalDuration / totalPlays : 0;

    // Get daily plays for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyPlays = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyPlays[dateStr] = 0;
    }

    analytics.forEach(activity => {
      const dateStr = new Date(activity.last_played).toISOString().split('T')[0];
      if (dailyPlays[dateStr] !== undefined) {
        dailyPlays[dateStr] += activity.play_count || 0;
      }
    });

    res.json({
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist
      },
      analytics: {
        totalPlays,
        totalDuration,
        uniqueListeners,
        avgDuration,
        dailyPlays: Object.entries(dailyPlays).map(([date, plays]) => ({
          date,
          plays
        }))
      },
      recentActivity: analytics.slice(0, 20).map(activity => ({
        listener: activity.users,
        playCount: activity.play_count,
        listenDuration: activity.listen_duration,
        lastPlayed: activity.last_played
      }))
    });

  } catch (error) {
    console.error('Get song analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track song play (called when user plays a song)
router.post('/track-play', authenticateToken, async (req, res) => {
  try {
    const { songId, duration } = req.body;
    const userId = req.user.userId;

    if (!songId) {
      return res.status(400).json({ error: 'Song ID is required' });
    }

    // Add to listening history
    const { error: historyError } = await supabase
      .from('listening_history')
      .insert({
        user_id: userId,
        song_id: songId,
        listen_duration: duration || 0
      });

    if (historyError) {
      console.error('Failed to add to listening history:', historyError);
    }

    // Update song analytics
    const { data: existingAnalytics, error: fetchError } = await supabase
      .from('song_analytics')
      .select('id, play_count')
      .eq('song_id', songId)
      .eq('listener_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Failed to fetch existing analytics:', fetchError);
    }

    if (existingAnalytics) {
      // Update existing record
      await supabase
        .from('song_analytics')
        .update({
          play_count: existingAnalytics.play_count + 1,
          last_played: new Date().toISOString()
        })
        .eq('id', existingAnalytics.id);
    } else {
      // Create new record
      await supabase
        .from('song_analytics')
        .insert({
          song_id: songId,
          listener_id: userId,
          play_count: 1,
          last_played: new Date().toISOString()
        });
    }

    res.json({ message: 'Play tracked successfully' });

  } catch (error) {
    console.error('Track play error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user listening history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { data: history, error } = await supabase
      .from('listening_history')
      .select(`
        listened_at,
        listen_duration,
        songs(
          id,
          title,
          artist,
          cover_url,
          song_categories(name, color)
        )
      `)
      .eq('user_id', userId)
      .order('listened_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch listening history' });
    }

    res.json({
      history: history.map(entry => ({
        songId: entry.songs.id,
        title: entry.songs.title,
        artist: entry.songs.artist,
        coverUrl: entry.songs.cover_url,
        category: entry.songs.song_categories,
        listenedAt: entry.listened_at,
        duration: entry.listen_duration
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: history.length
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get trending songs (public endpoint)
router.get('/trending', async (req, res) => {
  try {
    const { period = '7', limit = 10 } = req.query; // days

    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - parseInt(period));

    const { data: trending, error } = await supabase
      .from('song_analytics')
      .select(`
        play_count,
        songs!inner(
          id,
          title,
          artist,
          cover_url,
          song_categories(name, color),
          users(username, full_name)
        )
      `)
      .gte('last_played', periodDate.toISOString())
      .order('play_count', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch trending songs' });
    }

    // Group by song and sum play counts
    const songStats = {};
    trending.forEach(entry => {
      const songId = entry.songs.id;
      if (!songStats[songId]) {
        songStats[songId] = {
          song: entry.songs,
          totalPlays: 0
        };
      }
      songStats[songId].totalPlays += entry.play_count || 0;
    });

    const trendingSongs = Object.values(songStats)
      .sort((a, b) => b.totalPlays - a.totalPlays)
      .map(stat => ({
        id: stat.song.id,
        title: stat.song.title,
        artist: stat.song.artist,
        coverUrl: stat.song.cover_url,
        category: stat.song.song_categories,
        creator: stat.song.users,
        totalPlays: stat.totalPlays
      }));

    res.json({
      period: `${period} days`,
      trendingSongs
    });

  } catch (error) {
    console.error('Get trending songs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
