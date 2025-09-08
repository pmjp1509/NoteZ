import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { lazy, Suspense, useEffect } from 'react';
import LoginForm from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import ProtectedRoute from './components/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreatorRoute from './components/CreatorRoute';

const Dashboard = lazy(() => import('./components/Dashboard'));
const FriendProfilePage = lazy(() => import('./components/dashboard/pages/FriendProfilePage'));
const CreatorDashboard = lazy(() => import('./components/dashboard/ContentCreatorDashboard').then(m => ({ default: m.ContentCreatorDashboard })));
const ProfileEditPage = lazy(() => import('./components/dashboard/pages/ProfileEditPage'));

function App() {
  useEffect(() => {
    // Default title; route components override as needed
    document.title = 'NoteZ';
  }, []);
  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={new QueryClient()}>
          <div className="App">
            <Suspense fallback={<div className="p-6 text-gray-300">Loading...</div>}>
              <Routes>
                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/friend/:friendId" element={<ProtectedRoute><FriendProfilePage /></ProtectedRoute>} />
                <Route path="/creator" element={<ProtectedRoute><CreatorRoute><CreatorDashboard /></CreatorRoute></ProtectedRoute>} />
                <Route path="/profile/edit" element={<ProtectedRoute><ProfileEditPage /></ProtectedRoute>} />
                <Route path="/" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </div>
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;