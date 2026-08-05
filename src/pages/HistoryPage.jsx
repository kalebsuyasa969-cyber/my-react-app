import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDuration } from '../utils/gradeQuiz';

export default function HistoryPage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      const attemptsQuery = query(collection(db, 'attempts'), where('userId', '==', user.uid));
      const snap = await getDocs(attemptsQuery);
      const sorted = snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0));
      setAttempts(sorted);
      setLoading(false);
    }

    loadHistory();
  }, [user]);

  if (loading) {
    return <LoadingSpinner message="Memuat riwayat..." />;
  }

  return (
    <div className="page history-page">
      <div className="page-header">
        <h1>Riwayat Latihan</h1>
        <p>Semua hasil latihan dan nilai Anda tersimpan di sini.</p>
      </div>

      {attempts.length === 0 ? (
        <div className="empty-state">
          <p>Belum ada riwayat. Kerjakan latihan pertama Anda!</p>
          <Link to="/upload" className="btn btn-primary">
            Upload Latihan
          </Link>
        </div>
      ) : (
        <div className="history-table card-panel">
          {attempts.map((attempt) => (
            <Link key={attempt.id} to={`/results/${attempt.id}`} className="history-row">
              <div>
                <strong>{attempt.exerciseTitle}</strong>
                <span>
                  {attempt.correctCount}/{attempt.totalQuestions} benar ·{' '}
                  {formatDuration(attempt.durationSeconds || 0)}
                </span>
              </div>
              <div className="history-row-right">
                <span className="grade-tag">{attempt.gradeLabel}</span>
                <span className={`score-badge ${attempt.percentage >= 75 ? 'good' : 'warn'}`}>
                  {attempt.percentage}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
