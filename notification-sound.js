const P2PNotificationSound=(()=>{
  let audio=null;
  let unlocked=false;
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
      const current=[...container.querySelectorAll('.message[data-message-id]')];
      const added=[];
      for(const el of current){
        const id=el.dataset.messageId;
        if(!known.has(id)){
          known.add(id);
          added.push(el);
        }
      }
      // A single newly-added message means an actual incoming message.
      // Larger replacements are treated as a chat switch/initial render.
      if(added.length===1){
        const el=added[0];
        const uid=el.querySelector('[data-profile-uid]')?.dataset.profileUid;
        const me=window.firebase?.auth?.currentUser?.uid;
        if(!me||uid!==me)play();
      }
    });
    observer.observe(container,{childList:true,subtree:true});
  }

  const watch=()=>{
    document.addEventListener('click',unlock,{once:false,passive:true});
    document.addEventListener('touchstart',unlock,{once:false,passive:true});
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