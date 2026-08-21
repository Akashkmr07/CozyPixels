import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTrap } from '../useFocusTrap.js';

export const UpdateModal = ({ show, onClose, state, version, progress, errorMsg, onInstall }) => {
  const trapRef = useFocusTrap(show, onClose);
  const statusLabel = {
    checking: 'Checking for updates',
    available: 'Update ready',
    uptodate: 'All caught up',
    downloading: 'Installing update',
    error: 'Update failed',
  }[state] || 'Update';

  const statusHint = {
    checking: 'Checking for updates…',
    available: 'A newer desktop build is available.',
    uptodate: "You're on the latest version.",
    downloading: 'Installer is running. Keep the app open.',
    error: 'The update check could not complete.',
  }[state] || '';

  useEffect(() => {
    if (state === 'uptodate') {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, onClose]);

  if (!show) return null;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="update-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={state !== 'downloading' ? onClose : undefined}
          role="dialog" aria-modal="true" aria-label="Update"
          ref={trapRef}
        >
          <motion.div
            className="update-modal"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="update-frame">

              {state === 'checking' && (
                <div className="update-content update-content--tight">
                  <p className="update-desc">Looking for the latest version.</p>
                </div>
              )}

              {state === 'available' && (
                <div className="update-content update-content--tight">
                  <h2 className="update-available-title">Update available</h2>
                  <p className="update-version-large">{version}</p>
                  <div className="update-actions">
                    <button className="update-btn update-btn--ghost" onClick={onClose}>Later</button>
                    <button className="update-btn update-btn--primary" onClick={onInstall}>Install</button>
                  </div>
                </div>
              )}

              {state === 'uptodate' && (
                <div className="update-content update-content--tight">
                  <p className="update-desc update-desc--prominent">You're already up to date.</p>
                  <div className="update-actions">
                    <button className="update-btn update-btn--primary" onClick={onClose}>Awesome!</button>
                  </div>
                </div>
              )}

              {state === 'downloading' && (
                <div className="update-content update-content--tight">
                  <p className="update-desc update-desc--prominent">Installing update. Keep the app open until it finishes.</p>
                  <div className="update-progress-wrap">
                    <div className="update-progress-track">
                      <motion.div 
                        className="update-progress-fill"
                        initial={{ width: '0%' }}
                        animate={{ width: progress > 0 ? `${progress}%` : '100%' }}
                        transition={progress > 0 ? { duration: 0.3 } : { duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                    <div className="update-progress-meta">
                      <span>{progress > 0 ? `${Math.round(progress)}%` : 'Preparing installer'}</span>
                      <span>{progress > 0 ? 'Downloading and installing' : 'This can take a moment'}</span>
                    </div>
                  </div>
                </div>
              )}

              {state === 'error' && (
                <div className="update-content update-content--tight">
                  <p className="update-desc update-desc--prominent">{errorMsg || 'Could not check for updates'}</p>
                  <div className="update-actions">
                    <button className="update-btn update-btn--primary" onClick={onClose}>Close</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
