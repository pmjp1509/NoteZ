# Smart Recommendations System

## Overview
Personalized recommendation system that suggests songs based on user listening history and preferences.

## How It Works

### 1. **Data Sources**
The recommendation algorithm uses:
- **Recently Played Songs**: Last 20 songs from `listening_history` table
- **Most Played Songs**: Top 10 from `user_song_frequency` table
- **Category Preferences**: Extracted from user's listening patterns

### 2. **Algorithm**

```
Step 1: Analyze user's listening history
  → Get last 20 recently played songs
  → Get top 10 most frequently played songs
  → Extract category preferences

Step 2: Find similar songs
  → Match songs from same categories
  → Exclude already played songs
  → Sort by newest first

Step 3: Fill with trending songs (if needed)
  → Add popular songs if less than 5 recommendations
  → Ensure variety

Step 4: Return 5 personalized suggestions
```

### 3. **Backend Endpoints**

#### Get Song Recommendations
```
GET /api/recommendations?limit=5
Authorization: Bearer <token>

Response:
{
  "recommendations": [
    {
      "id": "uuid",
      "title": "Song Title",
      "artist": "Artist Name",
      "movie": "Movie Name",
      "audioUrl": "url",
      "coverUrl": "url",
      "category": "happy",
      "categoryColor": "#10b981"
    }
  ],
  "basedOn": "user_history" | "popular",
  "count": 5
}
```

#### Get Playlist Recommendations
```
GET /api/recommendations/playlists?limit=3
Authorization: Bearer <token>

Response:
{
  "playlists": [
    {
      "id": "uuid",
      "name": "Playlist Name",
      "description": "Description",
      "coverUrl": "url",
      "creator": "username",
      "songCount": 10
    }
  ],
  "count": 3
}
```

## Frontend Implementation

### Recommendations Component
Location: `frontend/src/components/dashboard/Recommendations.tsx`

**Features:**
- Shows 5 personalized song recommendations
- Dynamic title based on recommendation type:
  - "For You" with Music2 icon (personalized)
  - "Trending" with TrendingUp icon (popular)
- Hover effects and smooth animations
- Loading state
- Empty state with helpful message
- Click-to-play functionality

**Smart Behavior:**
- If user is logged in → fetch personalized recommendations
- If not logged in → show trending/popular songs
- If API fails → graceful fallback to regular songs

### Visual Design
```
┌─────────────────────────────────────┐
│ 🎵 For You    Based on your taste  │
├─────────────────────────────────────┤
│  ┌──┐                              │
│  │🎨│  Song Title                  │
│  │  │  Artist Name            ▶️   │
│  └──┘                              │
│                                     │
│  [4 more songs...]                 │
└─────────────────────────────────────┘
```

## Database Tables Used

### listening_history
Tracks every song play by users
```sql
- user_id (UUID)
- song_id (UUID)
- listened_at (timestamp)
- listen_duration (int)
```

### user_song_frequency
Aggregates play count per user per song
```sql
- user_id (UUID)
- song_id (UUID)
- freq (int)
- first_played (timestamp)
- last_played (timestamp)
```

### song_categories
15 mood-based categories
```sql
- id (UUID)
- name (enum: happy, sad, angry, energetic, calm, etc.)
- description (text)
- color (hex)
```

## Recommendation Types

### User History Based (Personalized)
**When**: User has listening history
**Logic**: 
- Analyze last 20 songs + top 10 most played
- Find songs from same categories
- Exclude already played songs
- Return fresh suggestions

**Benefits**:
- Tailored to user's taste
- Discovers new songs in preferred categories
- Avoids repetition

### Popular/Trending Based
**When**: New user or no history
**Logic**:
- Show latest public songs
- Sort by creation date (newest first)
- Ensure variety

**Benefits**:
- Helps new users discover content
- Shows platform's best content
- Cold start solution

## Integration with Other Features

### AI DJ Assistant
- AI suggestions based on emotion
- Recommendations based on listening history
- Complementary approaches

### Recently Played
- User sees what they played
- Recommendations show new discoveries
- Different but related

### Search
- Search finds specific songs
- Recommendations suggest similar songs
- Helps discovery

## Usage Examples

### Example 1: Active User
**Profile**: User who listens to happy/party songs
**History**: Recently played 5 party songs, 3 energetic songs
**Recommendations**: 
1. New party song A
2. New energetic song B
3. New happy song C
4. New party song D
5. New energetic song E

### Example 2: New User
**Profile**: Just signed up, no history
**Recommendations**: 
1. Latest trending song
2. Popular song from this week
3. Recently uploaded hit
4. Trending artist's new release
5. Popular from category "happy"

### Example 3: Mixed Taste User
**Profile**: Listens to sad, romantic, and calm songs
**History**: Mix of emotional categories
**Recommendations**:
1. New sad song
2. New romantic song
3. New calm song
4. New nostalgic song (related category)
5. New inspirational song (related category)

## Performance Considerations

### Caching Strategy
- User history cached in frontend (5 min TTL)
- Recommendations refreshed on:
  - Component mount
  - After playing 5+ songs
  - Manual refresh

### Query Optimization
- Indexed queries on `listening_history` (user_id, listened_at)
- Indexed queries on `user_song_frequency` (user_id, freq)
- Limited result sets (max 20 for analysis, 5 for output)

### Scalability
- Stateless endpoint (no session storage)
- Database-driven (leverages Postgres performance)
- Fallback mechanism (graceful degradation)

## Future Enhancements

1. **Collaborative Filtering**: Recommend songs liked by similar users
2. **Time-based Patterns**: Suggest different music for morning/evening
3. **Mood Detection**: Integrate with AI DJ for context-aware suggestions
4. **Album Recommendations**: Suggest full albums, not just songs
5. **Artist Discovery**: Recommend new artists based on favorites
6. **Playlist Generation**: Auto-create playlists from recommendations
7. **Diversity Control**: Balance between familiar and new
8. **Feedback Loop**: Learn from skipped vs completed songs

## Testing

### Test Personalized Recommendations
```bash
# 1. Start backend
cd backend && npm run dev

# 2. Login and play some songs
# Visit dashboard and play 5-10 songs from specific categories

# 3. Check recommendations
# Should see "For You" with songs from similar categories
```

### Test Fallback
```bash
# 1. Use incognito/logout
# 2. Visit dashboard
# 3. Check recommendations
# Should see "Trending" with popular songs
```

## Troubleshooting

**No personalized recommendations?**
- Check if user has listening history
- Verify `listening_history` table has entries
- Check backend logs for errors

**Always showing "Trending"?**
- User might not be logged in
- Token might be expired
- No listening history available

**Empty recommendations?**
- Database might not have songs
- Check if songs have `category_id` assigned
- Verify songs are marked as `is_public = true`

**Same songs appearing?**
- Need more songs in database
- User's preferred categories might be limited
- Add more variety to song categories

