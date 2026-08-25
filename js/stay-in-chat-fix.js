/* Prevent incoming messages/notifications from hijacking the conversation the user is reading. */
(() => {
  let lastUserConversation = null;
  let navigationUntil = 0;
  let restoring = false;
  let observerStarted = false;

  const getConversationButton = (type, key) => {
    const selector = type === 'dm' ? '#dm-list [data-dm]' : '#room-list [data-room]';
    return [...document.querySelectorAll(selector)].find(b => (type === 'dm' ? b.dataset.dm : b.dataset.room) === key) || null;
  };

  const getCurrentConversation = () => {
    const title = document.getElementById('view-title')?.textContent?.trim();
    if (!title) return null;

    const dm = [...document.querySelectorAll('#dm-list [data-dm]')].find(b => {
      const text = b.querySelector('.dm-name')?.textContent?.trim() || b.textContent.trim();
      return text === title;
    });
    if (dm) return {type: 'dm', key: dm.dataset.dm};

    const room = [...document.querySelectorAll('#room-list [data-room]')].find(b => {
      const text = b.querySelector('.room-label, span')?.textContent?.trim() || b.textContent.trim();
      return text === title;
    });
    if (room) return {type: 'room', key: room.dataset.room};

    return null;
  };

  const sameConversation = (a, b) => !!a && !!b && a.type === b.type && a.key === b.key;

  const recordNavigation = e => {
    const dm = e.target.closest('#dm-list [data-dm]');
    const room = e.target.closest('#room-list [data-room]');
    if (!dm && !room) return;

    const type = dm ? 'dm' : 'room';
    const key = dm ? dm.dataset.dm : room.dataset.room;
    lastUserConversation = {type, key};
    navigationUntil = Date.now() + 5000;
  };

  const restoreConversation = () => {
    if (!lastUserConversation || restoring) return;
    const button = getConversationButton(lastUserConversation.type, lastUserConversation.key);
    if (!button) return;

    restoring = true;
    try {
      button.click();
    } finally {
      setTimeout(() => { restoring = false; }, 150);
    }
  };

  const start = () => {
    if (observerStarted) return;
    observerStarted = true;

    document.addEventListener('click', recordNavigation, true);

    const initial = getCurrentConversation();
    if (initial) lastUserConversation = initial;

    const title = document.getElementById('view-title');
    if (!title) return;

    let previousTitle = title.textContent?.trim() || '';
    const titleObserver = new MutationObserver(() => {
      const nextTitle = title.textContent?.trim() || '';
      if (nextTitle === previousTitle) return;
      previousTitle = nextTitle;

      if (restoring || Date.now() <= navigationUntil) return;

      const current = getCurrentConversation();
      if (!current || !lastUserConversation) return;
      if (!sameConversation(current, lastUserConversation)) restoreConversation();
    });

    titleObserver.observe(title, {childList: true, characterData: true, subtree: true});
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
