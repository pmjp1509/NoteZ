# Database Schema Analysis & Recommendations

## Current Schema Review

Your database schema is **mostly well-designed** for a music streaming application. Here's my analysis:

### ✅ **What's Working Well**

1. **Good Use of UUIDs**: Using UUIDs for primary keys is excellent for distributed systems
2. **Proper Relationships**: Foreign keys are correctly defined
3. **Timestamps**: Good use of `created_at` and `updated_at` for tracking
4. **Enums for Categories**: Using `song_category` enum is smart for data integrity
5. **Listening History Tracking**: Separate `listening_history` and `user_song_frequency` tables is good design
6. **RLS (Row Level Security)**: Proper security implementation

### ⚠️ **Issues Found & Recommendations**

#### 1. **Missing Gender Column in Users Table**
**Current**: Schema shows `gender` field missing in the provided schema
**Expected**: Should have gender enum
```sql
-- Add this if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender user_gender;
```

#### 2. **Albums Table Issues**
**Problem**: The `albums` table exists but:
- Songs have `album_id` FK but albums functionality seems unused
- No album_songs junction table (if you want songs in multiple albums)
- Album stats (`total_songs`, `total_listens`) need triggers to update

**Recommendation**:
```sql
-- Option A: If albums are simple (one song = one album)
-- Keep current design, add triggers:

CREATE OR REPLACE FUNCTION update_album_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE albums 
    SET total_songs = total_songs + 1
    WHERE id = NEW.album_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE albums 
    SET total_songs = total_songs - 1
    WHERE id = OLD.album_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_album_stats
  AFTER INSERT OR DELETE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_album_stats();

-- Option B: If songs can be in multiple albums (like playlists)
-- Create junction table:
CREATE TABLE album_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(album_id, song_id)
);
```

#### 3. **Missing Indexes for Performance**
Your schema mentions some indexes but you should verify these exist:

```sql
-- Critical indexes for mood filtering
CREATE INDEX IF NOT EXISTS idx_songs_category_id ON songs(category_id);
CREATE INDEX IF NOT EXISTS idx_songs_is_public ON songs(is_public);
CREATE INDEX IF NOT EXISTS idx_songs_category_public ON songs(category_id, is_public);

-- For recommendations system
CREATE INDEX IF NOT EXISTS idx_listening_history_user_song ON listening_history(user_id, song_id);
CREATE INDEX IF NOT EXISTS idx_user_song_frequency_composite ON user_song_frequency(user_id, freq DESC);
```

#### 4. **Missing Constraints**
Add these for data integrity:

```sql
-- Ensure duration is positive
ALTER TABLE songs ADD CONSTRAINT songs_duration_positive CHECK (duration >= 0);

-- Ensure play count is non-negative
ALTER TABLE song_analytics ADD CONSTRAINT analytics_play_count_positive CHECK (play_count >= 0);

-- Ensure frequency is positive
ALTER TABLE user_song_frequency ADD CONSTRAINT freq_positive CHECK (freq > 0);
```

#### 5. **Friend Requests Status Check**
**Current**: Using TEXT with CHECK constraint
**Better**: Use ENUM type for consistency

```sql
-- Create enum if doesn't exist
DO $$ BEGIN
  CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Then alter table (if needed)
-- ALTER TABLE friend_requests ALTER COLUMN status TYPE friend_request_status USING status::friend_request_status;
```

#### 6. **Missing Unique Constraint**
Prevent duplicate listening history entries for same user+song at same second:

```sql
-- Optional: Add if you want to prevent rapid duplicates
CREATE INDEX IF NOT EXISTS idx_listening_history_unique_listen 
  ON listening_history(user_id, song_id, listened_at);
```

#### 7. **Notification Type Enum**
Ensure this is properly defined:

```sql
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'friend_request', 
    'new_song', 
    'follow', 
    'like', 
    'playlist_share',
    'song_played',
    'new_album'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

### 🔧 **Recommended Schema Improvements**

#### 1. Add Missing Indexes (High Priority)
```sql
-- These will dramatically improve mood filter performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_category_public 
  ON songs(category_id, is_public) WHERE is_public = true;

