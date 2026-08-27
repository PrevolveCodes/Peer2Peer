// Prevent the legacy app.js room button onclick handlers from opening the old group-wide chat.
// The channel router owns group navigation.
(() => {
  const clean = () => {
    document.querySelectorAll('#room-list [data-room]').forEach(button => {
      if (button.dataset.channelRouterClean === '1') return;
      const replacement = button.cloneNode(true);
      replacement.dataset.channelRouterClean = '1';
      button.replaceWith(replacement);
    });
  };
  const start = () => {
    const list = document.getElementById('room-list');
    if (!list) return setTimeout(start, 100);
    clean();
    new MutationObserver(clean).observe(list, {childList:true, subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
