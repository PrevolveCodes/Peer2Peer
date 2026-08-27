import {getDatabase,ref,get,update} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

/* Client-side spam protection for the Peer2Peer composer.
   First burst: 1 minute timeout. Second burst: 1 hour timeout.
   The timeout is persisted in Firebase so it survives refreshes. */
const db=getDatabase();
let currentUid=null;
let sendingWindow=[];
let offenseHandling=false;
let popupOpen=false;
let lastComposer=null;

const root=()=>document.getElementById('modal-root');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function findUid(){
  if(currentUid)return currentUid;
  const avatar=document.getElementById('me-avatar');
  return avatar?.dataset?.uid||null;
}

function showSpamPopup(minutes,secondOffense){
  if(popupOpen)return;
  popupOpen=true;
  const r=root();
  if(!r)return;
  r.innerHTML=`<div class="modal-bg spam-warning-bg"><div class="spam-warning" role="alert" aria-live="assertive"><div class="spam-warning-icon">!</div><h2>Slow down</h2><p>You have been timed out for <b>${minutes} minute${minutes===1?'':'s'}</b> for spamming.</p><p>${secondOffense?'One more spam offense will result in a 1 hour timeout on your account.':'One more spam offense will result in a 1 hour timeout on your account.'}</p><button id="spam-warning-ok" class="primary">OK</button></div></div>`;
  const bg=r.firstElementChild;
  const card=r.querySelector('.spam-warning');
  document.body.classList.add('p2p-screen-shake');
  setTimeout(()=>document.body.classList.remove('p2p-screen-shake'),550);
  r.querySelector('#spam-warning-ok')?.addEventListener('click',()=>{bg?.remove();popupOpen=false});
  bg?.addEventListener('click',e=>{if(e.target===bg){bg.remove();popupOpen=false}});
}

function timeoutActive(data){return Number(data?.spamTimeoutUntil||0)>Date.now();}

async function loadModeration(uid){
  if(!uid)return null;
  try{return (await get(ref(db,`users/${uid}/moderation`))).val()||{}}catch{return null}
}

async function applyTimeout(uid){
  if(!uid||offenseHandling)return true;
  offenseHandling=true;
  try{
    const moderation=await loadModeration(uid)||{};
    const previousStrikes=Number(moderation.spamStrikes||0);
    const nextStrike=previousStrikes+1;
    const duration=nextStrike>=2?60*60*1000:60*1000;
    const until=Date.now()+duration;
    await update(ref(db,`users/${uid}/moderation`),{spamStrikes:nextStrike,spamTimeoutUntil:until,lastSpamAt:Date.now()});
    showSpamPopup(nextStrike>=2?60:1,nextStrike>=2);
    lockComposer(until);
  }catch(e){console.warn('Spam protection could not save timeout',e)}
  finally{offenseHandling=false}
  return true;
}

function lockComposer(until){
  const remaining=Math.max(0,until-Date.now());
  const disable=()=>{
    const msg=document.getElementById('msg');
    const send=document.getElementById('send');
    if(msg){msg.dataset.spamLocked='1';msg.disabled=true;msg.placeholder='You are temporarily timed out for spamming.'}
    if(send){send.dataset.spamLocked='1';send.disabled=true}
  };
  disable();
  setTimeout(()=>{
    const msg=document.getElementById('msg');
    const send=document.getElementById('send');
    if(msg){delete msg.dataset.spamLocked;msg.disabled=false;msg.placeholder='Write a message...'}
    if(send){delete send.dataset.spamLocked;send.disabled=false}
  },remaining+50);
}

async function checkTimeout(){
  const uid=findUid();
  if(!uid)return false;
  const moderation=await loadModeration(uid);
  if(timeoutActive(moderation)){
    lockComposer(Number(moderation.spamTimeoutUntil));
    return true;
  }
  return false;
}

async function onSendAttempt(){
  const msg=document.getElementById('msg');
  if(!msg||!msg.value.trim())return;
  if(await checkTimeout())return true;
  const now=Date.now();
  sendingWindow=sendingWindow.filter(t=>now-t<10000);
  sendingWindow.push(now);
  if(sendingWindow.length>=10){
    sendingWindow=[];
    await applyTimeout(findUid());
  }
}

document.addEventListener('click',e=>{
  const send=e.target.closest?.('#send');
  if(!send)return;
  if(send.dataset.spamLocked==='1'){
    e.preventDefault();e.stopImmediatePropagation();
    return;
  }
  onSendAttempt();
},true);

document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'||e.shiftKey)return;
  if(e.target?.id!=='msg')return;
  if(e.target.dataset.spamLocked==='1'){
    e.preventDefault();e.stopImmediatePropagation();
  }
},true);

const composerObserver=new MutationObserver(()=>{
  const msg=document.getElementById('msg');
  if(msg&&msg!==lastComposer){
    lastComposer=msg;
    const uid=findUid();
    if(uid)loadModeration(uid).then(m=>{if(timeoutActive(m))lockComposer(Number(m.spamTimeoutUntil))});
  }
});
composerObserver.observe(document.body,{childList:true,subtree:true});

/* Pick up the authenticated user from Firebase Auth without touching the app's auth flow. */
import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js').then(({getAuth,onAuthStateChanged})=>{
  const auth=getAuth();
  onAuthStateChanged(auth,user=>{currentUid=user?.uid||null;if(currentUid)checkTimeout()});
});
