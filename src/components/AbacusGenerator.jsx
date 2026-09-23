import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../db/supabase';
import { useAuth } from './AuthProvider';
import { GoogleSignIn } from './GoogleSignIn';
import { AccessRestricted } from './AccessRestricted';
import { NavBar } from './NavBar';
import { AbacusReview } from './AbacusReview';
import { generateQuestionPaperQuestions } from '../utils/questionEngine';
import { 
  FileText, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck, 
  ExternalLink, 
  LogOut, 
  Download, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

export const AbacusGenerator = () => {
  const { user, session, isAdmin, isAllowed, signOut, loading: authLoading } = useAuth();

  // Generator form state
  const [grade, setGrade] = useState(1);
  const [setNumber, setSetNumber] = useState(1);
  const [questionCount, setQuestionCount] = useState(100);
  const [title, setTitle] = useState('Brain wave context:Round 3 Practice Questions Class 1 - QP1');
  const [paperCode, setPaperCode] = useState('C1QP1');
  const [includeBodmas, setIncludeBodmas] = useState(false);
  const [bodmasPercentage, setBodmasPercentage] = useState(30);

  // Sample papers and readiness state
  const [activeSamples, setActiveSamples] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(true);
  const [sampleError, setSampleError] = useState(null);

  // Review mode state
  const [generatedPaper, setGeneratedPaper] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState(null);

  // Synchronize title and paperCode when grade or setNumber change
  const handleGradeChange = (newGrade) => {
    setGrade(newGrade);
    setTitle(`Brain wave context:Round 3 Practice Questions Class ${newGrade} - QP${setNumber}`);
    setPaperCode(`C${newGrade}QP${setNumber}`);
  };

  const handleSetNumberChange = (newSet) => {
    const val = parseInt(newSet, 10) || 1;
    setSetNumber(val);
    setTitle(`Brain wave context:Round 3 Practice Questions Class ${grade} - QP${val}`);
    setPaperCode(`C${grade}QP${val}`);
  };

  // Fetch active sample papers for all grades 1-8
  const fetchActiveSamples = useCallback(async () => {
    setLoadingSamples(true);
    setSampleError(null);
    try {
      const { data, error } = await supabase
        .from('sample_documents')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      setActiveSamples(data || []);
    } catch (err) {
      console.error('Failed to load active sample papers:', err);
      setSampleError(err.message);
    } finally {
      setLoadingSamples(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchActiveSamples();
    }
  }, [user, fetchActiveSamples]);

  // Determine readiness: Must have active approved sample for all 8 grades
  const configuredGrades = new Set(activeSamples.map(s => s.grade));
  const missingGrades = [1, 2, 3, 4, 5, 6, 7, 8].filter(g => !configuredGrades.has(g));
  const allGradesReady = missingGrades.length === 0;

  // Selected grade active sample
  const selectedGradeSample = activeSamples.find(s => s.grade === grade);

  // Handle generating question paper
  const handleGenerate = () => {
    setValidationError(null);

    // Form validations
    if (!title || !title.trim()) {
      setValidationError('Question paper title is mandatory.');
      return;
    }

    if (!setNumber || setNumber < 1) {
      setValidationError('Set number must be a positive integer.');
      return;
    }

    if (!questionCount || questionCount < 1 || questionCount > 500) {
      setValidationError('Total questions must be a positive number between 1 and 500.');
      return;
    }

    if (!paperCode || !paperCode.trim()) {
      setValidationError('Question paper code is mandatory.');
      return;
    }

    if (!allGradesReady) {
      setValidationError('Question paper generation is disabled globally because not all 8 grade samples are active.');
      return;
    }

    if (!selectedGradeSample || !selectedGradeSample.extracted_rules) {
      setValidationError(`Active approved sample rules not found for Grade ${grade}.`);
      return;
    }

    setIsGenerating(true);

    try {
      const questions = generateQuestionPaperQuestions({
        grade,
        count: questionCount,
        rulesConfig: selectedGradeSample.extracted_rules,
        sampleMeta: selectedGradeSample,
        includeBodmas,
        bodmasPercentage: includeBodmas ? bodmasPercentage : 0
      });

      setGeneratedPaper({
        title,
        grade,
        setNumber,
        paperCode,
        questionCount,
        includeBodmas,
        bodmasPercentage: includeBodmas ? bodmasPercentage : 0,
        questions,
        sampleMeta: selectedGradeSample
      });
    } catch (err) {
      setValidationError(`Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate single question from review page
  const handleRegenerateSingleQuestion = (index) => {
    if (!generatedPaper || !selectedGradeSample) return;

    try {
      const singleQ = generateQuestionPaperQuestions({
        grade,
        count: 1,
        rulesConfig: selectedGradeSample.extracted_rules,
        sampleMeta: selectedGradeSample,
        includeBodmas: generatedPaper.includeBodmas,
        bodmasPercentage: generatedPaper.bodmasPercentage
      })[0];

      const updatedQuestions = [...generatedPaper.questions];
      updatedQuestions[index] = {
        ...singleQ,
        questionNumber: index + 1
      };

      setGeneratedPaper({
        ...generatedPaper,
        questions: updatedQuestions
      });
    } catch (err) {
      alert(`Could not regenerate question: ${err.message}`);
    }
  };

  // Secure download/preview of sample document
  const handleViewSampleDoc = async () => {
    if (!selectedGradeSample?.storage_path) return;
    try {
      const { data, error } = await supabase.storage
        .from('grade-samples')
        .createSignedUrl(selectedGradeSample.storage_path, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      alert(`Could not open sample document: ${err.message}`);
    }
  };

  // 1. Loading state
  if (authLoading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Checking authentication...</p>
      </div>
    );
  }

  // 2. Unauthenticated: Google Sign-in screen required immediately
  if (!user) {
    return (
      <GoogleSignIn 
        returnTo="/abacus" 
        title="QSpace Abacus Generator" 
        subtitle="Sign in with your Google account to access, generate, review, and export abacus practice question papers."
      />
    );
  }

  // 3. Authenticated but unauthorized
  if (!isAllowed) {
    return <AccessRestricted />;
  }

  // 4. Review Mode View
  if (generatedPaper) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <NavBar currentPath="/abacus" />
        <div style={{ padding: '24px 20px 60px' }}>
          <AbacusReview
            paperData={generatedPaper}
            onBack={() => setGeneratedPaper(null)}
            onRegenerateSingle={handleRegenerateSingleQuestion}
          />
        </div>
      </div>
    );
  }

  // 5. Generator Form View
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <NavBar currentPath="/abacus" />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px 60px' }}>
      {/* Authenticated User Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderRadius: '12px',
        background: 'white',
        border: '1px solid var(--border-color)',
        marginBottom: '28px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata?.full_name || 'User'}
              style={{ width: '40px', height: '40px', borderRadius: '50%' }}
            />
          ) : (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700'
            }}>
              {(user.email || 'U')[0].toUpperCase()}
            </div>
          )}

          <div>
            <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>
              {user.user_metadata?.full_name || user.email}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {user.email} {isAdmin && <span style={{ color: '#2563eb', fontWeight: '600' }}>&bull; Admin</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && (
            <a
              href="/admin"
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Admin Setup
            </a>
          )}
          <button
            className="btn btn-secondary"
            onClick={signOut}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Global Readiness Check Notification */}
      {loadingSamples ? (
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Verifying active Grade 1–8 sample papers...</p>
        </div>
      ) : !allGradesReady ? (
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          background: '#fffbeb',
          border: '1px solid #f59e0b',
          marginBottom: '28px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#92400e', margin: 0 }}>
                Question Paper Generation Is Currently Disabled
              </h3>
              <p style={{ fontSize: '13px', color: '#b45309', margin: '6px 0 12px 0', lineHeight: 1.5 }}>
                An active, successfully processed, and approved sample DOCX must exist for <strong>every Grade 1 through 8</strong> before any question paper can be generated.
              </p>
              
              <div style={{ fontSize: '13px', color: '#78350f', background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a', marginBottom: '12px' }}>
                <strong>Missing / Unapproved Grades:</strong> Class {missingGrades.join(', Class ')}
              </div>

              {isAdmin ? (
                <a
                  href="/admin"
                  className="btn btn-primary"
                  style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  Go to Admin Page to Complete Sample Setup &rarr;
                </a>
              ) : (
                <p style={{ fontSize: '12px', color: '#b45309', margin: 0, fontStyle: 'italic' }}>
                  Please contact a system administrator to upload and approve the required Grade Sample Papers.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '14px 18px',
          borderRadius: '10px',
          background: '#f0fdf4',
          border: '1px solid #86efac',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle size={18} color="#16a34a" />
          <span style={{ fontSize: '13px', color: '#166534', fontWeight: '500' }}>
            All 8 Grade Sample Papers are active and verified. You may generate question papers freely.
          </span>
        </div>
      )}

      {/* Generator Form */}
      <div className="glass-panel animate-fade-in" style={{ padding: '32px', opacity: allGradesReady ? 1 : 0.6 }}>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
          Generate Abacus Practice Paper
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
          Create mathematically verified abacus practice papers conforming strictly to the active sample paper rules.
        </p>

        {validationError && (
          <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', marginBottom: '20px', color: '#b91c1c', fontSize: '13px' }}>
            {validationError}
          </div>
        )}

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Class / Grade Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>
              Select Class / Grade (1 – 8)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleGradeChange(g)}
                  disabled={!allGradesReady}
                  style={{
                    padding: '10px 0',
                    borderRadius: '8px',
                    border: grade === g ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: grade === g ? 'var(--primary)' : 'white',
                    color: grade === g ? 'white' : 'var(--text-main)',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: allGradesReady ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Class {g}
                </button>
              ))}
            </div>
          </div>

          {/* Active Sample Reference Info Box */}
          {selectedGradeSample && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Authoritative Reference Document:
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="var(--primary)" />
                  {selectedGradeSample.original_filename} (Version {selectedGradeSample.version})
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                  {selectedGradeSample.extracted_rules?.rules_summary}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleViewSampleDoc}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <ExternalLink size={13} /> View Sample Paper
              </button>
            </div>
          )}

          {/* Title input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>
              Question Paper Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              disabled={!allGradesReady}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px' }}
            />
          </div>

          {/* Set Number & Questions Count Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>
                Set Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                value={setNumber}
                disabled={!allGradesReady}
                onChange={(e) => handleSetNumberChange(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>
                Total Questions Required
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={questionCount}
                disabled={!allGradesReady}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 100)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-main)' }}>
                Paper Code (Editable)
              </label>
              <input
                type="text"
                value={paperCode}
                disabled={!allGradesReady}
                onChange={(e) => setPaperCode(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* BODMAS Checkbox Option */}
          <div
            style={{
              background: includeBodmas ? '#eff6ff' : '#f8fafc',
              border: includeBodmas ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: allGradesReady ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease'
            }}
            onClick={(e) => {
              if (e.target.tagName !== 'INPUT' && allGradesReady) {
                setIncludeBodmas(!includeBodmas);
              }
            }}
          >
            <input
              type="checkbox"
              id="includeBodmas"
              checked={includeBodmas}
              disabled={!allGradesReady}
              onChange={(e) => setIncludeBodmas(e.target.checked)}
              style={{
                marginTop: '3px',
                width: '18px',
                height: '18px',
                cursor: allGradesReady ? 'pointer' : 'not-allowed',
                accentColor: 'var(--primary)'
              }}
            />
            <div>
              <label
                htmlFor="includeBodmas"
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-main)',
                  cursor: allGradesReady ? 'pointer' : 'not-allowed',
                  display: 'block'
                }}
              >
                Apply BODMAS Rules (Brackets &amp; Operator Precedence)
              </label>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                Randomly applies brackets and order-of-precedence operations (e.g. <code>(A + B) × C</code>, <code>A + (B × C)</code>, <code>(A + B) ÷ C</code>) to mathematical equations in the question paper.
              </p>

              {/* Percentage Controls (visible when BODMAS is enabled) */}
              {includeBodmas && (
                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '12px',
                    borderTop: '1px solid #dbeafe',
                    cursor: 'default'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label htmlFor="bodmasPercentage" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                      Percentage of Questions with Brackets:
                    </label>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)' }}>
                      {bodmasPercentage}% (~{Math.round((questionCount * bodmasPercentage) / 100)} of {questionCount} questions)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      id="bodmasPercentage"
                      value={bodmasPercentage}
                      disabled={!allGradesReady}
                      onChange={(e) => setBodmasPercentage(parseInt(e.target.value, 10))}
                      style={{ flex: 1, accentColor: 'var(--primary)', cursor: allGradesReady ? 'pointer' : 'not-allowed' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={bodmasPercentage}
                        disabled={!allGradesReady}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 0));
                          setBodmasPercentage(val);
                        }}
                        style={{
                          width: '56px',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '13px',
                          textAlign: 'center'
                        }}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>%</span>
                    </div>
                  </div>

                  {/* Quick percentage presets */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '2px' }}>Presets:</span>
                    {[10, 20, 30, 40, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setBodmasPercentage(pct)}
                        disabled={!allGradesReady}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: bodmasPercentage === pct ? '700' : '500',
                          borderRadius: '6px',
                          border: bodmasPercentage === pct ? '1px solid var(--primary)' : '1px solid #cbd5e1',
                          background: bodmasPercentage === pct ? 'var(--primary)' : '#ffffff',
                          color: bodmasPercentage === pct ? '#ffffff' : '#475569',
                          cursor: allGradesReady ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generate Action Button */}
          <div style={{ marginTop: '12px' }}>
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={!allGradesReady || isGenerating}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {isGenerating ? (
                <>Generating {questionCount} Verified Questions...</>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate {questionCount} Practice Questions for Class {grade}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
