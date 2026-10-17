import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Trash2, Clock, Printer, Edit2, X, Plus } from 'lucide-react';
import { db } from '../db/database';
import { generateHallTicket } from '../utils/pdfGenerator';
import { generateWorkshopSlip } from '../utils/workshopPdfGenerator';
import { logGeneration } from '../utils/analytics';
import { format } from 'date-fns';

export const StudentTable = ({ mode, year, onBack }) => {
  const students = useLiveQuery(
    () => db.students.where('recordType').equals(mode).toArray(),
    [mode]
  );
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  // Examination slots configuration for Hall Tickets
  const [includeSlots, setIncludeSlots] = useState(() => {
    const saved = localStorage.getItem('qspace_include_slots');
    return saved !== null ? saved === 'true' : true;
  });

  const [examinationSlots, setExaminationSlots] = useState(() => {
    try {
      const saved = localStorage.getItem('qspace_exam_slots');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return ['9:00 AM', '11:30 AM', '2:30 PM'];
  });

  const updateSlots = (newSlots) => {
    setExaminationSlots(newSlots);
    localStorage.setItem('qspace_exam_slots', JSON.stringify(newSlots));
  };

  const handleToggleIncludeSlots = (val) => {
    setIncludeSlots(val);
    localStorage.setItem('qspace_include_slots', String(val));
  };

  const handleSlotChange = (index, value) => {
    const updated = [...examinationSlots];
    updated[index] = value;
    updateSlots(updated);
  };

  const handleAddSlot = () => {
    if (examinationSlots.length >= 6) return;
    updateSlots([...examinationSlots, '']);
  };

  const handleRemoveSlot = (index) => {
    const updated = examinationSlots.filter((_, idx) => idx !== index);
    updateSlots(updated);
  };

  const handleSetPreset3 = () => {
    updateSlots(['9:00 AM', '11:30 AM', '2:30 PM']);
  };

  const handleSetPreset4 = () => {
    updateSlots(['9:00 AM', '11:30 AM', '2:00 PM', '4:30 PM']);
  };

  const handleClearSlots = () => {
    updateSlots([]);
  };

  const activeValidSlots = includeSlots 
    ? examinationSlots.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
    : [];

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

      if (mode === 'workshop') {
        await generateWorkshopSlip(selectedStudents, {
          signal: controller.signal,
          year,
          onProgress: (current, total) => {
            setGenerationProgress({ current, total });
          }
        });
      } else {
        await generateHallTicket(selectedStudents, {
          signal: controller.signal,
          slots: activeValidSlots,
          onProgress: (current, total) => {
            setGenerationProgress({ current, total });
          }
        });
      }
      
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

      // Log analytics (fire-and-forget)
      logGeneration({ documentType: mode, studentCount: selectedStudents.length, year });
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

      if (mode === 'workshop') {
        await generateWorkshopSlip(students, {
          signal: controller.signal,
          year,
          onProgress: (current, total) => {
            setGenerationProgress({ current, total });
          }
        });
      } else {
        await generateHallTicket(students, {
          signal: controller.signal,
          slots: activeValidSlots,
          onProgress: (current, total) => {
            setGenerationProgress({ current, total });
          }
        });
      }
      
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

      // Log analytics (fire-and-forget)
      logGeneration({ documentType: mode, studentCount: students.length, year });
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

        {mode === 'hallTicket' && (
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', margin: 0, color: 'var(--text-main)' }}>
                    Examination Timeslots
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Configure timing options printed in the Important Instructions section of Hall Tickets.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>
                  <input 
                    type="checkbox" 
                    className="custom-checkbox"
                    checked={includeSlots}
                    onChange={(e) => handleToggleIncludeSlots(e.target.checked)}
                  />
                  Include Timeslots on Hall Tickets
                </label>
              </div>
            </div>

            {includeSlots ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginRight: '4px' }}>Presets:</span>
                    <button 
                      type="button" 
                      onClick={handleSetPreset3}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: examinationSlots.length === 3 ? 'var(--primary-light)' : '#f8fafc',
                        color: examinationSlots.length === 3 ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      3 Slots
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSetPreset4}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: examinationSlots.length === 4 ? 'var(--primary-light)' : '#f8fafc',
                        color: examinationSlots.length === 4 ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      4 Slots
                    </button>
                    <button 
                      type="button" 
                      onClick={handleAddSlot}
                      disabled={examinationSlots.length >= 6}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px dashed var(--primary)',
                        background: '#ffffff',
                        color: 'var(--primary)',
                        fontWeight: '600',
                        cursor: examinationSlots.length >= 6 ? 'not-allowed' : 'pointer',
                        opacity: examinationSlots.length >= 6 ? 0.5 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={14} /> Add Slot
                    </button>
                    <button 
                      type="button" 
                      onClick={handleClearSlots}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#ef4444',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Clear All
                    </button>
                  </div>

                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {activeValidSlots.length === 0 ? 'No active slots (will be skipped)' : `${activeValidSlots.length} active ${activeValidSlots.length === 1 ? 'slot' : 'slots'}`}
                  </span>
                </div>

                {/* Slot inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                  {examinationSlots.map((slot, index) => (
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>
                        Timeslot {index + 1}
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="text"
                          value={slot}
                          placeholder="e.g. 9:00 AM"
                          onChange={(e) => handleSlotChange(index, e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: 'var(--text-main)',
                            background: '#ffffff'
                          }}
                        />
                        <button
                          type="button"
                          title="Remove slot"
                          onClick={() => handleRemoveSlot(index)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #f1f5f9',
                            background: '#f8fafc',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Preview Box */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: activeValidSlots.length > 0 ? '#f0f7ff' : '#fffbeb',
                  border: `1px solid ${activeValidSlots.length > 0 ? '#bae0ff' : '#fde68a'}`,
                  fontSize: '12.5px',
                  color: activeValidSlots.length > 0 ? '#1e3a8a' : '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <strong style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {activeValidSlots.length > 0 ? 'Hall Ticket Preview:' : 'Note:'}
                  </strong>
                  {activeValidSlots.length > 0 ? (
                    <span>
                      The available examination slots are : {activeValidSlots.map((s, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span style={{ color: '#94a3b8', margin: '0 6px' }}>|</span>}
                          <strong style={{ color: 'var(--primary)' }}>{s}</strong>
                        </React.Fragment>
                      ))}
                    </span>
                  ) : (
                    <span>No values are entered. The entire examination slots and timing change request text will be skipped from printing.</span>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                fontSize: '12.5px',
                color: 'var(--text-muted)'
              }}>
                Timeslots are unchecked. Hall tickets will be printed without the examination slots and timing change request section.
              </div>
            )}
          </div>
        )}

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
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
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
                      <div style={{ fontSize: '13px' }}>{student.date || '-'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{student.time || '-'}</div>
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
