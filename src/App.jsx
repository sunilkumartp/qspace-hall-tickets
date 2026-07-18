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

      {/* Hidden container for PDF rendering — uses fixed position with visibility hidden
           so html2canvas can capture at full width without the container being collapsed */}
      <div 
        id="pdf-render-container" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '794px',
          overflow: 'hidden',
          visibility: 'hidden',
          zIndex: -1
        }}
      >
        <HallTicketTemplate students={pdfStudents} />
      </div>
    </div>
  );
}

export default App;
