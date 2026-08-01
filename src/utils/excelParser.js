import * as XLSX from 'xlsx';
import { format, parse } from 'date-fns';

// Month abbreviation map for manual parsing
const MONTH_MAP = {
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
  'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
};

/**
 * Robustly parse a date value from Excel.
 * Handles: JS Date objects, Excel serial numbers, and common string
 * formats like "8-Aug-26", "7-Dec-25", "08/08/2026", "2026-08-08".
 */
const parseExcelDate = (raw) => {
  if (!raw) return null;

  // Already a Date object (from cellDates: true)
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;

  // Excel serial number
  if (typeof raw === 'number') {
    return new Date(Math.round((raw - 25569) * 864e5));
  }

  const str = String(raw).trim();
  if (!str) return null;

  // Try native Date constructor first (handles ISO, "August 8, 2026", etc.)
  const native = new Date(str);
  if (!isNaN(native.getTime()) && native.getFullYear() > 1970) return native;

  // Try common Excel abbreviated format: "8-Aug-26" or "08-Aug-2026"
  const abbrMatch = str.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
  if (abbrMatch) {
    const day = parseInt(abbrMatch[1], 10);
    const monthIdx = MONTH_MAP[abbrMatch[2].toLowerCase()];
    let yr = parseInt(abbrMatch[3], 10);
    if (monthIdx !== undefined) {
      // 2-digit year: 00-49 -> 2000s, 50-99 -> 1900s
      if (yr < 100) yr += yr < 50 ? 2000 : 1900;
      return new Date(yr, monthIdx, day);
    }
  }

  // Try date-fns parse with several patterns
  const patterns = [
    'd-MMM-yy', 'dd-MMM-yy', 'd-MMM-yyyy', 'dd-MMM-yyyy',
    'd/M/yyyy', 'dd/MM/yyyy', 'M/d/yyyy', 'MM/dd/yyyy',
    'd-M-yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd'
  ];
  for (const pattern of patterns) {
    try {
      const result = parse(str, pattern, new Date());
      if (!isNaN(result.getTime())) return result;
    } catch { /* continue */ }
  }

  return null; // truly unparseable
};

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Assuming data is in the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON – raw:false gives formatted strings, but cellDates gives Date objects for date cells
        const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'd-MMM-yy' });
        
        // Map to our database schema
        const students = rawData.map((row, index) => {
          // Fallbacks for standard column names
          const name = row['Name of Student'] || row['Name of St'] || row['Student Name'] || `Student ${index + 1}`;
          
          let classStr = '';
          if (row['Class of Student'] !== undefined) classStr = String(row['Class of Student']).trim();
          else if (row['Class of Stu'] !== undefined) classStr = String(row['Class of Stu']).trim();
          else if (row['Class'] !== undefined) classStr = String(row['Class']).trim();
          
          const divisionStr = row['Division'] !== undefined ? String(row['Division']).trim() : '';
          
          let classDivision = '';
          if (classStr && divisionStr) {
             classDivision = `Class ${classStr} - Division ${divisionStr}`;
          } else if (classStr) {
             classDivision = `Class ${classStr}`;
          } else if (divisionStr) {
             classDivision = `Division ${divisionStr}`;
          }

          let formattedDate = '';
          const rawDateVal = row['Date'];
          if (rawDateVal) {
             const parsedDate = parseExcelDate(rawDateVal);
             if (parsedDate) {
                formattedDate = format(parsedDate, 'EEEE, dd MMMM yyyy');
             } else {
                // Last resort: use the raw string as-is
                formattedDate = String(rawDateVal);
             }
          }

          return {
            name: name,
            classDivision: classDivision,
            date: formattedDate,
            time: row['Time'] || '9:00 AM',
            venue: row['Venue'] || 'Bharatiya Vidya Bhavan SDMP COMPLEX, Near Vadakkechira, Opposite - Sevabharathi Thrissur',
            school: row['School'] || 'Don Bosco Central school, Mannuthi',
            round1Marks: row['Round 1 M'] || row['Round 1 Marks'] || '',
            remarks: row['Remarks'] || '',
            enteredBy: row['Data Entered By'] || row['Entered By'] || '',
            isGenerated: false,
            generatedAt: null
          };
        });
        
        resolve(students);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
};
