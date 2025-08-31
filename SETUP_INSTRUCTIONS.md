# 🚀 NoteZ Music App - Setup Instructions

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

## 🗄️ Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready
3. Note down your project URL and service role key

### 2. Run Database Schema
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `backend/supabase/schema.sql`
4. Run the script to create all tables and functions

### 3. Create Storage Buckets
1. Go to Storage in your Supabase dashboard
2. Create a bucket named `songs` (for audio files)
3. Create a bucket named `avatars` (for profile pictures)
4. Set both buckets to public

## 🔧 Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production

# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Hugging Face API (for AI mood detection)
HUGGINGFACE_API_KEY=your-huggingface-token
```

### 3. Start Backend Server
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 🎨 Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the `frontend` directory:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Start Frontend Development Server
```bash
npm run dev
```

The app will open at `http://localhost:5173`

## 🔐 Authentication Setup

### 1. Supabase Auth Configuration
1. Go to Authentication > Settings in your Supabase dashboard
2. Enable Email authentication
3. Configure your site URL and redirect URLs
4. Optionally enable Google OAuth

### 2. JWT Configuration
1. Go to Settings > API in your Supabase dashboard
2. Copy the JWT secret
3. Update your backend `.env` file

## 📱 Testing the App

### 1. User Registration
1. Open the app in your browser
2. Click "Create Account"
3. Choose between "Normal User" or "Content Creator"
4. Fill in your details and register

### 2. Content Creator Features
1. Login as a content creator
2. Upload songs with metadata
3. View analytics dashboard
4. Manage your music library

### 3. Normal User Features
1. Login as a normal user
2. Browse and search music
3. Create playlists
4. Add friends and follow creators

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `FRONTEND_URL` is set correctly in backend `.env`
   - Check that the frontend is running on the expected port

2. **Database Connection Issues**
   - Verify Supabase credentials in `.env`
   - Check that the schema has been run successfully

3. **File Upload Issues**
   - Ensure storage buckets are created and public
   - Check file size limits (50MB for audio, 5MB for images)

4. **Authentication Issues**
   - Verify JWT secret is set correctly
   - Check Supabase auth settings

### Getting Help

- Check the browser console for frontend errors
- Check the terminal for backend errors
- Verify all environment variables are set
- Ensure all dependencies are installed

## 🚀 Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use a strong, unique JWT secret
3. Configure proper CORS origins
4. Use environment-specific Supabase projects

### Frontend
1. Build the app: `npm run build`
2. Deploy the `dist` folder to your hosting service
3. Update environment variables for production

## 📊 Features Implemented

✅ **User Profile Management**
- Edit profile details (name, bio, gender)
- Upload/change profile picture
- Profile modal with form validation

✅ **Friend System**
- Send friend requests
- Accept/reject friend requests
- View friend activity
- Add friends via search

✅ **Notifications System**
- Friend request notifications
- New song notifications from followed creators
- Mark notifications as read
- Notification badges

✅ **Library Management**
- Favorites management
- Playlist creation and management
- Follow content creators
- Clean sidebar navigation

✅ **Enhanced Search**
- Real-time search suggestions
- Search by song, artist, movie
- Advanced filtering options

✅ **Song Actions**
- Like/unlike songs
- Add to playlists
- Play songs
- Song frequency tracking

✅ **Content Creator Dashboard**
- Upload songs with metadata
- Track song performance
- View analytics and statistics
- Manage music library

## 🔄 Next Steps

1. **Test all features** with different user roles
2. **Add sample data** to see the app in action
3. **Customize the UI** to match your preferences
4. **Deploy to production** when ready

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify all setup steps are completed
3. Check the console and terminal for error messages
4. Ensure all environment variables are correctly set

Happy coding! 🎵✨

