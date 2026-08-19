import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { invoke } from '@tauri-apps/api/core';
import { LuChevronLeft, LuChevronRight, LuRefreshCw, LuMonitor, LuDownload, LuX } from 'react-icons/lu';
import { useFocusTrap } from '../useFocusTrap.js';
import { formatWallpaperName } from '../utils.js';

const STATIC_URL = 'https://cdn.jsdelivr.net/gh/yadavnikhil03/CozyPixels@main/frontend/public';

export const Lightbox = ({ wallpaper, onClose, onSetWallpaper, onSetLockScreen, onDownload, setting, settingLock, onNext, onPrev, hasNext, hasPrev }) => {
  const [imgSrc, setImgSrc] = useState(null);
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    const fn = e => { 
      if (e.key === 'Escape') onClose(); 
      if (e.key === 'ArrowRight' && hasNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose, onNext, onPrev, hasNext, hasPrev]);

  useEffect(() => {
    let isMounted = true;
    let currentBlobUrl = null;
    if (!wallpaper) return;
    const baseImageUrl = wallpaper.path.startsWith('http') || wallpaper.path.startsWith('cozy://') ? wallpaper.path : `${STATIC_URL}${wallpaper.path}`;
    
    if (wallpaper.path.startsWith('http') && !wallpaper.realPath) {
      invoke('fetch_image_bytes', { url: wallpaper.path })
        .then(bytes => {
          if (!isMounted) return;
          const blob = new Blob([new Uint8Array(bytes)]);
          currentBlobUrl = URL.createObjectURL(blob);
          setImgSrc(currentBlobUrl);
        })
        .catch(err => {
          if (!isMounted) return;
          setImgSrc(baseImageUrl);
        });
    } else {
      setImgSrc(baseImageUrl);
    }
    
    return () => {
      isMounted = false;
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  }, [wallpaper]);

  if (!wallpaper) return null;
  const displayName = formatWallpaperName(wallpaper.name);

  return (
    <motion.div className="lightbox" onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      role="dialog" aria-modal="true" aria-label={`Preview: ${displayName}`}
      ref={trapRef}>
      <motion.div className="lightbox__box" onClick={e => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}>
        {hasPrev && (
          <button className="lightbox__nav lightbox__nav--prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous wallpaper">
            <LuChevronLeft size={24} />
          </button>
        )}
        <AnimatePresence mode="wait">
          {imgSrc && (
            <motion.img 
              key={imgSrc} 
              src={imgSrc} 
              alt={displayName} 
              className="lightbox__img" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>
        {hasNext && (
          <button className="lightbox__nav lightbox__nav--next" onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next wallpaper">
            <LuChevronRight size={24} />
          </button>
        )}
        <div className="lightbox__bar">
          <div className="lightbox__meta">
            <span className="lightbox__name">{displayName}</span>
            <span className="lightbox__cat">{wallpaper.category}</span>
          </div>

          <div className="lightbox__actions">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`lb-btn lb-btn--primary ${setting ? 'loading' : ''}`}
                onClick={() => onSetWallpaper(wallpaper)}
                disabled={setting || settingLock}
                aria-label={`Set ${displayName} as wallpaper`}
              >
                {setting ? <LuRefreshCw size={15} className="spin" /> : <LuMonitor size={15} />}
                {setting ? 'Setting...' : 'Set as Wallpaper'}
              </button>
              <button
                className={`lb-btn lb-btn--ghost ${settingLock ? 'loading' : ''}`}
                onClick={() => onSetLockScreen(wallpaper)}
                disabled={setting || settingLock}
                title="Set as Windows Lock Screen"
                aria-label={`Set ${displayName} as lock screen`}
              >
                {settingLock ? <LuRefreshCw size={15} className="spin" /> : <LuMonitor size={15} />}
                {settingLock ? 'Setting...' : 'Lock Screen'}
              </button>
              <button
                className={`lb-btn lb-btn--ghost ${(setting || settingLock) ? 'loading' : ''}`}
                onClick={async () => {
                  await onSetWallpaper(wallpaper);
                  await onSetLockScreen(wallpaper);
                }}
                disabled={setting || settingLock}
                title="Set as Wallpaper & Lock Screen"
                aria-label={`Set ${displayName} as wallpaper and lock screen`}
              >
                {(setting || settingLock) ? <LuRefreshCw size={15} className="spin" /> : <LuMonitor size={15} />}
                Set Both
              </button>
            </div>
            <button className="lb-btn lb-btn--ghost" onClick={() => onDownload(wallpaper)} aria-label={`Download ${displayName}`}>
              <LuDownload size={15} /> Download
            </button>
          </div>
          <button className="lightbox__close" onClick={onClose} aria-label="Close lightbox"><LuX size={16} /></button>
        </div>
      </motion.div>
    </motion.div>
  );
};
