const OPTION_PATTERN = /^([A-Ea-e])[).:-]\s*(.+)$/;

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
    const end =
      index + 1 < matches.length
        ? matches[index + 1].index
        : normalized.length;

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

  lines.forEach((line) => {
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

  const questionText = questionLines.join(' ').trim();

  if (!questionText || options.length < 2) {
    return null;
  }

  return {
    id: `q${block.number}`,
    number: block.number,
    text: questionText,
    options,

    // Akan diisi AI pada tahap berikutnya
    correctAnswer: null,
    explanation: null,
  };
}

export function parseQuestionsFromText(text) {
  const blocks = splitQuestionBlocks(text);

  return blocks
    .map(parseQuestionBlock)
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);
}

export function getFormatGuide() {
  return `1. Apa ibukota Indonesia?
A. Jakarta
B. Bandung
C. Surabaya
D. Medan
E. Makassar

2. Berapa hasil dari 7 × 8?
A. 48
B. 54
C. 56
D. 64
E. 58`;
}