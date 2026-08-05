export function gradeQuiz(questions, answers) {
  const results = questions.map((question) => {
    const userAnswer = answers[question.id] || null;
    const isCorrect = userAnswer === question.correctAnswer;

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

  const correctCount = results.filter((result) => result.isCorrect).length;
  const totalQuestions = questions.length;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  let gradeLabel = 'Perlu Latihan';
  if (percentage >= 90) gradeLabel = 'Sangat Baik';
  else if (percentage >= 75) gradeLabel = 'Baik';
  else if (percentage >= 60) gradeLabel = 'Cukup';

  return {
    results,
    correctCount,
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
