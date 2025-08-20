import { LogOut, Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MainDashboard } from '@/components/dashboard/MainDashboard';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useEffect } from 'react';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Set document title for Dashboard
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'NoteZ — Dashboard';
    }
  }, []);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">NoteZ</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 max-w-[60%] sm:max-w-none">
              <span className="hidden sm:inline text-gray-300 truncate">Welcome, {currentUser?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 md:pb-8">
        <MainDashboard />
      </main>
      <MobileNav />
    </div>
  );
}