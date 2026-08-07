const express = require("express");

const router = express.Router();

const { processQuestions } = require("../services/geminiService");

router.post("/process", async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: "questions wajib berupa array.",
      });
    }

    const aiResult = await processQuestions(questions);

    res.json({
      success: true,
      questions: aiResult,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;