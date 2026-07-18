import Dexie from 'dexie';

// Initialize the database
export const db = new Dexie('QSpaceHallTicketsDB');

// Define schema
// We store students with their generation status
db.version(1).stores({
  students: '++id, name, classDivision, date, time, venue, school, remarks, round1Marks, enteredBy, isGenerated, generatedAt'
});
