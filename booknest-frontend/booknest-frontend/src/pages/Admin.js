import React, { useState, useEffect, useCallback } from 'react';
import { productsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import './Admin.css';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('books');
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Book form
  const emptyBook = { name: '', author: '', description: '', price: '', stock: '', category_id: '' };
  const [bookForm, setBookForm] = useState(emptyBook);
  const [editingBook, setEditingBook] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // Category form
  const emptyCategory = { category_name: '', description: '' };
  const [catForm, setCatForm] = useState(emptyCategory);
  const [editingCat, setEditingCat] = useState(null);

  // Redirect non-admin
  if (!user?.is_admin) return <Navigate to="/" replace />;

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

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
      </div>

      {msg.text && <div className={`admin-msg ${msg.type}`}>{msg.text}</div>}

      {tab === 'books' && (
        <BooksTab
          books={books} setBooks={setBooks}
          categories={categories} setCategories={setCategories}
          bookForm={bookForm} setBookForm={setBookForm}
          editingBook={editingBook} setEditingBook={setEditingBook}
          imageFile={imageFile} setImageFile={setImageFile}
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
    </div>
  );
}

// ── Books Tab ──────────────────────────────────────────────────────────
function BooksTab({ books, setBooks, categories, setCategories, bookForm, setBookForm, editingBook, setEditingBook, imageFile, setImageFile, emptyBook, loading, setLoading, flash }) {

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([productsAPI.getAll(), productsAPI.getCategories()]);
      setBooks(bRes.data);
      setCategories(cRes.data);
    } catch { flash('Failed to load data.', 'error'); }
    setLoading(false);
  }, [setBooks, setCategories, setLoading, flash]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBookChange = (e) => {
    setBookForm({ ...bookForm, [e.target.name]: e.target.value });
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...bookForm,
        price: parseFloat(bookForm.price),
        stock: parseInt(bookForm.stock, 10),
      };
      if (editingBook) {
        await productsAPI.update(editingBook, payload);
        flash('Book updated successfully!');
      } else {
        const { data } = await productsAPI.create(payload);
        // Upload image if selected
        if (imageFile && data.product_id) {
          const fd = new FormData();
          fd.append('image', imageFile);
          await productsAPI.uploadImage(data.product_id, fd);
        }
        flash('Book added successfully!');
      }
      setBookForm(emptyBook);
      setEditingBook(null);
      setImageFile(null);
      fetchData();
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
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await productsAPI.remove(id);
      flash('Book deleted.');
      fetchData();
    } catch { flash('Failed to delete book.', 'error'); }
  };

  const handleImageUpload = async (bookId) => {
    if (!imageFile) return;
    const fd = new FormData();
    fd.append('image', imageFile);
    try {
      await productsAPI.uploadImage(bookId, fd);
      flash('Image uploaded!');
      setImageFile(null);
      fetchData();
    } catch { flash('Image upload failed.', 'error'); }
  };

  const getCategoryName = (id) => categories.find(c => c.category_id === id)?.category_name || '—';

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
              <input name="price" type="number" min="0" step="0.01" value={bookForm.price} onChange={handleBookChange} required placeholder="299" />
            </div>
            <div className="form-group">
              <label>Stock *</label>
              <input name="stock" type="number" min="0" value={bookForm.stock} onChange={handleBookChange} required placeholder="50" />
            </div>
          </div>
          <div className="form-group">
            <label>Book Cover Image</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-admin-primary" disabled={loading}>
              {loading ? 'Saving…' : editingBook ? 'Update Book' : 'Add Book'}
            </button>
            {editingBook && (
              <button type="button" className="btn-admin-secondary" onClick={() => { setEditingBook(null); setBookForm(emptyBook); setImageFile(null); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Book List */}
      <div className="admin-table-card">
        <h2>📋 All Books ({books.length})</h2>
        {loading && !books.length ? (
          <p className="admin-loading">Loading books...</p>
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
                {books.map((book) => (
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
                      {editingBook === book.product_id && imageFile && (
                        <button className="btn-upload" onClick={() => handleImageUpload(book.product_id)}>📷</button>
                      )}
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

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productsAPI.getCategories();
      setCategories(data);
    } catch { flash('Failed to load categories.', 'error'); }
    setLoading(false);
  }, [setCategories, setLoading, flash]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleCatChange = (e) => {
    setCatForm({ ...catForm, [e.target.name]: e.target.value });
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCat) {
        await productsAPI.updateCategory(editingCat, catForm);
        flash('Category updated!');
      } else {
        await productsAPI.createCategory(catForm);
        flash('Category added!');
      }
      setCatForm(emptyCategory);
      setEditingCat(null);
      fetchCategories();
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
      fetchCategories();
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
