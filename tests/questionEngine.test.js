import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestionPaperQuestions } from '../src/utils/questionEngine.js';

test('Math Abacus Question Engine - Unit Tests', async (t) => {
  // Mock extracted rules configuration representing a Class 3 sample
  const mockClass3Rules = {
    grade: 3,
    templates: [
      {
        id: 'g3_add_2op',
        name: 'Two-operand Addition',
        pattern: '{A} + {B}',
        operations: ['+'],
        operand_count: 2,
        operand_ranges: [{ min: 10, max: 99 }, { min: 10, max: 99 }],
        answer_range: { min: 20, max: 198 },
        weight: 0.5
      },
      {
        id: 'g3_sub_2op',
        name: 'Two-operand Subtraction',
        pattern: '{A} - {B}',
        operations: ['-'],
        operand_count: 2,
        operand_ranges: [{ min: 20, max: 99 }, { min: 10, max: 80 }],
        answer_range: { min: 0, max: 89 },
        no_negative: true,
        weight: 0.5
      }
    ]
  };

  await t.test('generates exact number of requested questions', () => {
    const questions = generateQuestionPaperQuestions({
      grade: 3,
      count: 100,
      rulesConfig: mockClass3Rules,
      sampleMeta: { id: 'mock-sample-3', version: 1, rule_version: 1 }
    });

    assert.equal(questions.length, 100);
  });

  await t.test('every question has exactly four unique options and one verified correct answer', () => {
    const questions = generateQuestionPaperQuestions({
      grade: 3,
      count: 50,
      rulesConfig: mockClass3Rules,
      sampleMeta: { id: 'mock-sample-3', version: 1, rule_version: 1 }
    });

    questions.forEach((q, idx) => {
      // Must have valid number
      assert.equal(q.questionNumber, idx + 1);

      // Options must be non-empty strings
      assert.ok(q.optionA && q.optionB && q.optionC && q.optionD);

      // Exactly four unique options
      const uniqueOpts = new Set([q.optionA, q.optionB, q.optionC, q.optionD]);
      assert.equal(uniqueOpts.size, 4, `Question ${idx + 1} does not have 4 unique options`);

      // Correct option must be one of A, B, C, D
      assert.ok(['A', 'B', 'C', 'D'].includes(q.correctOption));

      // Correct answer must match the chosen correct option
      const mappedAns = q[`option${q.correctOption}`];
      assert.equal(mappedAns, q.correctAnswer, `Option ${q.correctOption} (${mappedAns}) does not equal correctAnswer (${q.correctAnswer})`);

      // Mathematically verify answer
      if (q.sourcePattern === '{A} + {B}') {
        const match = q.questionText.match(/^(\d+)\s*\+\s*(\d+)/);
        assert.ok(match, 'Addition question text does not match pattern');
        const calculated = parseInt(match[1], 10) + parseInt(match[2], 10);
        assert.equal(parseInt(q.correctAnswer, 10), calculated);
      } else if (q.sourcePattern === '{A} - {B}') {
        const match = q.questionText.match(/^(\d+)\s*\-\s*(\d+)/);
        assert.ok(match, 'Subtraction question text does not match pattern');
        const calculated = parseInt(match[1], 10) - parseInt(match[2], 10);
        assert.equal(parseInt(q.correctAnswer, 10), calculated);
        assert.ok(calculated >= 0, 'Subtraction produced negative result contrary to rule');
      }
    });
  });

  await t.test('throws descriptive error if grade rules are missing', () => {
    assert.throws(() => {
      generateQuestionPaperQuestions({
        grade: 5,
        count: 10,
        rulesConfig: null
      });
    }, /No active generation rules found for Grade 5/);
  });
});
