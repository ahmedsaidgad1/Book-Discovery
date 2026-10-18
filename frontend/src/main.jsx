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
  const [newBook, setNewBook] = useState({ title: '', titleAr: '', author: '', description: '', genreId: '', readingUrl: '', readingSource: '' });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('book-discovery-theme', theme);
  }, [theme]);

  const ar = lang === 'ar';
  const t = (en, arabic) => ar ? arabic : en;
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
  async function loadRecommendations() {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/recommendations`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRecommendations(await res.json());
    } catch { }
  }
  useEffect(() => { const onHashChange = () => setCurrentHash(window.location.hash || '#'); window.addEventListener('hashchange', onHashChange); return () => window.removeEventListener('hashchange', onHashChange); }, []);
  useEffect(() => { if (token) { loadBooks(); fetch(`${API}/api/genres`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).then(setGenres).catch(() => setGenres([])); } else { setBooks([]); } }, [token]);
  useEffect(() => { if (token) loadRecommendations(); }, [token]);
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

  const chooseBookToRead = (book) => { setSelectedBookPreview(book); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const bookCard = (b) => <article className="book" key={b.id}>
    <a className="cover" href={`#read/${b.id}`} aria-label={t('Open book details and reader', 'افتح صفحة الكتاب والقراءة')}><span>BOOK</span><strong>{ar ? (b.titleAr || b.title) : b.title}</strong><small>{b.author}</small></a>
    <div className="book-body"><span className="genre">{ar ? (b.genre?.nameAr || 'كتاب') : (b.genre?.name || 'Book')}</span>
      <h3><a href={`#read/${b.id}`}>{ar ? (b.titleAr || b.title) : b.title}</a></h3><p className="author">{b.author}</p>
      <p>{ar ? (b.descriptionAr || b.description) : b.description}</p>
      {b.averageRating !== undefined && <p className="rating">★ {Number(b.averageRating).toFixed(1)} <small>({b.ratingCount || 0})</small></p>}
      {b.readingSource && <p className="reading-source">{t('Reading source:', 'مصدر القراءة:')} {b.readingSource}</p>}
      <div className="actions">{b.readingUrl && /^https?:\/\//i.test(b.readingUrl) && <a className="read-link" href={`#read/${b.id}`}>{t('Reading options', 'خيارات القراءة')}</a>}<button onClick={() => { addToList(b.id); chooseBookToRead(b); }}>{t('Want to read', 'أريد قراءته')}</button><select aria-label="Rating" defaultValue="" onChange={e => { if (e.target.value) rate(b.id, Number(e.target.value)); }}><option value="" disabled>{t('Rate', 'قيّم')}</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ★</option>)}</select></div>
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
      {token && selectedBookPreview && !currentHash.startsWith('#read/') && <section className="account-panel selected-book-preview" aria-live="polite"><div><span className="eyebrow">{t('YOUR NEXT READ', 'كتابك القادم')}</span><h2>{ar ? (selectedBookPreview.titleAr || selectedBookPreview.title) : selectedBookPreview.title}</h2><p>{selectedBookPreview.author}</p><p>{ar ? (selectedBookPreview.descriptionAr || selectedBookPreview.description || '') : (selectedBookPreview.description || '')}</p>{selectedBookPreview.readingSource && <p className="reading-source">{t('Reading source:', 'مصدر القراءة:')} {selectedBookPreview.readingSource}</p>}</div><div className="selected-book-actions"><div className="selected-book-cover"><span>BOOK</span><strong>{ar ? (selectedBookPreview.titleAr || selectedBookPreview.title) : selectedBookPreview.title}</strong><small>{selectedBookPreview.author}</small></div>{selectedBookPreview.readingUrl && /^https?:\/\//i.test(selectedBookPreview.readingUrl) ? <a className="read-link" href={selectedBookPreview.readingUrl} target="_blank" rel="noopener noreferrer">{t('Open PDF / book link ↗', 'افتح رابط الكتاب / PDF ↗')}</a> : <p>{t('A reading link is not available for this book yet.', 'رابط قراءة الكتاب غير متاح حاليًا.')}</p>}<button className="text-button" onClick={() => setSelectedBookPreview(null)}>{t('Close preview', 'إغلاق المعاينة')}</button></div></section>}
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
      {token && !window.location.hash.startsWith('#read/') && <section id="account" className="account-panel"><div><span className="eyebrow">{t('YOUR READING SPACE', 'مساحتك القرائية')}</span><h2>{t('Make it personal.', 'اجعلها تجربتك.')}</h2><p>{t('Sign in to rate books, save your reading list, and get recommendations.', 'سجّل الدخول لتقييم الكتب وحفظ قائمتك والحصول على ترشيحات.')}</p></div>
        
      </section>}

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
      {token && <section id="recommendations" className="section"><div className="section-heading"><div><span className="eyebrow">{t('A LITTLE MORE PERSONAL', 'اختيارات أقرب لذوقك')}</span><h2>{t('Picked for you', 'ترشيحات لك')}</h2></div><span className="count">{recommendations.length} {t('books', 'كتب')}</span></div>{recommendations.length ? <div className="book-grid">{recommendations.map(bookCard)}</div> : <p>{t('Choose your interests and rate books to improve recommendations.', 'اختر اهتماماتك وقيّم الكتب لتحسين الترشيحات.')}</p>}</section>}
      <section id="discover" className="section"><div className="section-heading"><div><span className="eyebrow">{t('THE READING SHELF', 'رف الكتب')}</span><h2>{t('Explore your next read', 'اختر قراءتك القادمة')}</h2><p>{t('A few places to begin your next adventure.', 'بعض الاقتراحات لتبدأ رحلتك القادمة.')}</p></div><span className="count">{books.length} {t('books', 'كتب')}</span></div>
        <div className="book-grid">{books.map(bookCard)}</div>
      </section>
      <section className="community"><div><span className="eyebrow">{t('READING IS BETTER TOGETHER', 'القراءة أجمل مع الآخرين')}</span><h2>{t('Every reader has a story.', 'لكل قارئ حكاية.')}</h2><p>{t('Reader profiles, shared interests, and following are planned for the next release.', 'ملفات القراء والاهتمامات المشتركة والمتابعة ضمن التطوير القادم.')}</p></div><div className="community-mark">Read<br /><i>together.</i></div></section>
    </main>
    <footer><a className="brand" href="#"><span className="brand-icon">B</span> Book<span>Discovery</span></a><span>{t('Made for readers, one page at a time.', 'صُممت لمحبي القراءة، صفحة بعد صفحة.')}</span><small>© 2026 Book Discovery MVP</small></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
