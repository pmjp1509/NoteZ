const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Emotion to song category mapping based on database schema
// Maps detected emotions to song categories from your database
const EMOTION_TO_CATEGORIES = {
  // Primary emotions from j-hartmann/emotion-english-distilroberta-base
  joy: ['happy', 'party', 'energetic'],
  happy: ['happy', 'party', 'energetic'],
  neutral: ['chill', 'calm', 'study'],
  sadness: ['sad', 'motivational', 'nostalgic'],
  anger: ['angry', 'workout', 'calm'],
  disgust: ['calm', 'inspirational', 'chill'],
  fear: ['calm', 'sleep', 'chill'],
  surprise: ['energetic', 'party', 'happy'],
  // Extended emotions (if detected by model)
  optimism: ['motivational', 'inspirational', 'happy'],
  admiration: ['happy', 'inspirational', 'energetic'],
  love: ['romantic', 'happy', 'calm'],
  annoyance: ['chill', 'calm', 'sleep'],
  disappointment: ['sad', 'motivational', 'inspirational'],
  nervousness: ['calm', 'sleep', 'study'],
  excitement: ['energetic', 'party', 'workout'],
  relaxed: ['chill', 'calm', 'sleep'],
  nostalgic: ['nostalgic', 'sad', 'calm'],
  bored: ['energetic', 'party', 'travel'],
  stressed: ['calm', 'sleep', 'motivational'],
  lonely: ['sad', 'romantic', 'nostalgic'],
  confident: ['motivational', 'workout', 'party'],
  tired: ['calm', 'sleep', 'chill'],
  focused: ['study', 'calm', 'chill'],
  // Default fallback
  default: ['chill', 'calm', 'study']
};

async function callHuggingFace(model, inputs, { timeoutMs = 5000, retries = 2 } = {}) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error('Missing HUGGINGFACE_API_KEY');

  let attempt = 0;
  let lastErr;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HF error ${res.status}: ${text}`);
      }
      return res.json();
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // Backoff and retry only on network/5xx/timeout
      const isAbort = err?.name === 'AbortError';
      const isRetryable = isAbort || /\b5\d\d\b/.test(String(err)) || /fetch|network/i.test(String(err));
      if (attempt < retries && isRetryable) {
        const backoff = Math.min(2000 * (attempt + 1), 5000);
        await new Promise(r => setTimeout(r, backoff));
        attempt++;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function pickTopLabel(hfResponse) {
  // HF can return either array of arrays for classification pipeline
  const groups = Array.isArray(hfResponse) ? hfResponse : [];
  const first = Array.isArray(groups[0]) ? groups[0] : groups;
  if (!Array.isArray(first)) return null;
  const sorted = [...first].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return sorted[0]?.label?.toLowerCase() || null;
}

router.post('/mood', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    // Try emotion first
    let label;
    try {
      const emotion = await callHuggingFace('j-hartmann/emotion-english-distilroberta-base', text);
      label = pickTopLabel(emotion);
    } catch (e) {
      console.warn('HF emotion call failed, trying sentiment fallback:', e?.message || e);
    }

    // Fallback to sentiment
    if (!label) {
      try {
        const sentiment = await callHuggingFace('distilbert-base-uncased-finetuned-sst-2-english', text);
        label = pickTopLabel(sentiment);
      } catch (e) {
        console.warn('HF sentiment call failed, using default mapping:', e?.message || e);
      }
    }

    // Get categories for this emotion
    const categories = EMOTION_TO_CATEGORIES[label] || EMOTION_TO_CATEGORIES.default;
    
    // Fetch songs from database based on categories
    const { data: songs, error: dbError } = await supabase
      .from('songs')
      .select(`
        id,
        title,
        artist,
        movie,
        audio_url,
        cover_url,
        song_categories!inner(name)
      `)
      .in('song_categories.name', categories)
      .eq('is_public', true)
      .limit(5);

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to fetch song suggestions' });
    }

    // Format the response
    const suggestions = (songs || []).map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      movie: song.movie,
      audioUrl: song.audio_url,
      coverUrl: song.cover_url,
      category: song.song_categories?.name
    }));

    res.json({
      input: text,
      emotion: label,
      categories: categories,
      suggestions: suggestions
    });
  } catch (error) {
    console.error('AI /mood error:', error);
    res.status(500).json({ error: 'Failed to analyze mood' });
  }
});

module.exports = router;
