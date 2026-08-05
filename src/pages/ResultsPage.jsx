import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import QuestionCard from '../components/QuestionCard';
import ScoreRing from '../components/ScoreRing';
import { gradeQuiz, formatDuration } from '../utils/gradeQuiz';

export default function ResultsPage() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState(location.state?.attempt || null);
  const [loading, setLoading] = useState(!attempt && !!attemptId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function saveOrLoadAttempt() {
      if (attempt) return;

      const submitState = location.state;
      if (!submitState?.exercise || !submitState?.answers) {
        if (attemptId) {
          setLoading(false);
        } else {
          navigate('/');
        }
        return;
      }

      setSaving(true);
      const graded = gradeQuiz(submitState.exercise.questions, submitState.answers);

      try {
        const docRef = await addDoc(collection(db, 'attempts'), {
          userId: user.uid,
          exerciseId: submitState.exercise.id,
          exerciseTitle: submitState.exercise.title,
          answers: submitState.answers,
          results: graded.results,
          correctCount: graded.correctCount,
          totalQuestions: graded.totalQuestions,
          percentage: graded.percentage,
          gradeLabel: graded.gradeLabel,
          durationSeconds: submitState.elapsed || 0,
          completedAt: serverTimestamp(),
        });

        setAttempt({
          id: docRef.id,
          exerciseTitle: submitState.exercise.title,
          durationSeconds: submitState.elapsed || 0,
          questions: submitState.exercise.questions,
          ...graded,
        });

        navigate(`/results/${docRef.id}`, {
          replace: true,
          state: {
            attempt: {
              id: docRef.id,
              exerciseTitle: submitState.exercise.title,
              durationSeconds: submitState.elapsed || 0,
              questions: submitState.exercise.questions,
              ...graded,
            },
          },
        });
      } catch (err) {
        setAttempt({
          id: 'local',
          exerciseTitle: submitState.exercise.title,
          durationSeconds: submitState.elapsed || 0,
          questions: submitState.exercise.questions,
          ...graded,
        });
      } finally {
        setSaving(false);
        setLoading(false);
      }
    }

    saveOrLoadAttempt();
  }, [attempt, attemptId, location.state, navigate, user]);

  if (loading || saving) {
    return <LoadingSpinner message={saving ? 'Menghitung nilai...' : 'Memuat hasil...'} />;
  }

  if (!attempt) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Hasil latihan tidak ditemukan.</p>
          <Link to="/" className="btn btn-primary">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page results-page">
      <section className="results-hero card-panel">
        <div>
          <p className="eyebrow">Hasil Latihan</p>
          <h1>{attempt.exerciseTitle}</h1>
          <p className="grade-label">{attempt.gradeLabel}</p>
          <div className="results-stats">
            <span>{attempt.correctCount}/{attempt.totalQuestions} benar</span>
            <span>Waktu: {formatDuration(attempt.durationSeconds || 0)}</span>
          </div>
          <div className="hero-actions">
            <Link to="/" className="btn btn-primary">
              Dashboard
            </Link>
            <Link to="/history" className="btn btn-secondary">
              Riwayat Latihan
            </Link>
          </div>
        </div>
        <ScoreRing percentage={attempt.percentage} />
      </section>

      <section className="section-block">
        <h2>Pembahasan Soal</h2>
        <div className="review-list">
          {attempt.results.map((result) => {
            const question = attempt.questions.find((item) => item.id === result.questionId);
            if (!question) return null;

            return (
              <QuestionCard
                key={result.questionId}
                question={question}
                selectedAnswer={result.userAnswer}
                showResult
                result={result}
                disabled
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
