# NoteZ - Music App

A modern music application built with React, TypeScript, and Supabase.

## Features

- User authentication (email/password and Google OAuth)
- Modern UI with Tailwind CSS
- Responsive design
- TypeScript for type safety

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Supabase credentials:
   ```
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. Get your Supabase credentials:
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy the "anon public" key
   - Replace `your_supabase_anon_key_here` with your actual key

5. Run the development server:
   ```bash
   npm run dev
   ```

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Enable authentication in your Supabase dashboard
3. Configure Google OAuth (optional):
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase (Authentication & Database)
- React Router DOM
- Lucide React (Icons)
