import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, isLoggedIn } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="container navbar-inner">

        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">BookNest</span>
        </Link>

        {/* Desktop Nav */}
        <div className="navbar-links">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Browse</Link>
          {isLoggedIn && (
            <>
              <Link to="/wishlist" className={`nav-link ${isActive('/wishlist') ? 'active' : ''}`}>Wishlist</Link>
              <Link to="/orders" className={`nav-link ${isActive('/orders') ? 'active' : ''}`}>Orders</Link>
              {user?.is_admin && (
                <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>Admin</Link>
              )}
            </>
          )}
        </div>

        {/* Right Actions */}
        <div className="navbar-actions">
          {isLoggedIn ? (
            <>
              {/* Cart */}
              <Link to="/cart" className="cart-btn">
                <span>🛒</span>
                {cart.item_count > 0 && (
                  <span className="badge">{cart.item_count}</span>
                )}
              </Link>

              {/* User Menu */}
              <div className="user-menu">
                <button className="user-btn" onClick={() => setMenuOpen(!menuOpen)}>
                  <span className="user-avatar">{user?.username?.[0]?.toUpperCase()}</span>
                  <span className="user-name">{user?.username}</span>
                  <span className="chevron">▾</span>
                </button>
                {menuOpen && (
                  <div className="dropdown" onMouseLeave={() => setMenuOpen(false)}>
                    <Link to="/profile" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      👤 My Profile
                    </Link>
                    <Link to="/orders" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      📦 My Orders
                    </Link>
                    {user?.is_admin && (
                      <Link to="/admin" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                        ⚙️ Admin Panel
                      </Link>
                    )}
                    <div className="dropdown-divider" />
                    <button className="dropdown-item danger" onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="btn btn-ghost">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
