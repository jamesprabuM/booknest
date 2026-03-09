import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, ordersAPI, paymentsAPI } from '../api';
import { useCart } from '../context/CartContext';
import './Checkout.css';

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [newAddr, setNewAddr] = useState({
    full_name: '', phone: '', house_no: '', street: '', city: '', state: '', pincode: '', country: 'India'
  });
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    authAPI.getAddresses().then(({ data }) => {
      setAddresses(data);
      if (data.length > 0) setSelectedAddress(data[0].address_id);
    }).catch(() => {});
  }, []);

  const handleAddrChange = (e) => setNewAddr({ ...newAddr, [e.target.name]: e.target.value });

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation is not supported by your browser.'); return; }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const a = data.address || {};
          setNewAddr((prev) => ({
            ...prev,
            house_no: a.house_number || prev.house_no,
            street:   a.road || a.neighbourhood || a.suburb || prev.street,
            city:     a.city || a.town || a.village || a.county || prev.city,
            state:    a.state || prev.state,
            pincode:  a.postcode || prev.pincode,
            country:  a.country || prev.country,
          }));
        } catch {
          setError('Could not fetch address from location.');
        } finally { setLocating(false); }
      },
      () => { setError('Location access denied. Please allow location permission.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const { data } = await authAPI.addAddress(newAddr);
      setAddresses([...addresses, data]);
      setSelectedAddress(data.address_id);
      setShowAddForm(false);
    } catch { setError('Failed to save address.'); }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { setError('Please select a delivery address.'); return; }
    if (cart.items.length === 0) { setError('Your cart is empty.'); return; }
    setError(''); setPlacing(true);
    try {
      const { data: order } = await ordersAPI.checkout({
        address_id: selectedAddress,
        payment_mode: 'Razorpay',
      });

      // Create Razorpay order
      const { data: payment } = await paymentsAPI.create({ order_id: order.order_id });

      // Open Razorpay popup
      const options = {
        key: payment.razorpay_key_id,
        amount: payment.amount,
        currency: payment.currency,
        name: 'BookNest',
        description: 'Book Purchase',
        order_id: payment.razorpay_order_id,
        handler: async (response) => {
          await paymentsAPI.verify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            order_id:            order.order_id,
          });
          await clearCart();
          navigate(`/orders/${order.order_id}?success=true`);
        },
        prefill: { name: newAddr.full_name },
        theme: { color: '#c8622a' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 className="section-title">Checkout</h1>
        <p className="section-subtitle">Review your order and complete payment</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="checkout-layout">
          <div className="checkout-main">
            {/* Delivery Address */}
            <div className="checkout-section card">
              <div className="section-header">
                <h2>📍 Delivery Address</h2>
                <button className="btn btn-ghost" onClick={() => setShowAddForm(!showAddForm)}>
                  + Add New
                </button>
              </div>

              {addresses.length === 0 && !showAddForm && (
                <p className="no-address">No addresses saved. Add one below.</p>
              )}

              <div className="address-list">
                {addresses.map((addr) => (
                  <label key={addr.address_id} className={`address-option ${selectedAddress === addr.address_id ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="address"
                      value={addr.address_id}
                      checked={selectedAddress === addr.address_id}
                      onChange={() => setSelectedAddress(addr.address_id)}
                    />
                    <div className="address-text">
                      <strong>{addr.full_name}</strong>
                      <span>{addr.house_no}, {addr.street}, {addr.city}</span>
                      <span>{addr.state} - {addr.pincode}, {addr.country}</span>
                      <span>📞 {addr.phone}</span>
                    </div>
                  </label>
                ))}
              </div>

              {showAddForm && (
                <form className="add-address-form" onSubmit={handleAddAddress}>
                  <div className="addr-form-header">
                    <h3>New Address</h3>
                    <button type="button" className="btn btn-location" onClick={handleUseMyLocation} disabled={locating}>
                      {locating ? '⏳ Detecting…' : '📍 Use My Location'}
                    </button>
                  </div>
                  <div className="addr-grid">
                    {[
                      { name: 'full_name', label: 'Full Name', placeholder: 'Priya Sharma' },
                      { name: 'phone',     label: 'Phone',     placeholder: '9876543210' },
                      { name: 'house_no',  label: 'House No',  placeholder: '42' },
                      { name: 'street',    label: 'Street',    placeholder: 'MG Road' },
                      { name: 'city',      label: 'City',      placeholder: 'Bengaluru' },
                      { name: 'state',     label: 'State',     placeholder: 'Karnataka' },
                      { name: 'pincode',   label: 'Pincode',   placeholder: '560001' },
                      { name: 'country',   label: 'Country',   placeholder: 'India' },
                    ].map((f) => (
                      <div key={f.name} className="form-group">
                        <label className="form-label">{f.label}</label>
                        <input className="form-input" name={f.name} placeholder={f.placeholder}
                          value={newAddr[f.name]} onChange={handleAddrChange} required />
                      </div>
                    ))}
                  </div>
                  <div className="addr-form-actions">
                    <button type="submit" className="btn btn-primary">Save Address</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>

            {/* Order Items */}
            <div className="checkout-section card">
              <h2>📚 Order Items</h2>
              <div className="order-items-list">
                {cart.items.map((item) => (
                  <div key={item.cart_item_id} className="order-item-row">
                    <span className="oi-name">{item.product?.name}</span>
                    <span className="oi-qty">×{item.quantity}</span>
                    <span className="oi-price">₹{(item.product?.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="checkout-summary card">
            <h2>💳 Payment Summary</h2>
            <div className="summary-rows">
              <div className="summary-row">
                <span>Items ({cart.item_count})</span>
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

            <div className="payment-badge">
              <span>🔒 Secured by Razorpay</span>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handlePlaceOrder}
              disabled={placing || cart.items.length === 0}
            >
              {placing ? 'Processing…' : `Pay ₹${cart.total}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
