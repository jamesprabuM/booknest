import React, { useState, useEffect, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { wishlistAPI } from '../api';
import { useNavigate } from 'react-router-dom';
import './BookPreview.css';

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
    setTimeout(() => setToast(''), 2000);
  };

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 350);
  }, [onClose]);

  // Close on Escape key
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

        {/* Book Cover Section */}
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

        {/* Book Details Section */}
        <div className="preview-details">
          <div className="preview-header">
            <p className="preview-author">{book.author}</p>
            <h2 className="preview-title">{book.name}</h2>
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
              {adding ? 'Adding...' : '🛒 Add to Cart'}
            </button>
            <button
              className={`preview-wish-btn ${wishlisted ? 'active' : ''}`}
              onClick={handleWishlist}
            >
              {wishlisted ? '❤️ Wishlisted' : '🤍 Add to Wishlist'}
            </button>
          </div>

          {toast && <div className="preview-toast">{toast}</div>}
        </div>
      </div>
    </div>
  );
}
