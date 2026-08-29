(() => {
  const PREFS={compact:'p2p-compact',large:'p2p-large-text',contrast:'p2p-high-contrast',motion:'p2p-reduced-motion',avatars:'p2p-avatars',actions:'p2p-always-actions'};
  const apply=()=>{
    const b=document.body,get=k=>localStorage.getItem(k)==='1';
    b.classList.toggle('p2p-compact',get(PREFS.compact));
    b.classList.toggle('p2p-large-text',get(PREFS.large));
    b.classList.toggle('p2p-high-contrast',get(PREFS.contrast));
    b.classList.toggle('p2p-reduced-motion',get(PREFS.motion));
    b.classList.toggle('p2p-hide-avatars',localStorage.getItem(PREFS.avatars)==='0');
    b.classList.toggle('p2p-always-actions',get(PREFS.actions));
    const theme=localStorage.getItem('p2p-theme')||'dark';
    const light=theme==='light'||(theme==='system'&&matchMedia('(prefers-color-scheme:light)').matches);
    b.classList.toggle('p2p-light-theme',light);
    b.classList.toggle('light',light);
    document.documentElement.dataset.theme=light?'light':'dark';
  };
  apply();
  window.P2PApplySettings=apply;
  document.addEventListener('change',e=>{if(e.target.matches?.('[data-p],[data-s]')){const k=e.target.dataset.p||e.target.dataset.s;localStorage.setItem('p2p-'+k,e.target.type==='checkbox'?(e.target.checked?'1':'0'):e.target.value);apply()}});
  matchMedia('(prefers-color-scheme:light)').addEventListener?.('change',apply);
})();
