import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../db/supabase';
import { format } from 'date-fns';
import { ArrowLeft, RefreshCw, BarChart3, FileText, Monitor, Clock } from 'lucide-react';
import { AdminSamplePapers } from './AdminSamplePapers';

export const AdminDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('generation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (fetchError) throw fetchError;
      setLogs(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Computed stats
  const stats = useMemo(() => {
    const generations = logs.filter(l => l.event_type === 'generation');
    const visits = logs.filter(l => l.event_type === 'page_visit');
    const hallTickets = generations.filter(l => l.document_type === 'hallTicket');
    const workshops = generations.filter(l => l.document_type === 'workshop');
    const totalStudents = generations.reduce((sum, l) => sum + (l.student_count || 0), 0);

    // Browser breakdown
    const browsers = {};
    logs.forEach(l => {
      const b = l.browser || 'Unknown';
      browsers[b] = (browsers[b] || 0) + 1;
    });

    // OS breakdown
    const osList = {};
    logs.forEach(l => {
      const o = l.os || 'Unknown';
      osList[o] = (osList[o] || 0) + 1;
    });

    return {
      totalGenerations: generations.length,
      totalVisits: visits.length,
      hallTicketGenerations: hallTickets.length,
      workshopGenerations: workshops.length,
      totalStudentsGenerated: totalStudents,
      browsers,
      osList
    };
  }, [logs]);

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#0f172a', color: '#e2e8f0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>
              📊 Admin Dashboard
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              Generation analytics & debug info
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchLogs}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155',
                background: '#1e293b', color: '#94a3b8', cursor: 'pointer', fontSize: '13px'
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155',
                background: '#1e293b', color: '#94a3b8', cursor: 'pointer', fontSize: '13px'
              }}
            >
              <ArrowLeft size={14} />
              Back to App
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#7f1d1d', borderRadius: '8px', marginBottom: '24px', color: '#fca5a5', fontSize: '14px' }}>
            Error: {error}
          </div>
        )}

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <StatCard icon={<FileText size={20} />} label="Total Generations" value={stats.totalGenerations} color="#3b82f6" />
          <StatCard icon={<Monitor size={20} />} label="Page Visits" value={stats.totalVisits} color="#8b5cf6" />
          <StatCard icon={<BarChart3 size={20} />} label="Hall Tickets" value={stats.hallTicketGenerations} color="#10b981" />
          <StatCard icon={<BarChart3 size={20} />} label="Workshop Slips" value={stats.workshopGenerations} color="#f59e0b" />
          <StatCard icon={<Clock size={20} />} label="Total Students" value={stats.totalStudentsGenerated} color="#ec4899" />
        </div>

        {/* Browser & OS Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <BreakdownCard title="Browser Breakdown" data={stats.browsers} />
          <BreakdownCard title="OS Breakdown" data={stats.osList} />
        </div>

        {/* Log Table */}
        <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>
              Recent Events ({logs.length})
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Event</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Count</th>
                  <th style={thStyle}>Year</th>
                  <th style={thStyle}>Browser</th>
                  <th style={thStyle}>OS</th>
                  <th style={thStyle}>Resolution</th>
                  <th style={thStyle}>Timezone</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan="9" style={{ ...tdStyle, textAlign: 'center', padding: '40px', color: '#64748b' }}>No events recorded yet.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={tdStyle}>
                        <div style={{ whiteSpace: 'nowrap' }}>
                          {format(new Date(log.created_at), 'dd MMM yyyy')}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>
                          {format(new Date(log.created_at), 'hh:mm:ss a')}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                          background: log.event_type === 'generation' ? '#1e3a5f' : '#2d1f54',
                          color: log.event_type === 'generation' ? '#60a5fa' : '#a78bfa'
                        }}>
                          {log.event_type}
                        </span>
                      </td>
                      <td style={tdStyle}>{log.document_type}</td>
                      <td style={tdStyle}>{log.student_count || '-'}</td>
                      <td style={tdStyle}>{log.year || '-'}</td>
                      <td style={tdStyle}>{log.browser || '-'}</td>
                      <td style={tdStyle}>{log.os || '-'}</td>
                      <td style={tdStyle}>{log.screen_resolution || '-'}</td>
                      <td style={tdStyle}>{log.timezone || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Abacus Grade Sample Papers Governance Section */}
        <AdminSamplePapers />
      </div>
    </div>
  );
};

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  color: '#94a3b8',
  fontWeight: '600',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '10px 16px',
  color: '#cbd5e1',
  borderBottom: '1px solid #334155'
};

const StatCard = ({ icon, label, value, color }) => (
  <div style={{
    background: '#1e293b', borderRadius: '12px', padding: '20px',
    border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '16px'
  }}>
    <div style={{
      width: '44px', height: '44px', borderRadius: '10px',
      background: `${color}20`, color, display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#f1f5f9' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{label}</div>
    </div>
  </div>
);

const BreakdownCard = ({ title, data }) => {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  return (
    <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9', marginBottom: '16px' }}>{title}</h3>
      {entries.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '13px' }}>No data yet</div>
      ) : (
        entries.map(([name, count]) => (
          <div key={name} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: '#cbd5e1' }}>{name}</span>
              <span style={{ color: '#94a3b8' }}>{count} ({Math.round((count / total) * 100)}%)</span>
            </div>
            <div style={{ height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${(count / total) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: '2px' }} />
            </div>
          </div>
        ))
      )}
    </div>
  );
};
