export function gradeQuiz(questions, answers) {
  const results = questions.map((question) => {
    const userAnswer = answers[question.id] || null;

    let isCorrect = null;

    // Jika AI belum mengisi jawaban benar,
    // soal belum bisa dinilai.
    if (question.correctAnswer !== null) {
      isCorrect = userAnswer === question.correctAnswer;
    }

    return {
      questionId: question.id,
      number: question.number,
      text: question.text,
      options: question.options,
      userAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation,
    };
  });

  const correctCount = results.filter(
    (result) => result.isCorrect === true
  ).length;

  const pendingCount = results.filter(
    (result) => result.isCorrect === null
  ).length;

  const totalQuestions = questions.length;

  const gradedQuestions = totalQuestions - pendingCount;

  const percentage =
    gradedQuestions > 0
      ? Math.round((correctCount / gradedQuestions) * 100)
      : 0;

  let gradeLabel = 'Perlu Latihan';

  if (percentage >= 90) gradeLabel = 'Sangat Baik';
  else if (percentage >= 75) gradeLabel = 'Baik';
  else if (percentage >= 60) gradeLabel = 'Cukup';

  return {
    results,
    correctCount,
    pendingCount,
    totalQuestions,
    percentage,
    gradeLabel,
  };
}

export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}