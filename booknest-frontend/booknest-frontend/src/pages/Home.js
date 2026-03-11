import React, { useState, useEffect } from 'react';
import { productsAPI } from '../api';
import BookCard from '../components/BookCard';
import BookPreview from '../components/BookPreview';
import './Home.css';

export default function Home() {
  const [books, setBooks]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [previewBook, setPreviewBook] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const BOOKS_PER_PAGE = 50;

  useEffect(() => {
    productsAPI.getCategories().then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    setCurrentPage(1);
    const params = {};
    if (search) params.search = search;
    if (activeCategory) params.category = activeCategory;
    productsAPI.getAll(params)
      .then(({ data }) => setBooks(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to fetch books:', err);
        setError(err.response ? `Server error (${err.response.status})` : 'Could not connect to server. Make sure the backend is running.');
        setBooks([]);
      })
      .finally(() => setLoading(false));
  }, [search, activeCategory]);

  const totalPages = Math.ceil(books.length / BOOKS_PER_PAGE);
  const paginatedBooks = books.slice(
    (currentPage - 1) * BOOKS_PER_PAGE,
    currentPage * BOOKS_PER_PAGE
  );

  const goToPage = (page) => {
    setCurrentPage(page);
    document.querySelector('.page-content')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="home">
      {/* Hero with Background Video */}
      <div className="hero">
        <div className="hero-video-wrap">
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            poster=""
          >
            <source src="/videos/hero-bg.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-overlay" />
        </div>

        <div className="container hero-content">
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

      {/* Featured Video Showcase */}
      <div className="video-showcase">
        <div className="container">
          <div className="showcase-grid">
            <div className="showcase-text">
              <span className="showcase-badge">✨ Discover</span>
              <h2 className="showcase-title">Every page tells<br />a <em>story</em></h2>
              <p className="showcase-desc">
                Explore thousands of handpicked books across every genre.
                From timeless classics to modern bestsellers — your next
                adventure is just a click away.
              </p>
              <div className="showcase-stats">
                <div className="stat-item">
                  <span className="stat-number">{books.length}+</span>
                  <span className="stat-label">Books</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{categories.length}</span>
                  <span className="stat-label">Genres</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Access</span>
                </div>
              </div>
            </div>
            <div className="showcase-video-wrap">
              <video
                className="showcase-video"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src="/videos/book-macro.mp4" type="video/mp4" />
              </video>
              <div className="showcase-video-frame" />
            </div>
          </div>
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
            <span className="results-count">
              {books.length} book{books.length !== 1 ? 's' : ''}
              {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
            </span>
          )}
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Unable to load books</h3>
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={() => { setError(''); setSearch(''); setSearchInput(''); setActiveCategory(''); }}>
              Retry
            </button>
          </div>
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
          <>
            <div className="books-grid">
              {paginatedBooks.map((book) => (
                <BookCard key={book.product_id} book={book} onPreview={setPreviewBook} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn page-prev"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>

                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          className={`page-num ${page === currentPage ? 'active' : ''}`}
                          onClick={() => goToPage(page)}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="page-ellipsis">…</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  className="page-btn page-next"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Book Preview Modal */}
      {previewBook && (
        <BookPreview book={previewBook} onClose={() => setPreviewBook(null)} />
      )}
    </div>
  );
}
