import React, { useState, useEffect, useCallback, useRef, useDeferredValue, useMemo } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react';
import { LuGithub, LuSparkles, LuWind, LuRotateCcw, LuChevronRight, LuCopy, LuCheck, LuImage, LuTrees, LuBuilding, LuMoon, LuSun, LuPalette, LuLayoutGrid } from 'react-icons/lu';
import SanctuaryMode from './components/forgeui/sanctuary-mode';
import FaqSection from './components/FaqSection';
import Skiper34 from './components/Skiper34';
import './index.css';

const STATIC_URL = import.meta.env.PROD ? 'https://cdn.jsdelivr.net/gh/yadavnikhil03/CozyPixels@main/frontend/public' : '';
const imageUrl = (path) => `${STATIC_URL}${path.startsWith('/') ? path : `/${path}`}`;

const detectBrowser = () => {
  const ua = window.navigator.userAgent;
  if (ua.indexOf("Edg") > -1) return { name: 'Edge', url: 'edge://extensions' };
  if (ua.indexOf("OPR") > -1 || ua.indexOf("Opera") > -1) return { name: 'Opera', url: 'opera://extensions' };
  if (ua.indexOf("Brave") > -1 || (navigator.brave && navigator.brave.isBrave)) return { name: 'Brave', url: 'brave://extensions' };
  return { name: 'Chrome', url: 'chrome://extensions' };
};

const promoSectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.12,
      delayChildren: 0.12,
    },
  },
};

const promoItemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut' },
  },
};

const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const modalCardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 220, damping: 22 },
  },
  exit: { opacity: 0, y: 18, scale: 0.98, transition: { duration: 0.16 } },
};




const ExtensionModal = ({ onClose, browser }) => {
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(browser.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <m.div
      className="lightbox-overlay extension-modal-overlay"
      onClick={onClose}
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <m.div
        className="extension-modal-content"
        onClick={(e) => e.stopPropagation()}
        variants={modalCardVariants}
      >
        <button type="button" className="lightbox-close" onClick={onClose}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>

        <div className="modal-header">
          <div className="modal-icon">
            <LuSparkles />
          </div>
          <h3>Activate for {browser.name}</h3>
          <p>Almost there! Just 2 quick steps to activate your sanctuary.</p>
        </div>

        <div className="installation-steps">
          <div className="step-item">
            <div className="step-num">1</div>
            <div className="step-text">
              <strong>Open Extensions Page</strong>
              <p>Copy this address and paste it into a new tab:</p>
              <button type="button" className="copy-url-bar" style={{ width: '100%', fontFamily: 'inherit', fontSize: 'inherit', textAlign: 'left' }} onClick={copyUrl}>
                <code>{browser.url}</code>
                {copied ? <LuCheck style={{ color: '#27c93f' }} /> : <LuCopy />}
              </button>
            </div>
          </div>

          <div className="step-item">
            <div className="step-num">2</div>
            <div className="step-text">
              <strong>Load Unpacked Sanctuary</strong>
              <p>
                Enable <strong>Developer mode</strong>, click <strong>Load unpacked</strong>,
                and select the folder you just downloaded.
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="promo-btn primary" style={{ width: '100%' }} onClick={onClose}>
            I've loaded the Engine!
          </button>
        </div>
      </m.div>
    </m.div>
  );
};


const Header = ({ totalCount }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="container flex items-center justify-between w-full">
        <span className="logo-text">CozyPixels</span>
        <div className="header-actions">
          <a href="/about" className="header-link">About Us</a>
          <a href="/faq" className="header-link">FAQ</a>
          <a href="/contact" className="header-link">Contact</a>
          {totalCount > 0 && (
            <span className="wallpaper-count-header">
              {totalCount} wallpapers
            </span>
          )}
        </div>
      </div>
    </header>
  );
};


