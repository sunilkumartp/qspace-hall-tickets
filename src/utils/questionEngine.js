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
 * Generates a BODMAS / Order of Operations question with brackets and operator precedence.
 * Covers brackets and precedence suitable for the selected grade.
 */
export const generateBodmasQuestion = (grade, sampleMeta) => {
  let questionText = '';
  let correctAnswer = 0;
  let falsePrecedence = undefined;
  let pattern = '';
  const templateName = 'BODMAS (Brackets & Precedence)';

  if (grade <= 2) {
    // Grade 1 & 2: Addition and Subtraction with brackets
    const type = randInt(1, 3);
    if (type === 1) {
      // (A + B) - C
      const a = randInt(3, grade === 1 ? 10 : 25);
      const b = randInt(2, grade === 1 ? 10 : 25);
      const c = randInt(1, a + b - 1);
      correctAnswer = (a + b) - c;
      questionText = `(${a} + ${b}) - ${c} = ?`;
      pattern = '(A + B) - C';
    } else if (type === 2) {
      // A + (B - C)
      const c = randInt(1, grade === 1 ? 8 : 20);
      const b = randInt(c + 1, c + (grade === 1 ? 10 : 25));
      const a = randInt(2, grade === 1 ? 15 : 40);
      correctAnswer = a + (b - c);
      questionText = `${a} + (${b} - ${c}) = ?`;
      pattern = 'A + (B - C)';
    } else {
      // A - (B + C)
      const b = randInt(1, grade === 1 ? 8 : 15);
      const c = randInt(1, grade === 1 ? 8 : 15);
      const a = randInt(b + c + 1, b + c + (grade === 1 ? 15 : 35));
      correctAnswer = a - (b + c);
      falsePrecedence = (a - b) + c; // Common sign mistake when removing brackets
      questionText = `${a} - (${b} + ${c}) = ?`;
      pattern = 'A - (B + C)';
    }
  } else if (grade <= 4) {
    // Grade 3 & 4: Addition, Subtraction, Multiplication, and Division with brackets
    const type = randInt(1, 6);
    if (type === 1) {
      // (A + B) × C
      const a = randInt(2, 15);
      const b = randInt(2, 15);
      const c = randInt(2, 8);
      correctAnswer = (a + b) * c;
      falsePrecedence = a + (b * c); // Precedence mistake: forgetting brackets
      questionText = `(${a} + ${b}) × ${c} = ?`;
      pattern = '(A + B) × C';
    } else if (type === 2) {
      // A + (B × C)
      const b = randInt(2, 10);
      const c = randInt(2, 8);
      const a = randInt(5, 40);
      correctAnswer = a + (b * c);
      falsePrecedence = (a + b) * c; // Left-to-right mistake: ignoring precedence
      questionText = `${a} + (${b} × ${c}) = ?`;
      pattern = 'A + (B × C)';
    } else if (type === 3) {
      // (A - B) × C
      const b = randInt(2, 12);
      const a = randInt(b + 2, b + 20);
      const c = randInt(2, 8);
      correctAnswer = (a - b) * c;
      falsePrecedence = Math.abs(a - (b * c));
      questionText = `(${a} - ${b}) × ${c} = ?`;
      pattern = '(A - B) × C';
    } else if (type === 4) {
      // A × (B + C)
      const a = randInt(2, 8);
      const b = randInt(2, 12);
      const c = randInt(2, 12);
      correctAnswer = a * (b + c);
      falsePrecedence = (a * b) + c;
      questionText = `${a} × (${b} + ${c}) = ?`;
      pattern = 'A × (B + C)';
    } else if (type === 5) {
      // (A + B) ÷ C
      const c = randInt(2, 6);
      const quotient = randInt(2, 12);
      const total = c * quotient;
      const a = randInt(1, total - 1);
      const b = total - a;
      correctAnswer = quotient;
      questionText = `(${a} + ${b}) ÷ ${c} = ?`;
      pattern = '(A + B) ÷ C';
    } else {
      // A + (B ÷ C)
      const c = randInt(2, 6);
      const quotient = randInt(2, 10);
      const b = c * quotient;
      const a = randInt(5, 30);
      correctAnswer = a + quotient;
      falsePrecedence = Math.floor((a + b) / c);
      questionText = `${a} + (${b} ÷ ${c}) = ?`;
      pattern = 'A + (B ÷ C)';
    }
  } else {
    // Grade 5 to 8: Advanced BODMAS with multiple brackets and mixed precedence
    const type = randInt(1, 6);
    if (type === 1) {
      // (A + B) × (C - D)
      const d = randInt(2, 8);
      const c = randInt(d + 1, d + 10);
      const a = randInt(5, 25);
      const b = randInt(5, 25);
      correctAnswer = (a + b) * (c - d);
      questionText = `(${a} + ${b}) × (${c} - ${d}) = ?`;
      pattern = '(A + B) × (C - D)';
    } else if (type === 2) {
      // (A × B) + (C × D)
      const a = randInt(3, 15);
      const b = randInt(2, 10);
      const c = randInt(3, 15);
      const d = randInt(2, 10);
      correctAnswer = (a * b) + (c * d);
      questionText = `(${a} × ${b}) + (${c} × ${d}) = ?`;
      pattern = '(A × B) + (C × D)';
    } else if (type === 3) {
      // A + (B × C) - D
      const b = randInt(3, 12);
      const c = randInt(2, 10);
      const a = randInt(10, 50);
      const d = randInt(1, Math.min(25, Math.max(1, a + (b * c) - 1)));
      correctAnswer = a + (b * c) - d;
      falsePrecedence = ((a + b) * c) - d;
      questionText = `${a} + (${b} × ${c}) - ${d} = ?`;
      pattern = 'A + (B × C) - D';
    } else if (type === 4) {
      // (A - B) × (C + D)
      const b = randInt(2, 12);
      const a = randInt(b + 2, b + 20);
      const c = randInt(3, 15);
      const d = randInt(2, 10);
      correctAnswer = (a - b) * (c + d);
      questionText = `(${a} - ${b}) × (${c} + ${d}) = ?`;
      pattern = '(A - B) × (C + D)';
    } else if (type === 5) {
      // (A × B) ÷ C + D
      const c = randInt(2, 8);
      const quotient = randInt(2, 15);
      const mult = c * quotient;
      let a = c;
      let b = quotient;
      if (mult % 2 === 0 && mult > 4) {
        a = 2;
        b = mult / 2;
      }
      const d = randInt(2, 25);
      correctAnswer = quotient + d;
      questionText = `(${a} × ${b}) ÷ ${c} + ${d} = ?`;
      pattern = '(A × B) ÷ C + D';
    } else {
      // (A + B) × C - D
      const a = randInt(3, 15);
      const b = randInt(2, 15);
      const c = randInt(2, 8);
      const prod = (a + b) * c;
      const d = randInt(2, Math.min(30, Math.max(3, prod - 1)));
      correctAnswer = prod - d;
      falsePrecedence = a + (b * c) - d;
      questionText = `(${a} + ${b}) × ${c} - ${d} = ?`;
      pattern = '(A + B) × C - D';
    }
  }

  // Construct distractors: include falsePrecedence if available, plus standard plausible abacus distractors
  const distractors = new Set();
  if (falsePrecedence !== undefined && falsePrecedence !== correctAnswer && falsePrecedence >= 0) {
    distractors.add(falsePrecedence);
  }

  const standard = generatePlausibleDistractors(correctAnswer, { no_negative: true }, grade);
  for (const d of standard) {
    if (distractors.size >= 3) break;
    if (d !== correctAnswer && d >= 0) {
      distractors.add(d);
    }
  }

  let fallbackVal = Math.max(1, correctAnswer + 3);
  while (distractors.size < 3) {
    if (fallbackVal !== correctAnswer && !distractors.has(fallbackVal)) {
      distractors.add(fallbackVal);
    }
    fallbackVal++;
  }

  const distArray = Array.from(distractors).slice(0, 3);
  const allChoices = shuffle([
    { text: String(correctAnswer), isCorrect: true },
    { text: String(distArray[0]), isCorrect: false },
    { text: String(distArray[1]), isCorrect: false },
    { text: String(distArray[2]), isCorrect: false }
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
      bodmas: true,
      pattern,
      sampleDocId: sampleMeta?.id,
      sampleDocVersion: sampleMeta?.version,
      ruleVersion: sampleMeta?.rule_version
    },
    sourceTemplate: templateName,
    sourcePattern: pattern
  };
};

