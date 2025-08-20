import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getFriends, type Profile, type ListeningActivity } from '@/lib/database';
import { useNavigate } from 'react-router-dom';

type FriendWithActivity = Profile & { activity?: ListeningActivity };

export function FriendActivity() {
  const [friends, setFriends] = useState<FriendWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFriends();
  }, []);

  async function loadFriends() {
    try {
      const friendsData = await getFriends();
      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFriendClick(friend: FriendWithActivity) {
    navigate(`/profile/${friend.user_id}`);
  }

  function formatTimeAgo(dateString: string) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-primary" />
          Friend Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading friends...</div>
        ) : friends.length === 0 ? (
          <div className="text-sm text-muted-foreground">No friends yet</div>
        ) : (
          friends.map((friend) => (
            <div 
              key={friend.id} 
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors"
              onClick={() => handleFriendClick(friend)}
            >
              <img 
                src={friend.avatar_url || "/assets/album-placeholder.jpg"} 
                alt={friend.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{friend.name}</p>
                {friend.activity ? (
                  <>
                    <p className="text-xs text-muted-foreground truncate">
                      {friend.activity.song_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(friend.activity.listened_at)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Offline</p>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{friend.total_listening_hours}h</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}