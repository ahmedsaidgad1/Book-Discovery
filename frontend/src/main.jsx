import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5080';
function App() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState(localStorage.getItem('book-discovery-theme') || 'light');
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#');
  const [books, setBooks] = useState([]);
  const [openedBook, setOpenedBook] = useState(null);
  const [selectedBookPreview, setSelectedBookPreview] = useState(null);
  const [showBookReview, setShowBookReview] = useState(false);
  const [readerFailed, setReaderFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [genres, setGenres] = useState([]);
  const [readingList, setReadingList] = useState([]);
  const [readingListGenreFilter, setReadingListGenreFilter] = useState('all');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [bookReviews, setBookReviews] = useState([]);
  const [reviewDraft, setReviewDraft] = useState('');
  const [newBook, setNewBook] = useState({ title: '', titleAr: '', author: '', description: '', genreId: '', readingUrl: '', readingSource: '' });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('book-discovery-theme', theme);
  }, [theme]);

  const ar = lang === 'ar';
  const t = (en, arabic) => ar ? arabic : en;
  const filteredReadingList = readingListGenreFilter === 'all' ? readingList : readingList.filter(item => String(item.genreId) === String(readingListGenreFilter));
  const filteredRecommendations = selectedInterests.length === 0 ? recommendations : recommendations.filter(book => {
    const bookGenreId = book.genreId ?? book.GenreId ?? book.genre?.id ?? book.genre?.Id ?? book.genreID;
    const bookGenreName = String(book.genre?.name ?? book.genre?.Name ?? book.genreName ?? '').trim().toLocaleLowerCase();
    const bookGenreNameAr = String(book.genre?.nameAr ?? book.genre?.NameAr ?? book.genreNameAr ?? '').trim().toLocaleLowerCase();
    return selectedInterests.some(id => {
      const selectedGenre = genres.find(genre => String(genre.id ?? genre.Id) === String(id));
      return (bookGenreId != null && String(id) === String(bookGenreId)) ||
        (selectedGenre && bookGenreName && bookGenreName === String(selectedGenre.name ?? selectedGenre.Name ?? '').trim().toLocaleLowerCase()) ||
        (selectedGenre && bookGenreNameAr && bookGenreNameAr === String(selectedGenre.nameAr ?? selectedGenre.NameAr ?? '').trim().toLocaleLowerCase());
    });
  });
  const isAdmin = (() => {
    try {
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role === 'Admin' || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] === 'Admin';
    } catch { return false; }
  })();

  async function loadBooks(term = '') {
    if (!token) { setBooks([]); return; }
    try {
      const res = await fetch(`${API}/api/books?search=${encodeURIComponent(term)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json(); setBooks(data.items || []);
    } catch { setMessage(t('Could not connect to API. Start the .NET backend first.', 'تعذر الاتصال بالخادم. شغّل Backend أولاً.')); }
  }
  async function loadReadingList() {
    if (!token) return;
    try { const res = await fetch(`${API}/api/reader/reading-list`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) setReadingList(await res.json()); } catch { setMessage(t('Could not load your reading list.', 'تعذر تحميل قائمة القراءة.')); }
  }
  // Interests are intentionally session-only: they reset on page refresh.
  async function fetchInterests() { setSelectedInterests([]); }
  async function loadBookReviews(bookId) {
    if (!token || !bookId) return;
    try { const res = await fetch(`${API}/api/reader/books/${bookId}/reviews`, { headers: { Authorization: `Bearer ${token}` } }); setBookReviews(res.ok ? await res.json() : []); } catch { setBookReviews([]); }
  }
  async function saveBookReview(e) {
    e.preventDefault(); if (!selectedBookPreview || !reviewDraft.trim()) return;
    try { const res = await fetch(`${API}/api/reader/books/${selectedBookPreview.id}/review`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content: reviewDraft.trim() }) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.message || t('Could not save review.', 'تعذر حفظ المراجعة.')); setReviewDraft(''); setMessage(t('Review saved.', 'تم حفظ المراجعة.')); await loadBookReviews(selectedBookPreview.id); } catch (err) { setMessage(err.message); }
  }
  async function removeFromReadingList(bookId) {
    try { const res = await fetch(`${API}/api/reader/books/${bookId}/reading-status`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); if (!res.ok && res.status !== 204) throw new Error(t('Could not remove book.', 'تعذر حذف الكتاب.')); setReadingList(items => items.filter(item => item.id !== bookId)); loadRecommendations(); } catch (err) { setMessage(err.message); }
  }
  async function saveInterests() {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const firstRes = await fetch(`${API}/api/books?page=1&pageSize=50`, { headers });
      if (!firstRes.ok) throw new Error(t('Could not refresh books. Check that the backend is running.', 'تعذر تحديث الكتب. تأكد أن الخادم يعمل.'));
      const firstPage = await firstRes.json();
      const allBooks = [...(firstPage.items || [])];
      const pageCount = Math.ceil((firstPage.total || allBooks.length) / Math.max(1, firstPage.pageSize || 50));
      for (let page = 2; page <= pageCount; page += 1) {
        const res = await fetch(`${API}/api/books?page=${page}&pageSize=50`, { headers });
        if (!res.ok) throw new Error(t('Could not load all books for recommendations.', 'تعذر تحميل كل الكتب للترشيحات.'));
        const data = await res.json();
        allBooks.push(...(data.items || []));
      }
      setRecommendations(allBooks);
      setMessage(t('Picked for you updated for this session. Refreshing the page will clear these choices.', 'تم تحديث ترشيحاتك لهذه الجلسة. تحديث الصفحة سيمسح اختياراتك.'));
    } catch (err) { setMessage(err.message); }
  }
  async function loadRecommendations() {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/recommendations`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRecommendations(await res.json());
    } catch { }
  }
  useEffect(() => { const onHashChange = () => setCurrentHash(window.location.hash || '#'); window.addEventListener('hashchange', onHashChange); return () => window.removeEventListener('hashchange', onHashChange); }, []);
  useEffect(() => { if (token) { loadBooks(); fetch(`${API}/api/genres`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).then(setGenres).catch(() => setGenres([])); } else { setBooks([]); } }, [token]);
  useEffect(() => { if (token) { loadRecommendations(); loadReadingList(); fetchInterests(); } else { setReadingList([]); setSelectedInterests([]); } }, [token]);
  useEffect(() => {
    setReaderFailed(false);
    if (!token || !currentHash.startsWith('#read/')) { setOpenedBook(null); return; }
    const id = currentHash.slice(6);
    const existing = books.find(b => String(b.id) === id);
    if (existing) { setOpenedBook(existing); return; }
    if (!/^\\d+$/.test(id)) { setOpenedBook(null); return; }
    fetch(`${API}/api/books/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null).then(setOpenedBook).catch(() => setOpenedBook(null));
  }, [token, currentHash, books]);
  async function auth(e) {
    e.preventDefault(); setMessage('');
    const route = mode === 'login' ? 'login' : 'register';
    const body = mode === 'login' ? { email, password } : { name, email, password };
    try {
      const res = await fetch(`${API}/api/auth/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');
      localStorage.setItem('token', data.token); setToken(data.token); setMessage(t('Signed in successfully', 'تم تسجيل الدخول بنجاح')); await loadBooks(search);
    } catch (err) { setMessage(err.message); }
  }
  async function rate(bookId, score) {
    if (!token) { setMessage(t('Please sign in to rate books.', 'سجّل الدخول لتقييم الكتب.')); return; }
    const res = await fetch(`${API}/api/reader/books/${bookId}/rating`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ score }) });
    setMessage(res.ok ? t('Rating saved', 'تم حفظ التقييم') : t('Could not save rating', 'تعذر حفظ التقييم'));
    loadBooks(search); loadRecommendations();
  }
  async function addToList(bookId, status = 'WantToRead') {
    if (!token) { setMessage(t('Please sign in first.', 'سجّل الدخول أولاً.')); return; }
    const res = await fetch(`${API}/api/reader/books/${bookId}/reading-status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
    setMessage(res.ok ? t('Added to reading list', 'تمت الإضافة لقائمة القراءة') : t('Could not update list', 'تعذر تحديث القائمة'));
    loadRecommendations();
    loadReadingList();
  }

  async function createBook(e) {
    e.preventDefault();
    if (!token) { setMessage(t('Please sign in before adding a book.', 'سجّل الدخول قبل إضافة كتاب.')); return; }
    try {
      const res = await fetch(`${API}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...newBook, genreId: Number(newBook.genreId), language: 'en' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || t('Could not add book. Check the fields and try again.', 'تعذرت إضافة الكتاب. راجع البيانات وحاول مجددًا.'));
      setMessage(t('Book added successfully.', 'تمت إضافة الكتاب بنجاح.'));
      setNewBook({ title: '', titleAr: '', author: '', description: '', genreId: '', readingUrl: '', readingSource: '' });
      await loadBooks(search);
    } catch (err) { setMessage(err.message); }
  }

  const chooseBookToRead = (book) => { setSelectedBookPreview(book); setShowBookReview(false); setReviewDraft(''); loadBookReviews(book.id); window.setTimeout(() => document.getElementById('selected-book-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); };

  const bookCard = (b) => <article className="book" key={b.id}>
    <div className="cover" aria-label={t('Book cover', 'غلاف الكتاب')}><span>BOOK</span><strong>{ar ? (b.titleAr || b.title) : b.title}</strong><small>{b.author}</small></div>
    <div className="book-body"><span className="genre">{ar ? (b.genre?.nameAr || 'كتاب') : (b.genre?.name || 'Book')}</span>
      <h3>{ar ? (b.titleAr || b.title) : b.title}</h3><p className="author">{b.author}</p>
      <p>{ar ? (b.descriptionAr || b.description) : b.description}</p>
      {b.averageRating !== undefined && <p className="rating">★ {Number(b.averageRating).toFixed(1)} <small>({b.ratingCount || 0})</small></p>}
      {b.readingSource && <p className="reading-source">{t('Reading source:', 'مصدر القراءة:')} {b.readingSource}</p>}
      <div className="actions"><button onClick={() => { addToList(b.id); chooseBookToRead(b); }}>{t('Want to read', 'أريد قراءته')}</button><select aria-label="Rating" defaultValue="" onChange={e => { if (e.target.value) rate(b.id, Number(e.target.value)); }}><option value="" disabled>{t('Rate', 'قيّم')}</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ★</option>)}</select></div>
    </div>
  </article>;

  return <div className={ar ? 'app rtl' : 'app'} dir={ar ? 'rtl' : 'ltr'}>
    <header className="topbar"><a className="brand" href="#"><span className="brand-icon">B</span> Book<span>Discovery</span></a>
      <nav><a href="#discover">{t('Discover', 'اكتشف')}</a><a href="#recommendations">{t('For you', 'لك')}</a></nav>
      <div className="top-actions"><button className="lang" onClick={() => setLang(ar ? 'en' : 'ar')}>{ar ? 'English' : 'العربية'}</button><button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? t('Switch to light mode', 'التبديل للوضع الفاتح') : t('Switch to dark mode', 'التبديل للوضع الداكن')}>{theme === 'dark' ? '☀️' : '🌙'} <span>{theme === 'dark' ? t('Light', 'فاتح') : t('Dark', 'داكن')}</span></button>{token ? <button className="outline" onClick={() => { localStorage.removeItem('token'); setToken(''); setRecommendations([]); setMessage(t('Signed out', 'تم تسجيل الخروج')); }}>{t('Sign out', 'تسجيل الخروج')}</button> : <a href="#account" className="sign-link">{t('Sign in', 'دخول')}</a>}</div>
    </header>
    <main>
      <section className="hero"><div className="hero-content"><span className="eyebrow">{t('YOUR NEXT CHAPTER STARTS HERE', 'رحلتك القادمة تبدأ من هنا')}</span>
        <h1>{t('Find books that feel like', 'اكتشف كتبًا تشبه')} <em>{t('you.', 'ذوقك.')}</em></h1>
        <p>{t('Personalized book discovery for curious minds. Find your next favorite read and connect through stories.', 'اكتشف كتبًا تناسب اهتماماتك، واعثر على قراء يشاركونك حب الحكايات.')}</p>
        <div className="search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadBooks(search)} placeholder={t('Search books or authors...', 'ابحث عن كتاب أو مؤلف...')} /><button onClick={() => loadBooks(search)}>{t('Search', 'بحث')}</button></div>
        <div className="hero-meta"><span>✦ {t('Discover your taste', 'اكتشف ذوقك')}</span><span>✦ {t('Build your reading list', 'نظّم قراءاتك')}</span></div>
      </div><div className="hero-art"><div className="sun"></div><div className="floating-book book-one"><small>01 / FICTION</small><b>Stories<br />that stay.</b><span>BOOK DISCOVERY</span></div><div className="floating-book book-two"><small>READ • GROW</small><b>One page<br />at a time.</b></div><div className="spark">✳</div></div></section>
      {message && <div className="notice">{message}<button onClick={() => setMessage('')}>×</button></div>}
      {token && selectedBookPreview && !currentHash.startsWith('#read/') && (
        <section id="selected-book-preview" className="account-panel selected-book-preview" aria-live="polite">
          <div>
            <span className="eyebrow">{t('YOUR NEXT READ', 'كتابك القادم')}</span>
            <h2>{ar ? (selectedBookPreview.titleAr || selectedBookPreview.title) : selectedBookPreview.title}</h2>
            <p>{selectedBookPreview.author}</p>
            <p>{ar ? (selectedBookPreview.descriptionAr || selectedBookPreview.description || '') : (selectedBookPreview.description || '')}</p>
            {selectedBookPreview.readingSource && <p className="reading-source">{t('Reading source:', 'مصدر القراءة:')} {selectedBookPreview.readingSource}</p>}
          </div>
          <div className="selected-book-actions">
            <div className="selected-book-cover">
              <span>BOOK</span>
              <strong>{ar ? (selectedBookPreview.titleAr || selectedBookPreview.title) : selectedBookPreview.title}</strong>
              <small>{selectedBookPreview.author}</small>
            </div>
            {selectedBookPreview.readingUrl && /^https?:\/\//i.test(selectedBookPreview.readingUrl)
              ? <a className="read-link" href={selectedBookPreview.readingUrl} target="_blank" rel="noopener noreferrer">{t('1. Open reading source ↗', '١. افتح مصدر القراءة ↗')}</a>
              : <p>{t('A reading link is not available for this book yet.', 'رابط قراءة الكتاب غير متاح حاليًا.')}</p>}
            <button className="preview-review-button" onClick={() => setShowBookReview(value => !value)}>
              {showBookReview ? t('Hide book review', 'إخفاء مراجعة الكتاب') : t('2. View book review', '٢. عرض مراجعة الكتاب')}
            </button>
            {showBookReview && (
              <div className="book-review-details">
                <h3>{t('About this book', 'عن الكتاب')}</h3>
                <p>{(ar ? (selectedBookPreview.descriptionAr || selectedBookPreview.description) : selectedBookPreview.description) || t('No review or description has been added for this book yet.', 'لم تتم إضافة مراجعة أو وصف لهذا الكتاب حتى الآن.')}</p>
                <p><strong>{t('Author:', 'المؤلف:')}</strong> {selectedBookPreview.author}</p>
                <p><strong>{t('Genre:', 'التصنيف:')}</strong> {ar ? (selectedBookPreview.genre?.nameAr || selectedBookPreview.genre?.name || t('Not specified', 'غير محدد')) : (selectedBookPreview.genre?.name || t('Not specified', 'غير محدد'))}</p>
                <p><strong>{t('Average rating:', 'متوسط التقييم:')}</strong> {selectedBookPreview.averageRating !== undefined ? `${Number(selectedBookPreview.averageRating).toFixed(1)} / 5 (${selectedBookPreview.ratingCount || 0})` : t('No ratings yet', 'لا توجد تقييمات بعد')}</p>
                <h3>{t('Reader reviews', 'مراجعات القراء')}</h3>
                <form className="review-form" onSubmit={saveBookReview}>
                  <textarea maxLength="1200" required value={reviewDraft} onChange={e => setReviewDraft(e.target.value)} placeholder={t('Write your review (up to 1200 characters)…', 'اكتب مراجعتك (حتى 1200 حرف)…')} />
                  <button className="primary" type="submit">{t('Save my review', 'احفظ مراجعتي')}</button>
                </form>
                {bookReviews.length ? bookReviews.map(review => (
                  <article className="reader-review" key={review.id}>
                    <strong>{review.userName}</strong><p>{review.content}</p>
                    <small>{new Date(review.updatedAt).toLocaleDateString(ar ? 'ar-EG' : 'en-US')}</small>
                  </article>
                )) : <p>{t('No reader reviews yet. Be the first to write one.', 'لا توجد مراجعات من القراء بعد. كن أول من يكتب مراجعة.')}</p>}
              </div>
            )}
            <button className="text-button" onClick={() => { setSelectedBookPreview(null); setShowBookReview(false); }}>{t('Close preview', 'إغلاق المعاينة')}</button>
          </div>
        </section>
      )}
      {!token && <section id="account" className="account-panel"><div><span className="eyebrow">{t('MEMBERS ONLY', 'للأعضاء فقط')}</span><h2>{t('Sign in to explore books.', 'سجّل الدخول لاستكشاف الكتب.')}</h2><p>{t('Create an account or sign in to browse the library and open books.', 'أنشئ حسابًا أو سجّل الدخول لتصفح المكتبة وفتح الكتب.')}</p></div><form onSubmit={auth} className="auth-form">{mode === 'register' && <input required placeholder={t('Name', 'الاسم')} value={name} onChange={e => setName(e.target.value)} />}<input required type="email" placeholder={t('Email', 'البريد الإلكتروني')} value={email} onChange={e => setEmail(e.target.value)} /><input required minLength="8" type="password" placeholder={t('Password (8+ chars)', 'كلمة المرور (8 أحرف على الأقل)')} value={password} onChange={e => setPassword(e.target.value)} /><button className="primary">{mode === 'login' ? t('Sign in', 'دخول') : t('Create account', 'إنشاء حساب')}</button><button type="button" className="text-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? t('New here? Create account', 'مستخدم جديد؟ أنشئ حسابًا') : t('Already registered? Sign in', 'لديك حساب؟ سجّل الدخول')}</button></form></section>}
      {token && currentHash.startsWith('#read/') && <section className="account-panel reading-room"><div>
        <button className="text-button" onClick={() => { window.location.hash = '#discover'; }}>← {t('Back to books', 'العودة للكتب')}</button>
        <span className="eyebrow">{t('YOUR READING ROOM', 'غرفة القراءة')}</span>
        {!openedBook ? <h2>{t('Loading book details…', 'جارٍ تحميل بيانات الكتاب…')}</h2> : <><h2>{ar ? (openedBook.titleAr || openedBook.title) : openedBook.title}</h2>
          <p>{openedBook.author}</p><p>{ar ? (openedBook.descriptionAr || openedBook.description) : openedBook.description}</p>
          {openedBook.readingSource && <p className="reading-source">{t('Reading source:', 'مصدر القراءة:')} {openedBook.readingSource}</p>}
          {openedBook.readingUrl && /^https?:\/\//i.test(openedBook.readingUrl) ? <><div className="reader-notice">{t('Some publishers block embedded previews. If the preview is blank, open the source website below.', 'بعض مواقع النشر تمنع عرض المعاينة داخل الموقع. لو المعاينة فارغة، افتح موقع المصدر من الرابط أدناه.')}</div>
            {/books\.google\.com\/books\?q=/i.test(openedBook.readingUrl) ? <p>{t('This is a Google Books search link, not a direct reading preview.', 'ده رابط بحث في Google Books، مش معاينة قراءة مباشرة.')}</p> : !readerFailed && <iframe title={openedBook.title} src={openedBook.readingUrl} loading="lazy" onError={() => setReaderFailed(true)} style={{ width: '100%', height: '70vh', border: '1px solid #ddd', borderRadius: '12px' }} />}
            <p><a className="read-link" href={openedBook.readingUrl} target="_blank" rel="noopener noreferrer">{t('Open source website', 'افتح موقع المصدر')}</a></p></> : <p>{t('No valid reading link is available yet.', 'لا يوجد رابط قراءة صالح حتى الآن.')}</p>}
        </>}</div></section>}
      {token && !window.location.hash.startsWith('#read/') && <section id="account" className="account-panel reading-dashboard"><div><span className="eyebrow">{t('YOUR READING SPACE', 'مساحتك القرائية')}</span><h2>{t('Make it personal.', 'اجعلها تجربتك.')}</h2><p>{t('Choose genres to personalize recommendations.', 'اختر التصنيفات لتحسين الترشيحات.')}</p><h3>{t('Your interests', 'اهتماماتك')}</h3><div className="interest-options">{genres.map(g => <label key={g.id}><input type="checkbox" checked={selectedInterests.includes(g.id)} onChange={e => setSelectedInterests(items => e.target.checked ? [...items, g.id] : items.filter(id => id !== g.id))}/>{ar ? (g.nameAr || g.name) : g.name}</label>)}</div><button className="primary" onClick={saveInterests}>{t('Save interests', 'حفظ الاهتمامات')}</button></div><div className="reading-list-panel"><h3>{t('My reading list', 'قائمة قراءاتي')} ({filteredReadingList.length})</h3><label className="reading-list-filter"><span>{t('Filter by genre', 'تصفية حسب التصنيف')}</span><select value={readingListGenreFilter} onChange={e => setReadingListGenreFilter(e.target.value)}><option value="all">{t('All genres', 'كل التصنيفات')}</option>{genres.map(g => <option key={g.id} value={String(g.id)}>{ar ? (g.nameAr || g.name) : g.name}</option>)}</select></label>{filteredReadingList.length ? filteredReadingList.map(item => <article className="reading-list-item" key={item.id}><div><strong>{ar ? (item.titleAr || item.title) : item.title}</strong><small>{item.author}</small><span>{item.status}</span></div><div className="reading-list-actions"><select aria-label={t('Reading status', 'حالة القراءة')} value={item.status} onChange={async e => { await addToList(item.id, e.target.value); loadReadingList(); }}><option value="WantToRead">{t('Want to read', 'أريد قراءته')}</option><option value="Reading">{t('Reading', 'أقرأه الآن')}</option><option value="Finished">{t('Finished', 'انتهيت منه')}</option></select><button className="text-button" onClick={() => removeFromReadingList(item.id)}>{t('Remove', 'حذف')}</button></div></article>) : <p>{readingList.length ? t('No books in your reading list match this genre.', 'لا توجد كتب في قائمة قراءتك تطابق هذا التصنيف.') : t('Books you mark Want to read will appear here.', 'الكتب التي تضيفها إلى قائمة القراءة ستظهر هنا.')}</p>}</div></section>}

      {token && isAdmin && <section className="account-panel add-book-panel"><div><span className="eyebrow">{t('GROW THE LIBRARY', 'وسّع مكتبة الكتب')}</span><h2>{t('Add a book.', 'أضف كتابًا.')}</h2><p>{t('Add book details and a legitimate reading link. The book will be saved in the database.', 'أدخل بيانات الكتاب ورابط قراءة موثوقًا ليُحفظ في قاعدة البيانات.')}</p></div><form className="auth-form" onSubmit={createBook}>
        <input required maxLength="200" placeholder={t('Book title *', 'عنوان الكتاب *')} value={newBook.title} onChange={e => setNewBook({...newBook, title:e.target.value})}/>
        <input maxLength="200" placeholder={t('Arabic title (optional)', 'العنوان بالعربية (اختياري)')} value={newBook.titleAr} onChange={e => setNewBook({...newBook, titleAr:e.target.value})}/>
        <input required maxLength="120" placeholder={t('Author *', 'المؤلف *')} value={newBook.author} onChange={e => setNewBook({...newBook, author:e.target.value})}/>
        <textarea maxLength="2000" placeholder={t('Description (optional)', 'وصف الكتاب (اختياري)')} value={newBook.description} onChange={e => setNewBook({...newBook, description:e.target.value})}/>
        <select required value={newBook.genreId} onChange={e => setNewBook({...newBook, genreId:e.target.value})}><option value="">{t('Choose genre *', 'اختر التصنيف *')}</option>{genres.map(g => <option key={g.id} value={g.id}>{ar ? (g.nameAr || g.name) : g.name}</option>)}</select>
        <input required type="url" maxLength="1000" placeholder={t('Reading URL (https://...) *', 'رابط القراءة (https://...) *')} value={newBook.readingUrl} onChange={e => setNewBook({...newBook, readingUrl:e.target.value})}/>
        <input maxLength="150" placeholder={t('Reading source (e.g. Project Gutenberg)', 'مصدر القراءة (مثلاً: Project Gutenberg)')} value={newBook.readingSource} onChange={e => setNewBook({...newBook, readingSource:e.target.value})}/>
        <button className="primary">{t('Save book', 'حفظ الكتاب')}</button>
      </form></section>}
      {token && <section id="recommendations" className="section"><div className="section-heading"><div><span className="eyebrow">{t('A LITTLE MORE PERSONAL', 'اختيارات أقرب لذوقك')}</span><h2>{t('Picked for you', 'ترشيحات لك')}</h2></div><span className="count">{filteredRecommendations.length} {t('books', 'كتب')}</span></div>{filteredRecommendations.length ? <div className="book-grid">{filteredRecommendations.map(bookCard)}</div> : <p>{selectedInterests.length ? t('No recommended books match your selected interests yet.', 'لا توجد كتب مرشحة تطابق اهتماماتك المختارة حاليًا.') : t('Choose your interests and rate books to improve recommendations.', 'اختر اهتماماتك وقيّم الكتب لتحسين الترشيحات.')}</p>}</section>}
      <section id="discover" className="section"><div className="section-heading"><div><span className="eyebrow">{t('THE READING SHELF', 'رف الكتب')}</span><h2>{t('Explore your next read', 'اختر قراءتك القادمة')}</h2><p>{t('A few places to begin your next adventure.', 'بعض الاقتراحات لتبدأ رحلتك القادمة.')}</p></div><span className="count">{books.length} {t('books', 'كتب')}</span></div>
        <div className="book-grid">{books.map(bookCard)}</div>
      </section>
      <section className="community"><div><span className="eyebrow">{t('READING IS BETTER TOGETHER', 'القراءة أجمل مع الآخرين')}</span><h2>{t('Every reader has a story.', 'لكل قارئ حكاية.')}</h2><p>{t('Reader profiles, shared interests, and following are planned for the next release.', 'ملفات القراء والاهتمامات المشتركة والمتابعة ضمن التطوير القادم.')}</p></div><div className="community-mark">Read<br /><i>together.</i></div></section>
    </main>
    <footer><a className="brand" href="#"><span className="brand-icon">B</span> Book<span>Discovery</span></a><span>{t('Made for readers, one page at a time.', 'صُممت لمحبي القراءة، صفحة بعد صفحة.')}</span><small>© 2026 Book Discovery MVP</small></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
