const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const supabase = require('../config/supabase');

const router = express.Router();

// Multer configuration for profile picture uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware to verify Supabase access token and attach user profile
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Validate token format
  if (token.split('.').length !== 3) {
    return res.status(400).json({ error: 'Malformed token' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      throw error;
    }

    if (!user) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Ensure user exists in users table; create if missing via RPC
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    let dbUser = existingUser;
    if (userError || !existingUser) {
      // Create user directly instead of using RPC
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          username: user.email?.split('@')[0],
          full_name: user.user_metadata?.full_name || user.user_metadata?.name,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture
        })
        .select()
        .single();
      if (createError) {
        console.error('❌ Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to ensure user profile' });
      }
      dbUser = newUser;
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: dbUser?.username || user.user_metadata?.user_name || user.email?.split('@')[0],
      dbUser
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        gender: user.gender,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { username, fullName, bio, gender } = req.body;
    
    console.log('⚙️ Updating user profile for:', req.user.id);
    console.log('Update data:', { username, fullName, bio, gender });

    const updateData = {
      username: username || undefined,
      full_name: fullName || undefined,
      bio: bio || undefined,
      gender: gender || undefined,
      updated_at: new Date().toISOString()
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    console.log('Cleaned update data:', updateData);
    
    // Try direct update first
    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('\u274c Update profile error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // If update failed, try to check if user exists first
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.id)
        .single();
      
      if (checkError) {
        console.error('\u274c User does not exist:', checkError);
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log('\u2139\ufe0f User exists, update failed due to permissions or data issue');
      return res.status(500).json({ 
        error: 'Failed to update profile', 
        details: error.message,
        code: error.code,
        hint: 'This might be a Row Level Security (RLS) policy issue'
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        gender: user.gender,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile picture
router.post('/me/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const avatarFile = req.file;
    if (!avatarFile) {
      return res.status(400).json({ error: 'No avatar file provided' });
    }

    // Upload avatar to Supabase Storage
    const fileName = `avatars/${req.user.id}-${Date.now()}-${avatarFile.originalname}`;
    const { data: avatarData, error: avatarError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile.buffer, {
        contentType: avatarFile.mimetype,
        cacheControl: '3600'
      });

    if (avatarError) {
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }

    // Get public URL for avatar
    const { data: avatarUrl } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update user profile with new avatar URL
    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({
        avatar_url: avatarUrl.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (updateError) {
      // Clean up uploaded file if database update fails
      await supabase.storage.from('avatars').remove([fileName]);
      return res.status(500).json({ error: 'Failed to update avatar' });
    }

    res.json({
      message: 'Avatar updated successfully',
      avatarUrl: avatarUrl.publicUrl
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile by username
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, bio, role, created_at')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile by user ID
router.get('/profile/id/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, bio, role, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let query = supabase
      .from('users')
      .select('id, username, full_name, avatar_url, bio, role')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .order('username');

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: users, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to search users' });
    }

    res.json({
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        role: user.role
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send friend request
router.post('/friends/request', authenticateToken, async (req, res) => {
  try {
    const { receiverUsername } = req.body;

    if (!receiverUsername) {
      return res.status(400).json({ error: 'Receiver username is required' });
    }

    // Get receiver user (with role)
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('id, role')
      .eq('username', receiverUsername)
      .single();

    if (receiverError || !receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (receiver.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Enforce rule: normal users cannot send requests to content creators
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('id, role, username')
      .eq('id', req.user.id)
      .single();

    if (senderError || !sender) {
      return res.status(400).json({ error: 'Sender not found' });
    }

    if (sender.role === 'normal_user' && receiver.role === 'content_creator') {
      return res.status(403).json({ error: 'You cannot send requests to content creators' });
    }

    // Check if friend request already exists
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${receiver.id}),and(sender_id.eq.${receiver.id},receiver_id.eq.${req.user.id})`)
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ error: 'Friend request already pending' });
      } else if (existingRequest.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends' });
      }
    }

    // Send friend request
    const { data: friendRequest, error: requestError } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: req.user.id,
        receiver_id: receiver.id
      })
      .select()
      .single();

    if (requestError) {
      return res.status(500).json({ error: 'Failed to send friend request' });
    }

    // Create notification for receiver
    await supabase
      .from('notifications')
      .insert({
        user_id: receiver.id,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `@${req.user.username} sent you a friend request`,
        related_id: req.user.id
      });

    res.json({
      message: 'Friend request sent successfully',
      friendRequest: {
        id: friendRequest.id,
        senderId: friendRequest.sender_id,
        receiverId: friendRequest.receiver_id,
        status: friendRequest.status,
        createdAt: friendRequest.created_at
      }
    });

  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get friend requests
router.get('/friends/requests', authenticateToken, async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:users!friend_requests_sender_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('receiver_id', req.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch friend requests' });
    }

    res.json({
      requests: requests.map(req => ({
        id: req.id,
        sender: req.sender,
        status: req.status,
        createdAt: req.created_at
      }))
    });

  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept/Reject friend request
router.put('/friends/requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use "accept" or "reject"' });
    }

    // Get friend request
    const { data: friendRequest, error: requestError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('receiver_id', req.user.id)
      .eq('status', 'pending')
      .single();

    if (requestError || !friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    // Update friend request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('friend_requests')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update friend request' });
    }

    // Create notification for sender
    await supabase
      .from('notifications')
      .insert({
        user_id: friendRequest.sender_id,
        type: 'friend_request_response',
        title: 'Friend Request ' + (action === 'accept' ? 'Accepted' : 'Rejected'),
        message: `@${req.user.username} ${action === 'accept' ? 'accepted' : 'rejected'} your friend request`,
        related_id: requestId
      });

    res.json({
      message: `Friend request ${action}ed successfully`,
      friendRequest: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        updatedAt: updatedRequest.updated_at
      }
    });

  } catch (error) {
    console.error('Update friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's friends
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const { data: friends, error } = await supabase
      .from('user_friends')
      .select(`
        friend:users!user_friends_friend_id_fkey(id, username, full_name, avatar_url, bio, role)
      `)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch friends' });
    }

    res.json({
      friends: friends.map(f => f.friend)
    });

  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove friend
router.delete('/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;

    // Remove both friendship records (bidirectional)
    const { error } = await supabase
      .from('user_friends')
      .delete()
      .or(`and(user_id.eq.${req.user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${req.user.id})`);

    if (error) {
      return res.status(500).json({ error: 'Failed to remove friend' });
    }

    res.json({
      message: 'Friend removed successfully'
    });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Follow content creator
router.post('/follow/:creatorId', authenticateToken, async (req, res) => {
  try {
    const { creatorId } = req.params;

    if (creatorId === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if user is a content creator
    const { data: creator, error: creatorError } = await supabase
      .from('users')
      .select('id, username, role')
      .eq('id', creatorId)
      .eq('role', 'content_creator')
      .single();

    if (creatorError || !creator) {
      return res.status(404).json({ error: 'Content creator not found' });
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('creator_follows')
      .select('id')
      .eq('follower_id', req.user.id)
      .eq('creator_id', creatorId)
      .maybeSingle();

    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this creator' });
    }

    // Follow creator
    const { data: follow, error: followError } = await supabase
      .from('creator_follows')
      .insert({
        follower_id: req.user.id,
        creator_id: creatorId
      })
      .select()
      .single();

    if (followError) {
      return res.status(500).json({ error: 'Failed to follow creator' });
    }

    // Create notification for creator
    await supabase
      .from('notifications')
      .insert({
        user_id: creatorId,
        type: 'follow',
        title: 'New Follower',
        message: `@${req.user.username} started following you`,
        related_id: req.user.id
      });

    res.json({
      message: 'Successfully followed creator',
      follow: {
        id: follow.id,
        creatorId: follow.creator_id,
        createdAt: follow.created_at
      }
    });

  } catch (error) {
    console.error('Follow creator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unfollow content creator
router.delete('/follow/:creatorId', authenticateToken, async (req, res) => {
  try {
    const { creatorId } = req.params;

    const { error } = await supabase
      .from('creator_follows')
      .delete()
      .eq('follower_id', req.user.id)
      .eq('creator_id', creatorId);

    if (error) {
      return res.status(500).json({ error: 'Failed to unfollow creator' });
    }

    res.json({ message: 'Successfully unfollowed creator' });

  } catch (error) {
    console.error('Unfollow creator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's followed creators
router.get('/following', authenticateToken, async (req, res) => {
  try {
    const { data: follows, error } = await supabase
      .from('creator_follows')
      .select(`
        creator:users!creator_follows_creator_id_fkey(id, username, full_name, avatar_url, bio)
      `)
      .eq('follower_id', req.user.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch followed creators' });
    }

    res.json({
      creators: follows.map(f => f.creator)
    });

  } catch (error) {
    console.error('Get followed creators error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a notification (for testing/manual creation)
router.post('/notifications', authenticateToken, async (req, res) => {
  try {
    const { userId, type, title, message, relatedId } = req.body;

    if (!userId || !type || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: type,
        title: title || 'Notification',
        message: message,
        related_id: relatedId,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    console.log('✅ Notification created:', notification);
    res.json({
      message: 'Notification created successfully',
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedId: notification.related_id,
        isRead: notification.is_read,
        createdAt: notification.created_at
      }
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    res.json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        relatedId: n.related_id,
        isRead: n.is_read,
        createdAt: n.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: notifications.length
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true
      })
      .eq('id', notificationId)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to mark notification as read' });
    }

    res.json({ message: 'Notification marked as read' });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true
      })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) {
      return res.status(500).json({ error: 'Failed to mark notifications as read' });
    }

    res.json({ message: 'All notifications marked as read' });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test profile update (debug endpoint)
router.post('/test-update', authenticateToken, async (req, res) => {
  try {
    console.log('\ud83d\udd0d Testing profile update for user:', req.user.id);
    console.log('Request body:', req.body);
    
    // First, try to read the user
    const { data: currentUser, error: readError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();
    
    if (readError) {
      console.error('\u274c Cannot read user:', readError);
      return res.status(500).json({ error: 'Cannot read user', details: readError });
    }
    
    console.log('\u2705 Current user data:', currentUser);
    
    // Test a simple update
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('\u274c Update failed:', updateError);
      return res.status(500).json({ error: 'Update failed', details: updateError });
    }
    
    console.log('\u2705 Update successful:', updatedUser);
    res.json({ success: true, user: updatedUser });
    
  } catch (error) {
    console.error('Test update error:', error);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Get user activity (placeholder endpoint)
router.get('/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // For now, return empty activities array
    // In a real implementation, you would query an activities/user_activities table
    res.json({
      activities: []
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
