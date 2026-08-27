import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const auth=getAuth(),db=getDatabase();
let busy=false;

async function openGroup(button){
  if(busy)return;
  const code=button?.dataset?.room;
  if(!code)return;
  busy=true;
  try{
    const s=await get(ref(db,`rooms/${code}/meta`));
    const room=s.val()||{};
    // Use the existing channel implementation exposed by big-update.js.
    if(typeof window.__p2pOpenRoomChannels==='function'){
      await window.__p2pOpenRoomChannels(code,room);
    }else{
      // Trigger the existing router exactly once if the function is not exposed yet.
      button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    }
  }finally{setTimeout(()=>busy=false,100)}
}

function wire(){
  document.querySelectorAll('#room-list [data-room]').forEach(b=>{
    if(b.dataset.p2pSingleClick==='1')return;
    b.dataset.p2pSingleClick='1';
    b.onclick=null;
    b.addEventListener('click',e=>{
      if(e.target.closest('[data-room-settings]'))return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openGroup(b);
    },true);
  });
}

const observer=new MutationObserver(wire);
observer.observe(document.getElementById('room-list')||document.body,{childList:true,subtree:true});
wire();
window.__p2pChannelSingleClickReady=true;
