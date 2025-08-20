import { supabase } from "@/config/supabase";

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  total_listening_hours: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type Playlist = {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_url?: string;
  is_public: boolean;
  song_count: number;
  created_at: string;
  updated_at: string;
};

export type PlaylistSong = {
  id: string;
  playlist_id: string;
  song_name: string;
  song_movie?: string;
  song_path?: string;
  cover_url?: string;
  audio_url?: string;
  added_at: string;
};

export type Friendship = {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
};

export type ListeningActivity = {
  id: string;
  user_id: string;
  song_name: string;
  song_movie?: string;
  listened_at: string;
  duration_seconds: number;
};

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

export async function createUserProfile(name: string): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      name,
      avatar_url: `https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150`,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    return null;
  }

  return data;
}

export async function getFriends(): Promise<(Profile & { activity?: ListeningActivity })[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: friendships } = await supabase
    .from('friendships')
    .select(`
      friend_id,
      profiles!friendships_friend_id_fkey (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'accepted');

  if (!friendships) return [];

  const friends = await Promise.all(
    friendships.map(async (friendship: any) => {
      const profile = friendship.profiles;
      
      // Get latest listening activity
      const { data: activity } = await supabase
        .from('listening_activity')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('listened_at', { ascending: false })
        .limit(1)
        .single();

      return {
        ...profile,
        activity: activity || undefined
      };
    })
  );

  return friends;
}

export async function getPublicPlaylists(limit: number = 10): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching playlists:', error);
    return [];
  }

  return data || [];
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_public', true)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user playlists:', error);
    return [];
  }

  return data || [];
}