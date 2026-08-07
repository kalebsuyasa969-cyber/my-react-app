import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import QuestionCard from '../components/QuestionCard';
import { formatDuration } from '../utils/gradeQuiz';

export default function QuizPage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
const [remaining, setRemaining] = useState(null);

useEffect(() => {
  async function loadExercise() {
    try {
      const snap = await getDoc(doc(db, 'exercises', exerciseId));

      if (!snap.exists()) {
        setError('Latihan tidak ditemukan.');
      } else {
        const data = {
          id: snap.id,
          ...snap.data(),
        };

        setExercise(data);

        if (
          data.timerMode === "countdown" &&
          data.durationMinutes
        ) {
          setRemaining(data.durationMinutes * 60);
        }
      }
    } catch (err) {
      setError('Gagal memuat latihan.');
    } finally {
      setLoading(false);
    }
  }

  loadExercise();
}, [exerciseId]);

  useEffect(() => {
    if (!exercise) return;
  
    const timer = setInterval(() => {
      if (exercise.timerMode === "countdown") {
        setRemaining((prev) => {
          if (prev === null) return null;
  
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
  
          return prev - 1;
        });
      } else {
        setElapsed((prev) => prev + 1);
      }
    }, 1000);
  
    return () => clearInterval(timer);
  }, [exercise]);

  const questions = exercise?.questions || [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = useMemo(
    () => Object.keys(answers).filter((key) => answers[key]).length,
    [answers]
  );
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  function handleSelect(optionKey) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionKey }));
  }

  function handleSubmit() {
    if (answeredCount < questions.length) {
      const confirmSubmit = window.confirm(
        `Masih ada ${questions.length - answeredCount} soal belum dijawab. Tetap kirim jawaban?`
      );
      if (!confirmSubmit) return;
    }

    navigate('/results/new', {
      state: {
        answers,
        elapsed:
          exercise.timerMode === "countdown"
            ? (exercise.durationMinutes * 60) - remaining
            : elapsed,
        exercise,
      },
    });
  }

  if (loading) {
    return <LoadingSpinner message="Memuat latihan..." />;
  }

  if (error || !exercise) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>{error || 'Latihan tidak tersedia.'}</p>
          <Link to="/" className="btn btn-primary">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page quiz-page">
      <div className="quiz-topbar card-panel">
        <div>
          <p className="eyebrow">Sedang mengerjakan</p>
          <h1>{exercise.title}</h1>
          <p className="muted">
  Mode:
  {exercise.timerMode === "countdown"
    ? " Hitung Mundur"
    : " Stopwatch"}
</p>
        </div>
        <div className="quiz-meta">
          <span
  className="timer-badge"
  style={
    exercise?.timerMode === "countdown" &&
    remaining !== null &&
    remaining < 60
      ? {
          background: "#dc2626",
          color: "white",
          fontWeight: "bold",
        }
      : {}
  }
>
  ⏱{" "}
  {exercise?.timerMode === "countdown"
    ? formatDuration(remaining ?? 0)
    : formatDuration(elapsed)}
</span>
          <span>{answeredCount}/{questions.length} dijawab</span>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="quiz-layout">
        <aside className="question-nav card-panel">
          <h3>Navigasi Soal</h3>
          <div className="nav-grid">
            {questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                className={`nav-dot ${index === currentIndex ? 'active' : ''} ${
                  answers[question.id] ? 'answered' : ''
                }`}
                onClick={() => setCurrentIndex(index)}
              >
                {question.number}
              </button>
            ))}
          </div>
        </aside>

        <section className="quiz-main">
          {currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              selectedAnswer={answers[currentQuestion.id]}
              onSelect={handleSelect}
            />
          )}

          <div className="quiz-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((value) => value - 1)}
            >
              Sebelumnya
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentIndex((value) => value + 1)}
              >
                Selanjutnya
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                Selesai & Lihat Nilai
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
