import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RightSidebar() {
  return (
    <div className="hidden lg:flex flex-col gap-4">
      <Card className="bg-black/30 border-white/10">
        <CardHeader>
          <CardTitle className="text-white/90">Friend Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {["Alex", "Sarah", "Mike"].map((name, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10" />
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{name}</p>
                <p className="text-xs text-gray-400 truncate">Listening now</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-black/30 border-white/10">
        <CardHeader>
          <CardTitle className="text-white/90">AI DJ Assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-white/5 text-sm text-gray-300">
            Hey! Try saying "Play some lo‑fi music" or "Add this to my workout playlist" 🎵
          </div>
          <button className="w-full rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm px-3 py-2 transition">Play some lo‑fi beats</button>
        </CardContent>
      </Card>
    </div>
  );
}


