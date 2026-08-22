import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,push,get,onValue,remove,update} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig={apiKey:'AIzaSyAucXMpqBhYbZy1fSbkTKHX23y9bpx1hec',authDomain:'p2pminimalchat.firebaseapp.com',databaseURL:'https://p2pminimalchat-default-rtdb.firebaseio.com',projectId:'p2pminimalchat',storageBucket:'p2pminimalchat.firebasestorage.app',messagingSenderId:'37869407438',appId:'1:37869407438:web:63485dde33bb8710f8d49f'};
const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig),auth=getAuth(app),db=getDatabase(app);
let me=null,currentType=null,currentKey=null,pendingReply=null,forwardMessage=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const path=(type,key)=>type==='dm'?`dms/${[me.uid,key].sort().join('_')}/messages`:`rooms/${key}/messages`;

function trackSelection(){document.addEventListener('click',e=>{const dm=e.target.closest('[data-dm]'),room=e.target.closest('[data-room]');if(dm){currentType='dm';currentKey=dm.dataset.dm}else if(room&&!e.target.closest('[data-room-settings]')){currentType='room';currentKey=room.dataset.room}if(window.innerWidth<=700&&e.target.closest('.sidebar')&&!e.target.closest('.mobile-menu-button')){const toggle=document.getElementById('mobile-nav-toggle');if(toggle)toggle.checked=false}},true)}

function showReply(msg){pendingReply={id:msg.id,uid:msg.uid,name:msg.name,text:msg.text};const composer=document.querySelector('.composer'),input=document.getElementById('msg');if(!composer||!input)return;let bar=document.getElementById('reply-bar');if(!bar){bar=document.createElement('div');bar.id='reply-bar';composer.parentElement.insertBefore(bar,composer)}bar.innerHTML=`<span>Replying to <b>${esc(msg.name||'User')}</b>: ${esc(msg.text||'').slice(0,100)}</span><button type="button" id="cancel-reply">×</button>`;document.getElementById('cancel-reply').onclick=()=>{pendingReply=null;bar.remove()};input.focus({preventScroll:true})}

function showForward(msg){forwardMessage=msg;const root=document.getElementById('modal-root');if(!root)return;root.innerHTML=`<div class="modal-bg bug-modal"><div class="modal forward-modal"><button class="x" id="forward-close">×</button><h2>Forward message</h2><p class="muted">Choose where to send this message.</p><div id="forward-options"><p class="muted">Loading…</p></div></div></div>`;document.getElementById('forward-close').onclick=()=>root.innerHTML='';loadForwardOptions()}

async function loadForwardOptions(){const out=document.getElementById('forward-options');if(!out||!me)return;const [fs,rs]=await Promise.all([get(ref(db,`users/${me.uid}/friends`)),get(ref(db,`users/${me.uid}/joinedRooms`))]);const friends=fs.val()||{},rooms=rs.val()||{};out.innerHTML=`<h3>Messages</h3>${Object.entries(friends).map(([uid,u])=>`<button class="forward-option" data-ft="dm" data-fk="${esc(uid)}">${esc(u.username||uid)}</button>`).join('')||'<p class="muted">No friends.</p>'}<h3>Rooms</h3>${Object.keys(rooms).map(code=>`<button class="forward-option" data-ft="room" data-fk="${esc(code)}">${esc(code)}</button>`).join('')||'<p class="muted">No rooms.</p>'}`;out.querySelectorAll('.forward-option').forEach(b=>b.onclick=async()=>{const t=b.dataset.ft,k=b.dataset.fk;await push(ref(db,path(t,k)),{uid:me.uid,name:me.displayName||'User',text:forwardMessage.text||'',time:Date.now(),forwardedFrom:{uid:forwardMessage.uid||'',name:forwardMessage.name||'User'}});document.getElementById('modal-root').innerHTML=''})}

function handleActions(){document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;if(action!=='reply'&&action!=='forward')return;e.preventDefault();e.stopImmediatePropagation();const id=b.dataset.id;if(!currentType||!currentKey)return;get(ref(db,`${path(currentType,currentKey)}/${id}`)).then(s=>{const v=s.val();if(!v)return;const msg={...v,id};if(action==='reply')showReply(msg);else showForward(msg)}).catch(console.error)},true)}

