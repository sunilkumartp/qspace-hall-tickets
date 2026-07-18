import React, { useState, useEffect } from 'react';
import { UploadSection } from './components/UploadSection';
import { StudentTable } from './components/StudentTable';
import { HallTicketTemplate } from './components/HallTicketTemplate';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/database';

function App() {
  const studentsCount = useLiveQuery(() => db.students.count());
  const [view, setView] = useState('upload');
  const [pdfStudents, setPdfStudents] = useState([]);

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
            setPdfStudents={setPdfStudents}
          />
        )}
      </main>

      <footer style={{ marginTop: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
        <p style={{ margin: 0 }}>
          <strong>QSpace Hall Ticket Generator</strong> v1.0.0 &bull; &copy; {new Date().getFullYear()} QSpace Academy. All rights reserved.
        </p>
      </footer>

      {/* Hidden container for PDF rendering — uses fixed position offscreen
           so html2canvas can capture at full width without the container being collapsed */}
      <div 
        id="pdf-render-container" 
        style={{ 
          position: 'fixed', 
          top: '-9999px', 
          left: '-9999px', 
          width: '794px',
          zIndex: -1000
        }}
      >
        <HallTicketTemplate students={pdfStudents} />
      </div>
    </div>
  );
}

export default App;
