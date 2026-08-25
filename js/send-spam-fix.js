// Prevent rapid Enter/click spam from sending duplicate messages while the previous send is still pending.
// This works with the existing app.js send handler without replacing it.
(() => {
  let locked = false;
  let poll = null;

  function getComposer() {
    return document.getElementById('msg');
  }

  function getSendButton() {
    return document.getElementById('send');
  }

  function unlockWhenCleared() {
    clearInterval(poll);
    poll = setInterval(() => {
      const msg = getComposer();
      const btn = getSendButton();
      if (!msg || !btn) return;
      if (!msg.value.trim()) {
        locked = false;
        btn.disabled = false;
        clearInterval(poll);
        poll = null;
      }
    }, 40);
  }

  document.addEventListener('click', event => {
    const btn = event.target.closest?.('#send');
    if (!btn) return;

    const msg = getComposer();
    if (!msg || !msg.value.trim()) return;

    if (locked) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    locked = true;
    btn.disabled = true;
    unlockWhenCleared();
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    const msg = event.target.closest?.('#msg');
    if (!msg) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (locked || !msg.value.trim()) return;

    const btn = getSendButton();
    if (btn) btn.click();
  }, true);

  // app.js recreates the composer every time a chat is opened, so the delegated
  // listeners above continue working for every DM and room.
})();
