function updatePopupUI() {
  chrome.storage.local.get(['cachedImage', 'currentWallpaper', 'currentMeta', 'rotationInterval'], (result) => {
    const previewImg = document.getElementById('preview-image');
    const placeholder = document.getElementById('preview-placeholder');
    const previewName = document.getElementById('preview-name');
    const intervalSelect = document.getElementById('interval-select');
    const imageUrl = result.cachedImage || result.currentWallpaper;
    if (imageUrl) {
      previewImg.src = imageUrl;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
    } else {
      previewImg.style.display = 'none';
      placeholder.style.display = 'flex';
    }
    if (result.currentMeta && result.currentMeta.name) {
      previewName.innerText = result.currentMeta.name.replace(/\.[^/.]+$/, '');
    } else {
      previewName.innerText = 'Cozy Sanctuary';
    }
    if (result.rotationInterval) {
      intervalSelect.value = result.rotationInterval;
    }
  });
}
document.getElementById('rotate-btn').addEventListener('click', () => {
  const btn = document.getElementById('rotate-btn');
  const btnText = btn.querySelector('span');
  btn.disabled = true;
  btnText.innerText = 'Updating...';
  chrome.runtime.sendMessage({ action: "triggerRotation" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Popup Error:", chrome.runtime.lastError);
      btnText.innerText = 'Error - Try Again';
    } else {
      btnText.innerText = 'Vibe Updated!';
      updatePopupUI(); 
    }
    setTimeout(() => {
      btn.disabled = false;
      btnText.innerText = 'New Random Vibe';
    }, 1500);
  });
});
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
document.getElementById('site-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://cozy-pixels.vercel.app/' });
});
document.getElementById('interval-select').addEventListener('change', (e) => {
  const newInterval = e.target.value;
  chrome.runtime.sendMessage({ action: "updateTimer", interval: newInterval }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Popup Timer Update Error:", chrome.runtime.lastError);
    } else if (response && response.success) {
      const selectEl = document.getElementById('interval-select');
      const originalBorder = selectEl.style.borderColor;
      selectEl.style.borderColor = '#50b386'; 
      setTimeout(() => {
        selectEl.style.borderColor = originalBorder;
      }, 1000);
    }
  });
});
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "refreshUI") {
    updatePopupUI();
  }
});
document.addEventListener('DOMContentLoaded', updatePopupUI);
