const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

// Middleware to verify Supabase access token and attach user id
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  if (token.split('.').length !== 3) {
    return res.status(400).json({ error: 'Malformed token' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    if (!user) return res.status(403).json({ error: 'Invalid token' });

    req.user = { id: user.id, email: user.email };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Send friend request to a specific userId
router.post('/:userId/request', authenticateToken, async (req, res) => {
  try {
    const { userId: receiverId } = req.params;

    if (!receiverId) {
      return res.status(400).json({ error: 'Receiver ID is required' });
    }

    if (receiverId === req.user.id) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check existing request in either direction
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status, sender_id, receiver_id')
      .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${req.user.id})`)
      .maybeSingle();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ error: 'Friend request already pending' });
      }
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends' });
      }
      // If previously rejected, allow creating a new pending request from current sender
    }

    const { data: friendRequest, error: insertError } = await supabase
      .from('friend_requests')
      .insert({ sender_id: req.user.id, receiver_id: receiverId, status: 'pending' })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(400).json({ error: 'Duplicate friend request' });
      }
      return res.status(500).json({ error: 'Failed to send friend request' });
    }

    res.json({
      message: 'Friend request sent',
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

// Accept or reject a friend request (must be receiver)
router.put('/requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' | 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const { data: friendRequest, error: fetchError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('receiver_id', req.user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    const { data: updated, error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update request' });
    }

    res.json({
      message: `Request ${action}ed`,
      friendRequest: { id: updated.id, status: updated.status, updatedAt: updated.updated_at }
    });
  } catch (error) {
    console.error('Update friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel a pending request (must be sender). Alternatively, we can delete the row.
router.delete('/requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    const { data: reqRow, error: getError } = await supabase
      .from('friend_requests')
      .select('id, sender_id, status')
      .eq('id', requestId)
      .single();

    if (getError || !reqRow) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (reqRow.sender_id !== req.user.id) {
      return res.status(403).json({ error: 'Only sender can cancel request' });
    }

    if (reqRow.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be cancelled' });
    }

    const { error: delError } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);

    if (delError) {
      return res.status(500).json({ error: 'Failed to cancel request' });
    }

    res.json({ message: 'Request cancelled' });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user's friends (derived from accepted requests)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: accepted, error } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, created_at')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch friends' });
    }

    const friendIds = accepted.map(r => (r.sender_id === userId ? r.receiver_id : r.sender_id));

    if (friendIds.length === 0) {
      return res.json({ friends: [] });
    }

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, bio, role')
      .in('id', friendIds);

    if (usersError) {
      return res.status(500).json({ error: 'Failed to load friend profiles' });
    }

    res.json({ friends: usersData });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending requests received by current user
router.get('/requests/pending', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('id, sender_id, created_at, status, sender:users!friend_requests_sender_id_fkey(id, username, full_name, avatar_url)')
      .eq('receiver_id', req.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }

    res.json({
      requests: data.map(r => ({
        id: r.id,
        sender: r.sender,
        status: r.status,
        createdAt: r.created_at
      }))
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unfriend: set any accepted request between the pair to rejected
router.delete('/:friendId', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    const { data: reqRow, error: findError } = await supabase
      .from('friend_requests')
      .select('id, status, sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .maybeSingle();

    if (findError || !reqRow) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    const { error: updError } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', reqRow.id);

    if (updError) {
      return res.status(500).json({ error: 'Failed to remove friend' });
    }

    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Unfriend error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


