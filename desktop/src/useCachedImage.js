import { useState, useEffect } from 'react';
import { invoke as tauriInvoke } from '@tauri-apps/api/core';

const invoke = (...args) => window.__TAURI_INTERNALS__
  ? tauriInvoke(...args)
  : Promise.reject(new Error('Desktop cache is unavailable in browser mode'));

export function useCachedImage(url) {
  const [src, setSrc] = useState(url);

  useEffect(() => {
    let isMounted = true;
    
    if (!url) {
      setSrc(null);
      return;
    }
    
    // If it's already a local path, just use it
    if (!url.startsWith('http')) {
      setSrc(url);
      return;
    }

    setSrc(url);

    invoke('get_cached_image', { url })
      .then(cachedUrl => {
        if (isMounted && cachedUrl?.startsWith('cozy://localhost/')) {
          setSrc(cachedUrl);
        }
      })
      .catch(() => {
        // Keep the CDN URL as the fallback when local cache lookup fails.
      });

    return () => { isMounted = false; };
  }, [url]);

  return src;
}
