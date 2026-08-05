import { Link, useNavigate } from "react-router-dom";
import { Home, BookOpen, Upload, History, LogOut } from "lucide-react";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
    // nanti sesuaikan dengan Firebase logout kamu
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <BookOpen size={28} />
        <h2>Kk Jedi Jaya</h2>
      </div>

      <div className="navbar-menu">
        <Link to="/dashboard">
          <Home size={18} />
          Dashboard
        </Link>

        <Link to="/quiz">
          <BookOpen size={18} />
          Quiz
        </Link>

        <Link to="/upload">
          <Upload size={18} />
          Upload
        </Link>

        <Link to="/history">
          <History size={18} />
          History
        </Link>

        <button onClick={logout} className="logout">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;