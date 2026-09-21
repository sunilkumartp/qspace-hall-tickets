import React, { useState } from 'react';
import { supabase } from '../db/supabase';
import { useAuth } from './AuthProvider';
import { exportQuestionPaperToDocx } from '../utils/docxExporter';
import { exportQuestionPaperToCsv } from '../utils/csvExporter';
import { createGoogleQuizForm } from '../utils/googleFormsApi';
import { 
  ArrowLeft, 
  Download, 
  Save, 
  ExternalLink, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Edit2
} from 'lucide-react';

export const AbacusReview = ({
  paperData,
  onBack,
  onRegenerateSingle
}) => {
  const { user, session } = useAuth();

  const [title, setTitle] = useState(paperData.title);
  const [grade, setGrade] = useState(paperData.grade);
  const [setNumber, setSetNumber] = useState(paperData.setNumber);
  const [paperCode, setPaperCode] = useState(paperData.paperCode);
  const [questions, setQuestions] = useState([...paperData.questions]);

  const [showAnswers, setShowAnswers] = useState(true);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [googleFormResult, setGoogleFormResult] = useState(null);
  const [formError, setFormError] = useState(null);

  // Validation checks
  const getValidationIssues = () => {
    const issues = [];
    const seenTexts = new Set();

    questions.forEach((q, idx) => {
      // Duplicate text check
      if (seenTexts.has(q.questionText)) {
        issues.push(`Q${idx + 1} appears to be a duplicate of an earlier question.`);
      }
      seenTexts.add(q.questionText);

      // Options uniqueness check
      const opts = [q.optionA, q.optionB, q.optionC, q.optionD].map(o => String(o).trim());
      const uniqueOpts = new Set(opts);
      if (uniqueOpts.size < 4) {
        issues.push(`Q${idx + 1} has duplicate answer options.`);
      }

      // Check if correct answer matches one of the options
      if (!opts.includes(String(q.correctAnswer).trim())) {
        issues.push(`Q${idx + 1} correct answer does not match any of the four options.`);
      }
    });

    return issues;
  };

  const validationIssues = getValidationIssues();

  // Delete a question
  const handleDeleteQuestion = (index) => {
    if (questions.length <= 1) {
      alert('A question paper must contain at least one question.');
      return;
    }
    const updated = questions.filter((_, i) => i !== index).map((q, i) => ({
      ...q,
      questionNumber: i + 1
    }));
    setQuestions(updated);
  };

  // Add an empty manual question
  const handleAddManualQuestion = () => {
    const newQ = {
      questionNumber: questions.length + 1,
      questionText: '10 + 10 = ?',
      optionA: '18',
      optionB: '20',
      optionC: '22',
      optionD: '24',
      correctAnswer: '20',
      correctOption: 'B',
      difficultyMetadata: { manual: true, grade },
      sourceTemplate: 'Manual Entry',
      sourcePattern: 'Custom'
    };
    setQuestions([...questions, newQ]);
    setEditingQuestionIndex(questions.length);
  };

  // Update a single question in place
  const handleUpdateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  // Export DOCX
  const handleExportDocx = async () => {
    try {
      await exportQuestionPaperToDocx({
        title,
        paperCode,
        grade,
        setNumber,
        questions
      });
    } catch (err) {
      alert(`DOCX Export failed: ${err.message}`);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    try {
      exportQuestionPaperToCsv({
        title,
        paperCode,
        grade,
        setNumber,
        questions
      });
    } catch (err) {
      alert(`CSV Export failed: ${err.message}`);
    }
  };

  // Save to Supabase
  const handleSaveToDatabase = async () => {
    if (!user) {
      setSaveError('You must be signed in to save question papers.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      // 1. Check for existing paper with same grade, set, and code by this user
      const { data: existing, error: checkError } = await supabase
        .from('question_papers')
        .select('id')
        .eq('creator_id', user.id)
        .eq('grade', grade)
        .eq('set_number', setNumber)
        .eq('paper_code', paperCode)
        .maybeSingle();

      if (checkError) throw checkError;

      let paperId;

      if (existing) {
        const confirmOverwrite = window.confirm(
          `A question paper with code "${paperCode}" (Set ${setNumber}, Grade ${grade}) already exists in your account. Overwrite with this revision?`
        );
        if (!confirmOverwrite) {
          setIsSaving(false);
          return;
        }

        // Update existing paper
        paperId = existing.id;
        const { error: updateError } = await supabase
          .from('question_papers')
          .update({
            title,
            question_count: questions.length,
            sample_document_id: paperData.sampleMeta?.id || null,
            sample_doc_version: paperData.sampleMeta?.version || null,
            rule_version: paperData.sampleMeta?.rule_version || null,
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', paperId);

        if (updateError) throw updateError;

        // Delete old questions before re-inserting
        await supabase.from('questions').delete().eq('paper_id', paperId);
      } else {
        // Insert new paper
        const { data: newPaper, error: insertError } = await supabase
          .from('question_papers')
          .insert({
            creator_id: user.id,
            title,
            grade,
            set_number: setNumber,
            paper_code: paperCode,
            question_count: questions.length,
            sample_document_id: paperData.sampleMeta?.id || null,
            sample_doc_version: paperData.sampleMeta?.version || null,
            rule_version: paperData.sampleMeta?.rule_version || null,
            status: 'confirmed'
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        paperId = newPaper.id;
      }

      // 2. Insert questions
      const questionRows = questions.map((q, idx) => ({
        paper_id: paperId,
        question_number: idx + 1,
        question_text: q.questionText,
        option_a: q.optionA,
        option_b: q.optionB,
        option_c: q.optionC,
        option_d: q.optionD,
        correct_answer: q.correctAnswer,
        correct_option: q.correctOption,
        difficulty_metadata: q.difficultyMetadata || {},
        source_template: q.sourceTemplate || '',
        source_pattern: q.sourcePattern || ''
      }));

      const { error: qError } = await supabase.from('questions').insert(questionRows);
      if (qError) throw qError;

      setSaveSuccess(`Paper "${paperCode}" successfully saved with ${questions.length} questions.`);
    } catch (err) {
      console.error('Save error:', err);
      setSaveError(err.message || 'Failed to save question paper.');
    } finally {
      setIsSaving(false);
    }
  };

  // Publish to Google Forms
  const handleCreateGoogleForm = async () => {
    const providerToken = session?.provider_token;
    if (!providerToken) {
      setFormError('Google authorization token not detected in current session. Please sign out and sign in with Google to grant Forms permissions.');
      return;
    }

    setIsCreatingForm(true);
    setFormError(null);
    setGoogleFormResult(null);

    try {
      const result = await createGoogleQuizForm({
        accessToken: providerToken,
        title,
        paperCode,
        grade,
        setNumber,
        questions
      });

      setGoogleFormResult(result);

      // Save Form URL to question paper if saved
      if (user) {
        await supabase
          .from('question_papers')
          .update({
            google_form_id: result.formId,
            google_form_url: result.formEditUrl,
            status: 'published'
          })
          .eq('creator_id', user.id)
          .eq('paper_code', paperCode);
      }
    } catch (err) {
      console.error('Google Forms creation error:', err);
      setFormError(err.message || 'Failed to create Google Form.');
    } finally {
      setIsCreatingForm(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Bar with Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Generator
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowAnswers(!showAnswers)}
            title={showAnswers ? 'Hide Answers (Student Preview)' : 'Show Answers (Teacher Mode)'}
          >
            {showAnswers ? <EyeOff size={16} /> : <Eye size={16} />}
            {showAnswers ? 'Hide Answers' : 'Show Answers'}
          </button>

          <button className="btn btn-secondary" onClick={handleExportDocx}>
            <FileText size={16} /> Export DOCX
          </button>

          <button className="btn btn-secondary" onClick={handleExportCsv}>
            <FileSpreadsheet size={16} /> Export CSV
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSaveToDatabase}
            disabled={isSaving}
          >
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Paper'}
          </button>
        </div>
      </div>

      {/* Validation Warnings Panel */}
      {validationIssues.length > 0 && (
        <div style={{
          padding: '14px 18px',
          background: '#fffbeb',
          border: '1px solid #f59e0b',
          borderRadius: '10px',
          marginBottom: '20px',
          color: '#92400e',
          fontSize: '13px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={16} color="#d97706" />
            Validation Notices ({validationIssues.length})
          </div>
          <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
            {validationIssues.slice(0, 4).map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {saveSuccess && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #10b981', borderRadius: '8px', marginBottom: '20px', color: '#166534', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', marginBottom: '20px', color: '#b91c1c', fontSize: '13px' }}>
          {saveError}
        </div>
      )}

      {/* Google Forms Action Banner */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
            Publish as Google Form Quiz
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Automatically creates a Google Form with all {questions.length} questions, options, and configured answer keys.
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={handleCreateGoogleForm}
          disabled={isCreatingForm}
        >
          <ExternalLink size={16} />
          {isCreatingForm ? 'Creating Google Form...' : 'Create Google Form'}
        </button>
      </div>

      {googleFormResult && (
        <div style={{ padding: '16px 20px', background: '#e0f2fe', border: '1px solid #0284c7', borderRadius: '10px', marginBottom: '24px', color: '#0369a1', fontSize: '13px' }}>
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
            Google Form Created Successfully!
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <a
              href={googleFormResult.formEditUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0284c7', fontWeight: '600', textDecoration: 'underline' }}
            >
              Open Form Editor &rarr;
            </a>
            <a
              href={googleFormResult.formResponderUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0284c7', fontWeight: '600', textDecoration: 'underline' }}
            >
              View Student Link &rarr;
            </a>
          </div>
        </div>
      )}

      {formError && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', marginBottom: '24px', color: '#b91c1c', fontSize: '13px' }}>
          {formError}
        </div>
      )}

      {/* Header Info Card / Editable Details */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Paper Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Paper Code
            </label>
            <input
              type="text"
              value={paperCode}
              onChange={(e) => setPaperCode(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Class / Grade
            </label>
            <input
              type="text"
              value={`Class ${grade}`}
              disabled
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#f8fafc', color: '#64748b', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Set Number
            </label>
            <input
              type="number"
              min="1"
              value={setNumber}
              onChange={(e) => setSetNumber(parseInt(e.target.value, 10) || 1)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '14px' }}
            />
          </div>
        </div>
      </div>

      {/* Questions Roster Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
          Generated Questions ({questions.length})
        </h3>

        <button className="btn btn-secondary" onClick={handleAddManualQuestion}>
          <Plus size={15} /> Add Custom Question
        </button>
      </div>

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {questions.map((q, index) => {
          const isEditing = editingQuestionIndex === index;

          return (
            <div
              key={index}
              className="glass-panel"
              style={{
                padding: '18px 20px',
                background: 'white',
                border: isEditing ? '2px solid var(--primary)' : '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 8px',
                    height: '28px',
                    borderRadius: '6px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    fontWeight: '700',
                    fontSize: '13px'
                  }}>
                    Q{index + 1})
                  </span>

                  {isEditing ? (
                    <input
                      type="text"
                      value={q.questionText}
                      onChange={(e) => handleUpdateQuestion(index, 'questionText', e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--primary)', fontSize: '16px', fontWeight: '600', width: '280px' }}
                    />
                  ) : (
                    <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>
                      {q.questionText}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setEditingQuestionIndex(isEditing ? null : index)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                    title={isEditing ? 'Done Editing' : 'Edit Question'}
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={() => onRegenerateSingle(index)}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}
                    title="Regenerate this question with active rules"
                  >
                    <RefreshCw size={16} />
                  </button>

                  <button
                    onClick={() => handleDeleteQuestion(index)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    title="Delete Question"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Options Grid: four separate option values without alphabetic prefixes or labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                {['A', 'B', 'C', 'D'].map(optKey => {
                  const fieldName = `option${optKey}`;
                  const optVal = q[fieldName];
                  const isCorrect = q.correctOption === optKey;

                  return (
                    <div
                      key={optKey}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: showAnswers && isCorrect ? '#f0fdf4' : '#f8fafc',
                        border: showAnswers && isCorrect ? '1.5px solid #22c55e' : '1px solid #e2e8f0',
                        fontSize: '13px',
                        textAlign: 'center'
                      }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={optVal}
                          onChange={(e) => handleUpdateQuestion(index, fieldName, e.target.value)}
                          style={{ width: '80px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }}
                        />
                      ) : (
                        <span style={{ fontWeight: showAnswers && isCorrect ? '700' : '500', color: showAnswers && isCorrect ? '#166534' : 'var(--text-main)' }}>
                          {optVal}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Answer & Rule Info Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                {showAnswers ? (
                  <div>
                    <span style={{ color: '#16a34a', fontWeight: '700', textDecoration: 'underline' }}>
                      Ans: {q.correctAnswer}
                    </span>
                  </div>
                ) : (
                  <div>Answers hidden (student mode)</div>
                )}

                <div style={{ fontStyle: 'italic', fontSize: '11px' }}>
                  {q.sourceTemplate || 'Standard'} &bull; {q.sourcePattern}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
