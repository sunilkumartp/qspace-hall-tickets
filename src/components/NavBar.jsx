import React from 'react';
import { useAuth } from './AuthProvider';
import { 
  FileText, 
  Layers, 
  Sparkles, 
  Shield, 
  LogOut, 
  GraduationCap 
} from 'lucide-react';

export const NavBar = ({ currentPath = '/', appMode = 'hallTicket', onSelectMode = null }) => {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <nav style={{
      background: 'white',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
            }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a', lineHeight: 1.2 }}>
                QSpace Academy
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Education Suite
              </div>
            </div>
          </a>

          {/* Navigation Links / Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {currentPath === '/' && onSelectMode ? (
              <>
                <button
                  onClick={() => onSelectMode('hallTicket')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: appMode === 'hallTicket' ? '#eff6ff' : 'transparent',
                    color: appMode === 'hallTicket' ? '#1d4ed8' : '#64748b',
                    fontWeight: appMode === 'hallTicket' ? '600' : '500',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FileText size={16} />
                  Hall Tickets
                </button>

                <button
                  onClick={() => onSelectMode('workshop')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: appMode === 'workshop' ? '#eff6ff' : 'transparent',
                    color: appMode === 'workshop' ? '#1d4ed8' : '#64748b',
                    fontWeight: appMode === 'workshop' ? '600' : '500',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Layers size={16} />
                  Workshop Slips
                </button>
              </>
            ) : (
              <a
                href="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  color: currentPath === '/' ? '#1d4ed8' : '#64748b',
                  background: currentPath === '/' ? '#eff6ff' : 'transparent',
                  fontWeight: currentPath === '/' ? '600' : '500',
                  fontSize: '13px',
                  textDecoration: 'none'
                }}
              >
                <FileText size={16} />
                Document Generator
              </a>
            )}

            <a
              href="/abacus"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                color: currentPath === '/abacus' ? '#1d4ed8' : '#64748b',
                background: currentPath === '/abacus' ? '#eff6ff' : 'transparent',
                fontWeight: currentPath === '/abacus' ? '600' : '500',
                fontSize: '13px',
                textDecoration: 'none'
              }}
            >
              <Sparkles size={16} />
              Abacus Generator
            </a>

            {isAdmin && (
              <a
                href="/admin"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  color: currentPath === '/admin' ? '#7c3aed' : '#64748b',
                  background: currentPath === '/admin' ? '#f5f3ff' : 'transparent',
                  fontWeight: currentPath === '/admin' ? '600' : '500',
                  fontSize: '13px',
                  textDecoration: 'none'
                }}
              >
                <Shield size={16} />
                Admin Panel
              </a>
            )}
          </div>
        </div>

        {/* User Profile Pill & Sign Out */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 10px 4px 6px',
              background: '#f8fafc',
              borderRadius: '24px',
              border: '1px solid #e2e8f0'
            }}>
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.email}
                  style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                />
              ) : (
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  {(user.email || 'U')[0].toUpperCase()}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>
                  {user.user_metadata?.full_name || user.email.split('@')[0]}
                </span>
                <span style={{ fontSize: '10px', color: isAdmin ? '#2563eb' : '#64748b', fontWeight: isAdmin ? '600' : '400' }}>
                  {isAdmin ? 'Administrator' : 'Authorized User'}
                </span>
              </div>
            </div>

            <button
              onClick={signOut}
              title="Sign Out"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
