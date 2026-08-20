import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get,set,remove,onValue,onDisconnect} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig={apiKey:'AIzaSyAucXMpqBhYbZy1fSbkTKHX23y9bpx1hec',authDomain:'p2pminimalchat.firebaseapp.com',databaseURL:'https://p2pminimalchat-default-rtdb.firebaseio.com',projectId:'p2pminimalchat',storageBucket:'p2pminimalchat.firebasestorage.app',messagingSenderId:'37869407438',appId:'1:37869407438:web:63485dde33bb8710f8d49f',measurementId:'G-9JNKBE87C3'};
const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig),auth=getAuth(app),db=getDatabase(app);
let me=null,currentPath=null,typingTimer=null,typingListener=null,lookupTimer=null;
const $=id=>document.getElementById(id);

function typingBase(path){return `${path}/typing`}
function stopTyping(){if(!currentPath||!me)return;clearTimeout(typingTimer);remove(ref(db,`${typingBase(currentPath)}/${me.uid}`)).catch(()=>{});}
function setTyping(path){if(!me||!path)return;currentPath=path;const r=ref(db,`${typingBase(path)}/${me.uid}`);set(r,{uid:me.uid,name:me.displayName||'User',at:Date.now()}).catch(()=>{});onDisconnect(r).remove().catch(()=>{});clearTimeout(typingTimer);typingTimer=setTimeout(stopTyping,1800)}
function renderTyping(data){const el=$('typing-indicator');if(!el)return;const names=Object.values(data||{}).filter(v=>v&&v.uid!==me?.uid).map(v=>v.name||'Someone');const unique=[...new Set(names)];if(!unique.length){el.textContent='';el.classList.remove('visible');return}el.textContent=unique.length===1?`${unique[0]} is typing...`:`${unique.slice(0,2).join(' and ')} are typing...`;el.classList.add('visible')}
async function resolvePath(){const title=$('view-title')?.textContent?.trim();const sub=$('view-sub')?.textContent?.trim();if(!title||title==='Welcome'||!me)return null;if(sub==='Private conversation'){
  const snap=await get(ref(db,'userDirectory'));const users=snap.val()||{};const other=Object.values(users).find(u=>u.uid!==me.uid&&(u.username||'')===title);if(other)return `dms/${[me.uid,other.uid].sort().join('_')}`;
}
if(sub==='Room'){
  const joined=await get(ref(db,`users/${me.uid}/joinedRooms`));const codes=Object.keys(joined.val()||{});for(const code of codes){const snap=await get(ref(db,`rooms/${code}/meta`));const room=snap.val()||{};if((room.name||code)===title)return `rooms/${code}`}
}
return null}
async function attach(){const composer=$('msg');if(!composer)return;if(composer.dataset.typingReady)return;composer.dataset.typingReady='1';const path=await resolvePath();if(!path)return;currentPath=path;typingListener=onValue(ref(db,typingBase(path)),s=>renderTyping(s.val()||{}));composer.addEventListener('input',()=>{if(composer.value.trim())setTyping(path);else stopTyping()});composer.addEventListener('blur',stopTyping)}
function ensure(){const composer=$('msg');if(!composer)return;let el=$('typing-indicator');if(!el){el=document.createElement('div');el.id='typing-indicator';el.className='typing-indicator';composer.closest('.content')?.insertBefore(el,composer.closest('.composer'));}attach()}
const observer=new MutationObserver(()=>{clearTimeout(lookupTimer);lookupTimer=setTimeout(ensure,50)});observer.observe(document.body,{childList:true,subtree:true});
onAuthStateChanged(auth,user=>{me=user;if(user)ensure()});
