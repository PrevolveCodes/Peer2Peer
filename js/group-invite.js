import {getDatabase,ref,get,set,onValue,remove} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';

const firebaseConfig={apiKey:'AIzaSyAucXMpqBhYbZy1fSbkTKHX23y9bpx1hec',authDomain:'p2pminimalchat.firebaseapp.com',databaseURL:'https://p2pminimalchat-default-rtdb.firebaseio.com',projectId:'p2pminimalchat',storageBucket:'p2pminimalchat.firebasestorage.app',messagingSenderId:'37869407438',appId:'1:37869407438:web:63485dde33bb8710f8d49f'};
const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig),auth=getAuth(app),db=getDatabase(app);
let me=null,lastTitle='',timer=null;
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function currentRoom(){
  if(!me||$('view-sub')?.textContent!=='Room')return null;
  const title=$('view-title')?.textContent?.trim();if(!title)return null;
  const joined=(await get(ref(db,`users/${me.uid}/joinedRooms`))).val()||{};
  for(const code of Object.keys(joined)){
    const s=await get(ref(db,`rooms/${code}/meta`));
    const room=s.val()||{};
    if((room.name||code)===title)return {code,room};
  }
  return null;
}

async function render(){
  const actions=$('header-actions');if(!actions)return;
  const found=await currentRoom();
  if(!found||found.room.owner!==me?.uid){actions.querySelector('[data-group-invite]')?.remove();return}
  if(actions.querySelector('[data-group-invite]'))return;
  const b=document.createElement('button');
  b.className='header-action';b.dataset.groupInvite='1';b.textContent='+';b.title='Invite people to this group';
  b.onclick=()=>openInvite(found.code,found.room);actions.prepend(b);
}

async function openInvite(code,room){
  const m=document.createElement('div');m.className='modal-bg';
  m.innerHTML=`<div class="modal"><button class="x" data-close>×</button><h2>Invite to ${esc(room.name||code)}</h2><p class="muted">Choose a friend to send a group invite.</p><div style="display:flex;gap:8px"><input id="group-code" value="${esc(code)}" readonly><button id="copy-group-code">Copy code</button></div><h3>Friends</h3><div id="group-friends"><p class="muted">Loading...</p></div></div>`;
  document.getElementById('modal-root').appendChild(m);
  m.querySelector('[data-close]').onclick=()=>m.remove();
  m.querySelector('#copy-group-code').onclick=async()=>{await navigator.clipboard.writeText(code);m.querySelector('#copy-group-code').textContent='Copied';setTimeout(()=>{if(m.isConnected)m.querySelector('#copy-group-code').textContent='Copy code'},1200)};
  const friends=(await get(ref(db,`users/${me.uid}/friends`))).val()||{},members=(await get(ref(db,`rooms/${code}/members`))).val()||{};
  const list=m.querySelector('#group-friends'),entries=Object.entries(friends);
  list.innerHTML=entries.length?entries.map(([uid,u])=>{const inRoom=!!members[uid];return `<div class="result"><div><b>${esc(u.username||uid)}</b></div>${inRoom?'<span>Already in group</span>':`<button data-invite-user="${esc(uid)}">Invite</button>`}</div>`}).join(''):'<p class="muted">You have no friends to invite yet.</p>';
  m.querySelectorAll('[data-invite-user]').forEach(btn=>btn.onclick=async()=>{
    const uid=btn.dataset.inviteUser,u=friends[uid]||{};
    await set(ref(db,`users/${uid}/groupInvites/${code}`),{code,groupName:room.name||code,fromUid:me.uid,fromName:me.displayName||'A friend',createdAt:Date.now()});
    btn.textContent='Invited';btn.disabled=true;
  });
}

function ensureInviteUI(){
  if(document.getElementById('p2p-group-invites'))return document.getElementById('p2p-group-invites');
  const el=document.createElement('div');el.id='p2p-group-invites';
  el.style.cssText='position:fixed;right:20px;top:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;width:min(360px,calc(100vw - 40px));';
  document.body.appendChild(el);return el;
}

function showInvites(invites){
  const box=ensureInviteUI();
  box.innerHTML=Object.entries(invites||{}).map(([code,i])=>`<div class="modal p2p-group-invite-card" data-invite-card="${esc(code)}" style="padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.35)"><b>Group invite</b><p style="margin:8px 0">${esc(i.fromName||'A friend')} invited you to <strong>${esc(i.groupName||code)}</strong>.</p><div style="display:flex;gap:8px"><button class="primary" data-join-invite="${esc(code)}">Join</button><button data-dismiss-invite="${esc(code)}">Decline</button></div></div>`).join('');
  box.querySelectorAll('[data-join-invite]').forEach(b=>b.onclick=async()=>{
    const code=b.dataset.joinInvite,inv=invites[code];
    const roomSnap=await get(ref(db,`rooms/${code}/meta`));
    if(!roomSnap.exists()){await remove(ref(db,`users/${me.uid}/groupInvites/${code}`));return alert('This group no longer exists.');}
    const p=(await get(ref(db,`users/${me.uid}/profile`))).val()||{};
    await set(ref(db,`users/${me.uid}/joinedRooms/${code}`),true);
    await set(ref(db,`rooms/${code}/members/${me.uid}`),{uid:me.uid,username:p.username||me.displayName||'User',avatarData:p.avatarData||p.avatar||null});
    await remove(ref(db,`users/${me.uid}/groupInvites/${code}`));
    b.closest('[data-invite-card]')?.remove();
    document.getElementById('room-list')?.querySelector(`[data-room="${CSS.escape(code)}"]`)?.click();
  });
  box.querySelectorAll('[data-dismiss-invite]').forEach(b=>b.onclick=async()=>{await remove(ref(db,`users/${me.uid}/groupInvites/${b.dataset.dismissInvite}`));b.closest('[data-invite-card]')?.remove()});
}

const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(render,80)});
obs.observe(document.body,{childList:true,subtree:true});

onAuthStateChanged(auth,u=>{
  me=u;if(!u)return;
  render();
  onValue(ref(db,`users/${u.uid}/groupInvites`),s=>showInvites(s.val()||{}));
});