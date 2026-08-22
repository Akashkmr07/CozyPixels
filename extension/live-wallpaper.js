const CozyLive = (() => {
  const STORAGE_KEYS = ['toggleLiveWallpaper', 'activeLiveWallpaper'];
  let currentObjectUrl = null; // tracks the one blob URL currently in use, for cleanup


  let lastRenderedKey = null;
  let lastAppliedUpdatedAt = 0;

  function initStorageSync() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      if (changes.toggleLiveWallpaper || changes.activeLiveWallpaper) {
        console.debug('[Cozy Live Sync] Storage change detected — applying.');
        applyFromStorage();
        syncToggleUI();
        refreshPickerUI(); 
      } else if (changes.liveWallpaperLibraryRev) {
       console.debug('[Cozy Live Sync] Library changed in another tab — refreshing picker.');
        refreshPickerUI();
      }
    });
  }

 function bumpLibraryRevision() {
    chrome.storage.local.set({ liveWallpaperLibraryRev: Date.now() }).catch(() => {});
  }

  function els() {
    return {
      layer: document.getElementById('live-wallpaper-layer'),
      video: document.getElementById('live-video'),
      web: document.getElementById('live-web'),
      gifBg: document.getElementById('live-gif-bg'),
    };
  }

  function requireEls() {
    const e = els();
    if (!e.layer || !e.video || !e.web || !e.gifBg) {
      console.error('[Cozy Live] Required DOM elements missing — live wallpaper layer cannot render.', e);
      return null;
    }
    return e;
  }

  function revokeCurrentObjectUrl() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  }

  function clearLayer() {
    const e = requireEls();
    if (!e) return;
    const { layer, video, web, gifBg } = e;
    layer.classList.remove('active');
    video.pause();
    video.removeAttribute('src');
    video.onerror = null;
    video.load();
    web.src = 'about:blank';
    web.style.display = 'none';
    video.style.display = 'none';
    gifBg.style.display = 'none';
    gifBg.style.backgroundImage = '';
    revokeCurrentObjectUrl();
    lastRenderedKey = null;
  }

  async function disableDueToMissingEntry(context) {
    console.warn('[Cozy Live] Active entry could not be rendered, falling back to static:', context);
    await chrome.storage.local.set({ toggleLiveWallpaper: false });
    clearLayer();
    syncToggleUI();
  }

  function syncToggleUI() {
    chrome.storage.local.get(['toggleLiveWallpaper']).then(r => {
      const toggle = document.getElementById('toggle-live-wallpaper');
      if (toggle) toggle.checked = !!r.toggleLiveWallpaper;
    }).catch(() => {});
  }

  function showStatus(message) {
    const statusEl = document.getElementById('live-wp-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.opacity = '1';
    setTimeout(() => { statusEl.style.opacity = '0'; }, 4000);
  }

function loadImageWithVerification(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image failed to load'));
      img.src = url;
    });
  }

  async function renderEntry(entry) {
    const e = requireEls();
    if (!e || !entry) return;
    const { layer, video, web, gifBg } = e;


    const key = `${entry.source}:${entry.id}`;
    if (key === lastRenderedKey && layer.classList.contains('active')) {
      return;
    }

    revokeCurrentObjectUrl();
    video.style.display = 'none';
    video.onerror = null;
    web.style.display = 'none';
    gifBg.style.display = 'none';
    web.src = 'about:blank';

    try {
      if (entry.source === 'local') {
        const record = await CozyDB.get(entry.id);
        if (!record) { await disableDueToMissingEntry(entry); return; }

        if (record.kind === 'video') {
          if (record.blob) {
            currentObjectUrl = URL.createObjectURL(record.blob);
            video.src = currentObjectUrl;
          } else if (record.url) {
            video.onerror = () => {
              console.error('[Cozy Live] Local video link failed to load:', record.url);
              showStatus('That video link could not be loaded');
            };
            video.src = record.url;
          } else {
            throw new Error('video record has neither blob nor url');
          }
          video.style.display = 'block';
          video.play().catch(() => {}); // autoplay can be blocked in some contexts; muted+loop covers the common case
        } else if (record.kind === 'gif') {
          if (record.blob) {
            currentObjectUrl = URL.createObjectURL(record.blob);
            gifBg.style.backgroundImage = `url("${currentObjectUrl}")`;
            gifBg.style.display = 'block';
          } else if (record.url) {
            try {
              await loadImageWithVerification(record.url);
              gifBg.style.backgroundImage = `url("${record.url}")`;
              gifBg.style.display = 'block';
            } catch {
              console.error('[Cozy Live] Local GIF link failed to load:', record.url);
              showStatus('That GIF link could not be loaded');
            }
          } else {
            throw new Error('gif record has neither blob nor url');
          }
        } else if (record.kind === 'web') {
          web.src = record.url;
          web.style.display = 'block';
          scheduleIframeLoadCheck(record.url);
        }
      } else if (entry.source === 'cdn') {
        if (entry.kind === 'video') {
          video.onerror = () => {
            console.error('[Cozy Live] Video link failed to load:', entry.url);
            showStatus('That video link could not be loaded');
          };
          video.src = entry.url;
          video.style.display = 'block';
          video.play().catch(() => {});
        } else if (entry.kind === 'gif') {
          try {
            await loadImageWithVerification(entry.url);
            gifBg.style.backgroundImage = `url("${entry.url}")`;
            gifBg.style.display = 'block';
          } catch {
            console.error('[Cozy Live] GIF link failed to load:', entry.url);
            showStatus('That GIF link could not be loaded');
          }
        } else if (entry.kind === 'web') {
           web.src = entry.url;
          web.style.display = 'block';
          scheduleIframeLoadCheck(entry.url);
        }
      }
      layer.classList.add('active');
      lastRenderedKey = key;
    } catch (err) {
      console.error('[Cozy Live] Failed to render live wallpaper:', entry, err);
      await disableDueToMissingEntry(entry);
    }
  }

  function scheduleIframeLoadCheck(url) {
    const { web } = els();
    if (!web) return;
    let loaded = false;
    const onLoad = () => { loaded = true; };
    web.addEventListener('load', onLoad, { once: true });
    setTimeout(() => {
      web.removeEventListener('load', onLoad);
      if (!loaded) {
        console.warn('[Cozy Live] Web wallpaper did not report loading in time:', url);
        showStatus('This site may block embedding — try a direct video/GIF link instead');
      }
    }, 6000);
  }

  async function applyFromStorage() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS);
      if (result.toggleLiveWallpaper && result.activeLiveWallpaper) {
        const incomingUpdatedAt = result.activeLiveWallpaper.updatedAt || 0;
        if (incomingUpdatedAt < lastAppliedUpdatedAt) {
          console.debug('[Cozy Live Sync] Ignoring stale update:', incomingUpdatedAt, '<', lastAppliedUpdatedAt);
          return;
        }
        lastAppliedUpdatedAt = incomingUpdatedAt;
        await renderEntry(result.activeLiveWallpaper);
      } else {
        clearLayer();
      }
    } catch (err) {
      console.error('[Cozy Live] applyFromStorage failed:', err);
    }
  }

  async function setActive(entry) {
    await chrome.storage.local.set({
      toggleLiveWallpaper: true,
      activeLiveWallpaper: { ...entry, updatedAt: Date.now() },
    });
  }

  async function disable() {
    await chrome.storage.local.set({ toggleLiveWallpaper: false });
  }

  function setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      const e = els();
      if (!e.video || !e.video.src) return;
      if (document.hidden) {
        e.video.pause();
      } else {
        e.video.play().catch(() => {});
      }
    });
  }


  const THUMB_MAX_DIM = 480;
  const THUMB_TIMEOUT_MS = 8000;

  function generateVideoThumbnail(blob) {
    return new Promise((resolve) => {
      const videoEl = document.createElement('video');
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.preload = 'metadata';
      const objUrl = URL.createObjectURL(blob);
      videoEl.src = objUrl;

      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(objUrl);
        resolve(result);
      };

      const timer = setTimeout(() => finish(null), THUMB_TIMEOUT_MS);

      videoEl.addEventListener('error', () => { clearTimeout(timer); finish(null); });

      videoEl.addEventListener('loadedmetadata', () => {
       const seekTo = Math.min(1, (videoEl.duration || 1) * 0.1);
        try {
          videoEl.currentTime = seekTo;
        } catch {
          clearTimeout(timer);
          finish(null);
        }
      });

      videoEl.addEventListener('seeked', () => {
        clearTimeout(timer);
        try {
          const scale = Math.min(1, THUMB_MAX_DIM / Math.max(videoEl.videoWidth || THUMB_MAX_DIM, videoEl.videoHeight || THUMB_MAX_DIM));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((videoEl.videoWidth || THUMB_MAX_DIM) * scale));
          canvas.height = Math.max(1, Math.round((videoEl.videoHeight || THUMB_MAX_DIM) * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          finish(canvas.toDataURL('image/jpeg', 0.72));
        } catch (err) {
           console.error('[Cozy Live] Thumbnail generation failed:', err);
          finish(null);
        }
      });
    });
  }

 async function getStorageEstimate() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try {
      return await navigator.storage.estimate();
    } catch {
      return null;
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(0)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  }

  async function updateStorageIndicator() {
    const el = document.getElementById('live-wp-storage');
    if (!el) return;
    const est = await getStorageEstimate();
    if (est && est.quota) {
      el.textContent = `${formatBytes(est.usage)} used of ${formatBytes(est.quota)} available on this device`;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  function isQuotaError(err) {
    return !!err && (err.name === 'QuotaExceededError' || /quota/i.test(err.message || ''));
  }

 
  async function listAllEntries() {
    const [localFiles, storageResult] = await Promise.all([
      CozyDB.getAll().catch(err => { console.error('[Cozy Live] CozyDB.getAll failed:', err); return []; }),
      chrome.storage.local.get(['allWallpapers']),
    ]);

    const local = localFiles
      .sort((a, b) => b.addedAt - a.addedAt)
      .map(f => {
        let previewUrl = null;
        if (f.kind === 'video') {
          previewUrl = f.thumbnailDataUrl || null;
        } else if (f.kind === 'gif' && f.blob) {
          previewUrl = URL.createObjectURL(f.blob);
        } else if (f.kind === 'gif' && f.url) {
          previewUrl = f.url;
        }
        return {
          source: 'local',
          id: f.id,
          kind: f.kind,
          name: f.name,
          previewUrl,
          isBlobPreview: f.kind === 'gif' && !!f.blob,
        };
      });

    const catalog = (storageResult.allWallpapers || [])
      .filter(w => w && (w.type === 'video' || w.type === 'gif' || w.type === 'web') && w.url)
      .map(w => ({
        source: 'cdn',
        id: w.url,
        kind: w.type,
        name: w.name || 'Curated Live Wallpaper',
        previewUrl: w.thumbnail || (w.type === 'gif' ? w.url : null),
        url: w.url,
      }));

    return { local, catalog };
  }

  function isSameEntry(a, b) {
    if (!a || !b) return false;
    return a.source === b.source && String(a.id) === String(b.id);
  }

  function renderPickerCard(entry, activeEntry, onApply, onDelete) {
    const card = document.createElement('div');
    card.className = 'live-wp-card';
    if (isSameEntry(entry, activeEntry)) card.classList.add('active');

    const preview = document.createElement('div');
    preview.className = 'live-wp-card__preview';
    if (entry.previewUrl) {
      preview.style.backgroundImage = `url("${entry.previewUrl}")`;
    } else {
      preview.classList.add('live-wp-card__preview--web');
      preview.textContent = entry.kind === 'video' ? 'VIDEO' : entry.kind.toUpperCase();
    }
    const badge = document.createElement('span');
    badge.className = 'live-wp-card__badge';
    badge.textContent = entry.kind.toUpperCase();
    preview.appendChild(badge);

    if (isSameEntry(entry, activeEntry)) {
      const applied = document.createElement('span');
      applied.className = 'live-wp-card__applied';
      applied.textContent = 'Applied';
      preview.appendChild(applied);
    }

    card.appendChild(preview);

    const name = document.createElement('div');
    name.className = 'live-wp-card__name';
    name.textContent = entry.name.replace(/\.[^/.]+$/, '');
    card.appendChild(name);

    card.addEventListener('click', () => onApply(entry));

    if (entry.source === 'local' && onDelete) {
      const del = document.createElement('button');
      del.className = 'live-wp-card__delete';
      del.setAttribute('aria-label', `Remove ${entry.name}`);
      del.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      del.addEventListener('click', (e) => { e.stopPropagation(); onDelete(entry); });
      card.appendChild(del);
    }

    return card;
  }

  async function refreshPickerUI() {
    const grid = document.getElementById('live-wp-grid');
    const emptyState = document.getElementById('live-wp-empty');
    if (!grid) return;

    try {
      const [{ local, catalog }, storageResult] = await Promise.all([
        listAllEntries(),
        chrome.storage.local.get(['activeLiveWallpaper', 'toggleLiveWallpaper']),
      ]);
      const activeEntry = storageResult.toggleLiveWallpaper ? storageResult.activeLiveWallpaper : null;

      grid.innerHTML = '';
      const all = [...local, ...catalog];

      if (emptyState) emptyState.style.display = all.length === 0 ? 'block' : 'none';
      for (const entry of all) {
        grid.appendChild(renderPickerCard(entry, activeEntry, handleApply, handleDelete));
      }

      for (const entry of local) {
        if (entry.isBlobPreview && entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      }

      updateStorageIndicator();
    } catch (err) {
      console.error('[Cozy Live] refreshPickerUI failed:', err);
    }
  }

  async function handleApply(entry) {
    const toApply = entry.source === 'cdn'
      ? { source: 'cdn', id: entry.id, kind: entry.kind, name: entry.name, url: entry.url }
      : { source: 'local', id: entry.id, kind: entry.kind, name: entry.name };
    await setActive(toApply);
  }

  async function handleDelete(entry) {
    await CozyDB.remove(entry.id);
    const result = await chrome.storage.local.get(['activeLiveWallpaper']);
    if (result.activeLiveWallpaper && isSameEntry(result.activeLiveWallpaper, entry)) {
      // Falls back to static — onChanged propagates this to every tab.
      await disable();
    } else {
       bumpLibraryRevision();
    }
    await refreshPickerUI();
  }

  const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'image/gif'];
  const MAX_FILE_BYTES = 300 * 1024 * 1024; // 300MB — generous for a wallpaper video, cheap safety cap

  async function handleFileUpload(fileList) {
    let added = 0, skipped = 0, quotaHit = false, lastAdded = null;

    for (const file of fileList) {
      if (!ACCEPTED_TYPES.includes(file.type)) { skipped++; continue; }
      if (file.size > MAX_FILE_BYTES) { skipped++; continue; }

      const kind = file.type === 'image/gif' ? 'gif' : 'video';
      const thumbnailDataUrl = kind === 'video' ? await generateVideoThumbnail(file) : null;

      const record = {
        id: CozyDB.makeId(),
        name: file.name,
        kind,
        blob: file,
        thumbnailDataUrl,
        addedAt: Date.now(),
        size: file.size,
      };
      try {
        await CozyDB.put(record);
        added++;
        lastAdded = record;
      } catch (err) {
        console.error('[Cozy Live] Failed to store uploaded file:', file.name, err);
        if (isQuotaError(err)) quotaHit = true;
        skipped++;
      }
    }

    if (added > 0) {
      showStatus(
        `${added} file${added > 1 ? 's' : ''} added` +
        (quotaHit ? ' — storage limit reached for the rest' : '')
      );
      if (lastAdded) {
        await setActive({ source: 'local', id: lastAdded.id, kind: lastAdded.kind, name: lastAdded.name });
      } else {
        await refreshPickerUI();
      }
    } else {
      if (quotaHit) {
        showStatus('Storage limit reached — remove some live wallpapers or use a link instead');
      } else if (skipped > 0) {
        showStatus('Unsupported file type or too large (max 300MB)');
      }
      await refreshPickerUI();
    }
  }

  function isValidHttpUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }


  function normalizeUrlInput(value) {
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  function detectLinkKind(url) {
    let path = '';
    try { path = new URL(url).pathname.toLowerCase(); } catch { /* fall through to full-string check below */ }
    const full = url.toLowerCase();
    if (/\.(mp4|webm|ogv)(\?|$)/.test(path) || /\.(mp4|webm|ogv)(\?|$)/.test(full)) return 'video';
    if (/\.gif(\?|$)/.test(path) || /\.gif(\?|$)/.test(full)) return 'gif';
    return 'web';
  }


  async function tryResolveDirectMediaUrl(pageUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(pageUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const html = await res.text();

       const patterns = [
        /https:\/\/[^"'\s\\]+\.(?:mp4|webm)\b/i,
        /https%3A%2F%2F[^"'\s\\&]+\.(?:mp4|webm)\b/i,
        /https:\/\/[^"'\s\\]+\.gif\b/i,
        /https%3A%2F%2F[^"'\s\\&]+\.gif\b/i,
      ];
      for (const pattern of patterns) {
        const m = html.match(pattern);
        if (m) {
          try { return decodeURIComponent(m[0]); } catch { return m[0]; }
        }
      }
      return null;
    } catch (err) {
      console.warn('[Cozy Live] Could not resolve a direct media URL from page:', pageUrl, err);
      return null;
    }
  }

  async function handleAddWebWallpaper(rawUrl) {
    const url = normalizeUrlInput(rawUrl);
    if (!isValidHttpUrl(url)) {
      showStatus('Enter a valid URL');
      return;
    }

    let kind = detectLinkKind(url);
    let finalUrl = url;

    if (kind === 'web') {
      showStatus('Checking link…');
      const resolved = await tryResolveDirectMediaUrl(url);
      if (resolved) {
        finalUrl = resolved;
        kind = /\.gif\b/i.test(resolved) ? 'gif' : 'video';
      }
    }

    const record = {
      id: CozyDB.makeId(),
      name: new URL(finalUrl).hostname,
      kind,
      url: finalUrl,
      addedAt: Date.now(),
      size: 0,
    };
    try {
      await CozyDB.put(record);
    } catch (err) {
      console.error('[Cozy Live] Failed to store web wallpaper link:', finalUrl, err);
      showStatus(isQuotaError(err) ? 'Storage limit reached' : 'Could not save that link');
      return;
    }

    if (kind === 'web') {
      showStatus('Web wallpaper added — note: some sites block embedding');
    } else if (finalUrl !== url) {
      showStatus(`Found the direct ${kind === 'gif' ? 'GIF' : 'video'} link — added`);
    } else {
      showStatus(`${kind === 'gif' ? 'GIF' : 'Video'} link added`);
    }
    await setActive({ source: 'local', id: record.id, kind: record.kind, name: record.name });
  }

  function setupUI() {
    const toggle = document.getElementById('toggle-live-wallpaper');
    const fileInput = document.getElementById('live-wp-file-input');
    const addFileBtn = document.getElementById('live-wp-add-file-btn');
    const addWebBtn = document.getElementById('live-wp-add-web-btn');
    const webUrlInput = document.getElementById('live-wp-web-url');

    if (toggle) {
      syncToggleUI();
      toggle.addEventListener('change', async () => {
        try {
          if (toggle.checked) {
            const result = await chrome.storage.local.get(['activeLiveWallpaper']);
            if (result.activeLiveWallpaper) {
               await chrome.storage.local.set({ toggleLiveWallpaper: true });
            } else {
              const { local, catalog } = await listAllEntries();
              const first = local[0] || catalog[0];
              for (const entry of local) { if (entry.isBlobPreview && entry.previewUrl) URL.revokeObjectURL(entry.previewUrl); }
              if (first) {
                await handleApply(first);
              } else {
                toggle.checked = false;
                showStatus('Add a video, GIF, or web wallpaper first');
              }
            }
          } else {
            await disable();
          }
        } catch (err) {
          console.error('[Cozy Live] Toggle handler failed:', err);
          toggle.checked = false;
          showStatus('Something went wrong — try again');
        }
      });
    }

    if (addFileBtn && fileInput) {
      addFileBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          handleFileUpload(Array.from(e.target.files));
          fileInput.value = '';
        }
      });
    }

    if (addWebBtn && webUrlInput) {
      addWebBtn.addEventListener('click', () => {
        const val = webUrlInput.value.trim();
        if (val) {
          handleAddWebWallpaper(val);
          webUrlInput.value = '';
        }
      });
      webUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addWebBtn.click();
      });
    }

    refreshPickerUI();
  }

  async function init() {
    setupVisibilityHandling();
    initStorageSync();
    await applyFromStorage();
    setupUI();
  }

  return { init, refreshPickerUI };
})();

document.addEventListener('DOMContentLoaded', () => {
  CozyLive.init().catch(err => console.error('[Cozy Live] init failed:', err));
});
