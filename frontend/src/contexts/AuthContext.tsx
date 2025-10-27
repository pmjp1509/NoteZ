import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    // Persist access token for backend API calls
    const accessToken = data.session?.access_token;
    if (accessToken) {
      localStorage.setItem('token', accessToken);
    }
    return data;
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    if (error) throw error;
    // For OAuth, token will be set after redirect in onAuthStateChange
    return data;
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('token');
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      // DEBUG: Log session arrival for OAuth flows
      console.debug('AuthContext: getSession result', { session, error });
      setCurrentUser(session?.user ?? null);
      if (session?.access_token) {
        console.debug('AuthContext: saving access_token to localStorage', session.access_token?.slice(0, 20) + '...');
        localStorage.setItem('token', session.access_token);
      } else {
        console.debug('AuthContext: no access_token found, removing token from localStorage');
        localStorage.removeItem('token');
      }
      setLoading(false);
      // DEV helper: optionally auto-set a dev token for faster local testing
      try {
        const devToken = (import.meta as any).env?.VITE_DEV_AUTO_LOGIN_TOKEN;
        if (!session && devToken) {
          console.debug('AuthContext: dev auto-login token found, setting session');
          // Try to set session client-side for development convenience
          // setSession may accept only access_token in some client versions
          try {
            await (supabase.auth as any).setSession({ access_token: devToken });
            localStorage.setItem('token', devToken);
            const { data } = await supabase.auth.getUser(devToken);
            setCurrentUser(data?.user ?? null);
          } catch (_e) {
            // Fallback: just set localStorage token so API calls work
            localStorage.setItem('token', devToken);
          }
        }
      } catch (e) {
        console.warn('AuthContext: dev auto-login failed', e);
      }
    }).catch(error => {
      console.error('AuthContext: Error getting session', error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // DEBUG: Log auth state change events (important for OAuth redirect)
      console.debug('AuthContext: onAuthStateChange', { event, session });
      setCurrentUser(session?.user ?? null);
      if (session?.access_token) {
        console.debug('AuthContext: onAuthStateChange saving access_token to localStorage', session.access_token?.slice(0, 20) + '...');
        localStorage.setItem('token', session.access_token);
        // Provision user row in our DB immediately after OAuth redirect
        fetch('http://localhost:3001/api/users/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).catch(() => {});
      } else {
        console.debug('AuthContext: onAuthStateChange no access_token, removing token');
        localStorage.removeItem('token');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    signInWithGoogle,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}