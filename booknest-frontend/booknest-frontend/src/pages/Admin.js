import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { productsAPI, ordersAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import './Admin.css';

const ADMIN_AUTO_FETCH_COOLDOWN_MS = 30000;

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('books');
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Book form
  const emptyBook = { name: '', author: '', description: '', price: '', stock: '', category_id: '', image: '' };
  const [bookForm, setBookForm] = useState(emptyBook);
  const [editingBook, setEditingBook] = useState(null);

  // Category form
  const emptyCategory = { category_name: '', description: '' };
  const [catForm, setCatForm] = useState(emptyCategory);
  const [editingCat, setEditingCat] = useState(null);

  // Redirect non-admin
  if (!user?.is_admin) return <Navigate to="/" replace />;

  const flash = useCallback((text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>📚 Admin Dashboard</h1>
        <p>Manage books, categories and inventory</p>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'books' ? 'active' : ''}`} onClick={() => setTab('books')}>
          📖 Books
        </button>
        <button className={`admin-tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>
          🏷️ Categories
        </button>
        <button className={`admin-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          📦 Orders
        </button>
      </div>

      {msg.text && <div className={`admin-msg ${msg.type}`}>{msg.text}</div>}

      {tab === 'books' && (
        <BooksTab
          books={books} setBooks={setBooks}
          categories={categories} setCategories={setCategories}
          bookForm={bookForm} setBookForm={setBookForm}
          editingBook={editingBook} setEditingBook={setEditingBook}
          emptyBook={emptyBook} loading={loading} setLoading={setLoading}
          flash={flash}
        />
      )}

      {tab === 'categories' && (
        <CategoriesTab
          categories={categories} setCategories={setCategories}
          catForm={catForm} setCatForm={setCatForm}
          editingCat={editingCat} setEditingCat={setEditingCat}
          emptyCategory={emptyCategory} loading={loading} setLoading={setLoading}
          flash={flash}
        />
      )}

      {tab === 'orders' && (
        <OrdersTab
          loading={loading} setLoading={setLoading}
          flash={flash}
        />
      )}
    </div>
  );
}

// ── Books Tab ──────────────────────────────────────────────────────────
function BooksTab({ books, setBooks, categories, setCategories, bookForm, setBookForm, editingBook, setEditingBook, emptyBook, loading, setLoading, flash }) {
  const lastFetchRef = useRef(0);
  const isFetchingRef = useRef(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const isValidImageUrl = (value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const previewSrc = (bookForm.image || '').trim();

  useEffect(() => {
    setPreviewFailed(false);
  }, [previewSrc]);

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.category_id] = c.category_name || '';
    });
    return map;
  }, [categories]);

  const displayedBooks = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    let rows = books;

    if (query) {
      rows = books.filter((book) => {
        const haystack = [
          book.name,
          book.author,
          categoryMap[book.category_id],
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    const sorted = [...rows].sort((a, b) => {
      let left;
      let right;

      switch (sortBy) {
        case 'author':
          left = (a.author || '').toLowerCase();
          right = (b.author || '').toLowerCase();
          break;
        case 'category':
          left = (categoryMap[a.category_id] || '').toLowerCase();
          right = (categoryMap[b.category_id] || '').toLowerCase();
          break;
        case 'price':
          left = Number(a.price || 0);
          right = Number(b.price || 0);
          break;
        case 'stock':
          left = Number(a.stock || 0);
          right = Number(b.stock || 0);
          break;
        case 'name':
        default:
          left = (a.name || '').toLowerCase();
          right = (b.name || '').toLowerCase();
      }

      if (left < right) return sortOrder === 'asc' ? -1 : 1;
      if (left > right) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [books, searchText, sortBy, sortOrder, categoryMap]);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    if (isFetchingRef.current) return;
    if (!force && now - lastFetchRef.current < ADMIN_AUTO_FETCH_COOLDOWN_MS) return;

    isFetchingRef.current = true;
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([productsAPI.getAll(), productsAPI.getCategories()]);
      setBooks(bRes.data);
      setCategories(cRes.data);
      lastFetchRef.current = Date.now();
    } catch { flash('Failed to load data.', 'error'); }
    setLoading(false);
    isFetchingRef.current = false;
  }, [setBooks, setCategories, setLoading, flash]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBookChange = (e) => {
    setBookForm({ ...bookForm, [e.target.name]: e.target.value });
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...bookForm,
      name: (bookForm.name || '').trim(),
      author: (bookForm.author || '').trim(),
      description: (bookForm.description || '').trim(),
      category_id: (bookForm.category_id || '').trim(),
      image: (bookForm.image || '').trim(),
      price: Number(bookForm.price),
      stock: Number(bookForm.stock),
    };

    if (payload.name.length < 2) {
      flash('Book name must be at least 2 characters.', 'error');
      return;
    }
    if (payload.author.length < 2) {
      flash('Author name must be at least 2 characters.', 'error');
      return;
    }
    if (!payload.category_id) {
      flash('Please select a category.', 'error');
      return;
    }
    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      flash('Price must be greater than 0.', 'error');
      return;
    }
    if (!Number.isInteger(payload.stock) || payload.stock < 0) {
      flash('Stock must be a whole number 0 or greater.', 'error');
      return;
    }
    if (payload.description.length > 2000) {
      flash('Description cannot exceed 2000 characters.', 'error');
      return;
    }
    if (!isValidImageUrl(payload.image)) {
      flash('Image URL must start with http:// or https://', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingBook) {
        await productsAPI.update(editingBook, payload);
        flash('Book updated successfully!');
      } else {
        await productsAPI.create(payload);
        flash('Book added successfully!');
      }
      setBookForm(emptyBook);
      setEditingBook(null);
      fetchData(true);
    } catch (err) {
      const msg = err.response?.data;
      flash(typeof msg === 'object' ? Object.values(msg).flat().join(' ') : 'Failed to save book.', 'error');
    }
    setLoading(false);
  };

  const handleEdit = (book) => {
    setEditingBook(book.product_id);
    setBookForm({
      name: book.name || '',
      author: book.author || '',
      description: book.description || '',
      price: book.price?.toString() || '',
      stock: book.stock?.toString() || '',
      category_id: book.category_id || '',
      image: book.image || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await productsAPI.remove(id);
      flash('Book deleted.');
      fetchData(true);
    } catch { flash('Failed to delete book.', 'error'); }
  };

  const getCategoryName = (id) => categoryMap[id] || '—';

  return (
    <div className="admin-section">
      {/* Form */}
      <div className="admin-form-card">
        <h2>{editingBook ? '✏️ Edit Book' : '➕ Add New Book'}</h2>
        <form onSubmit={handleBookSubmit} className="admin-form">
          <div className="form-row">
            <div className="form-group">
              <label>Book Name *</label>
              <input name="name" value={bookForm.name} onChange={handleBookChange} required placeholder="The Alchemist" />
            </div>
            <div className="form-group">
              <label>Author *</label>
              <input name="author" value={bookForm.author} onChange={handleBookChange} required placeholder="Paulo Coelho" />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" value={bookForm.description} onChange={handleBookChange} rows={3} placeholder="A story about following your dreams..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select name="category_id" value={bookForm.category_id} onChange={handleBookChange} required>
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Price (₹) *</label>
              <input name="price" type="number" min="0.01" step="0.01" value={bookForm.price} onChange={handleBookChange} required placeholder="299" />
            </div>
            <div className="form-group">
              <label>Stock *</label>
              <input name="stock" type="number" min="0" step="1" value={bookForm.stock} onChange={handleBookChange} required placeholder="50" />
            </div>
          </div>
          <div className="form-group">
            <label>Book Cover Image URL</label>
            <input
              name="image"
              type="url"
              value={bookForm.image}
              onChange={handleBookChange}
              placeholder="https://example.com/cover.jpg"
            />
          </div>
          {previewSrc && (
            <div className="admin-cover-preview">
              {previewFailed ? (
                <p className="admin-cover-preview-error">Image preview failed. Check the URL or try a different file.</p>
              ) : (
                <img
                  src={previewSrc}
                  alt="Cover preview"
                  className="admin-cover-preview-image"
                  onError={() => setPreviewFailed(true)}
                />
              )}
              <p className="admin-cover-preview-meta">
                Previewing URL image
              </p>
            </div>
          )}
          <div className="form-actions">
            <button type="submit" className="btn-admin-primary" disabled={loading}>
              {loading ? 'Saving…' : editingBook ? 'Update Book' : 'Add Book'}
            </button>
            {editingBook && (
              <button type="button" className="btn-admin-secondary" onClick={() => { setEditingBook(null); setBookForm(emptyBook); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Book List */}
      <div className="admin-table-card">
        <h2>📋 All Books ({displayedBooks.length}{searchText.trim() ? ` / ${books.length}` : ''})</h2>
        <div className="books-tools">
          <input
            className="books-search"
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, author, category..."
          />
          <select className="books-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="author">Sort: Author</option>
            <option value="category">Sort: Category</option>
            <option value="price">Sort: Price</option>
            <option value="stock">Sort: Stock</option>
          </select>
          <select className="books-sort" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="asc">Order: Ascending</option>
            <option value="desc">Order: Descending</option>
          </select>
        </div>
        {loading && !books.length ? (
          <p className="admin-loading">Loading books...</p>
        ) : displayedBooks.length === 0 ? (
          <p className="admin-loading">No books match your search.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cover</th>
                  <th>Name</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedBooks.map((book) => (
                  <tr key={book.product_id}>
                    <td>
                      <img src={book.image || 'https://via.placeholder.com/50x70?text=No+Cover'} alt="" className="admin-book-thumb" />
                    </td>
                    <td className="td-name">{book.name}</td>
                    <td>{book.author}</td>
                    <td>{getCategoryName(book.category_id)}</td>
                    <td>₹{book.price}</td>
                    <td><span className={`stock-badge ${book.stock > 0 ? 'in-stock' : 'out'}`}>{book.stock}</span></td>
                    <td className="td-actions">
                      <button className="btn-edit" onClick={() => handleEdit(book)}>✏️</button>
                      <button className="btn-delete" onClick={() => handleDelete(book.product_id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Categories Tab ─────────────────────────────────────────────────────
function CategoriesTab({ categories, setCategories, catForm, setCatForm, editingCat, setEditingCat, emptyCategory, loading, setLoading, flash }) {
  const lastFetchRef = useRef(0);
  const isFetchingRef = useRef(false);

  const fetchCategories = useCallback(async (force = false) => {
    const now = Date.now();
    if (isFetchingRef.current) return;
    if (!force && now - lastFetchRef.current < ADMIN_AUTO_FETCH_COOLDOWN_MS) return;

    isFetchingRef.current = true;
    setLoading(true);
    try {
      const { data } = await productsAPI.getCategories();
      setCategories(data);
      lastFetchRef.current = Date.now();
    } catch { flash('Failed to load categories.', 'error'); }
    setLoading(false);
    isFetchingRef.current = false;
  }, [setCategories, setLoading, flash]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleCatChange = (e) => {
    setCatForm({ ...catForm, [e.target.name]: e.target.value });
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      category_name: (catForm.category_name || '').trim(),
      description: (catForm.description || '').trim(),
    };

    if (payload.category_name.length < 2) {
      flash('Category name must be at least 2 characters.', 'error');
      return;
    }
    if (payload.description.length > 500) {
      flash('Category description cannot exceed 500 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingCat) {
        await productsAPI.updateCategory(editingCat, payload);
        flash('Category updated!');
      } else {
        await productsAPI.createCategory(payload);
        flash('Category added!');
      }
      setCatForm(emptyCategory);
      setEditingCat(null);
      fetchCategories(true);
    } catch (err) {
      const msg = err.response?.data;
      flash(typeof msg === 'object' ? Object.values(msg).flat().join(' ') : 'Failed to save category.', 'error');
    }
    setLoading(false);
  };

  const handleEditCat = (cat) => {
    setEditingCat(cat.category_id);
    setCatForm({ category_name: cat.category_name, description: cat.description || '' });
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await productsAPI.deleteCategory(id);
      flash('Category deleted.');
      fetchCategories(true);
    } catch { flash('Failed to delete category.', 'error'); }
  };

  return (
    <div className="admin-section">
      <div className="admin-form-card">
        <h2>{editingCat ? '✏️ Edit Category' : '➕ Add New Category'}</h2>
        <form onSubmit={handleCatSubmit} className="admin-form">
          <div className="form-row">
            <div className="form-group">
              <label>Category Name *</label>
              <input name="category_name" value={catForm.category_name} onChange={handleCatChange} required placeholder="Fiction" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input name="description" value={catForm.description} onChange={handleCatChange} placeholder="Fictional stories and novels" />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-admin-primary" disabled={loading}>
              {loading ? 'Saving…' : editingCat ? 'Update Category' : 'Add Category'}
            </button>
            {editingCat && (
              <button type="button" className="btn-admin-secondary" onClick={() => { setEditingCat(null); setCatForm(emptyCategory); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-table-card">
        <h2>📋 All Categories ({categories.length})</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.category_id}>
                  <td className="td-name">{cat.category_name}</td>
                  <td>{cat.description || '—'}</td>
                  <td className="td-actions">
                    <button className="btn-edit" onClick={() => handleEditCat(cat)}>✏️</button>
                    <button className="btn-delete" onClick={() => handleDeleteCat(cat.category_id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Orders Tab ─────────────────────────────────────────────────────
function OrdersTab({ loading, setLoading, flash }) {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [retryCount, setRetryCount] = useState(0);
  const lastFetchRef = useRef(0);
  const isFetchingRef = useRef(false);

  const ORDER_STATUSES = ['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

  const fetchOrders = useCallback(async (attempt = 0, force = false) => {
    const now = Date.now();
    if (isFetchingRef.current) return;
    if (!force && now - lastFetchRef.current < ADMIN_AUTO_FETCH_COOLDOWN_MS) return;

    isFetchingRef.current = true;
    setLoading(true);
    try {
      const { data } = await ordersAPI.getAll();
      setOrders(data);
      setRetryCount(0); // Reset retry count on success
      lastFetchRef.current = Date.now();
      setLoading(false);
      isFetchingRef.current = false;
    } catch (error) {
      const isQuotaError = error.response?.status === 500 || error.message?.includes('429');
      if (isQuotaError && attempt < 1) {
        // Only retry once with backoff to avoid read spikes under quota pressure.
        const delay = 5000;
        flash(`Loading orders (attempt ${attempt + 1})...`);
        setLoading(false);
        isFetchingRef.current = false;
        setTimeout(() => {
          setRetryCount(attempt + 1);
          fetchOrders(attempt + 1, true);
        }, delay);
      } else {
        flash('Failed to load orders. Please try again.', 'error');
        setRetryCount(0);
        setLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, [setLoading, flash]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatus({ ...updatingStatus, [orderId]: true });
    try {
      await ordersAPI.updateStatus(orderId, { order_status: newStatus });
      flash(`Order updated to ${newStatus}`);
      fetchOrders(0, true);
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to update status.', 'error');
    }
    setUpdatingStatus({ ...updatingStatus, [orderId]: false });
  };

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.order_status === filterStatus);

  const getStatusColor = (status) => {
    const colors = {
      'Pending': '#ffa500',
      'Paid': '#4169e1',
      'Shipped': '#1e90ff',
      'Out for Delivery': '#ff6347',
      'Delivered': '#228b22',
      'Cancelled': '#888',
    };
    return colors[status] || '#999';
  };

  return (
    <div className="admin-section">
      <div className="admin-filter-card">
        <h2>📦 Order Management</h2>
        <div className="filter-row">
          <label>Filter by Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
            <option value="all">All Orders</option>
            {ORDER_STATUSES.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <span className="filter-count">{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="admin-table-card">
        <h2>📋 Orders ({filteredOrders.length})</h2>
        {loading && !orders.length ? (
          <p className="admin-loading">Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No orders found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Payment Status</th>
                  <th>Order Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.order_id}>
                    <td className="td-mono" style={{ fontSize: '0.85rem' }}>
                      {order.order_id.slice(0, 8).toUpperCase()}
                    </td>
                    <td>{order.user_id?.slice(0, 8) || 'N/A'}</td>
                    <td>{new Date(order.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="td-amount">₹{order.total_amount}</td>
                    <td>
                      <span className={`status-pill status-${order.payment_status?.toLowerCase()}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td>
                      <span className="status-pill" style={{ backgroundColor: getStatusColor(order.order_status) }}>
                        {order.order_status}
                      </span>
                    </td>
                    <td className="td-actions">
                      <select
                        value={order.order_status}
                        onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                        disabled={updatingStatus[order.order_id]}
                        className="status-select"
                        style={{ fontSize: '0.85rem', padding: '4px 6px' }}
                      >
                        {ORDER_STATUSES.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
