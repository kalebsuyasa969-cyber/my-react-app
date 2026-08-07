const {setGlobalOptions} = require("firebase-functions");
const {onCall} = require("firebase-functions/v2/https");
const {defineString} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

setGlobalOptions({
  maxInstances: 10,
});

const GEMINI_API_KEY = defineString("GEMINI_API_KEY");

const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const {GoogleGenerativeAI} = require("@google/generative-ai");

exports.processExercise = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("Harus login terlebih dahulu");
  }

  const {exerciseId} = request.data;

  if (!exerciseId) {
    throw new Error("exerciseId tidak boleh kosong");
  }

  const docRef = db.collection("exercises").doc(exerciseId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new Error("Latihan tidak ditemukan");
  }

  const exercise = docSnap.data();

  const questions = exercise.questions || [];

  if (questions.length === 0) {
    throw new Error("Tidak ada soal");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const prompt = `
Anda adalah guru profesional.

Berikut adalah ${questions.length} soal pilihan ganda.

Untuk SETIAP soal tentukan:

- correctAnswer (huruf A/B/C/D/E)
- explanation (penjelasan singkat)

BALAS HANYA JSON ARRAY.

Contoh:

[
  {
    "number":1,
    "correctAnswer":"A",
    "explanation":"..."
  }
]

Data soal:

${JSON.stringify(questions, null, 2)}
`;

  try {
    const result = await model.generateContent(prompt);

    let text = result.response.text().trim();

    if (text.startsWith("```")) {
      text = text
          .replace(/^```json/, "")
          .replace(/^```/, "")
          .replace(/```$/, "")
          .trim();
    }

    const aiAnswers = JSON.parse(text);

    const updatedQuestions = questions.map((question) => {
      const ai = aiAnswers.find(
          (item) => item.number === question.number,
      );

      if (!ai) {
        return {
          ...question,
          correctAnswer: null,
          explanation: null,
        };
      }

      return {
        ...question,
        correctAnswer: String(ai.correctAnswer || "")
            .toUpperCase()
            .trim(),
        explanation: String(ai.explanation || "").trim(),
      };
    });

    const successCount = updatedQuestions.filter(
        (q) => q.correctAnswer,
    ).length;

    await docRef.update({
      questions: updatedQuestions,
      status: successCount > 0 ? "ready" : "failed",
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Exercise processed", {
      exerciseId,
      successCount,
      total: questions.length,
    });

    return {
      success: true,
      successCount,
      total: questions.length,
    };
  } catch (err) {
    logger.error(err);

    await docRef.update({
      status: "failed",
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    throw new Error("Gagal memproses soal menggunakan AI.");
  }
});
