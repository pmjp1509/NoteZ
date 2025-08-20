import { Home, Library, ListMusic, Heart, Compass, Bot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const navItems = [
  { icon: Home, label: 'Home' },
  { icon: Library, label: 'Library' },
  { icon: ListMusic, label: 'Playlists' },
  { icon: Heart, label: 'Favorites' },
  { icon: Compass, label: 'Recommendations' },
  { icon: Bot, label: 'Chatbot DJ' },
];

export function LeftSidebar() {
  return (
    <div className="hidden md:block space-y-4">
      <Card className="bg-black/30 border-white/10">
        <CardContent className="p-4">
          <nav className="space-y-1">
            {navItems.map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </CardContent>
      </Card>

      <Card className="bg-black/30 border-white/10">
        <CardContent className="p-4">
          <p className="text-sm text-gray-400 mb-2">Now Playing</p>
          <div className="flex items-center gap-3">
            <img src="/assets/album-placeholder.jpg" alt="cover" className="w-10 h-10 rounded object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">Chill Vibes</p>
              <div className="mt-2 h-1 w-full bg-white/15 rounded">
                <div className="h-1 w-1/4 bg-gradient-to-r from-fuchsia-400 to-purple-500 rounded" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


