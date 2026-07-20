import Dexie from 'dexie';

// Initialize the database
export const db = new Dexie('QSpaceHallTicketsDB');

// Define schema
// We store students with their generation status and recordType
db.version(1).stores({
  students: '++id, name, classDivision, date, time, venue, school, remarks, round1Marks, enteredBy, isGenerated, generatedAt'
});

db.version(2).stores({
  students: '++id, recordType, name, classDivision, date, time, venue, school, remarks, round1Marks, enteredBy, isGenerated, generatedAt'
}).upgrade(tx => {
  return tx.students.toCollection().modify(student => {
    student.recordType = student.recordType || 'hallTicket';
  });
});
