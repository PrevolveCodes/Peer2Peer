import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get,push,onValue} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig={apiKey:'AIzaSyAucXMpqBhYbZy1fSbkTKHX23y9bpx1hec',authDomain:'p2pminimalchat.firebaseapp.com',databaseURL:'https://p2pminimalchat-default-rtdb.firebaseio.com',projectId:'p2pminimalchat',storageBucket:'p2pminimalchat.firebasestorage.app',messagingSenderId:'37869407438',appId:'1:37869407438:web:63485dde33bb8710f8d49f'};
const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);
const auth=getAuth(app),db=getDatabase(app);
let currentPath=null,currentMessages={},replyState=null,profile={};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function setCurrent(type,id){
  const user=auth.currentUser;
  if(!user)return;
  currentPath=type==='dm'?`dms/${[user.uid,id].sort().join('_')}/messages`:`rooms/${id}/messages`;
  replyState=null;
  removeReplyBar();
  onValue(ref(db,currentPath),snap=>{currentMessages=snap.val()||{};decorateReplies();});
}

function removeReplyBar(){document.querySelector('.actual-reply-composer')?.remove();}
function showReplyBar(msg,id){
  removeReplyBar();
  const composer=document.querySelector('.composer');
  if(!composer)return;
  const bar=document.createElement('div');
  bar.className='actual-reply-composer';
  bar.innerHTML=`<div><b>Replying to ${esc(msg.name||'User')}</b><span>${esc(String(msg.text||'').slice(0,160))}</span></div><button type="button" aria-label="Cancel reply">×</button>`;
  bar.querySelector('button').onclick=()=>{replyState=null;bar.remove();};
  composer.prepend(bar);
}

function startReply(id){
  const msg=currentMessages[id];
  if(!msg)return;
  replyState={id,uid:msg.uid||'',name:msg.name||'User',text:msg.text||''};
  showReplyBar(replyState,id);
  $('msg')?.focus();
}

function decorateReplies(){
  const messages=document.getElementById('messages');
  if(!messages)return;
  for(const [id,msg] of Object.entries(currentMessages)){
    if(!msg?.replyTo)continue;
    const el=messages.querySelector(`[data-message-id="${CSS.escape(id)}"]`);
    const body=el?.querySelector('.message-body');
    if(!body||body.querySelector('.actual-reply'))continue;
    const original=msg.replyTo;
    const quote=document.createElement('button');
    quote.type='button';
    quote.className='actual-reply';
    quote.innerHTML=`<b>Replying to ${esc(original.name||'User')}</b><span>${esc(String(original.text||'').slice(0,220))}</span>`;
    quote.onclick=()=>{
      const target=messages.querySelector(`[data-message-id="${CSS.escape(original.id||'')}"]`);
      target?.scrollIntoView({behavior:'smooth',block:'center'});
    };
    body.prepend(quote);
  }
}

// Capture the clicks before app.js gets its old reply handler.
document.addEventListener('click',e=>{
  const dm=e.target.closest?.('[data-dm]');
  if(dm){setCurrent('dm',dm.dataset.dm);return;}
  const room=e.target.closest?.('[data-room]');
  if(room){setCurrent('room',room.dataset.room);return;}
  const reply=e.target.closest?.('[data-action="reply"]');
  if(reply){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    startReply(reply.dataset.id);
  }
},true);

// Replace only the send operation when a reply is active. Normal messages still use app.js.
document.addEventListener('click',async e=>{
  if(e.target?.id!=='send'||!replyState||!currentPath)return;
  e.preventDefault();
  e.stopPropagation();
  if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  const input=$('msg'),text=input?.value.trim();
  if(!text)return;
  const user=auth.currentUser;
  if(!user)return;
  try{
    await push(ref(db,currentPath),{
      uid:user.uid,
      name:profile.username||user.displayName||'User',
      avatar:profile.avatarData||null,
      text,
      time:Date.now(),
      replyTo:{id:replyState.id,uid:replyState.uid,name:replyState.name,text:replyState.text}
    });
    input.value='';
    replyState=null;
    removeReplyBar();
  }catch(err){console.error('Reply send failed:',err);alert('Could not send the reply.');}
},true);

const observer=new MutationObserver(()=>decorateReplies());
observer.observe(document.body,{childList:true,subtree:true});

auth.onAuthStateChanged(async user=>{
  if(!user)return;
  const snap=await get(ref(db,`users/${user.uid}/profile`));
  profile=snap.val()||{};
});