const HERO_WALLPAPERS = [
  'Nord/Pixel%20Art/pixelcity.png',
  'Nord/Pixel%20Art/pixelmoon.png',
  'Catppuccin/Abstract%20%26%20Artistic/galaxy-waves.jpg',
  'Catppuccin/Abstract%20%26%20Artistic/cartoon-castle.png',
  'Catppuccin/Abstract%20%26%20Artistic/dark-waves.jpg',
  'Catppuccin/Abstract%20%26%20Artistic/droplets.png',
  'Nord/Abstract%20%26%20Artistic/ign_FluidifiedST-1.png',
  'Nord/Abstract%20%26%20Artistic/ign_MaterialMountains-1.png',
  'Nord/Abstract%20%26%20Artistic/ign_nordic_rose.png',
];

const Hero = () => (
  <div className="hero-wrapper">
    <div className="hero-bg-gradient" />
    <div className="hero-orb hero-orb-1" />
    <div className="hero-orb hero-orb-2" />
    <div className="hero-orb hero-orb-3" />

    <div id="about" className="hero-split-container">
      {/* LEFT: Text content */}
      <m.div
        className="hero-left"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="hero-title-split">
          <span className="hero-title-line">Your <span className="hero-title-accent">Serene</span></span>
          <span className="hero-title-line">Space Starts Here</span>
        </h1>

        <m.p
          className="hero-subtitle-split"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          Minimalist wallpapers, obsessively curated. Pick your vibe,
          transform your desktop into a place you actually want to look at.
        </m.p>

        <m.div
          className="hero-actions-row"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
        >
          <a href="#gallery" className="hero-cta-primary">
            Browse Wallpapers <LuChevronRight />
          </a>
          <a
            href="https://github.com/yadavnikhil03"
            target="_blank"
            rel="noopener noreferrer"
            className="creator-pill-badge"
          >
            <img src="https://github.com/yadavnikhil03.png" alt="@yadavnikhil03" className="creator-pill-avatar" />
            <span className="creator-pill-text">by <strong>@yadavnikhil03</strong></span>
            <LuGithub className="creator-pill-icon" />
          </a>
        </m.div>
      </m.div>

      {/* RIGHT: Wallpaper mosaic */}
      <m.div
        className="hero-right"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        <div className="hero-mosaic">
          {HERO_WALLPAPERS.slice(0, 9).map((path, i) => (
            <m.div
              key={path}
              className={`mosaic-card mosaic-card-${i}`}
              whileHover={{ scale: 1.04, zIndex: 10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.3 + i * 0.06, duration: 0.6 } }}
            >
              <img
                src={imageUrl(path)}
                alt={`wallpaper ${i + 1}`}
                className="mosaic-img"
                loading="eager"
                decoding="async"
              />
            </m.div>
          ))}
        </div>
        <div className="hero-mosaic-fade-bottom" />
        <div className="hero-mosaic-fade-right" />
      </m.div>
    </div>
  </div>
);

const getCategoryIcon = (cat) => {
  switch (cat.toLowerCase()) {
    case 'all': return <LuLayoutGrid />;
    case 'nature': return <LuTrees />;
    case 'architecture': case 'city': return <LuBuilding />;
    case 'dark': case 'night': return <LuMoon />;
    case 'light': case 'minimal': return <LuSun />;
    case 'art': case 'abstract': return <LuPalette />;
    default: return <LuImage />;
  }
};

const CategoryFilter = ({ categories, selected, onSelect, counts }) => (
  <nav className="container filters" aria-label="Wallpaper categories">
    <button
      type="button"
      className={`filter-btn ${selected === 'All' ? 'active' : ''}`}
      onClick={() => onSelect('All')}
      aria-pressed={selected === 'All'}
    >
      {selected === 'All' && (
        <m.div
          layoutId="activeFilterBg"
          className="active-filter-bg"
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        />
      )}
      <span className="filter-icon">{getCategoryIcon('All')}</span>
      <span className="filter-text">All Wallpapers</span>
      <span className="filter-count">{counts.total}</span>
    </button>
    {categories.map((cat) => (
      <button
        type="button"
        key={cat}
        className={`filter-btn ${selected === cat ? 'active' : ''}`}
        onClick={() => onSelect(cat)}
        aria-pressed={selected === cat}
      >
        {selected === cat && (
          <m.div
            layoutId="activeFilterBg"
            className="active-filter-bg"
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          />
        )}
        <span className="filter-icon">{getCategoryIcon(cat)}</span>
        <span className="filter-text">{cat}</span>
        <span className="filter-count">{counts[cat] || 0}</span>
      </button>
    ))}
  </nav>
);