function handleReplySend(){document.addEventListener('click',async e=>{if(e.target.id!=='send'||!pendingReply)return;e.preventDefault();e.stopImmediatePropagation();const input=document.getElementById('msg');const text=input?.value.trim();if(!text||!currentType||!currentKey)return;try{await push(ref(db,path(currentType,currentKey)),{uid:me.uid,name:me.displayName||'User',text,time:Date.now(),replyTo:{id:pendingReply.id,uid:pendingReply.uid,name:pendingReply.name,text:pendingReply.text}});input.value='';pendingReply=null;document.getElementById('reply-bar')?.remove()}catch(err){console.error(err);alert('Could not send reply.')}},true)}

function decorateMessages(){const observer=new MutationObserver(async()=>{const boxes=document.querySelectorAll('.message[data-message-id]');for(const box of boxes){if(box.dataset.bugDecorated==='1')continue;const id=box.dataset.messageId;if(!currentType||!currentKey)continue;const snap=await get(ref(db,`${path(currentType,currentKey)}/${id}`));const v=snap.val();if(!v)continue;const body=box.querySelector('.message-body');const p=body?.querySelector('p');if(!body||!p)continue;if(v.forwardedFrom&&!body.querySelector('.forwarded-label')){const d=document.createElement('div');d.className='forwarded-label';d.textContent='Forwarded';body.insertBefore(d,p)}if(v.replyTo&&!body.querySelector('.reply-preview')){const d=document.createElement('div');d.className='reply-preview';d.innerHTML=`<b>Replying to ${esc(v.replyTo.name||'User')}</b><span>${esc(v.replyTo.text||'')}</span>`;body.insertBefore(d,p)}box.dataset.bugDecorated='1'} });observer.observe(document.body,{childList:true,subtree:true})}

function validUid(uid){return typeof uid==='string'&&/^[A-Za-z0-9_-]{20,128}$/.test(uid)}
function validUsername(name){return typeof name==='string'&&name.trim().length>0&&!/[<>]/.test(name)&&name.trim().toLowerCase()!=='username'}

async function cleanFriendRequests(uid){
 const snap=await get(ref(db,`friendRequests/${uid}`));
 const requests=snap.val()||{};
 const friends=(await get(ref(db,`users/${uid}/friends`))).val()||{};
 const updates={};
 for(const [senderId,request] of Object.entries(requests)){
  let bad=!validUid(senderId)||!request||!validUsername(request.username);
  if(!bad&&friends[senderId])bad=true;
  if(!bad){
   const profileSnap=await get(ref(db,`users/${senderId}/profile`));
   const directorySnap=await get(ref(db,`userDirectory/${senderId}`));
   if(!profileSnap.exists()&&!directorySnap.exists())bad=true;
  }
  if(bad){updates[`friendRequests/${uid}/${senderId}`]=null;updates[`friendRequestsSent/${senderId}/${uid}`]=null}
 }
 if(Object.keys(updates).length)await update(ref(db),updates);
}

function fixFriendRequestState(){
 if(!me)return;
 onValue(ref(db,`friendRequests/${me.uid}`),()=>cleanFriendRequests(me.uid).catch(console.error));
 onValue(ref(db,`users/${me.uid}/friends`),()=>{
  const search=document.getElementById('search');
  if(search)search.dispatchEvent(new Event('input',{bubbles:true}));
 });
}

function fixMobileViewport(){
 const style=document.createElement('style');
 style.id='p2p-mobile-bug-fixes';
 style.textContent=`html{-webkit-text-size-adjust:100%;text-size-adjust:100%}input,textarea,select{font-size:16px!important}button{touch-action:manipulation}@media(max-width:700px){.composer textarea{font-size:16px!important}.message-image{max-width:min(320px,65vw)!important;max-height:240px!important}.message-image img{max-width:100%;height:auto}}`;
 document.head.appendChild(style);
}

function fixFallbackAvatars(){
 const observer=new MutationObserver(()=>document.querySelectorAll('.message-avatar').forEach(b=>{
  if(b.querySelector('img'))return;
  const name=b.closest('.message')?.querySelector('.message-body b')?.textContent||'User';
  let f=b.querySelector('.avatar-fallback');
  if(!f){f=document.createElement('span');f.className='avatar-fallback';b.replaceChildren(f)}
  f.textContent=(name.trim().charAt(0)||'U').toUpperCase();
 }));
 observer.observe(document.body,{childList:true,subtree:true});
}

onAuthStateChanged(auth,u=>{me=u;if(!u)return;trackSelection();handleActions();handleReplySend();decorateMessages();fixFriendRequestState();fixMobileViewport();fixFallbackAvatars()});