/**
 * Main Question Paper Generator
 * Generates an array of `count` unique multiple-choice questions for the given grade.
 * Supports configurable BODMAS percentage (e.g. 30%) with randomized distribution across the paper.
 */
export const generateQuestionPaperQuestions = ({
  grade,
  count = 100,
  rulesConfig,
  sampleMeta,
  includeBodmas = false,
  bodmasPercentage = 30
}) => {
  if (!rulesConfig || !rulesConfig.templates || rulesConfig.templates.length === 0) {
    throw new Error(`No active generation rules found for Grade ${grade}. Administrator must configure and approve sample paper.`);
  }

  // Calculate exact target BODMAS question count based on user-defined percentage
  const clampedPercent = Math.max(0, Math.min(100, Number(bodmasPercentage) || 0));
  const targetBodmasCount = includeBodmas && clampedPercent > 0
    ? Math.min(count, Math.max(1, Math.round((count * clampedPercent) / 100)))
    : 0;

  const questions = [];
  const seenTexts = new Set();
  const templates = rulesConfig.templates;
  const maxAttempts = count * 25;
  let attempts = 0;

  // 1. Generate target number of unique BODMAS bracketed questions
  let bodmasGenerated = 0;
  while (bodmasGenerated < targetBodmasCount && attempts < maxAttempts) {
    attempts++;
    const q = generateBodmasQuestion(grade, sampleMeta);
    if (!seenTexts.has(q.questionText)) {
      seenTexts.add(q.questionText);
      questions.push(q);
      bodmasGenerated++;
    }
  }

  // 2. Generate remaining standard questions
  while (questions.length < count && attempts < maxAttempts) {
    attempts++;
    const templateIndex = Math.floor(Math.random() * templates.length);
    const template = templates[templateIndex];
    const q = generateSingleQuestionFromTemplate(template, grade, sampleMeta);
    if (!seenTexts.has(q.questionText)) {
      seenTexts.add(q.questionText);
      questions.push(q);
    }
  }

  // If duplicate avoidance hit attempt threshold, fill remaining with unique variations
  let safetyCounter = 1;
  while (questions.length < count) {
    const template = templates[0];
    const q = generateSingleQuestionFromTemplate(template, grade, sampleMeta);
    const uniqueText = `${q.questionText} (variant ${safetyCounter++})`;
    questions.push({
      ...q,
      questionText: uniqueText
    });
  }

  // 3. Shuffle so the BODMAS questions are randomly distributed across the question paper
  const randomizedQuestions = shuffle(questions);

  // 4. Assign sequential question numbers Q1), Q2), ..., Qn)
  return randomizedQuestions.map((q, idx) => ({
    ...q,
    questionNumber: idx + 1
  }));
};
