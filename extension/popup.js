// Cozy Engine - Companion Popup Logic

// --- 1. UI Rendering & Synchronization ---
function updatePopupUI() {
  chrome.storage.local.get(['cachedImage', 'currentWallpaper', 'currentMeta', 'rotationInterval'], (result) => {
    const previewImg = document.getElementById('preview-image');
    const placeholder = document.getElementById('preview-placeholder');
    const previewName = document.getElementById('preview-name');
    const intervalSelect = document.getElementById('interval-select');

    // 1. Render thumbnail preview
    const imageUrl = result.cachedImage || result.currentWallpaper;
    if (imageUrl) {
      previewImg.src = imageUrl;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
    } else {
      previewImg.style.display = 'none';
      placeholder.style.display = 'flex';
    }

    // 2. Render current wallpaper metadata name
    if (result.currentMeta && result.currentMeta.name) {
      previewName.innerText = result.currentMeta.name.replace(/\.[^/.]+$/, '');
    } else {
      previewName.innerText = 'Cozy Sanctuary';
    }

    // 3. Sync interval selector value
    if (result.rotationInterval) {
      intervalSelect.value = result.rotationInterval;
    }
  });
}

// --- 2. Action Event Listeners ---
document.getElementById('rotate-btn').addEventListener('click', () => {
  const btn = document.getElementById('rotate-btn');
  const btnText = btn.querySelector('span');
  
  btn.disabled = true;
  btnText.innerText = 'Updating...';

  // Trigger rotation in service worker background
  chrome.runtime.sendMessage({ action: "triggerRotation" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Popup Error:", chrome.runtime.lastError);
      btnText.innerText = 'Error - Try Again';
    } else {
      btnText.innerText = 'Vibe Updated!';
      updatePopupUI(); // Instantly update preview after success
    }

    setTimeout(() => {
      btn.disabled = false;
      btnText.innerText = 'New Random Vibe';
    }, 1500);
  });
});

// Download Wallpaper Directly from Popup
document.getElementById('dl-btn').addEventListener('click', async () => {
  const btn = document.getElementById('dl-btn');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.style.opacity = '0.7';

  try {
    const result = await chrome.storage.local.get(['cachedImage', 'currentWallpaper', 'currentMeta']);
    const imageUrl = result.cachedImage || result.currentWallpaper;
    if (!imageUrl) return;

    let filename = 'cozy-sanctuary.gif';
    if (result.currentMeta && result.currentMeta.name) {
      filename = result.currentMeta.name;
    }

    let downloadUrl = imageUrl;
    if (imageUrl.startsWith('http')) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      downloadUrl = URL.createObjectURL(blob);
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (imageUrl.startsWith('http')) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    }
  } catch (err) {
    console.error('Download from popup failed', err);
  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.innerHTML = originalHtml;
  }
});

// Visit sanctuary page
document.getElementById('site-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://cozy-pixels.vercel.app/' });
});

// Update rotation interval timer setting
document.getElementById('interval-select').addEventListener('change', (e) => {
  const newInterval = e.target.value;
  chrome.runtime.sendMessage({ action: "updateTimer", interval: newInterval }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Popup Timer Update Error:", chrome.runtime.lastError);
    } else if (response && response.success) {
      // Visual feedback: brief color flash on selector
      const selectEl = document.getElementById('interval-select');
      const originalBorder = selectEl.style.borderColor;
      selectEl.style.borderColor = '#50b386'; // Success emerald green border
      setTimeout(() => {
        selectEl.style.borderColor = originalBorder;
      }, 1000);
    }
  });
});

// --- 3. Dynamic Service Message Listening ---
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "refreshUI") {
    updatePopupUI();
  }
});

// Bootstrap popup
document.addEventListener('DOMContentLoaded', updatePopupUI);
