import React, { useCallback, useState } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';
import { db } from '../db/database';

export const UploadSection = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const processFile = async (file) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
        throw new Error('Please upload a valid Excel file (.xlsx, .xls, .csv)');
      }
      
      const students = await parseExcelFile(file);
      
      if (students.length === 0) {
        throw new Error('No valid student data found in the file.');
      }

      // Add to database
      await db.students.bulkAdd(students);
      
      onUploadSuccess(students.length);
    } catch (err) {
      setError(err.message || 'An error occurred while parsing the file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '32px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <div 
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-color)'}`,
          borderRadius: '12px',
          padding: '48px 24px',
          backgroundColor: isDragging ? 'var(--primary-light)' : 'rgba(255,255,255,0.5)',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onClick={() => document.getElementById('excel-upload').click()}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ background: 'var(--primary-light)', padding: '16px', borderRadius: '50%' }}>
            <FileSpreadsheet size={32} color="var(--primary)" />
          </div>
        </div>
        
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          Upload Student Data
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Drag and drop your Excel sheet here, or click to browse.
        </p>

        <input 
          id="excel-upload"
          type="file" 
          accept=".xlsx, .xls, .csv" 
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        <button className="btn btn-primary" disabled={isLoading} style={{ opacity: isLoading ? 0.7 : 1 }}>
          <UploadCloud size={18} />
          {isLoading ? 'Processing...' : 'Browse Files'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{error}</span>
        </div>
      )}
    </div>
  );
};
