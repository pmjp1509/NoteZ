import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X, UserPlus, Music, Heart, Users, Check, XCircle, Loader2 } from 'lucide-react';

interface Notification {
  id: string;
  type: 'friend_request' | 'new_song' | 'follow' | 'like' | 'playlist_share';
  title: string;
  message: string;
  relatedId: string;
  isRead: boolean;
  createdAt: string;
}

interface FriendRequest {
  id: string;
  sender: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
  };
  status: string;
  createdAt: string;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'requests'>('notifications');

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchFriendRequests();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/users/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/users/friends/requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch friend requests:', error);
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/users/friends/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        // Remove the processed request
        setFriendRequests(prev => prev.filter(req => req.id !== requestId));
        // Refresh notifications
        fetchNotifications();
      }
    } catch (error) {
      console.error(`Failed to ${action} friend request:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3001/api/users/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-blue-400" />;
      case 'new_song':
        return <Music className="w-5 h-5 text-green-400" />;
      case 'follow':
        return <Users className="w-5 h-5 text-purple-400" />;
      case 'like':
        return <Heart className="w-5 h-5 text-red-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const pendingRequestsCount = friendRequests.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-black/30 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-purple-400" />
            <CardTitle className="text-xl text-white">Notifications</CardTitle>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Tab Navigation */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Friend Requests
              {pendingRequestsCount > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto">
            {activeTab === 'notifications' ? (
              <div className="p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        notification.isRead
                          ? 'bg-white/5 border-white/10'
                          : 'bg-purple-500/10 border-purple-500/20'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium ${
                            notification.isRead ? 'text-gray-300' : 'text-white'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="text-gray-400 hover:text-white"
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {friendRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400">No pending friend requests</p>
                  </div>
                ) : (
                  friendRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 bg-white/5 border border-white/10 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          {request.sender.avatarUrl ? (
                            <img
                              src={request.sender.avatarUrl}
                              alt="Avatar"
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-medium">
                              {request.sender.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white">
                            {request.sender.fullName || request.sender.username}
                          </h4>
                          <p className="text-sm text-gray-400">
                            @{request.sender.username}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimeAgo(request.createdAt)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleFriendRequest(request.id, 'accept')}
                            disabled={isLoading}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFriendRequest(request.id, 'reject')}
                            disabled={isLoading}
                            className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