const MOCKUP_WALLPAPERS = [
  { path: 'Nord/Pixel%20Art/pixelcity.png', name: 'pixelcity' },
  { path: 'Nord/Pixel%20Art/pixelmoon.png', name: 'pixelmoon' },
  { path: 'Nord/Anime%20%26%20Gaming/ign_DynamicFry-1.png', name: 'ign_DynamicFry-1' },
  { path: 'Catppuccin/Abstract%20%26%20Artistic/galaxy-waves.jpg', name: 'galaxy-waves' },
  { path: 'Catppuccin/Abstract%20%26%20Artistic/cartoon-castle.png', name: 'cartoon-castle' },
];

const ExtensionPromo = ({ onOpenModal }) => {
  const [wallpaperIdx, setWallpaperIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setWallpaperIdx(i => (i + 1) % MOCKUP_WALLPAPERS.length);
        setFade(true);
      }, 250);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const currentWallpaper = MOCKUP_WALLPAPERS[wallpaperIdx];

  return (
  <m.section
    className="container apple-promo-section"
    variants={promoSectionVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
  >
    <div className="apple-promo-container">
      <div className="apple-promo-bg-glow"></div>
      
      <div className="apple-promo-header">
        <m.div className="apple-promo-eyebrow" variants={promoItemVariants}>
          Apps & Extensions
        </m.div>
        <m.h2 className="apple-promo-title" variants={promoItemVariants}>
          Your screen.<br/>Reimagined.
        </m.h2>
        <m.p className="apple-promo-subtitle" variants={promoItemVariants}>
          Transform your desktop and browser into a serene digital sanctuary with our standalone app and browser extension.
        </m.p>
        <m.div className="apple-promo-actions" variants={promoItemVariants} style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px' }}>
          <m.button 
            className="apple-promo-btn" 
            onClick={onOpenModal}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Install Extension
          </m.button>
          <m.a 
            className="apple-promo-btn" 
            href="https://github.com/yadavnikhil03/CozyPixels/releases/latest/download/CozyPixels_1.0.8_x64-setup.exe"
            style={{ backgroundColor: 'transparent', border: '1px solid rgba(255, 255, 255, 0.5)', color: '#ffffff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: '#ffffff' }}
            whileTap={{ scale: 0.95 }}
          >
            Download Desktop App
          </m.a>
        </m.div>
      </div>

      <m.div 
        className="apple-promo-visual"
        variants={promoItemVariants}
      >
        <div className="apple-browser-mockup">
          <div className="apple-browser-header">
            <div className="apple-browser-dots">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <div className="apple-browser-bar"></div>
          </div>
          <div 
            className="apple-browser-body"
            style={{
              backgroundImage: `url('${imageUrl(currentWallpaper.path)}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: fade ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          >
            <div className="new-tab-content">
              <h1 className="new-tab-clock">17:36</h1>
              <p className="new-tab-quote">Breathe in, breathe out.</p>
            </div>
            
            <div className="new-tab-footer">
              <span className="new-tab-credit">{currentWallpaper.name}</span>
              <span className="new-tab-brand">Cozy Engine</span>
            </div>
          </div>
        </div>
      </m.div>

      <m.div className="apple-promo-features" variants={promoItemVariants}>
        <div className="apple-feature-card">
          <LuSparkles className="feature-icon" />
          <span>Fast install & startup</span>
        </div>
        <div className="apple-feature-card">
          <LuWind className="feature-icon" />
          <span>Focused new-tab layout</span>
        </div>
        <div className="apple-feature-card">
          <LuRotateCcw className="feature-icon" />
          <span>Wallpaper rotation controls</span>
        </div>
      </m.div>
    </div>
  </m.section>
  );
};


const EMPTY_WALLPAPERS = [];

const HorizontalShowcase = ({ wallpapers = EMPTY_WALLPAPERS, onPreview }) => {
  if (!wallpapers.length) return null;


  const infiniteWallpapers = [...wallpapers, ...wallpapers];

  return (
    <section className="showcase-section-drag">
      <div className="showcase-intro-block">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="showcase-intro-label"
        >
          Curated Collection
        </m.div>
        <m.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="showcase-intro-title"
        >
          The Serene Gallery
        </m.h2>
        <m.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="showcase-intro-desc"
        >
          Discover our hand-picked selection of minimalist artworks, perfectly framed for your digital space. Pause by hovering.
        </m.p>
      </div>

      <div className="showcase-marquee-container">
        <div className="showcase-marquee-track">
          {infiniteWallpapers.map((wp, index) => {
            return (
              <m.div
                key={`${wp.path}-${index}`}
                className="showcase-card"
                onClick={() => onPreview(wp)}
                whileHover={{ scale: 0.98 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="showcase-card-overlay" />
                <img
                  src={`${STATIC_URL}${wp.path}`}
                  alt={wp.name}
                  className="showcase-card-img"
                  draggable="false"
                  loading="lazy"
                  decoding="async"
                />
                <div className="showcase-card-content">
                  <p className="showcase-card-cat">{wp.category}</p>
                  <p className="showcase-card-title">
                    {wp.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                </div>
              </m.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


const WallpaperCard = React.memo(({ wallpaper, onPreview, onShowToast }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imageUrl = `${STATIC_URL}${wallpaper.path}`;
  const downloadUrl = `${STATIC_URL}${wallpaper.downloadPath}`;

  const displayName = wallpaper.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <m.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`wallpaper-card ${isLoaded ? 'loaded' : 'loading'}`}
      onClick={() => isLoaded && onPreview(wallpaper)}
    >
      {!isLoaded && !hasError && (
        <div className="skeleton-card" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
      )}

      {hasError ? (
        <div className="wallpaper-error">
          <span className="material-symbols-outlined">broken_image</span>
          <p>Failed to load</p>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={displayName}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.6s ease' }}
        />
      )}

      {isLoaded && (
        <div className="overlay">
          <div className="card-info">
            <span className="card-title">{wallpaper.category}</span>
            <span className="card-name">{displayName}</span>
          </div>
          <div className="card-actions">
            <a
              href={downloadUrl}
              download={wallpaper.name}
              className="download-btn"
              onClick={(e) => {
                e.stopPropagation();
                onShowToast("Wallpaper saved", "download");
              }}
              title="Download"
            >
              <span className="material-symbols-outlined">download</span>
            </a>
          </div>
        </div>
      )}
    </m.div>
  );
});


const Lightbox = ({ wallpaper, onClose, onSanctuary, onShowToast }) => {
  const imageUrl = wallpaper ? `${STATIC_URL}${wallpaper.path}` : '';
  const downloadUrl = wallpaper ? `${STATIC_URL}${wallpaper.downloadPath}` : '';

  const displayName = wallpaper
    ? wallpaper.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!wallpaper) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [wallpaper]);

  if (!wallpaper) return null;

  return (
    <div className="lightbox-overlay">
      <button 
        type="button" 
        className="lightbox-backdrop-btn" 
        onClick={onClose} 
        aria-label="Close lightbox"
      />
      <img src={imageUrl} alt="" className="lightbox-ambient-bg" />
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lightbox-close" onClick={onClose}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>
        <img src={imageUrl} alt={displayName} className="lightbox-main-img" />
        <div className="lightbox-footer">
          <div className="lightbox-info">
            <span className="lightbox-title" title={displayName}>{displayName}</span>
            <span className="lightbox-category">{wallpaper.category}</span>
          </div>
          <a
            href={downloadUrl}
            download={wallpaper.name}
            className="lightbox-download"
            onClick={() => onShowToast("Wallpaper saved", "download")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            Download
          </a>
          <button
            type="button"
            className="lightbox-sanctuary-btn"
            onClick={() => onSanctuary(wallpaper)}
            title="Enter Focus Sanctuary"
          >
            <LuSparkles />
            Sanctuary
          </button>
        </div>

      </div>
    </div>
  );
};





const scrollUp = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const Footer = () => (
  <footer className="site-footer">
    <div className="footer-brand">
      <span className="logo-text" style={{ fontSize: '2rem' }}>CozyPixels</span>
      <p className="footer-tagline">
        Curating the most serene 4K wallpapers for your aesthetic workspace.
      </p>
    </div>
    
    <div className="footer-links">
      <a href="/about" className="footer-link">About Us</a>
      <a href="/faq" className="footer-link">FAQ</a>
      <a href="/privacy" className="footer-link">Privacy Policy</a>
      <a href="/terms" className="footer-link">Terms & Conditions</a>
      <a href="/contact" className="footer-link">Contact</a>
    </div>
    
    <div className="footer-divider"></div>
    
    <p className="footer-copyright">
      © 2026 CozyPixels. Crafted for serenity.
    </p>
  </footer>
);


const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`scroll-top-btn ${visible ? 'visible' : ''}`}
      onClick={scrollUp}
      aria-label="Scroll to top"
      title="Back to top"
    >
      <span className="material-symbols-outlined">arrow_upward</span>
    </button>
  );
};


function getWallpapers(callback) {
  fetch('/wallpapers.json')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        callback(data);
      } else {
        console.error('Data is not an array:', data);
      }
    })
    .catch((err) => {
      console.error('Error fetching wallpapers:', err);
    });
}

function App() {
  const [wallpapers, setWallpapers] = useState([]);
  const [category, setCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [uiState, setUiState] = useState({
    previewWallpaper: null,
    sanctuaryWallpaper: null,
    showExtensionModal: false,
    browserInfo: { name: 'Chrome', url: 'chrome://extensions' },
    toast: null,
    displayCount: 30
  });
  const { previewWallpaper, sanctuaryWallpaper, showExtensionModal, browserInfo, toast, displayCount } = uiState;
  const setPreviewWallpaper = useCallback((val) => setUiState(prev => ({ ...prev, previewWallpaper: val })), []);
  const setSanctuaryWallpaper = useCallback((val) => setUiState(prev => ({ ...prev, sanctuaryWallpaper: val })), []);
  const setShowExtensionModal = useCallback((val) => setUiState(prev => ({ ...prev, showExtensionModal: val })), []);
  const setBrowserInfo = useCallback((val) => setUiState(prev => ({ ...prev, browserInfo: val })), []);
  const setToast = useCallback((val) => setUiState(prev => ({ ...prev, toast: typeof val === 'function' ? val(prev.toast) : val })), []);
  const setDisplayCount = useCallback((val) => setUiState(prev => ({ ...prev, displayCount: typeof val === 'function' ? val(prev.displayCount) : val })), []);
  const loaderRef = useRef(null);

  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((msg, type = 'default') => {
    setToast({ message: msg, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, [setToast]);

  const handleSearchChange = useCallback((val) => {
    setSearchQuery(val);
    setDisplayCount(30);
  }, [setSearchQuery, setDisplayCount]);

  const handleCategoryChange = useCallback((cat) => {
    setCategory(cat);
    setDisplayCount(30);
  }, [setCategory, setDisplayCount]);

  const enterSanctuary = (wallpaper) => {
    setPreviewWallpaper(null);
    setSanctuaryWallpaper(`${STATIC_URL}${wallpaper.path}`);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(e => console.log(e));
    }
    showToast("Entering Sanctuary Mode", "sanctuary");
  };



  const handleExtensionInstall = () => {
    const browser = detectBrowser();
    setBrowserInfo(browser);

    const downloadUrl = 'https://github.com/user-attachments/files/28417336/Cozypixels_extension.zip';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'cozy-engine.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExtensionModal(true);
  };

  useEffect(() => {
    getWallpapers(setWallpapers);
  }, []);


  const categories = Array.isArray(wallpapers) ? [...new Set(wallpapers.map((w) => w.category))] : [];

  const counts = useMemo(() => {
    const result = { total: wallpapers.length };
    for (const w of wallpapers) {
      result[w.category] = (result[w.category] || 0) + 1;
    }
    return result;
  }, [wallpapers]);

  const filteredWallpapers = wallpapers.filter((w) => {
    if (category !== 'All' && w.category !== category) return false;
    if (!deferredSearchQuery.trim()) return true;
    const q = deferredSearchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayCount(prev => prev + 30);
      }
    }, { threshold: 0.1, rootMargin: '400px' });

    const currentRef = loaderRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [filteredWallpapers.length, setDisplayCount]);

  const closeLightbox = useCallback(() => setPreviewWallpaper(null), [setPreviewWallpaper]);


  return (
    <LazyMotion features={domAnimation}>
      <div>
      <Header totalCount={wallpapers.length} />
      <main>
        <Hero totalCount={wallpapers.length} />

        <HorizontalShowcase
          wallpapers={wallpapers}
          onPreview={setPreviewWallpaper}
        />
        <Skiper34 />
        <ExtensionPromo onOpenModal={handleExtensionInstall} />

        <div id="gallery" className="container" style={{ paddingTop: '8px', paddingBottom: '16px' }}>
          <m.div
            className="search-wrapper"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              aria-label="Search wallpapers"
              placeholder="Search wallpapers..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </m.div>
        </div>

        <CategoryFilter
          categories={categories}
          selected={category}
          onSelect={handleCategoryChange}
          counts={counts}
        />
        <section className="container gallery" aria-label="Wallpapers collection">
          <h2 className="sr-only">High Resolution Wallpaper Gallery</h2>
          <AnimatePresence mode="popLayout">
            {filteredWallpapers.slice(0, displayCount).map((w) => (
              <WallpaperCard
                key={w.path}
                wallpaper={w}
                onPreview={setPreviewWallpaper}
                onShowToast={showToast}
              />
            ))}
          </AnimatePresence>
          {filteredWallpapers.length > displayCount && (
            <div ref={loaderRef} className="loader" style={{ gridColumn: '1 / -1', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined spin" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
              <span style={{ marginLeft: '12px' }}>Loading more wallpapers...</span>
            </div>
          )}
          {filteredWallpapers.length === 0 && (
            <div className="loader" style={{ gridColumn: '1 / -1' }}>
              No wallpapers found — try a different search or category.
            </div>
          )}
        </section>
        <FaqSection />
      </main>
      <Footer />
      <ScrollToTop />
      <AnimatePresence>
        {previewWallpaper && (
          <Lightbox
            wallpaper={previewWallpaper}
            onClose={closeLightbox}
            onSanctuary={enterSanctuary}
            onShowToast={showToast}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sanctuaryWallpaper && (
          <SanctuaryMode
            wallpaper={sanctuaryWallpaper}
            onClose={() => {
              setSanctuaryWallpaper(null);
              if (document.exitFullscreen && document.fullscreenElement) {
                document.exitFullscreen().catch(e => console.log(e));
              }
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showExtensionModal && (
          <ExtensionModal
            browser={browserInfo}
            onClose={() => setShowExtensionModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <m.div
            className="dynamic-island-toast"
            initial={{ opacity: 0, x: "-50%", y: -40, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: "-50%", y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: "-50%", y: -40, scale: 0.8, filter: 'blur(10px)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className="dynamic-island-content">
              <span className="dynamic-island-icon">
                {toast.type === 'download' ? <LuCheck /> : <LuSparkles />}
              </span>
              <span className="dynamic-island-text">{toast.message}</span>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      </div>
    </LazyMotion>
  );
}

export default App;
