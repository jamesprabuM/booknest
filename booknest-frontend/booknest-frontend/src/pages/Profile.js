import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import './Profile.css';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ username: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [locating, setLocating] = useState(false);
  const [newAddr, setNewAddr] = useState({
    full_name: '', phone: '', house_no: '', street: '', city: '', state: '', pincode: '', country: 'India'
  });
  const [formErrors, setFormErrors] = useState({});

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
    if (user) setProfile({ username: user.username || '', phone: user.phone || '' });
    authAPI.getAddresses().then(({ data }) => setAddresses(data)).catch(() => {});
  }, [user]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    
    // Validate username
    if (!profile.username.trim()) {
      showMsg('error', 'Full name is required.');
      return;
    }
    if (profile.username.length < 2) {
      showMsg('error', 'Full name must be at least 2 characters.');
      return;
    }
    if (/\d/.test(profile.username)) {
      showMsg('error', 'Full name cannot contain numbers.');
      return;
    }
    
    // Validate phone if provided
    if (profile.phone && !/^\d{10}$/.test(profile.phone.replace(/\s|-/g, ''))) {
      showMsg('error', 'Phone must be 10 digits.');
      return;
    }
    
    setSaving(true);
    try {
      await authAPI.updateProfile(profile);
      updateUser(profile);
      showMsg('success', 'Profile updated successfully!');
    } catch { showMsg('error', 'Failed to update profile.'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validate new password length
    if (pwdForm.new_password.length < 8) {
      showMsg('error', 'New password must be at least 8 characters long.');
      return;
    }
    
    setSaving(true);
    try {
      await authAPI.changePassword(pwdForm);
      setPwdForm({ old_password: '', new_password: '' });
      showMsg('success', 'Password changed successfully!');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to change password.');
    } finally { setSaving(false); }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    await authAPI.deleteAddress(id);
    setAddresses(addresses.filter(a => a.address_id !== id));
  };

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

  const handleAddAddress = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showMsg('error', 'Please fix the form errors before submitting.');
      return;
    }
    
    setSaving(true);
    try {
      const { data } = await authAPI.addAddress(newAddr);
      setAddresses([...addresses, data]);
      setNewAddr({ full_name: '', phone: '', house_no: '', street: '', city: '', state: '', pincode: '', country: 'India' });
      setShowAddrForm(false);
      setFormErrors({});
      showMsg('success', 'Address added successfully!');
    } catch { showMsg('error', 'Failed to save address.'); }
    finally { setSaving(false); }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { showMsg('error', 'Geolocation is not supported by your browser.'); return; }
    setLocating(true);
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
        } catch { showMsg('error', 'Could not fetch address from location.'); }
        finally { setLocating(false); }
      },
      () => { showMsg('error', 'Location access denied. Please allow location permission.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="profile-layout">
          {/* Sidebar */}
          <div className="profile-sidebar card">
            <div className="profile-avatar-section">
              <div className="big-avatar">{user?.username?.[0]?.toUpperCase()}</div>
              <h2 className="profile-name">{user?.username}</h2>
              <p className="profile-email">{user?.email}</p>
            </div>
            <nav className="profile-nav">
              {[
                { key: 'profile',   label: '👤 My Profile' },
                { key: 'addresses', label: '📍 Addresses' },
                { key: 'password',  label: '🔒 Password' },
              ].map((item) => (
                <button
                  key={item.key}
                  className={`profile-nav-btn ${tab === item.key ? 'active' : ''}`}
                  onClick={() => setTab(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="profile-content card">
            {message.text && (
              <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            {/* Profile Tab */}
            {tab === 'profile' && (
              <div>
                <h2 className="content-title">My Profile</h2>
                <form onSubmit={handleProfileSave}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" type="text"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={user?.email} disabled />
                    <p className="field-note">Email cannot be changed</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* Addresses Tab */}
            {tab === 'addresses' && (
              <div>
                <div className="section-header">
                  <h2 className="content-title" style={{ marginBottom: 0 }}>Saved Addresses</h2>
                  <button className="btn btn-ghost" onClick={() => setShowAddrForm(!showAddrForm)}>
                    {showAddrForm ? 'Cancel' : '+ Add New'}
                  </button>
                </div>

                {showAddrForm && (
                  <form className="add-address-form" onSubmit={handleAddAddress}>
                    <div className="addr-form-header">
                      <h3>New Address</h3>
                      <button type="button" className="btn btn-location" onClick={handleUseMyLocation} disabled={locating}>
                        {locating ? '\u23f3 Detecting\u2026' : '\ud83d\udccd Use My Location'}
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
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving\u2026' : 'Save Address'}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowAddrForm(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 && !showAddrForm ? (
                  <p className="no-data">No addresses saved yet.</p>
                ) : (
                  <div className="addresses-grid">
                    {addresses.map((addr) => (
                      <div key={addr.address_id} className="addr-card">
                        <strong>{addr.full_name}</strong>
                        <p>{addr.house_no}, {addr.street}</p>
                        <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p>{addr.country}</p>
                        <p>\ud83d\udcde {addr.phone}</p>
                        <button
                          className="btn btn-danger"
                          style={{ marginTop: 10, fontSize: '0.8rem', padding: '5px 12px' }}
                          onClick={() => handleDeleteAddress(addr.address_id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Password Tab */}
            {tab === 'password' && (
              <div>
                <h2 className="content-title">Change Password</h2>
                <form onSubmit={handlePasswordChange} style={{ maxWidth: 400 }}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input className="form-input" type="password"
                      value={pwdForm.old_password}
                      onChange={(e) => setPwdForm({ ...pwdForm, old_password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input className="form-input" type="password"
                      value={pwdForm.new_password}
                      onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                      minLength={8}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
