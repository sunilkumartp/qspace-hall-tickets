import React, { useState, useEffect } from 'react';
import { UploadSection } from './components/UploadSection';
import { StudentTable } from './components/StudentTable';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/database';

function App() {
  const studentsCount = useLiveQuery(() => db.students.count());
  const [view, setView] = useState('upload');

  useEffect(() => {
    if (studentsCount > 0) {
      setView('list');
    } else if (studentsCount === 0) {
      setView('upload');
    }
  }, [studentsCount]);

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="page-title">QSpace Hall Ticket Generator</h1>
        <p className="page-subtitle">Import students and generate beautiful PDF hall tickets</p>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {view === 'upload' ? (
          <UploadSection onUploadSuccess={() => setView('list')} />
        ) : (
          <StudentTable 
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
