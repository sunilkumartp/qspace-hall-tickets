import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../db/supabase';

const AuthContext = createContext({
  user: null,
  session: null,
  role: 'user',
  isAdmin: false,
  isAllowed: false,
  loading: true,
  primaryAdminEmail: 'remyasunil@gmail.com',
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('user');
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const PRIMARY_ADMIN_EMAIL = 'remyasunil@gmail.com';
  const ADMIN_EMAILS = [
    'remyasunil@gmail.com',
    'sunilkumartp@gmail.com',
    'remyamenonqspace@gmail.com'
  ];

  const fetchUserRole = useCallback(async (userObj) => {
    if (!userObj?.id || !userObj?.email) {
      setRole('user');
      setIsAllowed(false);
      return;
    }
    const userEmail = userObj.email.trim().toLowerCase();
    const isDesignatedAdmin = ADMIN_EMAILS.includes(userEmail);

    if (isDesignatedAdmin) {
      setRole('admin');
      setIsAllowed(true);
      try {
        await supabase
          .from('user_roles')
          .upsert({ user_id: userObj.id, role: 'admin' });
      } catch (e) {
        console.warn('Could not auto-upsert admin in user_roles:', e);
      }
      return;
    }

    try {
      // 1. Check if user is in allowed_users whitelist
      const { data: allowedData, error: allowedError } = await supabase
        .from('allowed_users')
        .select('role')
        .ilike('email', userEmail)
        .maybeSingle();

      if (!allowedError && allowedData) {
        const assignedRole = allowedData.role || 'user';
        setRole(assignedRole);
        setIsAllowed(true);
        if (assignedRole === 'admin') {
          await supabase
            .from('user_roles')
            .upsert({ user_id: userObj.id, role: 'admin' });
        }
        return;
      }

      // 2. Fallback check in user_roles table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userObj.id)
        .maybeSingle();

      if (roleData?.role === 'admin') {
        setRole('admin');
        setIsAllowed(true);
      } else {
        // User is authenticated with Google but NOT authorized/whitelisted
        setRole('unauthorized');
        setIsAllowed(false);
      }
    } catch (err) {
      console.error('Error verifying user authorization:', err);
      setRole('unauthorized');
      setIsAllowed(false);
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

  const signInWithGoogle = async (returnTo = '/') => {
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
    setIsAllowed(false);
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
    isAllowed,
    loading,
    primaryAdminEmail: PRIMARY_ADMIN_EMAIL,
    adminEmails: ADMIN_EMAILS,
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
