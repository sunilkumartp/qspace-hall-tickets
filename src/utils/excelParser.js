import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Assuming data is in the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        
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

          let formattedDate = 'Sunday, 07 December 2025'; // Fallback
          const rawDateStr = row['Date'];
          if (rawDateStr) {
             // Try parsing the date. Excel might give us a string like "7-Dec-25" or a date object or a number.
             let parsedDate;
             if (typeof rawDateStr === 'number') {
                // Excel serial date to JS Date
                parsedDate = new Date(Math.round((rawDateStr - 25569) * 864e5));
             } else {
                parsedDate = new Date(rawDateStr);
             }
             
             if (!isNaN(parsedDate.getTime())) {
                formattedDate = format(parsedDate, 'EEEE, dd MMMM yyyy');
             } else {
                formattedDate = String(rawDateStr); // fallback to literal string if parse fails
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
