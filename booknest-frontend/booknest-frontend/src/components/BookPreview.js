import React, { useState, useEffect, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { wishlistAPI } from '../api';
import { useNavigate } from 'react-router-dom';
import './BookPreview.css';

/* ── genre-specific accents for the trailer panel ── */
const genreConfig = {
  'Fiction':              { emoji: '📖', accent: '#c8622a', tagline: 'A Story Worth Living' },
  'Mystery & Thriller':   { emoji: '🔍', accent: '#6c3483', tagline: 'Every Page Holds a Secret' },
  'Fantasy':              { emoji: '🐉', accent: '#1a5276', tagline: 'Worlds Beyond Imagination' },
  'Science & Technology': { emoji: '🔬', accent: '#117a65', tagline: 'Ideas That Shape Tomorrow' },
  'Self-Help':            { emoji: '🌱', accent: '#b7950b', tagline: 'Transform Your Journey' },
  'History':              { emoji: '🏛️', accent: '#784212', tagline: 'Echoes of the Past' },
  'Romance':              { emoji: '💕', accent: '#c0392b', tagline: 'Love Between the Lines' },
  "Children's Books":     { emoji: '🌈', accent: '#2e86c1', tagline: 'Magic for Young Minds' },
};
const defaultGenre = { emoji: '📚', accent: '#c8622a', tagline: 'Discover Something New' };

export default function BookPreview({ book, onClose }) {
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [toast, setToast] = useState('');
  const [closing, setClosing] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 400);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [handleClose]);

  const handleAddToCart = async () => {
    if (!isLoggedIn) { handleClose(); navigate('/login'); return; }
    try {
      setAdding(true);
      await addToCart(book.product_id, 1);
      showToast('Added to cart!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const handleWishlist = async () => {
    if (!isLoggedIn) { handleClose(); navigate('/login'); return; }
    try {
      await wishlistAPI.addItem({ product_id: book.product_id });
      setWishlisted(true);
      showToast('Added to wishlist!');
    } catch {}
  };

  const coverColor = [
    '#f2e8e0','#e8f0f2','#e8f2e8','#f2f0e8','#ede8f2'
  ][book.name?.charCodeAt(0) % 5];

  if (!book) return null;

  const genre = genreConfig[book.category_name] || defaultGenre;
  const descSnippet = (book.description || 'A wonderful book waiting to be explored.').slice(0, 120);

  return (
    <div
      className={`preview-overlay ${closing ? 'closing' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`preview-modal ${closing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button className="preview-close" onClick={handleClose} aria-label="Close">
          <span>&times;</span>
        </button>

        {/* ── Left Panel: Cover + Details ── */}
        <div className="preview-left">
          <div className="preview-cover" style={{ background: coverColor }}>
            {book.image ? (
              <img src={book.image} alt={book.name} className="preview-cover-img" />
            ) : (
              <div className="preview-cover-placeholder">
                <span className="preview-cover-icon">📖</span>
              </div>
            )}
            <div className="preview-cover-glow" />
          </div>

          <div className="preview-details">
            <div className="preview-header">
              <span className="preview-category">{book.category_name || 'Book'}</span>
              <h2 className="preview-title">{book.name}</h2>
              <p className="preview-author">by {book.author}</p>
            </div>

            <p className="preview-description">
              {book.description || 'A wonderful book waiting to be explored. Dive into the pages and discover a world of imagination, knowledge, and adventure.'}
            </p>

            <div className="preview-meta">
              <div className="preview-price">₹{book.price}</div>
              <span className={`preview-stock ${book.stock === 0 ? 'out' : ''}`}>
                {book.stock === 0 ? 'Out of stock' : `${book.stock} in stock`}
              </span>
            </div>

            <div className="preview-actions">
              <button
                className="btn btn-primary preview-cart-btn"
                onClick={handleAddToCart}
                disabled={adding || book.stock === 0}
              >
                {adding ? 'Adding…' : '🛒 Add to Cart'}
              </button>
              <button
                className={`preview-wish-btn ${wishlisted ? 'active' : ''}`}
                onClick={handleWishlist}
              >
                {wishlisted ? '❤️ Wishlisted' : '🤍 Wishlist'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Book Overview Trailer ── */}
        <div className="preview-video-panel">
          <div className="preview-video-inner">
            <video className="preview-video" autoPlay muted loop playsInline>
              <source src="/videos/book-macro.mp4" type="video/mp4" />
            </video>
            <div className="preview-video-overlay" style={{
              background: `linear-gradient(180deg, ${genre.accent}22 0%, ${genre.accent}88 50%, ${genre.accent}dd 100%)`
            }} />

            {/* ── Cinematic Book Trailer Content ── */}
            <div className="trailer-content">
              {/* Top: genre badge */}
              <div className="trailer-top">
                <span className="trailer-genre-badge" style={{ borderColor: `${genre.accent}66` }}>
                  {genre.emoji} {book.category_name || 'Book'}
                </span>
              </div>

              {/* Center: animated title reveal */}
              <div className="trailer-center">
                <div className="trailer-line trailer-line-1" />
                <h3 className="trailer-title">{book.name}</h3>
                <p className="trailer-author-name">{book.author}</p>
                <div className="trailer-line trailer-line-2" />
              </div>

              {/* Scrolling description snippet */}
              <div className="trailer-description">
                <p>"{descSnippet}…"</p>
              </div>

              {/* Bottom: tagline + branding */}
              <div className="trailer-bottom">
                <p className="trailer-tagline">{genre.tagline}</p>
                <div className="trailer-divider" />
                <span className="trailer-brand">BookNest</span>
              </div>
            </div>
          </div>
        </div>

        {toast && <div className="preview-toast">{toast}</div>}
      </div>
    </div>
  );
}
