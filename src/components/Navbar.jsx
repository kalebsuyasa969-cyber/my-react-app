import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, Upload, History, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-brand-mark">KJ</span>
        <h2>Kk Jedi Jaya</h2>
      </Link>

      <div className="navbar-menu">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          <Home size={18} />
          Dashboard
        </NavLink>

        <NavLink to="/upload" className={({ isActive }) => (isActive ? "active" : "")}>
          <Upload size={18} />
          Upload
        </NavLink>

        <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>
          <History size={18} />
          History
        </NavLink>

        <button onClick={handleLogout} className="logout">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
