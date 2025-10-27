# 🎵 NoteZ Music App# 🚀 NoteZ Music App - Setup Instructions



A modern music streaming platform with AI-powered recommendations and social features.## 📋 Prerequisites



## 🌟 Features- Node.js 18+ and npm

- Supabase account

### Core Features- Git

- User profiles and authentication

- Music streaming and playlist management## 🗄️ Database Setup

- Friend system and social features

- Content creator dashboard### 1. Create Supabase Project

- Advanced search functionality1. Go to [supabase.com](https://supabase.com) and create a new project

2. Wait for the project to be ready

### 🤖 AI Features3. Note down your project URL and service role key

- **Smart DJ Assistant**: Suggests songs based on emotional input

- **Personalized Recommendations**: Based on listening history### 2. Run Database Schema

- **Mood-Based Playlists**: AI-curated song collections1. Go to your Supabase project dashboard

2. Navigate to SQL Editor

## 🚀 Getting Started3. Copy and paste the contents of `backend/supabase/schema.sql`

4. Run the script to create all tables and functions

### Prerequisites

- Node.js 18+ and npm### 3. Create Storage Buckets

- Supabase account1. Go to Storage in your Supabase dashboard

- Git2. Create a bucket named `songs` (for audio files)

3. Create a bucket named `avatars` (for profile pictures)

### Quick Start4. Set both buckets to public

1. Clone the repository

2. Set up Supabase project## 🔧 Backend Setup

3. Configure environment variables

4. Run backend and frontend servers### 1. Install Dependencies

```bash

[Detailed setup instructions](#setup-instructions)cd backend

npm install

## 📋 Setup Instructions```



### 1. Database Setup### 2. Environment Configuration

1. Create Supabase project at [supabase.com](https://supabase.com)Create a `.env` file in the `backend` directory:

2. Run `backend/supabase/schema.sql` in SQL Editor

3. Create storage buckets:```env

   - `songs` for audio files# Server Configuration

   - `avatars` for profile picturesPORT=3001

NODE_ENV=development

### 2. Backend Setup

```bash# JWT Configuration

cd backendJWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production

npm install

# Set up .env file (see .env.example)# Supabase Configuration

npm run devSUPABASE_URL=your-supabase-project-url

```SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key



### 3. Frontend Setup# Frontend URL (for CORS)

```bashFRONTEND_URL=http://localhost:5173

cd frontend

npm install# Hugging Face API (for AI mood detection)

# Set up .env file (see .env.example)HUGGINGFACE_API_KEY=your-huggingface-token

npm run dev```

```

### 3. Start Backend Server

## 🧠 Smart Features Documentation```bash

npm run dev

### AI DJ Assistant```

The AI DJ suggests songs based on:

- Emotional state detectionThe server will start on `http://localhost:3001`

- Current mood analysis

- Genre preferences## 🎨 Frontend Setup

- Listening history

### 1. Install Dependencies

### Recommendation System```bash

Personalized suggestions using:cd frontend

- Recently played (last 20 songs)npm install

- Most played (top 10)```

- Category preferences

- Friend activity### 2. Environment Configuration

- Trending tracksCreate a `.env` file in the `frontend` directory:



## 👥 User Roles```env

VITE_SUPABASE_URL=your-supabase-project-url

### Content CreatorsVITE_SUPABASE_ANON_KEY=your-supabase-anon-key

- Upload and manage music```

- View analytics and stats

- Track song performance### 3. Start Frontend Development Server

- Engage with listeners```bash

npm run dev

### Regular Users```

- Stream music

- Create playlistsThe app will open at `http://localhost:5173`

- Follow creators

- Connect with friends## 🔐 Authentication Setup



## 🛠 Technical Architecture### 1. Supabase Auth Configuration

1. Go to Authentication > Settings in your Supabase dashboard

### Frontend2. Enable Email authentication

- React with TypeScript3. Configure your site URL and redirect URLs

- Vite for build tooling4. Optionally enable Google OAuth

- TailwindCSS for styling

- Context API for state management### 2. JWT Configuration

1. Go to Settings > API in your Supabase dashboard

### Backend2. Copy the JWT secret

- Node.js Express server3. Update your backend `.env` file

- Supabase for database

- JWT authentication## 📱 Testing the App

- Real-time features

### 1. User Registration

## 🔐 Security Features1. Open the app in your browser

- JWT authentication2. Click "Create Account"

- Row Level Security (RLS)3. Choose between "Normal User" or "Content Creator"

- File upload validation4. Fill in your details and register

- User role management

### 2. Content Creator Features

## 📱 Feature Details1. Login as a content creator

2. Upload songs with metadata

### Profile Management3. View analytics dashboard

- Edit profile details4. Manage your music library

- Upload profile pictures

- View activity history### 3. Normal User Features

- Manage preferences1. Login as a normal user

2. Browse and search music

### Music Features3. Create playlists

- Create/edit playlists4. Add friends and follow creators

- Like/favorite songs

- Share music## 🐛 Troubleshooting

- Queue management

### Common Issues

### Social Features

- Friend requests1. **CORS Errors**

- Activity feed   - Ensure `FRONTEND_URL` is set correctly in backend `.env`

- Music sharing   - Check that the frontend is running on the expected port

- Real-time updates

2. **Database Connection Issues**

## 🐛 Troubleshooting   - Verify Supabase credentials in `.env`

   - Check that the schema has been run successfully

### Common Issues

1. **CORS Errors**: Check FRONTEND_URL in backend .env3. **File Upload Issues**

2. **Upload Issues**: Verify storage bucket permissions   - Ensure storage buckets are created and public

3. **Auth Problems**: Confirm JWT configuration   - Check file size limits (50MB for audio, 5MB for images)

4. **Database Errors**: Validate Supabase credentials

4. **Authentication Issues**

## 📈 Future Updates   - Verify JWT secret is set correctly

1. Mobile app development   - Check Supabase auth settings

2. Advanced analytics

3. More AI features### Getting Help

4. Enhanced social features

- Check the browser console for frontend errors

## 🤝 Contributing- Check the terminal for backend errors

Contributions are welcome! Please read our contributing guidelines first.- Verify all environment variables are set

- Ensure all dependencies are installed

## 📄 License

This project is licensed under the MIT License.## 🚀 Production Deployment

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

