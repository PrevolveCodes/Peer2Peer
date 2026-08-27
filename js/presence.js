import {getApp} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get,set,update,onDisconnect} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const app=getApp();
const auth=getAuth(app);
const db=getDatabase(app);
const IDLE_MS=10*60*1000;
let uid=null;
let manualStatus='online';
let idleTimer=null;

const writePresence=async status=>{
  if(!uid)return;
  await update(ref(db,`users/${uid}/profile`),{presence:status});
  await update(ref(db,`userDirectory/${uid}`),{presence:status});
};

const setupDisconnect=async()=>{
  if(!uid)return;
  const profileRef=ref(db,`users/${uid}/profile`);
  const directoryRef=ref(db,`userDirectory/${uid}`);
  await onDisconnect(profileRef).update({presence:'offline'});
  await onDisconnect(directoryRef).update({presence:'offline'});
};

const resetIdle=()=>{
  clearTimeout(idleTimer);
  if(!uid||manualStatus!=='online')return;
  writePresence('online');
  idleTimer=setTimeout(()=>writePresence('idle'),IDLE_MS);
};

['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(event=>window.addEventListener(event,resetIdle,{passive:true}));

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')resetIdle();
});

onAuthStateChanged(auth,async user=>{
  clearTimeout(idleTimer);
  uid=user?.uid||null;
  if(!uid)return;

  const snap=await get(ref(db,`users/${uid}/profile`));
  const profile=snap.val()||{};
  manualStatus=profile.presence==='dnd'||profile.presence==='offline'?profile.presence:'online';

  await setupDisconnect();
  await writePresence(manualStatus);
  resetIdle();
});

window.addEventListener('beforeunload',()=>{
  // Firebase onDisconnect handles the actual offline transition.
  clearTimeout(idleTimer);
});
