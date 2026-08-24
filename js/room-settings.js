import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get,update,remove,set} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig={apiKey:'AIzaSyAucXMpqBhYbZy1fSbkTKHX23y9bpx1hec',authDomain:'p2pminimalchat.firebaseapp.com',databaseURL:'https://p2pminimalchat-default-rtdb.firebaseio.com',projectId:'p2pminimalchat',storageBucket:'p2pminimalchat.firebasestorage.app',messagingSenderId:'37869407438',appId:'1:37869407438:web:63485dde33bb8710f8d49f',measurementId:'G-9JNKBE87C3'};
const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig),auth=getAuth(app),db=getDatabase(app);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatar=p=>p?.avatarData||p?.avatar||null;
const avatarHTML=(p,n='R')=>avatar(p)?`<img src="${esc(avatar(p))}" alt="">`:`<span class="avatar-fallback">${esc((n||'R').trim().charAt(0).toUpperCase()||'R')}</span>`;
const root=()=>document.getElementById('modal-root');
function openSettings(code){
 const uid=auth.currentUser?.uid;if(!uid)return;
 get(ref(db,`rooms/${code}`)).then(async snap=>{
  const data=snap.val()||{},room=data.meta||{},members=data.members||{},isOwner=room.owner===uid;
  if(!room.owner){alert('This room could not be loaded.');return;}
  const perms=room.permissions||{};
  const others=Object.values(members).filter(m=>m.uid!==room.owner);
  root().innerHTML=`<div class="modal-bg"><div class="modal">
   <button class="x" id="room-settings-close">×</button><h2>Room settings</h2>
   ${isOwner?`<label>Room name<input id="settings-room-name" value="${esc(room.name||code)}" maxlength="50"></label>
   <label>Room picture<input id="settings-room-pic" type="file" accept="image/*"></label>
   <div id="settings-room-preview" class="group-setting-avatar">${avatarHTML(room,room.name)}</div>
   <h3>Permissions</h3>
   ${others.length?`<details class="permission-dropdown"><summary>Manage member permissions (${others.length})</summary><div class="permission-list">${others.map(u=>{const p=perms[u.uid]||{};return `<div class="permission-user"><b>${esc(u.username||u.uid)}</b>
   <label><input type="checkbox" data-perm="manageSettings" data-uid="${esc(u.uid)}" ${p.manageSettings?'checked':''}> Manage settings</label>
   <label><input type="checkbox" data-perm="manageMembers" data-uid="${esc(u.uid)}" ${p.manageMembers?'checked':''}> Manage members</label>
   <label><input type="checkbox" data-perm="invite" data-uid="${esc(u.uid)}" ${p.invite?'checked':''}> Invite members</label>
   <label><input type="checkbox" data-perm="deleteMessages" data-uid="${esc(u.uid)}" ${p.deleteMessages?'checked':''}> Delete messages</label>
   <label><input type="checkbox" data-perm="pinMessages" data-uid="${esc(u.uid)}" ${p.pinMessages?'checked':''}> Pin messages</label>
   <label><input type="checkbox" data-perm="sendMessages" data-uid="${esc(u.uid)}" ${p.sendMessages?'checked':''}> Send messages</label></div>`}).join('')}</div></details>`:'<p class="muted">No other members yet.</p>'}`:'<p class="muted">Only the room owner can change room settings.</p>'}
   <p class="muted">${isOwner?'You are the room owner.':'Only the room owner can change room settings.'}</p>
   <div class="modal-actions">${isOwner?'<button id="settings-delete" class="danger">Delete room</button>':''}<button id="settings-close">Close</button>${isOwner?'<button class="primary" id="settings-save">Save changes</button>':''}</div>
  </div></div>`;
  const close=()=>root().innerHTML='';document.getElementById('room-settings-close').onclick=close;document.getElementById('settings-close').onclick=close;
  if(!isOwner)return;
  document.getElementById('settings-room-pic').onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>2e6){alert('Use an image under 2 MB.');e.target.value='';return}const r=new FileReader();r.onload=()=>document.getElementById('settings-room-preview').innerHTML=avatarHTML({avatarData:r.result},document.getElementById('settings-room-name').value);r.readAsDataURL(f)};
  document.getElementById('settings-save').onclick=async()=>{let pic=room.avatarData||null;const f=document.getElementById('settings-room-pic').files[0];if(f)pic=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(f)});const name=document.getElementById('settings-room-name').value.trim()||code;const newPerms={...perms};document.querySelectorAll('#modal-root [data-perm]').forEach(i=>{const u=i.dataset.uid,p=i.dataset.perm;newPerms[u]??={};newPerms[u][p]=i.checked});await update(ref(db,`rooms/${code}/meta`),{name,avatarData:pic,permissions:newPerms});close();document.querySelector(`[data-room="${CSS.escape(code)}"] span`)?.replaceChildren(document.createTextNode(name));};
  document.getElementById('settings-delete').onclick=async()=>{if(!confirm(`Delete ${room.name||code}? This removes the room and all its messages. This cannot be undone.`))return;await remove(ref(db,`rooms/${code}`));for(const u of Object.values(members))if(u.uid)await remove(ref(db,`users/${u.uid}/joinedRooms/${code}`));close();document.querySelector(`[data-room="${CSS.escape(code)}"]`)?.closest('.room-row')?.remove();document.getElementById('content').innerHTML='<div class="welcome"><div class="big-logo">P2P</div><h2>Room deleted</h2><p>The room and its messages are gone.</p></div>';document.getElementById('view-title').textContent='Welcome';document.getElementById('view-sub').textContent='Private conversations and rooms';};
 });
}
function install(){document.querySelectorAll('#room-list [data-room-settings]').forEach(b=>{b.onclick=e=>{e.preventDefault();e.stopPropagation();openSettings(b.dataset.roomSettings)}})}
new MutationObserver(install).observe(document.getElementById('room-list')||document.body,{childList:true,subtree:true});setTimeout(install,100);
