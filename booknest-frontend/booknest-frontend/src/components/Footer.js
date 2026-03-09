import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">📚 BookNest</span>
          <p>Your favourite online bookstore</p>
        </div>
        <div className="footer-links">
          <Link to="/">Browse Books</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/profile">Profile</Link>
        </div>
        <p className="footer-copy">© {new Date().getFullYear()} BookNest. All rights reserved.</p>
      </div>
    </footer>
  );
}
