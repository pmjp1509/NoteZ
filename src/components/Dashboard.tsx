import { Music, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MainDashboard } from '@/components/dashboard/MainDashboard';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useEffect, useState } from 'react';
import { getCurrentUserProfile, createUserProfile, type Profile } from '@/lib/database';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Set document title for Dashboard
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'NoteZ — Dashboard';
    }
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [currentUser]);

  async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
      let userProfile = await getCurrentUserProfile();
      
      // If no profile exists, create one
      if (!userProfile) {
        const name = currentUser.user_metadata?.full_name || 
                    currentUser.email?.split('@')[0] || 
                    'Music Lover';
        userProfile = await createUserProfile(name);
      }
      
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }
  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }

  function handleProfileClick() {
    setShowProfileDropdown(false);
    navigate('/profile');
  }

  function handleSettingsClick() {
    setShowProfileDropdown(false);
    navigate('/settings');
  }

  function handleLogoutClick() {
    setShowProfileDropdown(false);
    handleLogout();
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
              <span className="hidden sm:inline text-gray-300 truncate">
                Welcome, {profileLoading ? '...' : profile?.name || currentUser?.email}
              </span>
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg py-1 z-50">
                    <button
                      onClick={handleProfileClick}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={handleSettingsClick}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <hr className="border-white/10 my-1" />
                    <button
                      onClick={handleLogoutClick}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Click outside to close dropdown */}
      {showProfileDropdown && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setShowProfileDropdown(false)}
        />
      )}
      
      <main className="relative">
        <MainDashboard />
      </main>
      <MobileNav />
    </div>
  );
}
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