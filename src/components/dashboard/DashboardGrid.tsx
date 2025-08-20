import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Library, ListMusic, Heart, Compass, Menu, X } from "lucide-react";
import { MoodRecommendations } from "@/components/dashboard/MoodRecommendations";
import { CommunityPlaylists } from "@/components/dashboard/CommunityPlaylists";
import { LyricsPanel } from "@/components/dashboard/LyricsPanel";
import { FriendActivity } from "@/components/dashboard/FriendActivity";
import { useState } from "react";
import type { SongItem } from "@/lib/songs";

const navItems = [
  { icon: Home, label: 'Home', active: true },
  { icon: Library, label: 'Library', active: false },
  { icon: ListMusic, label: 'Playlists', active: false },
  { icon: Heart, label: 'Favorites', active: false },
  { icon: Compass, label: 'Recommendations', active: false },
];

export function DashboardGrid({ onPlay }: { onPlay?: (song: SongItem) => void }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
      {/* Mobile Navigation */}
      <div className="md:hidden">
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="flex items-center gap-2"
              >
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                Menu
              </Button>
            </div>
            {mobileNavOpen && (
              <div className="mt-3 space-y-1">
                {navItems.slice(0, 2).map(({ icon: Icon, label, active }) => (
                  <button
                    key={label}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                      active 
                        ? 'bg-primary/20 text-primary' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <Card className="glass-card">
          <CardContent className="p-3">
            <nav className="flex gap-1">
              {navItems.map(({ icon: Icon, label, active }) => (
                <button
                  key={label}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                    active 
                      ? 'bg-primary/20 text-primary' 
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        <div className="lg:col-span-2 space-y-2 sm:space-y-3">
          <MoodRecommendations />
          <CommunityPlaylists onPlay={onPlay} />
        </div>
        <div className="space-y-2 sm:space-y-3">
          <LyricsPanel />
          <FriendActivity />
        </div>
      </div>
    </div>
  );
}