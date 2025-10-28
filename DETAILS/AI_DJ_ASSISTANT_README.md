# AI DJ Assistant - Song Suggestions Feature

## Overview
The AI DJ Assistant now suggests actual songs from your database based on the user's emotional input using the Hugging Face emotion detection model.

## What Was Implemented

### 1. Backend Changes (`backend/routes/ai.js`)

#### Emotion to Category Mapping
Created a mapping that connects detected emotions to your database song categories:

```javascript
EMOTION_TO_CATEGORIES = {
  joy: ['happy', 'party', 'energetic'],
  happy: ['happy', 'party', 'energetic'],
  neutral: ['chill', 'calm', 'study'],
  sadness: ['motivational', 'inspirational', 'calm'],
  anger: ['calm', 'chill', 'workout'],
  disgust: ['calm', 'inspirational'],
  fear: ['calm', 'chill', 'sleep'],
  surprise: ['energetic', 'party', 'happy'],
  // ... and more
}
```

#### Database Integration
- Integrated Supabase to query songs from your database
- Fetches up to 5 songs that match the detected emotion's categories
- Returns formatted song suggestions with all necessary data

#### API Response Structure
```json
{
  "input": "I'm feeling stressed",
  "emotion": "sadness",
  "categories": ["motivational", "inspirational", "calm"],
  "suggestions": [
    {
      "id": "uuid",
      "title": "Song Title",
      "artist": "Artist Name",
      "movie": "Movie Name",
      "audioUrl": "url",
      "coverUrl": "url",
      "category": "motivational"
    }
    // ... up to 5 songs
  ]
}
```

### 2. Frontend Changes

#### RightSidebar Component (`frontend/src/components/dashboard/RightSidebar.tsx`)
- Updated to display song suggestions instead of just playlist names
- Shows detected emotion and suggested categories
- Displays up to 5 recommended songs with:
  - Album art or music icon
  - Song title, artist, and movie name
  - Play button on hover
- Click on any song to play it instantly
- Added scrollable list if suggestions exceed viewport
- Supports Enter key to submit mood input

#### MainDashboard Component (`frontend/src/components/dashboard/MainDashboard.tsx`)
- Added event listener for AI-suggested songs
- When a song is clicked in the AI DJ Assistant, it plays in the main player
- Seamless integration with existing player functionality

## How It Works

1. **User Input**: User types their mood/feeling (e.g., "I'm stressed and need to focus")
2. **Emotion Detection**: Hugging Face API analyzes the text and detects emotion
3. **Category Mapping**: Backend maps emotion to relevant song categories
4. **Database Query**: Fetches 5 songs from matching categories
5. **Display**: Shows songs in the right sidebar
6. **Playback**: User clicks a song → it plays in the main player

## Emotion → Category Mappings

### Primary Emotions (from Hugging Face model)
| Emotion | Suggested Categories |
|---------|---------------------|
| Joy/Happy | happy, party, energetic |
| Sadness | sad, motivational, nostalgic |
| Anger | angry, workout, calm |
| Fear | calm, sleep, chill |
| Neutral | chill, calm, study |
| Surprise | energetic, party, happy |
| Disgust | calm, inspirational, chill |

### Extended Emotions (contextual detection)
| Emotion | Suggested Categories |
|---------|---------------------|
| Stressed | calm, sleep, motivational |
| Lonely | sad, romantic, nostalgic |
| Bored | energetic, party, travel |
| Tired | calm, sleep, chill |
| Focused | study, calm, chill |
| Confident | motivational, workout, party |
| Nostalgic | nostalgic, sad, calm |
| Relaxed | chill, calm, sleep |

### All Database Categories Used
✅ happy, sad, angry, energetic, calm, romantic, motivational, chill, party, workout, study, sleep, travel, nostalgic, inspirational

## Features

✅ Real-time emotion detection using Hugging Face  
✅ Database-driven song suggestions  
✅ 5 song recommendations per query  
✅ Click-to-play functionality  
✅ Visual album art display  
✅ Responsive UI with smooth animations  
✅ Keyboard support (Enter to submit)  
✅ Scrollable song list  
✅ Integration with main music player  

## Requirements

- Supabase database with songs and song_categories populated
- HUGGINGFACE_API_KEY in backend .env
- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend .env
- Songs must have category_id assigned to be suggested

## Future Enhancements (Optional)

1. **Playlist Creation**: Allow users to save AI suggestions as a playlist
2. **More Suggestions**: Add pagination or "Load More" button
3. **User Preferences**: Learn from user's listening history
4. **Album/Artist Suggestions**: Expand beyond individual songs
5. **Multi-language Support**: Support emotion detection in other languages
6. **Mood History**: Track and display past mood analyses
7. **Advanced Filtering**: Filter by language, duration, etc.

## Testing

To test the feature:
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to the dashboard
4. Look at the right sidebar "AI DJ Assistant"
5. Type a mood description (e.g., "I'm feeling sad today")
6. Click "Get Suggestions"
7. View the 5 recommended songs
8. Click any song to play it

## Troubleshooting

**No songs returned?**
- Check if your database has songs with assigned categories
- Verify song categories match the ones in EMOTION_TO_CATEGORIES
- Check Supabase credentials in .env

**Songs not playing?**
- Verify audio_url is valid in the database
- Check browser console for errors
- Ensure main player is functioning

**Emotion detection fails?**
- Verify HUGGINGFACE_API_KEY is valid
- Check backend logs for API errors
- Try a different input phrase

