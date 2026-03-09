import React, { useState, useEffect } from 'react';
import { productsAPI } from '../api';
import BookCard from '../components/BookCard';
import './Home.css';

export default function Home() {
  const [books, setBooks]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    productsAPI.getCategories().then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (activeCategory) params.category = activeCategory;
    productsAPI.getAll(params)
      .then(({ data }) => setBooks(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, activeCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="home">
      {/* Hero */}
      <div className="hero">
        <div className="container">
          <p className="hero-eyebrow">Welcome to BookNest</p>
          <h1 className="hero-title">
            Find your next<br />
            <em>favourite book</em>
          </h1>
          <p className="hero-subtitle">
            Thousands of books across every genre — delivered to your door.
          </p>

          {/* Search Bar */}
          <form className="search-form" onSubmit={handleSearch}>
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search by title or author…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary search-btn">Search</button>
          </form>
        </div>
      </div>

      <div className="container page-content">
        {/* Category Pills */}
        {categories.length > 0 && (
          <div className="categories-row">
            <button
              className={`cat-pill ${activeCategory === '' ? 'active' : ''}`}
              onClick={() => setActiveCategory('')}
            >
              All Books
            </button>
            {categories.map((cat) => (
              <button
                key={cat.category_id}
                className={`cat-pill ${activeCategory === cat.category_id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.category_id)}
              >
                {cat.category_name}
              </button>
            ))}
          </div>
        )}

        {/* Results Header */}
        <div className="results-header">
          <h2 className="section-title">
            {search ? `Results for "${search}"` : activeCategory
              ? categories.find(c => c.category_id === activeCategory)?.category_name
              : 'All Books'}
          </h2>
          {!loading && (
            <span className="results-count">{books.length} book{books.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : books.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No books found</h3>
            <p>Try a different search term or category</p>
            <button className="btn btn-secondary" onClick={() => { setSearch(''); setSearchInput(''); setActiveCategory(''); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="books-grid">
            {books.map((book) => (
              <BookCard key={book.product_id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
