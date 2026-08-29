(() => {
  const apply = value => {
    const system = value === 'system';
    const dark = system ? matchMedia('(prefers-color-scheme: dark)').matches : value === 'dark';
    document.body.classList.toggle('light', !dark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  };
  const saved = localStorage.getItem('p2p-theme') || 'dark';
  apply(saved);
  document.addEventListener('change', e => {
    const select = e.target.closest?.('[data-s="theme"]');
    if (!select) return;
    localStorage.setItem('p2p-theme', select.value);
    apply(select.value);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if ((localStorage.getItem('p2p-theme') || 'dark') === 'system') apply('system');
  });
})();
