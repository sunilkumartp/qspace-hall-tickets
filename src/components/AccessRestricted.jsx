import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { ShieldAlert, LogOut, RefreshCw, Mail } from 'lucide-react';

export const AccessRestricted = () => {
  const { user, signOut, refreshProfile, primaryAdminEmail } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '500px',
        width: '100%',
        padding: '40px 32px',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
        borderRadius: '16px',
        border: '1px solid #fee2e2'
      }}>
        {/* Warning Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#fee2e2',
          color: '#ef4444',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <ShieldAlert size={36} />
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#1e293b' }}>
          Access Restricted
        </h2>

        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
          Your Google account is authenticated, but is not currently on the authorized user list for QSpace Academy.
        </p>

        {/* Current user email pill */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '24px',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={user.email}
              style={{ width: '36px', height: '36px', borderRadius: '50%' }}
            />
          ) : (
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#e2e8f0',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '14px'
            }}>
              {(user?.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Signed in as</div>
            <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.email}
            </div>
          </div>
        </div>

        {/* Admin contact box */}
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '14px 16px',
          marginBottom: '28px',
          textAlign: 'left',
          fontSize: '13px',
          color: '#1e40af',
          lineHeight: 1.5
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginBottom: '4px' }}>
            <Mail size={16} /> Contact Site Administrator
          </div>
          <div>
            Please contact <strong>{primaryAdminEmail || 'remyasunil@gmail.com'}</strong> to add your email address to the authorized users list.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            Check Again
          </button>

          <button
            onClick={signOut}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
