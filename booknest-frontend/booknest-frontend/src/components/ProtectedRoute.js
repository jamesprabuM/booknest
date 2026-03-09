import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}
