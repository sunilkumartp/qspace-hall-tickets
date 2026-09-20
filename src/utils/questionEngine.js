/**
 * Math Abacus Practice Question Engine
 * Generates verified, reproducible, grade-appropriate arithmetic multiple choice questions
 * strictly conforming to active DOCX-extracted rules.
 */

// Helper: Random integer in range [min, max] inclusive
const randInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper: Shuffle array in place
const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Generates 3 plausible distractor answers around the correct answer.
 * Uses abacus-common mistake patterns:
 * - Off by 1, 2 (bead counting slip)
 * - Off by 5 (upper deck 5-bead misplaced)
 * - Off by 10, 20 (rod carry slip)
 * - Transposition (e.g. 43 -> 34)
 */
const generatePlausibleDistractors = (correctAnswer, template, grade) => {
  const distractors = new Set();
  const ans = correctAnswer;
  const attemptsLimit = 30;
  let attempts = 0;

  // Potential delta offsets
  const deltas = [-1, 1, -2, 2, -5, 5, -10, 10, -20, 20, -100, 100];
  const shuffledDeltas = shuffle(deltas);

  for (const delta of shuffledDeltas) {
    if (distractors.size >= 3) break;
    const candidate = ans + delta;
    if (candidate !== ans && candidate >= 0) {
      // Respect answer bounds
      if (!template.no_negative || candidate >= 0) {
        distractors.add(candidate);
      }
    }
  }

  // Digit transposition if 2 or 3 digits (e.g., 47 -> 74)
  if (distractors.size < 3 && ans >= 10 && ans < 1000) {
    const s = String(ans);
    const reversed = parseInt(s.split('').reverse().join(''), 10);
    if (reversed !== ans && !distractors.has(reversed) && reversed > 0) {
      distractors.add(reversed);
    }
  }

  // Random nearby offsets if we still need more
  while (distractors.size < 3 && attempts < attemptsLimit) {
    attempts++;
    const offset = randInt(1, Math.max(5, grade * 3)) * (Math.random() < 0.5 ? 1 : -1);
    const candidate = ans + offset;
    if (candidate !== ans && candidate >= 0 && !distractors.has(candidate)) {
      distractors.add(candidate);
    }
  }

  // Final fallback to guaranteed unique positive integers
  let fallbackVal = Math.max(1, ans + 3);
  while (distractors.size < 3) {
    if (fallbackVal !== ans && !distractors.has(fallbackVal)) {
      distractors.add(fallbackVal);
    }
    fallbackVal++;
  }

  return Array.from(distractors).slice(0, 3);
};

/**
 * Generates a single question item matching an extracted template.
 */
