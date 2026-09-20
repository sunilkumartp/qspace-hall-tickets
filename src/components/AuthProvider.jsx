import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../db/supabase';

const AuthContext = createContext({
  user: null,
  session: null,
  role: 'user',
  isAdmin: false,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAILS = ['sunilkumartp@gmail.com', 'remyamenonqspace@gmail.com'];

  const fetchUserRole = useCallback(async (userObj) => {
    if (!userObj?.id) {
      setRole('user');
      return;
    }
    const isDesignatedAdmin = ADMIN_EMAILS.includes(userObj.email?.toLowerCase());

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userObj.id)
        .maybeSingle();

      if (!error && data?.role) {
        setRole(data.role);
      } else if (isDesignatedAdmin) {
        // Auto-seed admin role into user_roles
        await supabase
          .from('user_roles')
          .upsert({ user_id: userObj.id, role: 'admin' });
        setRole('admin');
      } else {
        setRole('user');
      }
    } catch (err) {
      console.error('Error checking user role:', err);
      setRole(isDesignatedAdmin ? 'admin' : 'user');
    }
  }, []);

  useEffect(() => {
    // Initial session lookup
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user || null);
      if (initialSession?.user) {
        fetchUserRole(initialSession.user);
      }
      setLoading(false);
    });

    // Reactive subscription to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      if (newSession?.user) {
        await fetchUserRole(newSession.user);
      } else {
        setRole('user');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  const signInWithGoogle = async (returnTo = '/abacus') => {
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(returnTo)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/forms.body',
          'https://www.googleapis.com/auth/forms.responses.readonly',
          'https://www.googleapis.com/auth/drive.file'
        ].join(' '),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole('user');
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserRole(user);
    }
  };

  const value = {
    user,
    session,
    role,
    isAdmin: role === 'admin',
    loading,
    signInWithGoogle,
    signOut,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
