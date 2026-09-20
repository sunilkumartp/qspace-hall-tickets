import JSZip from 'jszip';
import mammoth from 'mammoth';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip', // Some browsers report docx as zip
  'application/octet-stream' // Fallback
];

/**
 * Validates a file object ensuring it is a genuine, uncorrupted, unencrypted .docx archive.
 * @param {File} file
 * @returns {Promise<{ valid: boolean, error?: string, rawText?: string, html?: string, structure?: object }>}
 */
export const validateAndInspectDocx = async (file) => {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // 1. Extension check
  const name = file.name || '';
  if (!name.toLowerCase().endsWith('.docx')) {
    return { valid: false, error: 'Invalid file extension. Only Microsoft Word (.docx) documents are accepted.' };
  }

  // 2. File size check
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds the 10MB maximum limit (received ${(file.size / 1024 / 1024).toFixed(2)}MB).` };
  }
  if (file.size < 100) {
    return { valid: false, error: 'File is abnormally small or empty.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();

    // 3. Zip Package Structure Check using JSZip
    let zip;
    try {
      zip = await JSZip.loadAsync(arrayBuffer);
    } catch {
      return { valid: false, error: 'File is corrupt or is not a valid OpenXML ZIP container.' };
    }

    // Check for standard OpenXML signatures
    const hasContentTypes = !!zip.file('[Content_Types].xml');
    const hasDocumentXml = !!zip.file('word/document.xml');

    if (!hasContentTypes || !hasDocumentXml) {
      return { valid: false, error: 'The uploaded file does not contain standard Word (.docx) document XML structures.' };
    }

    // Check for password protection / encryption (EncryptedPackage stream in OLE or XML)
    if (zip.file('EncryptedPackage') || zip.file('EncryptionInfo')) {
      return { valid: false, error: 'Password-protected or encrypted DOCX files are not supported. Please remove encryption and re-upload.' };
    }

    // 4. Extract Text and HTML via Mammoth
    const [rawTextResult, htmlResult] = await Promise.all([
      mammoth.extractRawText({ arrayBuffer }),
      mammoth.convertToHtml({ arrayBuffer })
    ]);

    const rawText = rawTextResult?.value?.trim() || '';
    if (rawText.length === 0) {
      return { valid: false, error: 'The document appears to contain no readable text or questions.' };
    }

    return {
      valid: true,
      rawText,
      html: htmlResult?.value || '',
      fileSizeBytes: file.size,
      originalFilename: file.name
    };
  } catch (err) {
    console.error('Error validating DOCX:', err);
    return { valid: false, error: `Failed to read document contents: ${err.message || 'Unknown parsing error'}` };
  }
};