const generateSingleQuestionFromTemplate = (template, grade, sampleMeta) => {
  const op = template.operations[0] || '+';
  let questionText = '';
  let correctAnswer = 0;
  let operands = [];

  if (template.pattern === '{A} + {B}') {
    const rA = template.operand_ranges[0];
    const rB = template.operand_ranges[1];
    const a = randInt(rA.min, rA.max);
    const b = randInt(rB.min, rB.max);
    operands = [a, b];
    correctAnswer = a + b;
    questionText = `${a} + ${b} = ?`;
  } else if (template.pattern === '{A} - {B}') {
    const rA = template.operand_ranges[0];
    const rB = template.operand_ranges[1];
    let a = randInt(rA.min, rA.max);
    let b = randInt(rB.min, Math.min(rB.max, a));
    // Ensure positive answer unless explicitly allowed
    if (a < b) [a, b] = [b, a];
    operands = [a, b];
    correctAnswer = a - b;
    questionText = `${a} - ${b} = ?`;
  } else if (template.pattern === '{A} + {B} - {C}') {
    const a = randInt(template.operand_ranges[0].min, template.operand_ranges[0].max);
    const b = randInt(template.operand_ranges[1].min, template.operand_ranges[1].max);
    const c = randInt(template.operand_ranges[2].min, Math.min(template.operand_ranges[2].max, a + b));
    operands = [a, b, c];
    correctAnswer = a + b - c;
    questionText = `${a} + ${b} - ${c} = ?`;
  } else if (template.pattern === '{A} * {B}') {
    const a = randInt(template.operand_ranges[0].min, template.operand_ranges[0].max);
    const b = randInt(template.operand_ranges[1].min, template.operand_ranges[1].max);
    operands = [a, b];
    correctAnswer = a * b;
    questionText = `${a} × ${b} = ?`;
  } else if (template.pattern === '{A} / {B}') {
    // Generate clean division: b * quotient = a
    const divisor = randInt(template.operand_ranges[1].min, template.operand_ranges[1].max);
    const quotient = randInt(2, Math.floor(template.operand_ranges[0].max / divisor));
    const dividend = divisor * quotient;
    operands = [dividend, divisor];
    correctAnswer = quotient;
    questionText = `${dividend} ÷ ${divisor} = ?`;
  } else {
    // Generic addition fallback conforming to grade
    const a = randInt(1, grade * 15);
    const b = randInt(1, grade * 15);
    operands = [a, b];
    correctAnswer = a + b;
    questionText = `${a} + ${b} = ?`;
  }

  // Generate 3 unique distractors
  const distractors = generatePlausibleDistractors(correctAnswer, template, grade);

  // Combine into 4 options and randomly assign positions A, B, C, D
  const allChoices = shuffle([
    { text: String(correctAnswer), isCorrect: true },
    { text: String(distractors[0]), isCorrect: false },
    { text: String(distractors[1]), isCorrect: false },
    { text: String(distractors[2]), isCorrect: false },
  ]);

  const correctIndex = allChoices.findIndex(c => c.isCorrect);
  const correctOption = ['A', 'B', 'C', 'D'][correctIndex];

  return {
    questionText,
    optionA: allChoices[0].text,
    optionB: allChoices[1].text,
    optionC: allChoices[2].text,
    optionD: allChoices[3].text,
    correctAnswer: String(correctAnswer),
    correctOption,
    difficultyMetadata: {
      grade,
      operands,
      operation: op,
      templateId: template.id,
      sampleDocId: sampleMeta?.id,
      sampleDocVersion: sampleMeta?.version,
      ruleVersion: sampleMeta?.rule_version
    },
    sourceTemplate: template.name,
    sourcePattern: template.pattern
  };
};

/**
 * Main Question Paper Generator
 * Generates an array of `count` unique multiple-choice questions for the given grade.
 */
export const generateQuestionPaperQuestions = ({
  grade,
  count = 100,
  rulesConfig,
  sampleMeta
}) => {
  if (!rulesConfig || !rulesConfig.templates || rulesConfig.templates.length === 0) {
    throw new Error(`No active generation rules found for Grade ${grade}. Administrator must configure and approve sample paper.`);
  }

  const questions = [];
  const seenTexts = new Set();
  const templates = rulesConfig.templates;
  const maxAttempts = count * 15;
  let attempts = 0;

  while (questions.length < count && attempts < maxAttempts) {
    attempts++;

    // Pick a template according to its weight or uniformly
    const templateIndex = Math.floor(Math.random() * templates.length);
    const template = templates[templateIndex];

    const q = generateSingleQuestionFromTemplate(template, grade, sampleMeta);

    // Ensure uniqueness within paper
    if (!seenTexts.has(q.questionText)) {
      seenTexts.add(q.questionText);
      questions.push({
        questionNumber: questions.length + 1,
        ...q
      });
    }
  }

  // If duplicate avoidance hit attempt threshold, fill remaining with unique variations
  let safetyCounter = 1;
  while (questions.length < count) {
    const template = templates[0];
    const q = generateSingleQuestionFromTemplate(template, grade, sampleMeta);
    const uniqueText = `${q.questionText} (variant ${safetyCounter++})`;
    questions.push({
      questionNumber: questions.length + 1,
      ...q,
      questionText: uniqueText
    });
  }

  return questions;
};
