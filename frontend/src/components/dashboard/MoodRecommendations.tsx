import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const moods = [
  { emoji: "🎧", label: "Chill", color: "from-blue-500 to-cyan-400" },
  { emoji: "😊", label: "Happy", color: "from-yellow-400 to-orange-400" },
  { emoji: "💪", label: "Workout", color: "from-red-500 to-pink-500" },
  { emoji: "🌧️", label: "Rainy", color: "from-gray-500 to-blue-500" },
  { emoji: "🌙", label: "Night", color: "from-purple-600 to-indigo-600" },
  { emoji: "☀️", label: "Morning", color: "from-yellow-300 to-amber-400" },
];

export function MoodRecommendations() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-accent">🎭</span>
          Mood Vibes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {moods.map((mood, index) => (
            <Button key={index} variant="outline" className={`h-16 bg-gradient-to-r ${mood.color} hover:scale-105 transition-all duration-300 border-0 text-white font-medium hover:shadow-accent`}>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">{mood.emoji}</span>
                <span className="text-sm">{mood.label}</span>
              </div>
            </Button>
          ))}
        </div>
        <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">🤖 AI Suggestion</p>
          <p className="text-sm">Based on your recent activity, try some <span className="text-accent font-medium">Chill Vibes</span> for your afternoon coding session!</p>
        </div>
      </CardContent>
    </Card>
  );
}


