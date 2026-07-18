import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Download, Trash2, Clock, Printer, Edit2, X } from 'lucide-react';
import { db } from '../db/database';
import { generateHallTicket } from '../utils/pdfGenerator';
import { format } from 'date-fns';

export const StudentTable = ({ onBack, setPdfStudents }) => {
  const students = useLiveQuery(() => db.students.toArray());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  const toggleSelection = (id) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map(s => s.id)));
    }
  };

  const clearData = async () => {
    if (window.confirm('Are you sure you want to clear all student data?')) {
      await db.students.clear();
      onBack();
    }
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) return;
    
    setIsGenerating(true);
    setGenerationProgress(null);
    
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const selectedStudents = students.filter(s => selectedIds.has(s.id));
      setPdfStudents(selectedStudents);
      
      // Give React time to render the hidden template
      await new Promise(resolve => setTimeout(resolve, 600));
      
      await generateHallTicket(selectedStudents, {
        signal: controller.signal,
        onProgress: (current, total) => {
          setGenerationProgress({ current, total });
        }
      });
      
      // Update generation status
      const now = new Date().toISOString();
      await db.transaction('rw', db.students, async () => {
        for (const student of selectedStudents) {
          await db.students.update(student.id, {
            isGenerated: true,
            generatedAt: now
          });
        }
      });
      
      // Deselect all
      setSelectedIds(new Set());
    } catch (err) {
      if (err.message === 'Generation cancelled') {
        alert('PDF generation was cancelled.');
      } else {
        console.error('Error generating PDF:', err);
        alert('Failed to generate PDF. Please try again.');
      }
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
      setAbortController(null);
    }
  };

  const handleCancelGeneration = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleGenerateAll = async () => {
    if (students.length === 0) return;
    
    setIsGenerating(true);
    setGenerationProgress(null);
    
    const controller = new AbortController();
    setAbortController(controller);

    try {
      setPdfStudents(students);
      
      // Give React time to render the hidden template
      await new Promise(resolve => setTimeout(resolve, 600));
      
      await generateHallTicket(students, {
        signal: controller.signal,
        onProgress: (current, total) => {
          setGenerationProgress({ current, total });
        }
      });
      
      // Update generation status
      const now = new Date().toISOString();
      await db.transaction('rw', db.students, async () => {
        for (const student of students) {
          await db.students.update(student.id, {
            isGenerated: true,
            generatedAt: now
          });
        }
      });
      
      // Deselect all
      setSelectedIds(new Set());
    } catch (err) {
      if (err.message === 'Generation cancelled') {
        alert('PDF generation was cancelled.');
      } else {
        console.error('Error generating PDF:', err);
        alert('Failed to generate PDF. Please try again.');
      }
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
      setAbortController(null);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    
    await db.students.update(editingStudent.id, {
      name: editingStudent.name,
      classDivision: editingStudent.classDivision,
      date: editingStudent.date,
      time: editingStudent.time,
      venue: editingStudent.venue,
      school: editingStudent.school
    });
    setEditingStudent(null);
  };

  if (!students) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;

  return (
    <>
      <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>Student Roster</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              {students.length} Total Students
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={clearData}>
              <Trash2 size={16} /> Clear Data
            </button>
            <button 
              className="btn btn-secondary"
              disabled={students.length === 0 || isGenerating}
              onClick={handleGenerateAll}
              style={{ opacity: (students.length === 0 || isGenerating) ? 0.6 : 1 }}
            >
              <Printer size={16} /> 
              Generate All
            </button>
            <button 
              className={`btn ${selectedIds.size > 0 ? 'btn-primary' : 'btn-secondary'}`}
              disabled={selectedIds.size === 0 || isGenerating}
              onClick={handleGenerate}
              style={{ opacity: (selectedIds.size === 0 || isGenerating) ? 0.6 : 1 }}
            >
              {isGenerating ? (
                <>
                  <Clock size={16} /> 
                  Generating...
                </>
              ) : (
                <>
                  <Printer size={16} /> 
                  Generate {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    className="custom-checkbox"
                    checked={selectedIds.size === students.length && students.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th>Student Details</th>
                <th>Class/Division</th>
                <th>School</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No students found. Please import an excel file.
                  </td>
                </tr>
              ) : (
                students.map(student => (
                  <tr key={student.id} className={selectedIds.has(student.id) ? 'selected' : ''}>
                    <td>
                      <input 
                        type="checkbox" 
                        className="custom-checkbox"
                        checked={selectedIds.has(student.id)}
                        onChange={() => toggleSelection(student.id)}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{student.name}</div>
                    </td>
                    <td>{student.classDivision}</td>
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{student.school}</div>
                    </td>
                    <td>
                      {student.isGenerated ? (
                        <div>
                          <div className="badge badge-success" style={{ marginBottom: '4px' }}>
                            <Check size={12} style={{ marginRight: '4px' }} /> Generated
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {format(new Date(student.generatedAt), 'PP p')}
                          </div>
                        </div>
                      ) : (
                        <span className="badge badge-default">Pending</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setEditingStudent({...student})}
                        title="Edit Student"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '24px', borderRadius: '12px',
            width: '100%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Edit Student Details</h3>
              <button onClick={() => setEditingStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Name</label>
                <input 
                  type="text" 
                  value={editingStudent.name} 
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Class & Division</label>
                <input 
                  type="text" 
                  value={editingStudent.classDivision} 
                  onChange={e => setEditingStudent({...editingStudent, classDivision: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '12px', display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Date</label>
                  <input 
                    type="text" 
                    value={editingStudent.date} 
                    onChange={e => setEditingStudent({...editingStudent, date: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Time</label>
                  <input 
                    type="text" 
                    value={editingStudent.time} 
                    onChange={e => setEditingStudent({...editingStudent, time: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>School</label>
                <input 
                  type="text" 
                  value={editingStudent.school} 
                  onChange={e => setEditingStudent({...editingStudent, school: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Venue</label>
                <textarea 
                  value={editingStudent.venue} 
                  onChange={e => setEditingStudent({...editingStudent, venue: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', minHeight: '60px', fontFamily: 'inherit' }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingStudent(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {isGenerating && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '32px', borderRadius: '12px',
            width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', color: 'var(--primary)' }}>Generating Hall Tickets</h3>
            {generationProgress ? (
              <>
                <p style={{ fontSize: '16px', marginBottom: '8px', color: '#4a4a4a' }}>
                  Processing {generationProgress.current} of {generationProgress.total}...
                </p>
                <div style={{ width: '100%', backgroundColor: '#eef5ff', borderRadius: '4px', height: '10px', overflow: 'hidden', marginBottom: '24px' }}>
                   <div style={{ 
                      width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                      backgroundColor: 'var(--primary)',
                      height: '100%',
                      transition: 'width 0.3s ease'
                   }} />
                </div>
              </>
            ) : (
              <p style={{ fontSize: '16px', marginBottom: '24px', color: 'var(--text-muted)' }}>Preparing data...</p>
            )}
            <button 
              className="btn btn-secondary" 
              onClick={handleCancelGeneration}
              style={{ width: '100%', padding: '10px', fontWeight: '500' }}
            >
              Cancel Generation
            </button>
          </div>
        </div>
      )}
    </>
  );
};
