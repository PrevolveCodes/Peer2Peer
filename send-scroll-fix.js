// Keep the actual message list position stable when app.js re-renders messages.
let savedMessageScroll = null;
let restoreMessageTimers = [];

function clearRestoreTimers() {
  restoreMessageTimers.forEach(clearTimeout);
  restoreMessageTimers = [];
}

function captureMessagePosition() {
  const messages = document.getElementById('messages');
  if (!messages) return;
  const distanceFromBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight;
  savedMessageScroll = {
    top: messages.scrollTop,
    distanceFromBottom,
    wasAtBottom: distanceFromBottom < 80
  };
  clearRestoreTimers();
}

function restoreMessagePosition() {
  const messages = document.getElementById('messages');
  if (!messages || !savedMessageScroll) return;
  const state = savedMessageScroll;
  if (state.wasAtBottom) {
    messages.scrollTop = messages.scrollHeight;
  } else {
    messages.scrollTop = state.top;
  }
}

function scheduleMessageRestore() {
  restoreMessageTimers.push(
    requestAnimationFrame(restoreMessagePosition),
    setTimeout(restoreMessagePosition, 20),
    setTimeout(restoreMessagePosition, 80),
    setTimeout(restoreMessagePosition, 180),
    setTimeout(restoreMessagePosition, 350)
  );
}

// Also keep the browser's document position stable.
let savedWindowScroll = null;
function captureWindowPosition() {
  savedWindowScroll = {x: window.scrollX, y: window.scrollY};
}
function restoreWindowPosition() {
  if (savedWindowScroll) window.scrollTo(savedWindowScroll.x, savedWindowScroll.y);
}

// Capture before app.js's send handler runs.
document.addEventListener('click', event => {
  if (!event.target.closest('#send')) return;
  captureMessagePosition();
  captureWindowPosition();
  scheduleMessageRestore();
  requestAnimationFrame(restoreWindowPosition);
  setTimeout(restoreWindowPosition, 100);
  setTimeout(restoreWindowPosition, 250);
}, true);

document.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.shiftKey || event.target?.id !== 'msg') return;
  captureMessagePosition();
  captureWindowPosition();
  scheduleMessageRestore();
  requestAnimationFrame(restoreWindowPosition);
  setTimeout(restoreWindowPosition, 100);
  setTimeout(restoreWindowPosition, 250);
}, true);
