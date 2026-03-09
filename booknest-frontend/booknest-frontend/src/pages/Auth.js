import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import './Auth.css';

// ── Login ──────────────────────────────────────────────────────────────────
export function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data;
      if (typeof msg === 'object') {
        setError(Object.values(msg).flat().join(' '));
      } else {
        setError('Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left — Video + Branding */}
      <div className="auth-showcase">
        <div className="auth-video-wrap">
          <video className="auth-video" autoPlay muted loop playsInline>
            <source src="/videos/auth-bg.mp4" type="video/mp4" />
          </video>
          <div className="auth-video-overlay" />
        </div>
        <div className="auth-showcase-content">
          <Link to="/" className="auth-brand">📚 BookNest</Link>
          <h2 className="auth-tagline">Your Next<br />Great Read<br />Awaits</h2>
          <p className="auth-blurb">Discover thousands of books across every genre — curated for passionate readers.</p>
          <div className="auth-showcase-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-header">
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to continue your reading journey</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field" style={{ animationDelay: '0.2s' }}>
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="auth-field" style={{ animationDelay: '0.3s' }}>
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Register ───────────────────────────────────────────────────────────────
export function Register() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [form, setForm]       = useState({ username: '', email: '', password: '', phone: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.register(form);
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data;
      if (typeof msg === 'object') {
        setError(Object.values(msg).flat().join(' '));
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left — Video + Branding */}
      <div className="auth-showcase">
        <div className="auth-video-wrap">
          <video className="auth-video" autoPlay muted loop playsInline>
            <source src="/videos/auth-bg.mp4" type="video/mp4" />
          </video>
          <div className="auth-video-overlay" />
        </div>
        <div className="auth-showcase-content">
          <Link to="/" className="auth-brand">📚 BookNest</Link>
          <h2 className="auth-tagline">Start Your<br />Reading<br />Adventure</h2>
          <p className="auth-blurb">Join a community of book lovers — access exclusive collections and personalized picks.</p>
          <div className="auth-showcase-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-header">
            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">Join thousands of book lovers</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field" style={{ animationDelay: '0.15s' }}>
              <label className="auth-label">Full Name</label>
              <input
                className="auth-input"
                type="text"
                name="username"
                placeholder="Priya Sharma"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="auth-field" style={{ animationDelay: '0.22s' }}>
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="auth-field" style={{ animationDelay: '0.29s' }}>
              <label className="auth-label">Phone (optional)</label>
              <input
                className="auth-input"
                type="tel"
                name="phone"
                placeholder="9876543210"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div className="auth-field" style={{ animationDelay: '0.36s' }}>
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                name="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
