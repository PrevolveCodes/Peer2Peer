const P2PNotificationSound=(()=>{
  let audio=null;
  let unlocked=false;
  let suppressNext=false;
  const seen=new WeakMap();

  function unlock(){
    if(unlocked)return;
    try{
      audio=new (window.AudioContext||window.webkitAudioContext)();
      if(audio.state==='suspended')audio.resume();
      unlocked=true;
    }catch(e){}
  }

  function play(){
    if(!unlocked||!audio)return;
    try{
      if(audio.state==='suspended')audio.resume();
      const now=audio.currentTime;
      const osc=audio.createOscillator();
      const gain=audio.createGain();
      osc.type='sine';
      osc.frequency.setValueAtTime(880,now);
      osc.frequency.setValueAtTime(660,now+0.09);
      gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(0.13,now+0.01);
      gain.gain.exponentialRampToValueAtTime(0.001,now+0.18);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now+0.2);
    }catch(e){}
  }

  function setupMessages(container){
    if(seen.has(container))return;
    const ids=new Set();
    container.querySelectorAll('.message[data-message-id]').forEach(el=>ids.add(el.dataset.messageId));
    seen.set(container,ids);

    const observer=new MutationObserver(()=>{
      const known=seen.get(container);
      if(!known)return;
      const added=[];
      for(const el of container.querySelectorAll('.message[data-message-id]')){
        const id=el.dataset.messageId;
        if(!known.has(id)){
          known.add(id);
          added.push(el);
        }
      }
      if(added.length===1){
        if(suppressNext){
          suppressNext=false;
          return;
        }
        play();
      }
    });
    observer.observe(container,{childList:true,subtree:true});
  }

  const watch=()=>{
    document.addEventListener('click',e=>{
      unlock();
      if(e.target.closest('#send'))suppressNext=true;
    },{passive:true});
    document.addEventListener('touchstart',unlock,{passive:true});
    const root=document.getElementById('content');
    if(!root)return;
    const rootObserver=new MutationObserver(()=>{
      const messages=document.getElementById('messages');
      if(messages)setupMessages(messages);
    });
    rootObserver.observe(root,{childList:true,subtree:true});
    const messages=document.getElementById('messages');
    if(messages)setupMessages(messages);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
  return {unlock,play};
})();
window.P2PNotificationSound=P2PNotificationSound;