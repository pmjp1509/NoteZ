const express = require('express');

const router = express.Router();

// Simple emotion to playlist mapping
const EMOTION_TO_PLAYLIST = {
  joy: { name: 'Party Hits', tag: 'party' },
  happy: { name: 'Party Hits', tag: 'party' },
  optimism: { name: 'Uplift Vibes', tag: 'motivational' },
  admiration: { name: 'Feel Good Pop', tag: 'happy' },
  love: { name: 'Romantic Evening', tag: 'romantic' },
  sadness: { name: 'Motivation Mix', tag: 'motivational' },
  anger: { name: 'Calm Down', tag: 'calm' },
  annoyance: { name: 'Lo‑fi Chill Beats', tag: 'chill' },
  disappointment: { name: 'Fresh Start', tag: 'inspirational' },
  fear: { name: 'Comfort & Calm', tag: 'calm' },
  nervousness: { name: 'Lo‑fi Chill Beats', tag: 'chill' },
  disgust: { name: 'Clean Slate', tag: 'inspirational' },
  surprise: { name: 'Trending Now', tag: 'energetic' },
  excitement: { name: 'Hype Mix', tag: 'energetic' },
  default: { name: 'Lo‑fi Chill Beats', tag: 'chill' }
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

    const mapping = EMOTION_TO_PLAYLIST[label] || EMOTION_TO_PLAYLIST.default;

    res.json({
      input: text,
      modelLabel: label,
      recommendation: mapping
    });
  } catch (error) {
    console.error('AI /mood error:', error);
    res.status(500).json({ error: 'Failed to analyze mood' });
  }
});

module.exports = router;
