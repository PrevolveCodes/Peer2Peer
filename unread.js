import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get,onValue,update} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const config={apiKey:'AIzaSyAucXMpqBhYbZy1fSbkTKHX23y9bpx1hec',authDomain:'p2pminimalchat.firebaseapp.com',databaseURL:'https://p2pminimalchat-default-rtdb.firebaseio.com',projectId:'p2pminimalchat',storageBucket:'p2pminimalchat.firebasestorage.app',messagingSenderId:'37869407438',appId:'1:37869407438:web:63485dde33bb8710f8d49f'};
const app=getApps().length?getApps()[0]:initializeApp(config),auth=getAuth(app),db=getDatabase(app);
let me=null,activeKey=null,activeType=null,listening=new Map();
const $=id=>document.getElementById(id);

function statePath(type,key){return `users/${me.uid}/readState/${type}/${key}`}
async function markRead(type,key,time){if(!me||!key)return;await update(ref(db,statePath(type,key)),{time:time||Date.now()})}
function addDot(el){if(!el)return;if(!el.querySelector('.unread-dot')){const d=document.createElement('span');d.className='unread-dot';d.setAttribute('aria-label','Unread messages');el.appendChild(d)}el.classList.add('has-unread')}
function clearDot(el){if(!el)return;el.querySelector('.unread-dot')?.remove();el.classList.remove('has-unread')}
function findButton(type,key){return type==='dm'?document.querySelector(`[data-dm="${CSS.escape(key)}"]`):document.querySelector(`[data-room="${CSS.escape(key)}"]`)}
function paint(type,key,unread){const b=findButton(type,key);if(unread)addDot(b);else clearDot(b)}

async function watchConversation(type,key,path){
 const id=type+':'+key;if(listening.has(id))return;
 const readSnap=await get(ref(db,statePath(type,key)));let lastRead=readSnap.val()?.time||0;
 const unsub=onValue(ref(db,path),snap=>{
  const messages=snap.val()||{};let newest=lastRead;
  for(const v of Object.values(messages)){const t=v?.time||0;if(t>newest)newest=t}
  const unread=Object.values(messages).some(v=>(v?.time||0)>lastRead&&v?.uid!==me.uid);
  if(activeType===type&&activeKey===key&&unread){lastRead=newest;markRead(type,key,newest);paint(type,key,false)}
  else paint(type,key,unread);
 });
 listening.set(id,unsub);
}

function scanLists(){
 if(!me)return;
 document.querySelectorAll('[data-dm]').forEach(b=>{const key=b.dataset.dm;watchConversation('dm',key,`dms/${[me.uid,key].sort().join('_')}/messages`)})
 document.querySelectorAll('[data-room]').forEach(b=>{const key=b.dataset.room;watchConversation('room',key,`rooms/${key}/messages`)})
}

function setupClicks(){
 document.addEventListener('click',e=>{
  const dm=e.target.closest('[data-dm]');
  const room=e.target.closest('[data-room]');
  if(dm){activeType='dm';activeKey=dm.dataset.dm;clearDot(dm);markRead('dm',activeKey)}
  else if(room){activeType='room';activeKey=room.dataset.room;clearDot(room);markRead('room',activeKey)}
 });
 const observer=new MutationObserver(()=>scanLists());
 observer.observe(document.body,{childList:true,subtree:true});
}

onAuthStateChanged(auth,user=>{
 me=user;
 if(!user)return;
 setupClicks();
 onValue(ref(db,`users/${user.uid}/friends`),()=>scanLists());
 onValue(ref(db,`users/${user.uid}/joinedRooms`),()=>scanLists());
 scanLists();
});
