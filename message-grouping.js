const GROUP_GAP_MS = 10 * 60 * 1000;
const TIMESTAMP_GAP_MS = 5 * 60 * 1000;

const style = document.createElement('style');
style.textContent = `
.message.message-grouped .message-avatar { visibility: hidden; }
.message.message-grouped .message-body > b { display: none; }
.message.message-grouped { margin-top: 0; padding-top: 0 !important; padding-bottom: 0 !important; }
.message.message-group-start { margin-top: 10px; }
.message-group-timestamp { display: none !important; font-size: 11px; color: var(--muted); margin: 0 0 4px 52px; }
.message.message-show-timestamp .message-group-timestamp { display: block !important; }
.message.message-show-timestamp { margin-top: 14px; }
.message .message-body > small { display: none !important; }
`;
document.head.appendChild(style);

function captureMessageTimes(container) {
  [...container.querySelectorAll('.message')].forEach(message => {
    if (message.dataset.groupTime) return;
    const small = message.querySelector('.message-body > small');
    if (!small) return;
    const value = small.textContent.trim();
    const parsed = new Date(`1970-01-01 ${value}`);
    if (!Number.isNaN(parsed.getTime())) {
      message.dataset.groupTime = String(parsed.getHours() * 60 * 60 * 1000 + parsed.getMinutes() * 60 * 1000);
      message.dataset.groupTimeText = value;
    }
  });
}

function messageTime(message) {
  const stored = Number(message.dataset.groupTime);
  return Number.isFinite(stored) && message.dataset.groupTime ? stored : null;
}

function senderId(message) {
  return message.querySelector('[data-profile-uid]')?.dataset.profileUid || '';
}

function ensureTimestamp(message) {
  let timestamp = message.querySelector('.message-group-timestamp');
  if (!timestamp) {
    timestamp = document.createElement('div');
    timestamp.className = 'message-group-timestamp';
    const body = message.querySelector('.message-body');
    if (body) body.parentNode.insertBefore(timestamp, body);
  }
  timestamp.textContent = message.dataset.groupTimeText || '';
}

function regroupMessages() {
  const container = document.getElementById('messages');
  if (!container) return;

  captureMessageTimes(container);
  const messages = [...container.querySelectorAll(':scope > .message')];
  let previousSender = null;
  let previousTime = null;

  messages.forEach((message, index) => {
    message.classList.remove('message-grouped', 'message-group-start', 'message-show-timestamp');

    const oldTimestamp = message.querySelector('.message-group-timestamp');
    if (oldTimestamp) oldTimestamp.remove();

    const sender = senderId(message);
    const time = messageTime(message);
    let gap = Infinity;

    if (time !== null && previousTime !== null) {
      gap = time - previousTime;
      if (gap < 0) gap += 24 * 60 * 60 * 1000;
    }

    const sameGroup = index > 0 && sender && sender === previousSender && gap < GROUP_GAP_MS;

    if (sameGroup) {
      message.classList.add('message-grouped');
    } else {
      message.classList.add('message-group-start');
      // No timestamp on the first message. A timestamp only appears when
      // a new message starts after at least 5 minutes of silence.
      if (index > 0 && gap >= TIMESTAMP_GAP_MS) {
        ensureTimestamp(message);
        message.classList.add('message-show-timestamp');
      }
    }

    previousSender = sender;
    previousTime = time;
  });
}

function watchMessages() {
  const container = document.getElementById('messages');
  if (!container || container.dataset.groupingReady) return;
  container.dataset.groupingReady = '1';
  regroupMessages();

  const observer = new MutationObserver(() => requestAnimationFrame(regroupMessages));
  observer.observe(container, {childList: true, subtree: true});
}

const pageObserver = new MutationObserver(watchMessages);
pageObserver.observe(document.body, {childList: true, subtree: true});
watchMessages();
