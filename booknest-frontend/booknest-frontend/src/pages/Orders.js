import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ordersAPI } from '../api';
import './Orders.css';

const TRACKING_STEPS = ['Order Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'];

function normalizeStatus(status) {
  return (status || '').toLowerCase().trim();
}

function getDisplayTrackingStatus(status) {
  const normalized = normalizeStatus(status);
  if (normalized === 'pending' || normalized === 'paid') return 'Order Confirmed';
  if (normalized === 'shipped') return 'Shipped';
  if (normalized === 'out for delivery') return 'Out for Delivery';
  if (normalized === 'delivered') return 'Delivered';
  return 'Order Confirmed';
}

function getTrackingStepIndex(status) {
  const displayStatus = getDisplayTrackingStatus(status);
  const index = TRACKING_STEPS.indexOf(displayStatus);
  return index === -1 ? 0 : index;
}

function getTrackingStepClass(stepIndex, currentIndex, isCancelled) {
  if (isCancelled) return 'upcoming';
  if (stepIndex < currentIndex) return 'complete';
  if (stepIndex === currentIndex) return 'active';
  return 'upcoming';
}

// ── Orders List ────────────────────────────────────────────────────────────
export function Orders() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersAPI.getAll()
      .then(({ data }) => setOrders(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 className="section-title">My Orders</h1>
        <p className="section-subtitle">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>

        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No orders yet</h3>
            <p>When you place an order, it will appear here</p>
            <Link to="/" className="btn btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const isCancelled = normalizeStatus(order.order_status) === 'cancelled';
              const currentIndex = getTrackingStepIndex(order.order_status);
              return (
                <Link to={`/orders/${order.order_id}`} key={order.order_id} className="order-card card">
                <div className="order-card-left">
                  <p className="order-id">Order #{order.order_id.slice(0, 8).toUpperCase()}</p>
                  <p className="order-date">{new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}</p>
                </div>
                <div className="order-card-mid">
                  <span className={`status-pill status-${order.order_status?.toLowerCase()}`}>
                    {order.order_status}
                  </span>
                  <div className="order-track-mini" aria-label="Order tracking">
                    {TRACKING_STEPS.map((step, idx) => (
                      <span
                        key={step}
                        className={`track-mini-dot ${getTrackingStepClass(idx, currentIndex, isCancelled)}`}
                        title={step}
                      />
                    ))}
                  </div>
                </div>
                <div className="order-card-right">
                  <p className="order-amount">₹{order.total_amount}</p>
                  <span className="view-link">View →</span>
                </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Order Detail ───────────────────────────────────────────────────────────
export function OrderDetail() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success');
  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    ordersAPI.getOne(orderId)
      .then(({ data }) => setOrder(data))
      .catch(() => setError('Order not found.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      await ordersAPI.cancel(orderId);
      setOrder({ ...order, order_status: 'Cancelled' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel.');
    } finally { setCancelling(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (error)   return <div className="container page-wrapper"><div className="alert alert-error">{error}</div></div>;

  const isCancelled = normalizeStatus(order.order_status) === 'cancelled';
  const currentIndex = getTrackingStepIndex(order.order_status);
  const currentDisplayStep = getDisplayTrackingStatus(order.order_status);

  return (
    <div className="page-wrapper">
      <div className="container">
        {success && (
          <div className="alert alert-success" style={{ marginBottom: 28 }}>
            🎉 Payment successful! Your order has been placed.
          </div>
        )}

        <div className="order-detail-header">
          <div>
            <h1 className="section-title">Order Details</h1>
            <p className="section-subtitle">#{order.order_id.slice(0, 8).toUpperCase()}</p>
          </div>
          <span className={`status-pill status-${order.order_status?.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
            {order.order_status}
          </span>
        </div>

        <div className="order-detail-layout">
          <div>
            {/* Tracking */}
            <div className="od-section card">
              <h2>🚚 Order Tracking</h2>
              {isCancelled ? (
                <div className="tracking-cancelled">This order was cancelled. No further delivery updates are available.</div>
              ) : (
                <div className="tracking-steps" aria-label="Order progress tracker">
                  {TRACKING_STEPS.map((step, idx) => {
                    const state = getTrackingStepClass(idx, currentIndex, isCancelled);
                    return (
                      <div key={step} className={`tracking-step ${state}`}>
                        <div className="tracking-node" />
                        <span className="tracking-label">{step}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="tracking-note">
                {isCancelled
                  ? 'If this was unexpected, contact support with your order ID.'
                  : `Latest update: ${currentDisplayStep}.`}
              </p>
            </div>

            {/* Items */}
            <div className="od-section card" style={{ marginTop: 20 }}>
              <h2>📚 Items Ordered</h2>
              <div className="od-items">
                {order.items?.map((item) => (
                  <div key={item.order_item_id} className="od-item-row">
                    <div className="od-item-info">
                      <span className="od-item-name">{item.product_name || item.product_id}</span>
                      <span className="od-item-qty">Qty: {item.quantity}</span>
                    </div>
                    <span className="od-item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="od-total-row">
                  <span>Total</span>
                  <span>₹{order.total_amount}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {order.address && (
              <div className="od-section card" style={{ marginTop: 20 }}>
                <h2>📍 Delivery Address</h2>
                <div className="od-address">
                  <strong>{order.address.full_name}</strong>
                  <p>{order.address.house_no}, {order.address.street}</p>
                  <p>{order.address.city}, {order.address.state} - {order.address.pincode}</p>
                  <p>{order.address.country}</p>
                  <p>📞 {order.address.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Order Info */}
          <div>
            <div className="od-section card">
              <h2>📋 Order Info</h2>
              <div className="od-info-rows">
                <div className="od-info-row">
                  <span>Order ID</span>
                  <span>#{order.order_id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="od-info-row">
                  <span>Date</span>
                  <span>{new Date(order.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="od-info-row">
                  <span>Payment</span>
                  <span>{order.payment_mode}</span>
                </div>
                <div className="od-info-row">
                  <span>Payment Status</span>
                  <span className={`status-pill status-${order.payment_status?.toLowerCase()}`}>
                    {order.payment_status}
                  </span>
                </div>
              </div>

              {['Pending', 'Paid'].includes(order.order_status) && (
                <button
                  className="btn btn-danger btn-full"
                  style={{ marginTop: 20 }}
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling…' : '✕ Cancel Order'}
                </button>
              )}
            </div>
            <Link to="/orders" className="btn btn-secondary btn-full" style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              ← Back to Orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
