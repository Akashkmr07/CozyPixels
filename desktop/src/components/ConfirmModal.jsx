import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTrap } from '../useFocusTrap.js';
import { LuTriangleAlert } from 'react-icons/lu';

export const ConfirmModal = ({ show, title, message, onConfirm, onCancel }) => {
  const trapRef = useFocusTrap(show, onCancel);

  if (!show) return null;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="update-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="dialog" aria-modal="true" aria-label={title}
          ref={trapRef}
          style={{ zIndex: 10000 }}
        >
          <motion.div
            className="update-modal"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '420px', overflow: 'visible' }}
          >
            <div className="update-frame" style={{ padding: '24px' }}>
              <div className="update-content update-content--tight" style={{ gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '48px', height: '48px', borderRadius: '50%', 
                    background: 'var(--md-sys-color-error)', opacity: 0.15, position: 'absolute' 
                  }} />
                  <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <LuTriangleAlert size={24} color="var(--md-sys-color-error)" />
                  </div>
                  <h2 className="update-available-title" style={{ margin: 0, fontSize: '18px' }}>{title}</h2>
                </div>
                <p className="update-desc" style={{ marginBottom: '8px', fontSize: '14px', lineHeight: '1.5' }}>{message}</p>
                <div className="update-actions" style={{ justifyContent: 'flex-end', width: '100%', marginTop: '16px' }}>
                  <button className="update-btn update-btn--ghost" onClick={onCancel}>Cancel</button>
                  <button className="update-btn update-btn--primary" style={{ background: 'var(--md-sys-color-error)', color: 'white' }} onClick={onConfirm}>Delete</button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
