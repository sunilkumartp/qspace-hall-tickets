import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../db/supabase';
import { useAuth } from './AuthProvider';
import { validateAndInspectDocx } from '../utils/docxValidator';
import { extractGradeRulesFromText } from '../utils/docxRuleExtractor';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Download, 
  Check, 
  Clock, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const AdminSamplePapers = () => {
  const { user, isAdmin } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingGrade, setUploadingGrade] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [expandedGrade, setExpandedGrade] = useState(null);
  const [previewRuleDoc, setPreviewRuleDoc] = useState(null);

  // Fetch all sample documents across all grades
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const { data, error } = await supabase
        .from('sample_documents')
        .select('*')
        .order('grade', { ascending: true })
        .order('version', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to load sample documents:', err);
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle uploading a new sample document for a grade
  const handleUploadFile = async (e, grade) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingGrade(grade);
    setActionError(null);

    try {
      // 1. Validate file format, MIME, and package structure
      const inspection = await validateAndInspectDocx(file);
      if (!inspection.valid) {
        throw new Error(inspection.error);
      }

      // 2. Extract initial rules from document text
      const extractedRules = extractGradeRulesFromText(inspection.rawText, grade);

      // Determine next version number for this grade
      const gradeDocs = documents.filter(d => d.grade === grade);
      const nextVersion = gradeDocs.length > 0 ? Math.max(...gradeDocs.map(d => d.version)) + 1 : 1;

      // 3. Upload file to Supabase Storage private bucket
      const timestamp = Date.now();
      const storagePath = `grade-${grade}/v${nextVersion}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error: storageError } = await supabase.storage
        .from('grade-samples')
        .upload(storagePath, file, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false
        });

      if (storageError) {
        console.warn('Storage upload error:', storageError.message);
        // Fallback or continue if storage failed due to bucket permissions
      }

      // 4. Save metadata into sample_documents table
      const { data: newDoc, error: insertError } = await supabase
        .from('sample_documents')
        .insert({
          grade,
          version: nextVersion,
          original_filename: file.name,
          storage_path: storagePath,
          file_size_bytes: file.size,
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          status: 'awaiting_approval',
          extracted_rules: extractedRules,
          rule_version: nextVersion,
          uploader_id: user?.id || null,
          processing_errors: []
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Automatically open rules review for this newly uploaded document
      setPreviewRuleDoc(newDoc);
      await fetchDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
      setActionError(`Grade ${grade} Upload Error: ${err.message}`);
    } finally {
      setUploadingGrade(null);
      e.target.value = '';
    }
  };

  // Approve and activate a document version
  const handleApproveAndActivate = async (doc) => {
    try {
      setActionError(null);

      // Supersede any existing active version for this grade
      await supabase
        .from('sample_documents')
        .update({ status: 'superseded' })
        .eq('grade', doc.grade)
        .eq('status', 'active');

      // Set this version to active
      const { error } = await supabase
        .from('sample_documents')
        .update({
          status: 'active',
          approved_by: user?.id || null,
          approved_at: new Date().toISOString()
        })
        .eq('id', doc.id);

      if (error) throw error;

      setPreviewRuleDoc(null);
      await fetchDocuments();
    } catch (err) {
      setActionError(`Activation failed: ${err.message}`);
    }
  };

  // Re-process / re-extract rules from an existing document
  const handleReprocess = async (doc) => {
    try {
      setActionError(null);
      // Download from storage
      const { data: blob, error: downloadError } = await supabase.storage
        .from('grade-samples')
        .download(doc.storage_path);

      if (downloadError) throw downloadError;

      const inspection = await validateAndInspectDocx(blob);
      if (!inspection.valid) throw new Error(inspection.error);

      const rules = extractGradeRulesFromText(inspection.rawText, doc.grade);

      const { error } = await supabase
        .from('sample_documents')
        .update({
          extracted_rules: rules,
          status: doc.status === 'active' ? 'active' : 'awaiting_approval'
        })
        .eq('id', doc.id);

      if (error) throw error;
      await fetchDocuments();
    } catch (err) {
      setActionError(`Reprocessing failed: ${err.message}`);
    }
  };

  // Securely download / view document via signed URL
  const handleDownloadDoc = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('grade-samples')
        .createSignedUrl(doc.storage_path, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      setActionError(`Could not generate secure download URL: ${err.message}`);
    }
  };

  // Delete document version
  const handleDeleteDoc = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete Grade ${doc.grade} sample document (${doc.original_filename} v${doc.version})? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionError(null);
      // Delete from storage
      await supabase.storage
        .from('grade-samples')
        .remove([doc.storage_path]);

      // Delete from table
      const { error } = await supabase
        .from('sample_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
      await fetchDocuments();
    } catch (err) {
      setActionError(`Delete failed: ${err.message}`);
    }
  };

  // Compute status summary for Grades 1 to 8
  const gradeStatuses = [1, 2, 3, 4, 5, 6, 7, 8].map(grade => {
    const docs = documents.filter(d => d.grade === grade);
    const activeDoc = docs.find(d => d.status === 'active');
    const pendingDoc = docs.find(d => d.status === 'awaiting_approval' || d.status === 'processing');
    return {
      grade,
      activeDoc,
      pendingDoc,
      allDocs: docs,
      isConfigured: !!activeDoc
    };
  });

  const allConfigured = gradeStatuses.every(g => g.isConfigured);
  const missingGrades = gradeStatuses.filter(g => !g.isConfigured).map(g => g.grade);

  return (
    <div style={{ marginTop: '40px' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="#3b82f6" />
            Abacus Grade Sample Papers (Grades 1 – 8)
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
            Authoritative reference documents. An active, approved sample is required for every grade before generation is enabled.
          </p>
        </div>

        <button
          onClick={fetchDocuments}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155',
            background: '#1e293b', color: '#94a3b8', cursor: 'pointer', fontSize: '12px'
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Refresh Samples
        </button>
      </div>

      {/* Global Readiness Alert */}
      <div style={{
        padding: '14px 18px',
        borderRadius: '10px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: allConfigured ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        border: `1px solid ${allConfigured ? '#10b981' : '#f59e0b'}`
      }}>
        {allConfigured ? (
          <>
            <CheckCircle size={22} color="#10b981" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: '600', color: '#10b981', fontSize: '14px' }}>
                All 8 Grade Sample Papers Active & Approved
              </div>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                The Abacus Question Paper Generator is fully unlocked and ready for all grades.
              </div>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle size={22} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: '600', color: '#f59e0b', fontSize: '14px' }}>
                Question Paper Generation Is Currently Disabled Globally
              </div>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                Missing active approved samples for Grade(s): <strong>{missingGrades.join(', ')}</strong>. Upload and approve G1.docx–G8.docx to enable paper generation.
              </div>
            </div>
          </>
        )}
      </div>

      {actionError && (
        <div style={{ padding: '12px 16px', background: '#7f1d1d', borderRadius: '8px', marginBottom: '20px', color: '#fca5a5', fontSize: '13px' }}>
          {actionError}
        </div>
      )}

      {/* 8 Grade Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {gradeStatuses.map(({ grade, activeDoc, pendingDoc, allDocs, isConfigured }) => {
          const isExpanded = expandedGrade === grade;

          return (
            <div
              key={grade}
              style={{
                background: '#1e293b',
                borderRadius: '12px',
                border: `1px solid ${isConfigured ? '#334155' : '#854d0e'}`,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>
                      Class / Grade {grade}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Required file: G{grade}.docx
                    </div>
                  </div>

                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: '600',
                    background: isConfigured ? '#064e3b' : '#78350f',
                    color: isConfigured ? '#6ee7b7' : '#fcd34d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {isConfigured ? <Check size={11} /> : <AlertTriangle size={11} />}
                    {isConfigured ? 'Active' : 'Missing'}
                  </span>
                </div>

                {/* Active Document Details */}
                {activeDoc ? (
                  <div style={{ background: '#0f172a', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '12px', color: '#93c5fd', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={13} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeDoc.original_filename}
                      </span>
                      <span style={{ color: '#64748b' }}>v{activeDoc.version}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      {(activeDoc.file_size_bytes / 1024).toFixed(1)} KB &bull; Approved
                    </div>
                    {activeDoc.extracted_rules?.rules_summary && (
                      <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px', fontStyle: 'italic' }}>
                        {activeDoc.extracted_rules.rules_summary}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '12px', background: '#291b00', borderRadius: '8px', marginBottom: '12px', border: '1px dashed #ca8a04', color: '#fde047', fontSize: '12px', textAlign: 'center' }}>
                    No approved sample active
                  </div>
                )}

                {/* Pending Approval Notice */}
                {pendingDoc && (
                  <div style={{ padding: '8px 10px', background: '#172554', borderRadius: '6px', marginBottom: '12px', border: '1px solid #1e40af', fontSize: '11px', color: '#93c5fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Pending Approval: v{pendingDoc.version}</span>
                    <button
                      onClick={() => setPreviewRuleDoc(pendingDoc)}
                      style={{ background: '#2563eb', border: 'none', color: 'white', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: '600' }}
                    >
                      Review
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {/* Upload / Replace Button */}
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px',
                      borderRadius: '6px',
                      background: '#2563eb',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: uploadingGrade === grade ? 'not-allowed' : 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <Upload size={13} />
                    {uploadingGrade === grade ? 'Uploading...' : activeDoc ? 'Replace' : 'Upload DOCX'}
                    <input
                      type="file"
                      accept=".docx"
                      style={{ display: 'none' }}
                      disabled={uploadingGrade === grade}
                      onChange={(e) => handleUploadFile(e, grade)}
                    />
                  </label>

                  {/* View Active Rules Button */}
                  {activeDoc && (
                    <button
                      onClick={() => setPreviewRuleDoc(activeDoc)}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        background: '#334155',
                        border: 'none',
                        color: '#cbd5e1',
                        cursor: 'pointer'
                      }}
                      title="Review Extracted Rules"
                    >
                      <Eye size={14} />
                    </button>
                  )}

                  {/* Download Doc Button */}
                  {activeDoc && (
                    <button
                      onClick={() => handleDownloadDoc(activeDoc)}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        background: '#334155',
                        border: 'none',
                        color: '#cbd5e1',
                        cursor: 'pointer'
                      }}
                      title="Download DOCX"
                    >
                      <Download size={14} />
                    </button>
                  )}
                </div>

                {/* Versions toggle */}
                {allDocs.length > 1 && (
                  <button
                    onClick={() => setExpandedGrade(isExpanded ? null : grade)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      marginTop: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    {allDocs.length} versions {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}

                {/* Version History Drawer */}
                {isExpanded && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {allDocs.map(doc => (
                      <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '4px 6px', background: '#0f172a', borderRadius: '4px' }}>
                        <span style={{ color: doc.status === 'active' ? '#10b981' : '#94a3b8' }}>
                          v{doc.version} ({doc.status})
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => setPreviewRuleDoc(doc)}
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
                            title="View Rules"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc)}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                            title="Delete Version"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules Review & Approval Modal */}
      {previewRuleDoc && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            border: '1px solid #334155',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>
                  Grade {previewRuleDoc.grade} Sample Rules Review (v{previewRuleDoc.version})
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {previewRuleDoc.original_filename} &bull; Status: {previewRuleDoc.status}
                </div>
              </div>
              <button
                onClick={() => setPreviewRuleDoc(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, fontSize: '13px', color: '#cbd5e1' }}>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ color: '#93c5fd', fontSize: '14px', marginBottom: '6px' }}>Summary</h4>
                <p style={{ background: '#0f172a', padding: '10px 12px', borderRadius: '6px', border: '1px solid #334155', margin: 0 }}>
                  {previewRuleDoc.extracted_rules?.rules_summary || 'No summary generated.'}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ color: '#93c5fd', fontSize: '14px', marginBottom: '6px' }}>Detected Constraints</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                    <strong>Operations:</strong> {previewRuleDoc.extracted_rules?.operations_allowed?.join(', ') || 'None'}
                  </div>
                  <div style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                    <strong>Operand Range:</strong> {previewRuleDoc.extracted_rules?.operand_range?.min} to {previewRuleDoc.extracted_rules?.operand_range?.max}
                  </div>
                  <div style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                    <strong>Integers Only:</strong> {previewRuleDoc.extracted_rules?.integer_math_only ? 'Yes' : 'No'}
                  </div>
                  <div style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                    <strong>Non-Negative:</strong> {previewRuleDoc.extracted_rules?.non_negative_only ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ color: '#93c5fd', fontSize: '14px', marginBottom: '6px' }}>
                  Question Templates ({previewRuleDoc.extracted_rules?.templates?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {previewRuleDoc.extracted_rules?.templates?.map((tmpl, idx) => (
                    <div key={idx} style={{ background: '#0f172a', padding: '10px 12px', borderRadius: '6px', border: '1px solid #334155' }}>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>{tmpl.name}</div>
                      <div style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '12px', margin: '4px 0' }}>Pattern: {tmpl.pattern}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Answer range: {tmpl.answer_range?.min} to {tmpl.answer_range?.max} &bull; Distribution weight: {(tmpl.weight * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => handleReprocess(previewRuleDoc)}
                style={{
                  background: '#334155', border: 'none', color: '#cbd5e1',
                  padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                }}
              >
                Reprocess Rules
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setPreviewRuleDoc(null)}
                  style={{
                    background: 'transparent', border: '1px solid #475569', color: '#cbd5e1',
                    padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  Close
                </button>

                {previewRuleDoc.status !== 'active' && (
                  <button
                    onClick={() => handleApproveAndActivate(previewRuleDoc)}
                    style={{
                      background: '#10b981', border: 'none', color: 'white',
                      padding: '8px 20px', borderRadius: '6px', cursor: 'pointer',
                      fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Check size={16} />
                    Approve & Activate for Grade {previewRuleDoc.grade}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
