import axios from 'axios';

const CACHE_TTL = {
  categories: 5 * 60 * 1000,
  products: 60 * 1000,
};

const cacheStore = {
  categories: null,
  products: new Map(),
};

const buildProductsCacheKey = (params = {}) => {
  const sortedEntries = Object.entries(params || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(sortedEntries);
};

const isFresh = (entry, ttl) => Boolean(entry) && Date.now() - entry.ts < ttl;

const clearProductsCache = () => {
  cacheStore.products.clear();
};

const clearCategoriesCache = () => {
  cacheStore.categories = null;
};

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
  getAll: async (params) => {
    const key = buildProductsCacheKey(params);
    const cached = cacheStore.products.get(key);
    if (isFresh(cached, CACHE_TTL.products)) {
      return { data: cached.data };
    }

    const response = await api.get('/products/', { params });
    cacheStore.products.set(key, { data: response.data, ts: Date.now() });
    return response;
  },
  getOne:      (id)     => api.get(`/products/${id}/`),
  getCategories: async () => {
    if (isFresh(cacheStore.categories, CACHE_TTL.categories)) {
      return { data: cacheStore.categories.data };
    }

    const response = await api.get('/categories/');
    cacheStore.categories = { data: response.data, ts: Date.now() };
    return response;
  },
  create: async (data) => {
    const response = await api.post('/products/', data);
    clearProductsCache();
    return response;
  },
  update: async (id, data) => {
    const response = await api.patch(`/products/${id}/`, data);
    clearProductsCache();
    return response;
  },
  remove: async (id) => {
    const response = await api.delete(`/products/${id}/`);
    clearProductsCache();
    return response;
  },
  uploadImage: (id, formData) => api.post(`/products/${id}/image/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  createCategory: async (data) => {
    const response = await api.post('/categories/', data);
    clearCategoriesCache();
    clearProductsCache();
    return response;
  },
  updateCategory: async (id, data) => {
    const response = await api.patch(`/categories/${id}/`, data);
    clearCategoriesCache();
    clearProductsCache();
    return response;
  },
  deleteCategory: async (id) => {
    const response = await api.delete(`/categories/${id}/`);
    clearCategoriesCache();
    clearProductsCache();
    return response;
  },
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
  updateStatus: (id, data) => api.patch(`/orders/${id}/status/`, data),
};

// ── Payments ───────────────────────────────────────────────────────────────
export const paymentsAPI = {
  create: (data) => api.post('/payments/create/', data),
  verify: (data) => api.post('/payments/verify/', data),
};

export default api;
