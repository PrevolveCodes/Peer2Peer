const IMAGE_PREFIX = '[P2P_IMAGE]';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DATA_SIZE = 900 * 1024;

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be opened.'));
      img.onload = () => {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let quality = 0.82;
        let data = canvas.toDataURL('image/jpeg', quality);
        while (data.length > MAX_DATA_SIZE && quality > 0.35) {
          quality -= 0.08;
          data = canvas.toDataURL('image/jpeg', quality);
        }
        if (data.length > MAX_DATA_SIZE) {
          reject(new Error('The image is still too large after compression.'));
          return;
        }
        resolve(data);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function installComposer() {
  const composer = document.querySelector('.composer');
  if (!composer || document.getElementById('image-upload')) return;

  const file = document.createElement('input');
  file.type = 'file';
  file.id = 'image-upload-input';
  file.accept = 'image/*';
  file.hidden = true;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'image-upload';
  button.className = 'image-upload-button';
  button.title = 'Upload image';
  button.setAttribute('aria-label', 'Upload image');
  button.textContent = '＋';
  button.onclick = () => file.click();

  composer.insertBefore(button, composer.firstChild);
  composer.appendChild(file);

  file.onchange = async () => {
    const selected = file.files?.[0];
    if (!selected) return;
    file.value = '';
    if (!selected.type.startsWith('image/')) return alert('Please choose an image.');
    if (selected.size > MAX_FILE_SIZE) return alert('Images must be 10 MB or smaller.');

    const msg = document.getElementById('msg');
    const send = document.getElementById('send');
    if (!msg || !send) return alert('The message box is not ready yet.');

    button.disabled = true;
    button.textContent = '…';
    try {
      const dataUrl = await resizeImage(selected);
      msg.value = IMAGE_PREFIX + dataUrl;
      send.click();
    } catch (e) {
      console.error('Image processing failed:', e);
      alert(e?.message || 'Could not upload image.');
    } finally {
      button.disabled = false;
      button.textContent = '＋';
    }
  };
}

function renderImages() {
  document.querySelectorAll('.message p').forEach(p => {
    if (p.dataset.imageRendered === '1') return;
    const text = p.textContent || '';
    if (!text.startsWith(IMAGE_PREFIX)) return;
    const url = text.slice(IMAGE_PREFIX.length);
    if (!url.startsWith('data:image/') && !/^https:\/\//i.test(url)) return;

    const img = document.createElement('img');
    img.className = 'message-image';
    img.src = url;
    img.alt = 'Uploaded image';
    img.loading = 'lazy';
    img.onclick = () => {
      if (url.startsWith('data:image/')) {
        const w = window.open();
        if (w) w.document.write(`<img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain">`);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    };
    p.textContent = '';
    p.appendChild(img);
    p.dataset.imageRendered = '1';
  });
}

const observer = new MutationObserver(() => {
  installComposer();
  renderImages();
});
observer.observe(document.body, { childList: true, subtree: true });
installComposer();
renderImages();
