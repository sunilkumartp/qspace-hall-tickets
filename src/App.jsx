import React, { useState, useEffect } from 'react';
import { UploadSection } from './components/UploadSection';
import { StudentTable } from './components/StudentTable';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/database';

function App() {
  const [appMode, setAppMode] = useState('hallTicket');
  const [year, setYear] = useState('2025');

  const studentsCount = useLiveQuery(
    () => db.students.where('recordType').equals(appMode).count(),
    [appMode]
  );
  
  const [view, setView] = useState('upload');

  useEffect(() => {
    if (studentsCount > 0) {
      setView('list');
    } else if (studentsCount === 0) {
      setView('upload');
    }
  }, [studentsCount, appMode]);

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="page-title">QSpace Document Generator</h1>
        <p className="page-subtitle">Import students and generate beautiful PDF hall tickets or workshop slips</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'white', borderRadius: '8px', padding: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <button 
              onClick={() => setAppMode('hallTicket')}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: appMode === 'hallTicket' ? 'var(--primary)' : 'transparent', color: appMode === 'hallTicket' ? 'white' : 'var(--text-color)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Hall Tickets
            </button>
            <button 
              onClick={() => setAppMode('workshop')}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: appMode === 'workshop' ? 'var(--primary)' : 'transparent', color: appMode === 'workshop' ? 'white' : 'var(--text-color)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Workshop Slips
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 12px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-color)' }}>Year:</label>
            <input 
              type="text" 
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={{ width: '60px', padding: '4px 8px', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '14px' }}
            />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {view === 'upload' ? (
          <UploadSection mode={appMode} onUploadSuccess={() => setView('list')} />
        ) : (
          <StudentTable 
            mode={appMode}
            year={year}
            onBack={() => setView('upload')} 
          />
        )}
      </main>

      <footer style={{ marginTop: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
        <p style={{ margin: 0 }}>
          <strong>QSpace Hall Ticket Generator</strong> v1.0.0 &bull; &copy; {new Date().getFullYear()} QSpace Academy. All rights reserved.
        </p>
      </footer>


    </div>
  );
}

export default App;
