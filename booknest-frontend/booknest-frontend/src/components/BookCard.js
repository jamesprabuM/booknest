import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { wishlistAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import './BookCard.css';

export default function BookCard({ book, onPreview }) {
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (!isLoggedIn) { navigate('/login'); return; }
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

  const handleWishlist = async (e) => {
    e.stopPropagation();
    if (!isLoggedIn) { navigate('/login'); return; }
    try {
      await wishlistAPI.addItem({ product_id: book.product_id });
      setWishlisted(true);
      showToast('Added to wishlist!');
    } catch {}
  };

  const handleBuyNow = async (e) => {
    e.stopPropagation();
    if (!isLoggedIn) { navigate('/login'); return; }
    setBuying(true);
    navigate('/checkout', {
      state: {
        buyNowItems: [{ product_id: book.product_id, quantity: 1 }],
        buyNowPreview: [{
          product_id: book.product_id,
          quantity: 1,
          product: {
            name: book.name,
            price: book.price,
          },
        }],
      },
    });
    setBuying(false);
  };

  const coverColor = [
    '#f2e8e0','#e8f0f2','#e8f2e8','#f2f0e8','#ede8f2'
  ][book.name?.charCodeAt(0) % 5];

  return (
    <div className="book-card" onClick={() => onPreview ? onPreview(book) : navigate(`/books/${book.product_id}`)}>
      {/* Cover */}
      <div className="book-cover" style={{ background: coverColor }}>
        {book.image
          ? <img src={book.image} alt={book.name} />
          : <div className="cover-placeholder">
              <span className="cover-icon">📖</span>
              <span className="cover-title">{book.name}</span>
            </div>
        }
        <button
          className={`wishlist-btn ${wishlisted ? 'active' : ''}`}
          onClick={handleWishlist}
          title="Add to wishlist"
        >
          {wishlisted ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Info */}
      <div className="book-info">
        <p className="book-author">{book.author}</p>
        <h3 className="book-title">{book.name}</h3>
        <div className="book-footer">
          <span className="book-price">₹{book.price}</span>
          <span className={`stock-badge ${book.stock === 0 ? 'out' : ''}`}>
            {book.stock === 0 ? 'Out of stock' : `${book.stock} left`}
          </span>
        </div>
        <div className="book-actions">
          <button
            className="btn btn-primary btn-add"
            onClick={handleAddToCart}
            disabled={adding || buying || book.stock === 0}
          >
            {adding ? '...' : '+ Add to Cart'}
          </button>
          <button
            className="btn btn-secondary btn-buy-now"
            onClick={handleBuyNow}
            disabled={buying || adding || book.stock === 0}
          >
            {buying ? '...' : 'Buy Now'}
          </button>
        </div>
      </div>

      {toast && <div className="book-toast">{toast}</div>}
    </div>
  );
}
