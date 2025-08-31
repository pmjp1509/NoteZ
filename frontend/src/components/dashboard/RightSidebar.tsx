import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

export function RightSidebar() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ label?: string; name?: string; tag?: string } | null>(null);
  const [error, setError] = useState('');

  const analyzeMood = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('http://localhost:3001/api/ai/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze');
      setResult({ label: data.modelLabel, name: data.recommendation?.name, tag: data.recommendation?.tag });
    } catch (e: any) {
      setError(e.message || 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hidden lg:flex flex-col gap-4">
      <Card className="bg-black/30 border-white/10 flex-1">
        <CardHeader>
          <CardTitle className="text-white/90">AI DJ Assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-white/5 text-sm text-gray-300">
            Tell me how you're feeling, and I'll pick a playlist for your mood.
          </div>

          <div className="space-y-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., I'm stressed and need to focus"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={analyzeMood}
              disabled={loading || !prompt.trim()}
              className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm px-3 py-2 transition disabled:opacity-50"
            >
              {loading ? 'Analyzing…' : 'Recommend playlist'}
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">{error}</div>
          )}

          {result && (
            <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-white">Detected mood: <span className="text-purple-300">{result.label || 'unknown'}</span></p>
              <p className="text-sm text-gray-300">Try: <span className="text-white font-medium">{result.name}</span></p>
              <p className="text-xs text-gray-400">Category tag: {result.tag}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


