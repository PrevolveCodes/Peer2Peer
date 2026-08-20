import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

const firebaseConfig = {
  storageBucket: 'p2pminimalchat.firebasestorage.app'
};

// Reuse the Firebase app created by app.js when possible.
import { getApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const app = getApp();
const storage = getStorage(app);
const auth = getAuth(app);
const IMAGE_PREFIX = '[P2P_IMAGE]';
const MAX_SIZE = 10 * 1024 * 1024;

function installComposer() {
  const composer = document.querySelector('.composer');
  if (!composer || document.getElementById('image-upload')) return;

  const file = document.createElement('input');
  file.type = 'file';
  file.id = 'image-upload-input';
  file.accept = 'image/png,image/jpeg,image/gif,image/webp,image/avif';
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
    if (selected.size > MAX_SIZE) return alert('Images must be 10 MB or smaller.');

    const user = auth.currentUser;
    const msg = document.getElementById('msg');
    if (!user || !msg) return alert('You must be logged in to upload an image.');

    button.disabled = true;
    button.textContent = '…';
    try {
      const safeName = selected.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `messages/${user.uid}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;
      const imageRef = storageRef(storage, path);
      await uploadBytes(imageRef, selected, { contentType: selected.type });
      const url = await getDownloadURL(imageRef);
      msg.value = `${IMAGE_PREFIX}${url}`;
      msg.focus();
      const send = document.getElementById('send');
      if (send) send.click();
    } catch (e) {
      console.error('Image upload failed:', e);
      alert(`Image upload failed: ${e?.message || 'Unknown error'}`);
    } finally {
      button.disabled = false;
      button.textContent = '＋';
    }
  };
}

function renderImages() {
  document.querySelectorAll('.message p').forEach(p => {
    const text = p.textContent || '';
    if (!text.startsWith(IMAGE_PREFIX) || p.dataset.imageRendered === '1') return;
    const url = text.slice(IMAGE_PREFIX.length);
    if (!/^https:\/\//i.test(url)) return;

    const img = document.createElement('img');
    img.className = 'message-image';
    img.src = url;
    img.alt = 'Uploaded image';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onclick = () => window.open(url, '_blank', 'noopener,noreferrer');
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
