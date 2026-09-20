import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../db/supabase';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase client handles parsing the token hash automatically when detectSessionInUrl is true.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          const next = searchParams.get('next') || '/abacus';
          navigate(next, { replace: true });
        } else {
          // If session is still loading from URL hash, wait slightly or check event
          const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (event === 'SIGNED_IN' && newSession) {
              const next = searchParams.get('next') || '/abacus';
              navigate(next, { replace: true });
            }
          });

          // Timeout safety
          setTimeout(() => {
            if (!session) {
              navigate('/abacus', { replace: true });
            }
          }, 3000);

          return () => {
            authListener?.subscription?.unsubscribe();
          };
        }
      } catch (err) {
        console.error('Error handling auth callback:', err);
        setError(err.message || 'Authentication error');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-panel" style={{ padding: '30px', maxWidth: '400px', textAlign: 'center', background: '#fee2e2' }}>
          <h3 style={{ color: '#b91c1c', marginBottom: '8px' }}>Sign-In Failed</h3>
          <p style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/abacus')}>
            Return to Generator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid var(--border-color)',
        borderTop: '3px solid var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Completing Google sign-in...</p>
    </div>
  );
};
