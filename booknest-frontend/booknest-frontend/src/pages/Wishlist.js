import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { wishlistAPI } from '../api';
import { useCart } from '../context/CartContext';
import './Wishlist.css';

export default function Wishlist() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const { fetchCart }         = useCart();
  const navigate              = useNavigate();

  const load = () => {
    wishlistAPI.get()
      .then(({ data }) => setItems(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (id) => {
    await wishlistAPI.removeItem(id);
    setItems(items.filter(i => i.wishlist_item_id !== id));
  };

  const handleMoveToCart = async (id) => {
    await wishlistAPI.moveToCart(id);
    await fetchCart();
    setItems(items.filter(i => i.wishlist_item_id !== id));
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 className="section-title">My Wishlist</h1>
        <p className="section-subtitle">{items.length} saved book{items.length !== 1 ? 's' : ''}</p>

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤍</div>
            <h3>Your wishlist is empty</h3>
            <p>Save books you love for later</p>
            <Link to="/" className="btn btn-primary">Browse Books</Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {items.map((item) => (
              <div key={item.wishlist_item_id} className="wishlist-card card">
                <div
                  className="wl-cover"
                  onClick={() => navigate(`/books/${item.product_id}`)}
                >
                  {item.product?.image
                    ? <img src={item.product.image} alt={item.product.name} />
                    : <div className="wl-cover-placeholder">📖</div>
                  }
                </div>
                <div className="wl-info">
                  <p className="wl-author">{item.product?.author}</p>
                  <h3 className="wl-title">{item.product?.name}</h3>
                  <p className="wl-price">₹{item.product?.price}</p>
                  <div className="wl-actions">
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                      onClick={() => handleMoveToCart(item.wishlist_item_id)}
                    >
                      Move to Cart
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.82rem' }}
                      onClick={() => handleRemove(item.wishlist_item_id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
