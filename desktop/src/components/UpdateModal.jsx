import React from 'react';
import { useFocusTrap } from '../useFocusTrap.js';

export const UpdateModal = ({ show, onClose, state, version, progress, errorMsg, onInstall }) => {
  const trapRef = useFocusTrap(show);
  const statusLabel = {
    checking: 'Checking for updates',
    available: 'Update ready',
    uptodate: 'Up to date',
    downloading: 'Installing update',
    error: 'Update failed',
  }[state] || 'Update';

  const srMessage = {
    checking: 'Checking for updates…',
    available: `Update version ${version} is available.`,
    uptodate: 'You are using the latest version.',
    downloading: `Downloading update. ${Math.round(progress)}% complete.`,
    error: 'The update check could not complete.',
  }[state];

  if (!show) return null;

  return (
    <>
      {show && (
        <div
          className="update-backdrop"
          onClick={state !== 'downloading' ? onClose : undefined}
          style={{ opacity: 1 }}
        >
          <div
            ref={trapRef}
            role="dialog" aria-modal="true" aria-label="Update"
            className="update-modal"
            style={{ opacity: 1, transform: 'scale(1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="update-status-badge">{statusLabel}</div>
            
            <div className="update-frame">
              {state === 'checking' && (
                <div className="update-content update-content--tight">
                  <div className="spinner" style={{ margin: '0 auto 12px' }} />
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
                      <div 
                        className="update-progress-fill"
                        style={{ width: `${progress}%` }}
                        role="progressbar"
                        aria-valuenow={Math.round(progress)}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      />
                    </div>
                    <div className="update-progress-meta">
                      <span>Downloading…</span>
                      <span>{Math.round(progress)}%</span>
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

            <div className="sr-only" aria-live="polite">
              {srMessage}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
