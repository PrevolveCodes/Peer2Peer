// Message grouping / timestamp fix.
// This runs after app.js renders messages, so it does not replace the existing chat code.
(function(){
  const GAP = 7 * 60 * 1000;
  const getMessages = () => document.getElementById('messages');

  function timeOf(el){
    const small = el.querySelector('.message-body > small');
    if(!small) return 0;
    const d = Date.parse(small.textContent);
    return Number.isFinite(d) ? d : 0;
  }

  function apply(){
    const box = getMessages();
    if(!box) return;
    const items = [...box.querySelectorAll(':scope > .message')];
    let previous = null;

    items.forEach((item, index) => {
      const name = item.querySelector('.message-body > b')?.textContent?.trim() || '';
      const small = item.querySelector('.message-body > small');
      const t = timeOf(item);
      const prevName = previous?.querySelector('.message-body > b')?.textContent?.trim() || '';
      const prevT = previous ? timeOf(previous) : 0;
      const grouped = previous && name === prevName && t && prevT && (t - prevT) <= GAP;

      item.classList.toggle('message-grouped', !!grouped);
      item.classList.toggle('message-group-start', !grouped);

      // The old renderer puts a timestamp inside every message. Hide it for grouped
      // messages, which prevents a timestamp appearing above/inside a grouped run.
      if(small) small.style.display = grouped ? 'none' : 'none';

      previous = item;
    });
  }

  const observer = new MutationObserver(() => requestAnimationFrame(apply));
  function start(){
    const box = getMessages();
    if(box) observer.observe(box,{childList:true,subtree:true});
    apply();
  }

  const boot = setInterval(() => {
    if(getMessages()) { clearInterval(boot); start(); }
  }, 100);
})();
