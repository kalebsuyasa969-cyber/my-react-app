const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function processQuestions(questions) {
  const prompt = `
Anda adalah guru profesional.

Saya akan memberikan daftar soal pilihan ganda.

Tugas Anda:

1. Tentukan jawaban yang benar.
2. Berikan penjelasan singkat.
3. Jangan mengubah nomor soal.
4. Jangan mengubah urutan soal.
5. Jawaban harus sesuai dengan pilihan yang tersedia.

BALAS HANYA JSON VALID.

Format wajib:

[
  {
    "number": 1,
    "correctAnswer": "B",
    "explanation": "Penjelasan singkat mengenai jawaban yang benar."
  }
]

Data soal:

${JSON.stringify(questions, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    let text = response.text;

    text = text
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();

    const result = JSON.parse(text);

    return result;

  } catch (err) {
    console.error("Gemini Error:", err.message);
    throw err;
  }
}

module.exports = {
  processQuestions,
};