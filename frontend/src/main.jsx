import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5080';
function App() {
  const [lang, setLang] = useState('en');
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('login');
  const [message, setMessage] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const ar = lang === 'ar';
  const t = (en, arabic) => ar ? arabic : en;

  async function loadBooks(term = '') {
    try {
      const res = await fetch(`${API}/api/books?search=${encodeURIComponent(term)}`);
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
  useEffect(() => { loadBooks(); }, []);
  useEffect(() => { if (token) loadRecommendations(); }, [token]);
  async function auth(e) {
    e.preventDefault(); setMessage('');
    const route = mode === 'login' ? 'login' : 'register';
    const body = mode === 'login' ? { email, password } : { name, email, password };
    try {
      const res = await fetch(`${API}/api/auth/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');
      localStorage.setItem('token', data.token); setToken(data.token); setMessage(t('Signed in successfully', 'تم تسجيل الدخول بنجاح'));
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
  const bookCard = (b) => <article className="book" key={b.id}>
    <div className="cover"><span>BOOK</span><strong>{ar ? (b.titleAr || b.title) : b.title}</strong><small>{b.author}</small></div>
    <div className="book-body"><span className="genre">{ar ? (b.genre?.nameAr || 'كتاب') : (b.genre?.name || 'Book')}</span>
      <h3>{ar ? (b.titleAr || b.title) : b.title}</h3><p className="author">{b.author}</p>
      <p>{ar ? (b.descriptionAr || b.description) : b.description}</p>
      {b.averageRating !== undefined && <p className="rating">★ {Number(b.averageRating).toFixed(1)} <small>({b.ratingCount || 0})</small></p>}
      <div className="actions"><button onClick={() => addToList(b.id)}>{t('Want to read', 'أريد قراءته')}</button><select aria-label="Rating" defaultValue="" onChange={e => { if (e.target.value) rate(b.id, Number(e.target.value)); }}><option value="" disabled>{t('Rate', 'قيّم')}</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ★</option>)}</select></div>
    </div>
  </article>;

  return <div className={ar ? 'app rtl' : 'app'} dir={ar ? 'rtl' : 'ltr'}>
    <header className="topbar"><a className="brand" href="#"><span className="brand-icon">B</span> Book<span>Discovery</span></a>
      <nav><a href="#discover">{t('Discover', 'اكتشف')}</a><a href="#recommendations">{t('For you', 'لك')}</a></nav>
      <div className="top-actions"><button className="lang" onClick={() => setLang(ar ? 'en' : 'ar')}>{ar ? 'English' : 'العربية'}</button>{token ? <button className="outline" onClick={() => { localStorage.removeItem('token'); setToken(''); setRecommendations([]); setMessage(t('Signed out', 'تم تسجيل الخروج')); }}>{t('Sign out', 'تسجيل الخروج')}</button> : <a href="#account" className="sign-link">{t('Sign in', 'دخول')}</a>}</div>
    </header>
    <main>
      <section className="hero"><div className="hero-content"><span className="eyebrow">{t('YOUR NEXT CHAPTER STARTS HERE', 'رحلتك القادمة تبدأ من هنا')}</span>
        <h1>{t('Find books that feel like', 'اكتشف كتبًا تشبه')} <em>{t('you.', 'ذوقك.')}</em></h1>
        <p>{t('Personalized book discovery for curious minds. Find your next favorite read and connect through stories.', 'اكتشف كتبًا تناسب اهتماماتك، واعثر على قراء يشاركونك حب الحكايات.')}</p>
        <div className="search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadBooks(search)} placeholder={t('Search books or authors...', 'ابحث عن كتاب أو مؤلف...')} /><button onClick={() => loadBooks(search)}>{t('Search', 'بحث')}</button></div>
        <div className="hero-meta"><span>✦ {t('Discover your taste', 'اكتشف ذوقك')}</span><span>✦ {t('Build your reading list', 'نظّم قراءاتك')}</span></div>
      </div><div className="hero-art"><div className="sun"></div><div className="floating-book book-one"><small>01 / FICTION</small><b>Stories<br />that stay.</b><span>BOOK DISCOVERY</span></div><div className="floating-book book-two"><small>READ • GROW</small><b>One page<br />at a time.</b></div><div className="spark">✳</div></div></section>
      {message && <div className="notice">{message}<button onClick={() => setMessage('')}>×</button></div>}
      <section id="account" className="account-panel"><div><span className="eyebrow">{t('YOUR READING SPACE', 'مساحتك القرائية')}</span><h2>{t('Make it personal.', 'اجعلها تجربتك.')}</h2><p>{t('Sign in to rate books, save your reading list, and get recommendations.', 'سجّل الدخول لتقييم الكتب وحفظ قائمتك والحصول على ترشيحات.')}</p></div>
        {!token && <form onSubmit={auth} className="auth-form">{mode === 'register' && <input required placeholder={t('Name', 'الاسم')} value={name} onChange={e => setName(e.target.value)} />}<input required type="email" placeholder={t('Email', 'البريد الإلكتروني')} value={email} onChange={e => setEmail(e.target.value)} /><input required minLength="8" type="password" placeholder={t('Password (8+ chars)', 'كلمة المرور (8 أحرف على الأقل)')} value={password} onChange={e => setPassword(e.target.value)} /><button className="primary">{mode === 'login' ? t('Sign in', 'دخول') : t('Create account', 'إنشاء حساب')}</button><button type="button" className="text-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? t('New here? Create account', 'مستخدم جديد؟ أنشئ حسابًا') : t('Already registered? Sign in', 'لديك حساب؟ سجّل الدخول')}</button></form>}
      </section>
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
