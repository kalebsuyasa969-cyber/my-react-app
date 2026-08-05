export default function QuestionCard({
  question,
  selectedAnswer,
  onSelect,
  showResult = false,
  result = null,
  disabled = false,
}) {
  return (
    <article className={`question-card ${showResult ? (result?.isCorrect ? 'correct' : 'wrong') : ''}`}>
      <div className="question-header">
        <span className="question-badge">Soal {question.number}</span>
        {showResult && (
          <span className={`result-pill ${result?.isCorrect ? 'success' : 'danger'}`}>
            {result?.isCorrect ? 'Benar' : 'Salah'}
          </span>
        )}
      </div>

      <h3>{question.text}</h3>

      <div className="options-grid">
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option.key;
          const isCorrectOption = option.key === question.correctAnswer;
          let optionClass = 'option-btn';

          if (showResult) {
            if (isCorrectOption) optionClass += ' option-correct';
            else if (isSelected) optionClass += ' option-wrong';
          } else if (isSelected) {
            optionClass += ' option-selected';
          }

          return (
            <button
              key={option.key}
              type="button"
              className={optionClass}
              disabled={disabled || showResult}
              onClick={() => onSelect?.(option.key)}
            >
              <span className="option-key">{option.key}</span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className="explanation-box">
          <strong>Pembahasan:</strong>
          <p>{result?.explanation}</p>
          {!result?.isCorrect && (
            <p className="answer-hint">
              Jawaban benar: <strong>{question.correctAnswer}</strong>
            </p>
          )}
        </div>
      )}
    </article>
  );
}
