/**
 * Extracts structured mathematical rules and templates from a parsed DOCX text/html.
 * Analyzes questions, arithmetic operations, operand ranges, answer ranges, and notation.
 */

export const extractGradeRulesFromText = (rawText, grade) => {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const parsedQuestions = [];
  const operationsDetected = new Set();
  let minOperand = Infinity;
  let maxOperand = -Infinity;
  let minAnswer = Infinity;
  let maxAnswer = -Infinity;
  let maxOperandsCount = 2;
  let hasNegative = false;
  let hasDecimals = false;
  let hasMultiplication = false;
  let hasDivision = false;

  // Regular expression to identify arithmetic expressions like:
  // "1. 23 + 45 = ?" or "15 + 6 - 8" or "12 x 4" or "25 / 5"
  const exprRegex = /(?:(\d+)\s*[\.\)]\s*)?([0-9\.\+\-\*\/xX÷\s=]+)/;

  for (const line of lines) {
    // Check if line contains numbers and arithmetic symbols
    if (/[\+\-\*\/xX÷]/.test(line) && /\d/.test(line)) {
      // Clean up symbols
      const normalized = line
        .replace(/x|X/g, '*')
        .replace(/÷/g, '/')
        .replace(/=/g, ' ')
        .replace(/\?/g, ' ');

      // Extract numbers and operators
      const tokens = normalized.match(/(\d+|\+|\-|\*|\/)/g);
      if (tokens && tokens.length >= 3) {
        const numbers = [];
        const ops = [];

        for (const token of tokens) {
          if (['+', '-', '*', '/'].includes(token)) {
            ops.push(token);
            operationsDetected.add(token);
            if (token === '*') hasMultiplication = true;
            if (token === '/') hasDivision = true;
          } else if (/^\d+$/.test(token)) {
            const val = parseInt(token, 10);
            numbers.push(val);
            if (val < minOperand) minOperand = val;
            if (val > maxOperand) maxOperand = val;
          }
        }

        if (numbers.length >= 2 && ops.length >= 1) {
          maxOperandsCount = Math.max(maxOperandsCount, numbers.length);

          // Evaluate the math to check answer range and carry/borrow
          try {
            let running = numbers[0];
            for (let i = 0; i < ops.length; i++) {
              const op = ops[i];
              const nextNum = numbers[i + 1];
              if (op === '+') running += nextNum;
              else if (op === '-') running -= nextNum;
              else if (op === '*') running *= nextNum;
              else if (op === '/') running = nextNum !== 0 ? Math.floor(running / nextNum) : running;
            }

            if (running < 0) hasNegative = true;
            if (!Number.isInteger(running)) hasDecimals = true;

            if (running < minAnswer) minAnswer = running;
            if (running > maxAnswer) maxAnswer = running;

            parsedQuestions.push({
              raw: line,
              numbers,
              ops,
              evaluated: running
            });
          } catch {
            // ignore calculation errors in sample parsing
          }
        }
      }
    }
  }

  // Set default bounds per grade if sample had very few questions
  const defaultMinOperand = grade === 1 ? 1 : grade <= 3 ? 5 : 10;
  const defaultMaxOperand = grade === 1 ? 20 : grade === 2 ? 99 : grade <= 4 ? 999 : 9999;

  const finalMinOperand = Number.isFinite(minOperand) ? minOperand : defaultMinOperand;
  const finalMaxOperand = Number.isFinite(maxOperand) ? maxOperand : defaultMaxOperand;
  const finalMinAnswer = Number.isFinite(minAnswer) ? minAnswer : 0;
  const finalMaxAnswer = Number.isFinite(maxAnswer) ? maxAnswer : defaultMaxOperand * 2;

  const allowedOps = operationsDetected.size > 0 
    ? Array.from(operationsDetected) 
    : (grade === 1 ? ['+', '-'] : grade <= 3 ? ['+', '-'] : ['+', '-', '*']);

  // Construct structured templates based on analysis
  const templates = [];

  // Template 1: Basic 2-operand addition
  if (allowedOps.includes('+')) {
    templates.push({
      id: `g${grade}_add_2op`,
      name: 'Two-operand Addition',
      pattern: '{A} + {B}',
      operations: ['+'],
      operand_count: 2,
      operand_ranges: [
        { min: finalMinOperand, max: finalMaxOperand },
        { min: finalMinOperand, max: finalMaxOperand }
      ],
      answer_range: { min: finalMinOperand + 1, max: finalMaxOperand * 2 },
      allow_carry: grade > 1,
      weight: 0.35
    });
  }

  // Template 2: Basic 2-operand subtraction
  if (allowedOps.includes('-')) {
    templates.push({
      id: `g${grade}_sub_2op`,
      name: 'Two-operand Subtraction',
      pattern: '{A} - {B}',
      operations: ['-'],
      operand_count: 2,
      operand_ranges: [
        { min: Math.max(finalMinOperand, 2), max: finalMaxOperand },
        { min: finalMinOperand, max: finalMaxOperand }
      ],
      answer_range: { min: 0, max: finalMaxOperand },
      allow_borrow: grade > 1,
      no_negative: !hasNegative,
      weight: 0.35
    });
  }

  // Template 3: Multi-operation chain (A + B - C) for Grade 2+
  if (grade >= 2 && maxOperandsCount >= 3) {
    templates.push({
      id: `g${grade}_chain_3op`,
      name: 'Three-operand Chain Addition/Subtraction',
      pattern: '{A} + {B} - {C}',
      operations: ['+', '-'],
      operand_count: 3,
      operand_ranges: [
        { min: finalMinOperand, max: Math.min(finalMaxOperand, 500) },
        { min: finalMinOperand, max: Math.min(finalMaxOperand, 500) },
        { min: finalMinOperand, max: Math.min(finalMaxOperand, 300) }
      ],
      answer_range: { min: 0, max: finalMaxOperand * 2 },
      no_negative: true,
      weight: 0.2
    });
  }

  // Template 4: Multiplication for Grade 3+
  if (hasMultiplication || grade >= 3) {
    const multMax = grade <= 4 ? 12 : grade <= 6 ? 99 : 999;
    templates.push({
      id: `g${grade}_mult_2op`,
      name: 'Multiplication',
      pattern: '{A} * {B}',
      operations: ['*'],
      operand_count: 2,
      operand_ranges: [
        { min: 2, max: multMax },
        { min: 2, max: grade <= 4 ? 9 : 25 }
      ],
      answer_range: { min: 4, max: multMax * 25 },
      weight: grade >= 4 ? 0.25 : 0.15
    });
  }

  // Template 5: Division for Grade 4+
  if (hasDivision || grade >= 4) {
    templates.push({
      id: `g${grade}_div_2op`,
      name: 'Clean Division (No Remainder)',
      pattern: '{A} / {B}',
      operations: ['/'],
      operand_count: 2,
      operand_ranges: [
        { min: 10, max: grade <= 5 ? 100 : 1000 },
        { min: 2, max: 12 }
      ],
      integer_quotient_only: true,
      weight: 0.15
    });
  }

  return {
    grade,
    extracted_at: new Date().toISOString(),
    sample_question_count: parsedQuestions.length,
    operations_allowed: allowedOps,
    operand_range: { min: finalMinOperand, max: finalMaxOperand },
    answer_range: { min: finalMinAnswer, max: finalMaxAnswer },
    max_operands_per_question: maxOperandsCount,
    integer_math_only: !hasDecimals,
    non_negative_only: !hasNegative,
    templates,
    rules_summary: `Grade ${grade}: ${allowedOps.join(', ')} operations. Range: ${finalMinOperand} to ${finalMaxOperand}. ${parsedQuestions.length} sample items recognized.`
  };
};
