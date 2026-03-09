import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Cart.css';

export default function Cart() {
  const { cart, loading, updateItem, removeItem } = useCart();
  const navigate = useNavigate();

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 className="section-title">Shopping Cart</h1>
        <p className="section-subtitle">{cart.item_count} item{cart.item_count !== 1 ? 's' : ''} in your cart</p>

        {cart.items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <h3>Your cart is empty</h3>
            <p>Add some books to get started</p>
            <Link to="/" className="btn btn-primary">Browse Books</Link>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Items */}
            <div className="cart-items">
              {cart.items.map((item) => (
                <div key={item.cart_item_id} className="cart-item card">
                  <div className="item-cover">
                    {item.product?.image
                      ? <img src={item.product.image} alt={item.product.name} />
                      : <div className="item-cover-placeholder">📖</div>
                    }
                  </div>
                  <div className="item-details">
                    <h3 className="item-title">{item.product?.name}</h3>
                    <p className="item-author">{item.product?.author}</p>
                    <p className="item-price">₹{item.product?.price}</p>
                  </div>
                  <div className="item-actions">
                    <div className="qty-control">
                      <button
                        className="qty-btn"
                        onClick={() => item.quantity > 1
                          ? updateItem(item.cart_item_id, item.quantity - 1)
                          : removeItem(item.cart_item_id)
                        }
                      >−</button>
                      <span className="qty-value">{item.quantity}</span>
                      <button
                        className="qty-btn"
                        onClick={() => updateItem(item.cart_item_id, item.quantity + 1)}
                        disabled={item.quantity >= item.product?.stock}
                      >+</button>
                    </div>
                    <p className="item-subtotal">₹{(item.product?.price * item.quantity).toFixed(2)}</p>
                    <button
                      className="btn btn-ghost remove-btn"
                      onClick={() => removeItem(item.cart_item_id)}
                    >🗑</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="cart-summary card">
              <h2 className="summary-title">Order Summary</h2>
              <div className="summary-rows">
                <div className="summary-row">
                  <span>Subtotal ({cart.item_count} items)</span>
                  <span>₹{cart.total}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span className="free-shipping">FREE</span>
                </div>
                <div className="summary-divider" />
                <div className="summary-row total-row">
                  <span>Total</span>
                  <span>₹{cart.total}</span>
                </div>
              </div>
              <button
                className="btn btn-primary btn-full"
                onClick={() => navigate('/checkout')}
              >
                Proceed to Checkout →
              </button>
              <Link to="/" className="continue-shopping">← Continue Shopping</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
