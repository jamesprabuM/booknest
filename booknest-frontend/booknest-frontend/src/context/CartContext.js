import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [cart, setCart]       = useState({ items: [], total: 0, item_count: 0 });
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    if (!isLoggedIn) return;
    try {
      setLoading(true);
      const { data } = await cartAPI.get();
      setCart(data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCart(); }, [isLoggedIn]);

  const addToCart = async (product_id, quantity = 1) => {
    await cartAPI.addItem({ product_id, quantity });
    await fetchCart();
  };

  const updateItem = async (cart_item_id, quantity) => {
    await cartAPI.updateItem(cart_item_id, { quantity });
    await fetchCart();
  };

  const removeItem = async (cart_item_id) => {
    await cartAPI.removeItem(cart_item_id);
    await fetchCart();
  };

  const clearCart = async () => {
    await cartAPI.clear();
    setCart({ items: [], total: 0, item_count: 0 });
  };

  return (
    <CartContext.Provider value={{ cart, loading, fetchCart, addToCart, updateItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
