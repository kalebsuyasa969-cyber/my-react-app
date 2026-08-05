import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-icon">📚</span>
          <span>
            Latihan<span className="brand-accent">Ku</span>
          </span>
        </Link>

        {user && (
          <nav className="nav-links">
            <Link to="/">Dashboard</Link>
            <Link to="/upload">Upload Soal</Link>
            <Link to="/history">Riwayat</Link>
          </nav>
        )}

        <div className="nav-actions">
          {user ? (
            <>
              <span className="user-chip">{user.displayName || user.email}</span>
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Masuk
              </Link>
              <Link to="/register" className="btn btn-primary">
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
