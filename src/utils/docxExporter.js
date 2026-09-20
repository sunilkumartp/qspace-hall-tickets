import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  UnderlineType,
  Footer,
  PageNumber,
  AlignmentType
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * Sanitizes a filename component removing unsafe characters.
 */
export const sanitizeFilename = (name) => {
  return String(name || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Exports a question paper as a formatted Microsoft Word (.docx) document.
 */
export const exportQuestionPaperToDocx = async ({
  title,
  paperCode,
  grade,
  setNumber,
  questions
}) => {
  const safeCode = sanitizeFilename(paperCode || `C${grade}QP1`);
  const safeSet = sanitizeFilename(String(setNumber || 1));
  const filename = `${safeCode} Set ${safeSet}.docx`;

  const children = [
    // Header Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: title || `Math Abacus Practice Paper - Class ${grade}`,
          bold: true,
          size: 32, // 16pt
          font: 'Calibri'
        })
      ]
    }),

    // Subheader metadata line
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new TextRun({ text: `Class / Grade: `, bold: true, size: 22, font: 'Calibri' }),
        new TextRun({ text: `${grade}    |    `, size: 22, font: 'Calibri' }),
        new TextRun({ text: `Paper Code: `, bold: true, size: 22, font: 'Calibri' }),
        new TextRun({ text: `${safeCode}    |    `, size: 22, font: 'Calibri' }),
        new TextRun({ text: `Set: `, bold: true, size: 22, font: 'Calibri' }),
        new TextRun({ text: `${safeSet}    |    `, size: 22, font: 'Calibri' }),
        new TextRun({ text: `Total Questions: `, bold: true, size: 22, font: 'Calibri' }),
        new TextRun({ text: `${questions.length}`, size: 22, font: 'Calibri' })
      ]
    }),

    // Horizontal separator
    new Paragraph({
      spacing: { after: 240 },
      border: {
        bottom: { color: '999999', space: 1, style: 'single', size: 6 }
      }
    })
  ];

  // Append each question with 4 options and bold+underlined answer
  questions.forEach((q, index) => {
    // Question text paragraph
    children.push(
      new Paragraph({
        spacing: { before: 140, after: 80 },
        children: [
          new TextRun({
            text: `Q${index + 1}.  ${q.questionText}`,
            bold: true,
            size: 24, // 12pt
            font: 'Calibri'
          })
        ]
      })
    );

    // Options row / paragraph
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 400 },
        children: [
          new TextRun({ text: `(A)  ${q.optionA}        `, size: 22, font: 'Calibri' }),
          new TextRun({ text: `(B)  ${q.optionB}        `, size: 22, font: 'Calibri' }),
          new TextRun({ text: `(C)  ${q.optionC}        `, size: 22, font: 'Calibri' }),
          new TextRun({ text: `(D)  ${q.optionD}`, size: 22, font: 'Calibri' })
        ]
      })
    );

    // Correct Answer Line: Bold and Underlined format: "Ans: 42"
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        indent: { left: 400 },
        children: [
          new TextRun({
            text: `Ans: ${q.correctAnswer} (Option ${q.correctOption})`,
            bold: true,
            underline: { type: UnderlineType.SINGLE },
            size: 22,
            font: 'Calibri'
          })
        ]
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
            pageNumbers: { start: 1 }
          }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${safeCode} - Set ${safeSet}   |   Page `, size: 18, color: '666666' }),
                  PageNumber.CURRENT,
                  new TextRun({ text: ' of ', size: 18, color: '666666' }),
                  PageNumber.TOTAL_PAGES
                ]
              })
            ]
          })
        },
        children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
  return filename;
};
