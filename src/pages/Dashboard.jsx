import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [stats, setStats] = useState({ totalAttempts: 0, averageScore: 0, bestScore: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!user) return;

      const exercisesQuery = query(
        collection(db, 'exercises'),
        orderBy('createdAt', 'desc'),
        limit(12)
      );
      const attemptsQuery = query(collection(db, 'attempts'), where('userId', '==', user.uid));

      const [exercisesSnap, attemptsSnap] = await Promise.all([
        getDocs(exercisesQuery),
        getDocs(attemptsQuery),
      ]);

      const exerciseList = exercisesSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const allAttempts = attemptsSnap.docs.map((docSnap) => docSnap.data());
      const attemptList = attemptsSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => (b.completedAt?.seconds || 0) - (a.completedAt?.seconds || 0))
        .slice(0, 5);

      const totalAttempts = allAttempts.length;
      const averageScore =
        totalAttempts > 0
          ? Math.round(allAttempts.reduce((sum, item) => sum + item.percentage, 0) / totalAttempts)
          : 0;
      const bestScore =
        totalAttempts > 0 ? Math.max(...allAttempts.map((item) => item.percentage)) : 0;

      setExercises(exerciseList);
      setRecentAttempts(attemptList);
      setStats({ totalAttempts, averageScore, bestScore });
      setLoading(false);
    }

    loadDashboard();
  }, [user]);

  if (loading) {
    return <LoadingSpinner message="Memuat dashboard..." />;
  }

  return (
    <div className="page dashboard-page">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Platform Latihan Online</p>
          <h1>Halo, {user?.displayName || 'Pelajar'}! 👋</h1>
          <p className="hero-text">
            Upload soal latihan dari PDF/DOCX, kerjakan online, dan dapatkan nilai plus pembahasan
            secara instan.
          </p>
          <div className="hero-actions">
            <Link to="/upload" className="btn btn-primary">
              Upload Soal Baru
            </Link>
            <Link to="/history" className="btn btn-secondary">
              Lihat Riwayat
            </Link>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span>Total Latihan</span>
            <strong>{stats.totalAttempts}</strong>
          </div>
          <div className="stat-card">
            <span>Rata-rata Nilai</span>
            <strong>{stats.averageScore}%</strong>
          </div>
          <div className="stat-card">
            <span>Nilai Terbaik</span>
            <strong>{stats.bestScore}%</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-header">
          <h2>Latihan Tersedia</h2>
          <Link to="/upload">+ Buat latihan</Link>
        </div>

        {exercises.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada latihan. Upload dokumen soal pertama Anda!</p>
            <Link to="/upload" className="btn btn-primary">
              Upload Sekarang
            </Link>
          </div>
        ) : (
          <div className="card-grid">
            {exercises.map((exercise) => (
              <article key={exercise.id} className="exercise-card">
                <div className="exercise-card-top">
                  <span className="file-badge">{exercise.fileType?.toUpperCase() || 'DOC'}</span>
                  <span>{exercise.questionCount} soal</span>
                </div>
                <h3>{exercise.title}</h3>
                <p>Diupload oleh {exercise.uploaderName || 'Pengguna'}</p>
                <Link to={`/quiz/${exercise.id}`} className="btn btn-primary btn-block">
                  Mulai Latihan
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-header">
          <h2>Latihan Terakhir</h2>
          <Link to="/history">Lihat semua</Link>
        </div>

        {recentAttempts.length === 0 ? (
          <div className="empty-state compact">
            <p>Belum ada riwayat latihan. Kerjakan latihan pertama Anda!</p>
          </div>
        ) : (
          <div className="history-list">
            {recentAttempts.map((attempt) => (
              <Link key={attempt.id} to={`/results/${attempt.id}`} className="history-item">
                <div>
                  <strong>{attempt.exerciseTitle}</strong>
                  <span>{attempt.correctCount}/{attempt.totalQuestions} benar</span>
                </div>
                <span className={`score-badge ${attempt.percentage >= 75 ? 'good' : 'warn'}`}>
                  {attempt.percentage}%
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
