import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI, ordersAPI, paymentsAPI } from '../api';
import { useCart } from '../context/CartContext';
import './Checkout.css';

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [newAddr, setNewAddr] = useState({
    full_name: '', phone: '', house_no: '', street: '', city: '', state: '', pincode: '', country: 'India'
  });
  const [locating, setLocating] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const buyNowItems = location.state?.buyNowItems;
  const buyNowPreview = location.state?.buyNowPreview;
  const isBuyNowCheckout = Array.isArray(buyNowItems) && buyNowItems.length > 0;

  const checkoutItems = isBuyNowCheckout ? (buyNowPreview || []) : cart.items;
  const checkoutItemCount = checkoutItems.length;
  const checkoutTotal = isBuyNowCheckout
    ? checkoutItems.reduce((sum, item) => sum + ((Number(item.product?.price) || 0) * (item.quantity || 1)), 0)
    : Number(cart.total || 0);

  // Validation rules
  const validateField = (name, value) => {
    const errors = {};
    
    if (!value.trim()) {
      errors[name] = 'This field is required';
    } else {
      switch (name) {
        case 'full_name':
          if (/\d/.test(value)) {
            errors[name] = 'Name cannot contain numbers';
          }
          if (value.trim().length < 2) {
            errors[name] = 'Name must be at least 2 characters';
          }
          break;
        case 'phone':
          if (!/^\d{10}$/.test(value.replace(/\s|-/g, ''))) {
            errors[name] = 'Phone must be 10 digits';
          }
          break;
        case 'house_no':
          if (!/^[0-9a-zA-Z\/-]+$/.test(value)) {
            errors[name] = 'House number contains invalid characters';
          }
          break;
        case 'street':
          if (/^[0-9]+$/.test(value)) {
            errors[name] = 'Street name contains only numbers';
          }
          break;
        case 'city':
          if (/\d/.test(value)) {
            errors[name] = 'City cannot contain numbers';
          }
          break;
        case 'state':
          if (/\d/.test(value)) {
            errors[name] = 'State cannot contain numbers';
          }
          break;
        case 'pincode':
          if (!/^\d{5,6}$/.test(value)) {
            errors[name] = 'Pincode must be 5-6 digits';
          }
          break;
        case 'country':
          if (/\d/.test(value)) {
            errors[name] = 'Country cannot contain numbers';
          }
          break;
        default:
          break;
      }
    }
    
    return errors;
  };

  const validateForm = () => {
    const errors = {};
    Object.keys(newAddr).forEach((key) => {
      const fieldErrors = validateField(key, newAddr[key]);
      Object.assign(errors, fieldErrors);
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    authAPI.getAddresses().then(({ data }) => {
      setAddresses(data);
      if (data.length > 0) setSelectedAddress(data[0].address_id);
    }).catch(() => {});
  }, []);

  const handleAddrChange = (e) => {
    const { name, value } = e.target;
    setNewAddr({ ...newAddr, [name]: value });
    
    // Real-time validation
    const fieldErrors = validateField(name, value);
    setFormErrors((prev) => {
      const updated = { ...prev };
      if (Object.keys(fieldErrors).length === 0) {
        delete updated[name];
      } else {
        Object.assign(updated, fieldErrors);
      }
      return updated;
    });
  };

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
    
    if (!validateForm()) {
      setError('Please fix the form errors before submitting.');
      return;
    }
    
    try {
      const { data } = await authAPI.addAddress(newAddr);
      setAddresses([...addresses, data]);
      setSelectedAddress(data.address_id);
      setShowAddForm(false);
      setFormErrors({});
    } catch { setError('Failed to save address.'); }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { setError('Please select a delivery address.'); return; }
    if (checkoutItems.length === 0) { setError('No items available for checkout.'); return; }
    setError(''); setPlacing(true);
    try {
      const { data: order } = await ordersAPI.checkout({
        address_id: selectedAddress,
        payment_mode: 'Razorpay',
        ...(isBuyNowCheckout ? { buy_now_items: buyNowItems } : {}),
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
          if (!isBuyNowCheckout) {
            await clearCart();
          }
          navigate(`/orders/${order.order_id}?success=true`);
        },
        prefill: { name: newAddr.full_name },
        theme: { color: '#c8622a' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Checkout error:', err.response?.status, err.response?.data, err.message);
      const msg = err.response?.data?.error || err.response?.data?.detail || (err.response?.data && JSON.stringify(err.response.data)) || err.message || 'Failed to place order.';
      setError(msg);
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
                        <input 
                          className={`form-input ${formErrors[f.name] ? 'input-error' : ''}`}
                          name={f.name} 
                          placeholder={f.placeholder}
                          value={newAddr[f.name]} 
                          onChange={handleAddrChange} 
                          required 
                        />
                        {formErrors[f.name] && (
                          <span className="form-error">{formErrors[f.name]}</span>
                        )}
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
                {checkoutItems.map((item, idx) => (
                  <div key={item.cart_item_id || item.product_id || idx} className="order-item-row">
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
                <span>Items ({checkoutItemCount})</span>
                <span>₹{checkoutTotal}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span className="free-shipping">FREE</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row total-row">
                <span>Total</span>
                <span>₹{checkoutTotal}</span>
              </div>
            </div>

            <div className="payment-badge">
              <span>🔒 Secured by Razorpay</span>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handlePlaceOrder}
              disabled={placing || checkoutItems.length === 0}
            >
              {placing ? 'Processing…' : `Pay ₹${checkoutTotal}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
