import { saveAs } from 'file-saver';
import { sanitizeFilename } from './docxExporter';

/**
 * Escapes a single CSV field following RFC 4180 rules.
 */
const escapeCsvField = (field) => {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  // If field contains comma, quote, or newline, escape double quotes and wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
};

/**
 * Exports a question paper as a multi-row, print-oriented CSV with UTF-8 BOM.
 */
export const exportQuestionPaperToCsv = ({
  title,
  paperCode,
  grade,
  setNumber,
  questions
}) => {
  const safeCode = sanitizeFilename(paperCode || `C${grade}QP1`);
  const safeSet = sanitizeFilename(String(setNumber || 1));
  const filename = `${safeCode} Set ${safeSet}.csv`;

  const rows = [];

  // Metadata Header Block
  rows.push([escapeCsvField('Paper Title'), escapeCsvField(title)]);
  rows.push([escapeCsvField('Paper Code'), escapeCsvField(safeCode)]);
  rows.push([escapeCsvField('Class / Grade'), escapeCsvField(grade)]);
  rows.push([escapeCsvField('Set Number'), escapeCsvField(safeSet)]);
  rows.push([escapeCsvField('Total Questions'), escapeCsvField(questions.length)]);
  rows.push([escapeCsvField('Generated Date'), escapeCsvField(new Date().toISOString())]);
  rows.push(['']); // Blank separator line

  // Multi-row question layout per specification:
  // For every question: question text and 4 answer options on consecutive rows,
  // followed immediately by "Ans: {answer}" on its own row.
  questions.forEach((q, idx) => {
    const qNum = `Q${idx + 1}`;
    rows.push([escapeCsvField(qNum), escapeCsvField(q.questionText)]);
    rows.push([escapeCsvField('Option A'), escapeCsvField(q.optionA)]);
    rows.push([escapeCsvField('Option B'), escapeCsvField(q.optionB)]);
    rows.push([escapeCsvField('Option C'), escapeCsvField(q.optionC)]);
    rows.push([escapeCsvField('Option D'), escapeCsvField(q.optionD)]);
    rows.push([escapeCsvField('Ans:'), escapeCsvField(`${q.correctAnswer} (Option ${q.correctOption})`)]);
    rows.push(['']); // Blank row between questions
  });

  const csvString = rows.map(r => r.join(',')).join('\r\n');

  // Prepend UTF-8 BOM (\uFEFF) to ensure Microsoft Excel correctly detects UTF-8 characters
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);

  return filename;
};
