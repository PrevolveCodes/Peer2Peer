// Message layout fixes: group consecutive messages from the same sender,
// hide timestamps, and preserve the user's scroll position when messages update.
(() => {
  let lastSnapshot = '';
  let observer = null;
  let applying = false;

  function setup() {
    const messages = document.getElementById('messages');
    if (!messages || messages.dataset.messageUiFix === '1') return;
    messages.dataset.messageUiFix = '1';

    const apply = () => {
      if (applying) return;
      applying = true;

      const items = [...messages.querySelectorAll(':scope > .message')];
      if (!items.length) {
        applying = false;
        return;
      }

      const wasNearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80;
      const oldHeight = messages.scrollHeight;
      const oldTop = messages.scrollTop;

      let previousUid = null;
      let previousTime = 0;

      items.forEach((item, index) => {
        const avatar = item.querySelector('.message-avatar');
        const body = item.querySelector('.message-body');
        const name = body?.querySelector('b');
        const small = body?.querySelector('small');
        const data = item.dataset.messageId || String(index);

        const uid = avatar?.dataset.profileUid || '';
        const source = window.__p2pMessageData?.[data];
        const time = Number(source?.time || 0);
        const sameSender = uid && uid === previousUid;
        const withinGroup = sameSender && previousTime && time && (time - previousTime) <= 10 * 60 * 1000;

        if (small) small.style.display = 'none';

        if (withinGroup) {
          item.classList.add('message-grouped');
          if (avatar) avatar.style.visibility = 'hidden';
          if (name) name.style.display = 'none';
          item.style.paddingTop = '2px';
          item.style.paddingBottom = '2px';
        } else {
          item.classList.remove('message-grouped');
          if (avatar) avatar.style.visibility = '';
          if (name) name.style.display = '';
          item.style.paddingTop = '10px';
          item.style.paddingBottom = '10px';
        }

        previousUid = uid;
        previousTime = time;
      });

      const heightDelta = messages.scrollHeight - oldHeight;
      if (wasNearBottom) {
        messages.scrollTop = messages.scrollHeight;
      } else if (heightDelta) {
        messages.scrollTop = oldTop + heightDelta;
      }

      applying = false;
    };

    observer = new MutationObserver(() => requestAnimationFrame(apply));
    observer.observe(messages, {childList: true, subtree: true});
    requestAnimationFrame(apply);
  }

  const wait = new MutationObserver(setup);
  wait.observe(document.body, {childList: true, subtree: true});
  setup();
})();