-- Improve recommendations query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listening_history_recent 
  ON listening_history(user_id, listened_at DESC);
```

#### 2. Add Soft Delete Support (Optional)
Instead of hard deleting, keep records:

```sql
-- Add to tables that should support soft delete
ALTER TABLE songs ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE playlists ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX idx_songs_not_deleted ON songs(id) WHERE deleted_at IS NULL;
```

#### 3. Add Song Play Count Materialized View (Performance)
For faster trending/popular queries:

```sql
CREATE MATERIALIZED VIEW song_play_counts AS
SELECT 
  song_id,
  SUM(play_count) as total_plays,
  COUNT(DISTINCT listener_id) as unique_listeners,
  MAX(last_played) as last_played_at
FROM song_analytics
GROUP BY song_id;

-- Refresh periodically (e.g., every hour via cron job)
CREATE UNIQUE INDEX ON song_play_counts (song_id);

-- Refresh command (run periodically)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY song_play_counts;
```

#### 4. Add Search Optimization
For better search performance:

```sql
-- Add GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_songs_search 
  ON songs USING gin(to_tsvector('english', title || ' ' || artist || ' ' || COALESCE(movie, '')));
```

### 📊 **Schema Completeness Check**

| Feature | Status | Note |
|---------|--------|------|
| Users & Auth | ✅ Good | Well structured |
| Songs & Categories | ✅ Good | Proper categorization |
| Playlists | ✅ Good | Junction table pattern |
| Favorites | ✅ Good | Separate tracking |
| Listening History | ✅ Good | Dual tracking (history + frequency) |
| Analytics | ✅ Good | Comprehensive tracking |
| Friends System | ✅ Good | Proper bidirectional relationship |
| Albums | ⚠️ Incomplete | Needs triggers or junction table |
| Notifications | ✅ Good | Enum-based types |
| Search Indexes | ⚠️ Missing | Add GIN index |
| Performance Indexes | ⚠️ Incomplete | Add composite indexes |

### 🎯 **Priority Action Items**

#### High Priority (Do Now)
1. ✅ Add composite index on `songs(category_id, is_public)` for mood filtering
2. ✅ Add index on `listening_history(user_id, listened_at DESC)` for recommendations
3. ⚠️ Decide on Albums strategy (Option A or B above)

#### Medium Priority (Do Soon)
4. Add full-text search GIN index for better search
5. Add materialized view for trending songs
6. Add missing CHECK constraints

#### Low Priority (Nice to Have)
7. Add soft delete support
8. Add more notification types
9. Consider partitioning listening_history if it grows large

### 🚫 **No Major Issues Found!**

Your schema is **not messy** at all! It's actually quite well-designed. The main things are:
- Missing some performance indexes (easy fix)
- Albums functionality needs completion
- Some constraints for data validation

### 📝 **Quick Fix SQL Script**

Run this to add the most important improvements:

```sql
-- Performance indexes for mood filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_category_public 
  ON songs(category_id, is_public) WHERE is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listening_history_recent 
  ON listening_history(user_id, listened_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_song_frequency_top 
  ON user_song_frequency(user_id, freq DESC);

-- Data integrity constraints
ALTER TABLE songs ADD CONSTRAINT IF NOT EXISTS songs_duration_positive 
  CHECK (duration >= 0);

ALTER TABLE song_analytics ADD CONSTRAINT IF NOT EXISTS analytics_play_positive 
  CHECK (play_count >= 0);

-- Search optimization
CREATE INDEX IF NOT EXISTS idx_songs_search 
  ON songs USING gin(
    to_tsvector('english', 
      title || ' ' || artist || ' ' || COALESCE(movie, '')
    )
  );
```

## Conclusion

Your database schema is **well-designed** overall! The structure supports:
- ✅ Music streaming
- ✅ User management
- ✅ Playlists & favorites
- ✅ Social features (friends)
- ✅ Analytics & recommendations
- ✅ Proper security (RLS)

Main improvements needed are **performance optimizations** (indexes) rather than structural changes.

