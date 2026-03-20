import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import { Login, Register } from './pages/Auth';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import { Orders, OrderDetail } from './pages/Orders';
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';
import Admin from './pages/Admin';
import './styles/globals.css';

function AppLayout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppLayout>
            <Routes>
              {/* Public */}
              <Route path="/"         element={<Home />} />
              <Route path="/login"    element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected */}
              <Route path="/cart"     element={<ProtectedRoute><Cart /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
              <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
              <Route path="/orders"   element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/:orderId" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              <Route path="/profile"  element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/admin"    element={<ProtectedRoute><Admin /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
