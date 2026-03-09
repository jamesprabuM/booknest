import axios from 'axios';

// ── Axios Instance ─────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: attach JWT ───────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response Interceptor: refresh token on 401 ────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post('/api/v1/auth/token/refresh/', { refresh });
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login:    (data) => api.post('/auth/login/', data),
  logout:   (data) => api.post('/auth/logout/', data),
  profile:  ()     => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  getAddresses: ()       => api.get('/auth/addresses/'),
  addAddress:   (data)   => api.post('/auth/addresses/', data),
  updateAddress: (id, data) => api.patch(`/auth/addresses/${id}/`, data),
  deleteAddress: (id)    => api.delete(`/auth/addresses/${id}/`),
};

// ── Products ───────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll:      (params) => api.get('/products/', { params }),
  getOne:      (id)     => api.get(`/products/${id}/`),
  getCategories: ()     => api.get('/categories/'),
};

// ── Cart ───────────────────────────────────────────────────────────────────
export const cartAPI = {
  get:          ()           => api.get('/cart/'),
  addItem:      (data)       => api.post('/cart/items/', data),
  updateItem:   (id, data)   => api.patch(`/cart/items/${id}/`, data),
  removeItem:   (id)         => api.delete(`/cart/items/${id}/`),
  clear:        ()           => api.delete('/cart/clear/'),
};

// ── Wishlist ───────────────────────────────────────────────────────────────
export const wishlistAPI = {
  get:         ()   => api.get('/wishlist/'),
  addItem:     (data) => api.post('/wishlist/items/', data),
  removeItem:  (id) => api.delete(`/wishlist/items/${id}/`),
  moveToCart:  (id) => api.post(`/wishlist/items/${id}/move-to-cart/`),
};

// ── Orders ─────────────────────────────────────────────────────────────────
export const ordersAPI = {
  checkout: (data) => api.post('/orders/checkout/', data),
  getAll:   ()     => api.get('/orders/'),
  getOne:   (id)   => api.get(`/orders/${id}/`),
  cancel:   (id)   => api.post(`/orders/${id}/cancel/`),
};

// ── Payments ───────────────────────────────────────────────────────────────
export const paymentsAPI = {
  create: (data) => api.post('/payments/create/', data),
  verify: (data) => api.post('/payments/verify/', data),
};

export default api;
