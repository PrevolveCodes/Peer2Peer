// Keeps grouped messages compact by removing the per-message timestamp.
const hideMessageTimes = () => {
  document.querySelectorAll('.message-body > small').forEach(el => el.remove());
};

const messageObserver = new MutationObserver(hideMessageTimes);

function initMessageSpacingFix() {
  hideMessageTimes();
  const messages = document.getElementById('messages');
  if (messages) messageObserver.observe(messages, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMessageSpacingFix);
} else {
  initMessageSpacingFix();
}
