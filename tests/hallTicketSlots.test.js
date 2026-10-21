import test from 'node:test';
import assert from 'node:assert/strict';
import { generateHallTicket, getExampleTimingSlots, parseTimeToMinutes } from '../src/utils/pdfGenerator.js';

test('Hall Ticket PDF Generator - Custom Timeslots & Single Page Guarantee', async (t) => {
  const mockStudent = {
    name: 'Ananya Sharma',
    classDivision: 'Grade 4 B',
    school: 'Bhavans Vidya Mandir, Calicut',
    date: '15th November 2026',
    time: '11:30 AM',
    venue: 'Auditorium Hall, Bhavans Campus, Ramanattukara, Calicut'
  };

  await t.test('parseTimeToMinutes parses 12h/24h formats accurately', () => {
    assert.equal(parseTimeToMinutes('9:00 AM'), 540);
    assert.equal(parseTimeToMinutes('11:30 AM'), 690);
    assert.equal(parseTimeToMinutes('12:00 PM'), 720);
    assert.equal(parseTimeToMinutes('12:30 PM'), 750);
    assert.equal(parseTimeToMinutes('1:00 PM'), 780);
    assert.equal(parseTimeToMinutes('2:30 PM'), 870);
    assert.equal(parseTimeToMinutes('4:30 PM'), 990);
  });

  await t.test('getExampleTimingSlots selects matching slots with to > from', () => {
    // Standard 3 slots
    const res3 = getExampleTimingSlots(['9:00 AM', '11:30 AM', '2:30 PM']);
    assert.equal(res3.egFrom, '11:30 AM');
    assert.equal(res3.egTo, '2:30 PM');
    assert.ok(parseTimeToMinutes(res3.egTo) > parseTimeToMinutes(res3.egFrom));

    // Shuffled / reverse order input
    const resShuffled = getExampleTimingSlots(['2:30 PM', '9:00 AM', '11:30 AM']);
    assert.equal(resShuffled.egFrom, '11:30 AM');
    assert.equal(resShuffled.egTo, '2:30 PM');
    assert.ok(parseTimeToMinutes(resShuffled.egTo) > parseTimeToMinutes(resShuffled.egFrom));

    // 4 custom slots
    const res4 = getExampleTimingSlots(['9:00 AM', '11:30 AM', '2:00 PM', '4:30 PM']);
    assert.equal(res4.egFrom, '11:30 AM');
    assert.equal(res4.egTo, '2:00 PM');
    assert.ok(parseTimeToMinutes(res4.egTo) > parseTimeToMinutes(res4.egFrom));

    // 2 custom slots (entered forward and reversed)
    const res2 = getExampleTimingSlots(['10:00 AM', '1:00 PM']);
    assert.equal(res2.egFrom, '10:00 AM');
    assert.equal(res2.egTo, '1:00 PM');
    assert.ok(parseTimeToMinutes(res2.egTo) > parseTimeToMinutes(res2.egFrom));

    const res2Rev = getExampleTimingSlots(['1:00 PM', '10:00 AM']);
    assert.equal(res2Rev.egFrom, '10:00 AM');
    assert.equal(res2Rev.egTo, '1:00 PM');
    assert.ok(parseTimeToMinutes(res2Rev.egTo) > parseTimeToMinutes(res2Rev.egFrom));

    // Custom school slots
    const resCustom = getExampleTimingSlots(['8:30 AM', '12:00 PM', '3:30 PM']);
    assert.equal(resCustom.egFrom, '12:00 PM');
    assert.equal(resCustom.egTo, '3:30 PM');
    assert.ok(parseTimeToMinutes(resCustom.egTo) > parseTimeToMinutes(resCustom.egFrom));
  });

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
