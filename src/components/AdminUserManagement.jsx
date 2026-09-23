import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../db/supabase';
import { useAuth } from './AuthProvider';
import { format } from 'date-fns';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Mail,
  Crown
} from 'lucide-react';

export const AdminUserManagement = () => {
  const { user, isAdmin, primaryAdminEmail } = useAuth();

  const [allowedUsers, setAllowedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Add user form state
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch allowed users from Supabase
  const fetchAllowedUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('allowed_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setAllowedUsers(data || []);
    } catch (err) {
      console.error('Error fetching allowed users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllowedUsers();
  }, [fetchAllowedUsers]);

  // Handle adding an authorized user
  const handleAddUser = async (e) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Check if already in list
    if (allowedUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      setError(`User ${cleanEmail} is already in the authorized users list.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data, error: insertErr } = await supabase
        .from('allowed_users')
        .insert({
          email: cleanEmail,
          role: roleInput,
          created_by: user?.email || 'admin'
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setSuccessMsg(`Successfully granted access to ${cleanEmail} (${roleInput}).`);
      setEmailInput('');
      setRoleInput('user');
      await fetchAllowedUsers();
    } catch (err) {
      console.error('Error adding user:', err);
      setError(err.message || 'Failed to add authorized user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle removing an authorized user
  const handleRemoveUser = async (userToRemove) => {
    if (userToRemove.email.toLowerCase() === primaryAdminEmail.toLowerCase()) {
      alert(`Cannot remove the primary site administrator (${primaryAdminEmail}).`);
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to revoke access for ${userToRemove.email}? They will no longer be able to use the application.`
    );
    if (!confirmDelete) return;

    setError(null);
    setSuccessMsg(null);

    try {
      const { error: deleteErr } = await supabase
        .from('allowed_users')
        .delete()
        .eq('id', userToRemove.id);

      if (deleteErr) throw deleteErr;

      setSuccessMsg(`Revoked access for ${userToRemove.email}.`);
      await fetchAllowedUsers();
    } catch (err) {
      console.error('Error removing user:', err);
      setError(err.message || 'Failed to revoke access.');
    }
  };

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '16px',
      border: '1px solid #334155',
      padding: '24px',
      marginTop: '32px'
    }}>
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={18} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>
              Authorized Users Management
            </h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 42px' }}>
            Control which Google accounts are authorized to use QSpace Hall Ticket and Practice Question Paper generators.
          </p>
        </div>

        <button
          onClick={fetchAllowedUsers}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '8px',
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Refresh List
        </button>
      </div>

      {/* Admin Highlight Banner */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0' }}>
          <Crown size={16} color="#fbbf24" />
          <span>Designated Site Administrator:</span>
          <strong style={{ color: '#60a5fa' }}>{primaryAdminEmail}</strong>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '12px' }}>
          Total Authorized Accounts: <strong style={{ color: '#f8fafc' }}>{allowedUsers.length}</strong>
        </div>
      </div>

      {/* Notification Banners */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#fca5a5',
          fontSize: '13px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid #22c55e',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#86efac',
          fontSize: '13px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add User Form */}
      <form onSubmit={handleAddUser} style={{
        background: '#0f172a',
        borderRadius: '12px',
        border: '1px solid #334155',
        padding: '16px 20px',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserPlus size={15} color="#38bdf8" />
          <span>Authorize a New User by Google Email</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px' }}>
            <input
              type="email"
              placeholder="user@gmail.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ width: '130px' }}>
            <select
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#1d4ed8'; }}
            onMouseOut={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#2563eb'; }}
          >
            <UserPlus size={14} />
            {isSubmitting ? 'Adding...' : 'Grant Access'}
          </button>
        </div>
      </form>

      {/* Users Table */}
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #334155' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>Google Email</th>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>Role</th>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>Authorized On</th>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600' }}>Authorized By</th>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                  Loading authorized users...
                </td>
              </tr>
            ) : allowedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No authorized users found.
                </td>
              </tr>
            ) : (
              allowedUsers.map((item) => {
                const isPrimary = item.email.toLowerCase() === primaryAdminEmail.toLowerCase();

                return (
                  <tr 
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #334155',
                      background: isPrimary ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: '#f1f5f9', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={14} color="#94a3b8" />
                        <span>{item.email}</span>
                        {isPrimary && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: 'rgba(251, 191, 36, 0.15)',
                            color: '#fbbf24',
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            <Crown size={11} /> Primary Admin
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: item.role === 'admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: item.role === 'admin' ? '#c084fc' : '#60a5fa'
                      }}>
                        {item.role === 'admin' ? 'Administrator' : 'User'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>
                      {item.created_at ? format(new Date(item.created_at), 'MMM dd, yyyy HH:mm') : '—'}
                    </td>

                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>
                      {item.created_by || 'system'}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {isPrimary ? (
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Protected</span>
                      ) : (
                        <button
                          onClick={() => handleRemoveUser(item)}
                          title="Revoke access"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                        >
                          <Trash2 size={13} />
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
