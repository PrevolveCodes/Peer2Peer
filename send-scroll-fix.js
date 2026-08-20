// Prevent the browser from moving the whole page when a message is sent.
// The message list can still scroll normally; only the document scroll position is restored.

let savedWindowScroll = null;
let restoreTimers = [];

function savePagePosition() {
  savedWindowScroll = { x: window.scrollX, y: window.scrollY };
  restoreTimers.forEach(clearTimeout);
  restoreTimers = [];
}

function restorePagePosition() {
  if (!savedWindowScroll) return;
  const pos = savedWindowScroll;
  window.scrollTo(pos.x, pos.y);
}

function scheduleRestore() {
  restoreTimers.push(
    requestAnimationFrame(restorePagePosition),
    setTimeout(restorePagePosition, 20),
    setTimeout(restorePagePosition, 100),
    setTimeout(restorePagePosition, 250)
  );
}

// Capture clicks before app.js's send handler runs.
document.addEventListener('click', event => {
  const send = event.target.closest('#send');
  if (!send) return;
  savePagePosition();
  scheduleRestore();
}, true);

// Enter sends through the button's click handler, so preserve the position here too.
document.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.shiftKey) return;
  if (event.target?.id !== 'msg') return;
  savePagePosition();
  scheduleRestore();
}, true);
