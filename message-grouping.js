const GROUP_GAP_MS = 10 * 60 * 1000;

const style = document.createElement('style');
style.textContent = `
.message.message-grouped .message-avatar { visibility: hidden; }
.message.message-grouped .message-body > b { display: none; }
.message.message-grouped { margin-top: 2px; padding-top: 2px !important; padding-bottom: 2px !important; }
.message.message-group-start { margin-top: 10px; }
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

function regroupMessages() {
  const container = document.getElementById('messages');
  if (!container) return;

  captureMessageTimes(container);
  const messages = [...container.querySelectorAll(':scope > .message')];
  let previousSender = null;
  let previousTime = null;

  messages.forEach(message => {
    message.classList.remove('message-grouped', 'message-group-start');

    const sender = senderId(message);
    const time = messageTime(message);
    let gap = Infinity;

    if (time !== null && previousTime !== null) {
      gap = time - previousTime;
      if (gap < 0) gap += 24 * 60 * 60 * 1000;
    }

    const sameGroup = sender && sender === previousSender && gap <= GROUP_GAP_MS;

    if (sameGroup) {
      message.classList.add('message-grouped');
    } else {
      message.classList.add('message-group-start');
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

  const observer = new MutationObserver(() => {
    requestAnimationFrame(regroupMessages);
  });
  observer.observe(container, {childList: true, subtree: true});
}

const pageObserver = new MutationObserver(watchMessages);
pageObserver.observe(document.body, {childList: true, subtree: true});
watchMessages();
