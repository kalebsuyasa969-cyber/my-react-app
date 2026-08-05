const OPTION_PATTERN = /^([A-Ea-e])[\).\:\-]\s*(.+)$/;
const ANSWER_PATTERN = /^(?:jawaban|answer|kunci)\s*[:\-]\s*([A-Ea-e])/i;
const EXPLANATION_PATTERN = /^(?:penjelasan|pembahasan|explanation|alasan)\s*[:\-]\s*(.+)$/i;

function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function splitQuestionBlocks(text) {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(/(?:^|\n)\s*(\d+)\.\s+/g)];

  if (matches.length === 0) {
    return [];
  }

  const blocks = [];

  matches.forEach((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : normalized.length;
    blocks.push({
      number: Number(match[1]),
      content: normalized.slice(start, end).trim(),
    });
  });

  return blocks;
}

function parseQuestionBlock(block) {
  const lines = block.content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const options = [];
  const questionLines = [];
  let correctAnswer = null;
  let explanation = null;
  let explanationLines = [];
  let collectingExplanation = false;

  lines.forEach((line) => {
    const answerMatch = line.match(ANSWER_PATTERN);
    if (answerMatch) {
      correctAnswer = answerMatch[1].toUpperCase();
      collectingExplanation = false;
      return;
    }

    const explanationMatch = line.match(EXPLANATION_PATTERN);
    if (explanationMatch) {
      explanation = explanationMatch[1].trim();
      collectingExplanation = true;
      return;
    }

    if (collectingExplanation) {
      explanationLines.push(line);
      return;
    }

    const optionMatch = line.match(OPTION_PATTERN);
    if (optionMatch) {
      options.push({
        key: optionMatch[1].toUpperCase(),
        text: optionMatch[2].trim(),
      });
      return;
    }

    questionLines.push(line);
  });

  if (explanationLines.length > 0) {
    explanation = [explanation, ...explanationLines].filter(Boolean).join(' ');
  }

  const questionText = questionLines.join(' ').trim();

  if (!questionText || options.length < 2 || !correctAnswer) {
    return null;
  }

  const validAnswer = options.some((option) => option.key === correctAnswer);
  if (!validAnswer) {
    return null;
  }

  return {
    id: `q${block.number}`,
    number: block.number,
    text: questionText,
    options,
    correctAnswer,
    explanation: explanation || 'Pembahasan belum tersedia untuk soal ini.',
  };
}

export function parseQuestionsFromText(text) {
  const blocks = splitQuestionBlocks(text);
  const questions = blocks
    .map(parseQuestionBlock)
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);

  return questions;
}

export function getFormatGuide() {
  return `1. Apa ibukota Indonesia?
A. Jakarta
B. Bandung
C. Surabaya
D. Medan
Jawaban: A
Penjelasan: Jakarta adalah ibukota Republik Indonesia.

2. Berapa hasil dari 7 × 8?
A. 48
B. 54
C. 56
D. 64
Jawaban: C
Penjelasan: 7 dikali 8 sama dengan 56.`;
}
