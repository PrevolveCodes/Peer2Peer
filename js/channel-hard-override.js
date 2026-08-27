// Make the channel router the only group-opening handler.
// app.js attaches direct onclick handlers to room buttons; this capture-phase
// handler runs before those handlers and opens the channel UI on the first click.
import {getDatabase,ref,get} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
const db=getDatabase(),auth=getAuth();
let busy=false;
document.addEventListener('click',async e=>{
  const b=e.target.closest?.('#room-list [data-room]');
  if(!b||e.target.closest('[data-room-settings]'))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(busy)return;busy=true;
  try{
    const code=b.dataset.room;
    const snap=await get(ref(db,`rooms/${code}/meta`));
    if(!snap.exists())return;
    // discord-channel-layout owns the actual channel UI. Dispatch a private event
    // so this override does not depend on its internal function scope.
    document.dispatchEvent(new CustomEvent('p2p:open-room',{detail:{code,room:snap.val()}}));
  }catch(err){console.error(err)}finally{busy=false}
},true);
