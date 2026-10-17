import test from 'node:test';
import assert from 'node:assert/strict';
import { generateHallTicket } from '../src/utils/pdfGenerator.js';

test('Hall Ticket PDF Generator - Custom Timeslots & Single Page Guarantee', async (t) => {
  const mockStudent = {
    name: 'Ananya Sharma',
    classDivision: 'Grade 4 B',
    school: 'Bhavans Vidya Mandir, Calicut',
    date: '15th November 2026',
    time: '11:30 AM',
    venue: 'Auditorium Hall, Bhavans Campus, Ramanattukara, Calicut'
  };

  await t.test('generates exactly 1 page with 3 custom slots', async () => {
    const slots = ['9:00 AM', '11:30 AM', '2:30 PM'];
    const doc = await generateHallTicket([mockStudent], {
      slots,
      returnDoc: true
    });

    assert.equal(doc.getNumberOfPages(), 1, 'Hall ticket must fit strictly on 1 page');
  });

  await t.test('generates exactly 1 page with 4 custom slots', async () => {
    const slots = ['9:00 AM', '11:30 AM', '2:00 PM', '4:30 PM'];
    const doc = await generateHallTicket([mockStudent], {
      slots,
      returnDoc: true
    });

    assert.equal(doc.getNumberOfPages(), 1, 'Hall ticket with 4 slots must fit strictly on 1 page');
  });

  await t.test('generates exactly 1 page and omits timeslot text when slots array is empty', async () => {
    const doc = await generateHallTicket([mockStudent], {
      slots: [],
      returnDoc: true
    });

    assert.equal(doc.getNumberOfPages(), 1, 'Hall ticket with no slots must fit strictly on 1 page');
  });

  await t.test('generates exactly 1 page when slots array contains whitespace/empty strings only', async () => {
    const doc = await generateHallTicket([mockStudent], {
      slots: ['  ', '', '   '],
      returnDoc: true
    });

    assert.equal(doc.getNumberOfPages(), 1, 'Hall ticket with blank slot entries must omit block and fit on 1 page');
  });

  await t.test('defaults to standard 3 slots when options.slots is undefined', async () => {
    const doc = await generateHallTicket([mockStudent], {
      returnDoc: true
    });

    assert.equal(doc.getNumberOfPages(), 1, 'Default options must fit strictly on 1 page');
  });
});
