import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get,update,remove} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const auth=getAuth(),db=getDatabase();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatar=p=>p?.avatarData||p?.avatar||null;
const avatarHTML=(p,n='R')=>avatar(p)?`<img src="${esc(avatar(p))}" alt="">`:`<span class="avatar-fallback">${esc((n||'R').trim().charAt(0).toUpperCase()||'R')}</span>`;
const root=()=>document.getElementById('modal-root');

async function openRoomSettings(code){
 const uid=auth.currentUser?.uid;
 if(!uid||!code)return;
 try{
  const snap=await get(ref(db,`rooms/${code}`));
  const data=snap.val()||{},room=data.meta||{},members=data.members||{};
  if(!room.owner){alert('This room has no owner.');return;}
  if(room.owner!==uid){alert('Only the room owner can change room settings.');return;}
  const perms=room.permissions||{};
  const others=Object.values(members).filter(m=>m?.uid&&m.uid!==room.owner);
  root().innerHTML=`<div class="modal-bg"><div class="modal">
   <button class="x" id="p2p-rs-x">×</button>
   <h2>Room settings</h2>
   <label>Room name<input id="p2p-rs-name" value="${esc(room.name||code)}" maxlength="50"></label>
   <label>Room picture<input id="p2p-rs-pic" type="file" accept="image/*"></label>
   <div id="p2p-rs-preview" class="group-setting-avatar">${avatarHTML(room,room.name)}</div>
   <h3>Permissions</h3>
   ${others.length?`<details class="permission-dropdown" open><summary>Manage member permissions (${others.length})</summary><div class="permission-list">${others.map(u=>{const p=perms[u.uid]||{};return `<div class="permission-user"><b>${esc(u.username||u.uid)}</b><label><input type="checkbox" data-p2p-perm="manageSettings" data-uid="${esc(u.uid)}" ${p.manageSettings?'checked':''}> Manage settings</label><label><input type="checkbox" data-p2p-perm="manageMembers" data-uid="${esc(u.uid)}" ${p.manageMembers?'checked':''}> Manage members</label><label><input type="checkbox" data-p2p-perm="invite" data-uid="${esc(u.uid)}" ${p.invite?'checked':''}> Invite members</label><label><input type="checkbox" data-p2p-perm="deleteMessages" data-uid="${esc(u.uid)}" ${p.deleteMessages?'checked':''}> Delete messages</label><label><input type="checkbox" data-p2p-perm="pinMessages" data-uid="${esc(u.uid)}" ${p.pinMessages?'checked':''}> Pin messages</label><label><input type="checkbox" data-p2p-perm="sendMessages" data-uid="${esc(u.uid)}" ${p.sendMessages?'checked':''}> Send messages</label></div>`}).join('')}</div></details>`:'<p class="muted">No other members yet.</p>'}
   <p class="muted">You are the room owner.</p>
   <div class="modal-actions"><button id="p2p-rs-delete" class="danger">Delete room</button><button id="p2p-rs-close">Cancel</button><button class="primary" id="p2p-rs-save">Save changes</button></div>
  </div></div>`;
  const close=()=>root().innerHTML='';
  document.getElementById('p2p-rs-x').onclick=close;
  document.getElementById('p2p-rs-close').onclick=close;
  document.getElementById('p2p-rs-pic').onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>2e6){alert('Use an image under 2 MB.');e.target.value='';return}const r=new FileReader();r.onload=()=>document.getElementById('p2p-rs-preview').innerHTML=avatarHTML({avatarData:r.result},document.getElementById('p2p-rs-name').value);r.readAsDataURL(f)};
  document.getElementById('p2p-rs-save').onclick=async()=>{const btn=document.getElementById('p2p-rs-save');btn.disabled=true;try{let pic=room.avatarData||null;const f=document.getElementById('p2p-rs-pic').files[0];if(f)pic=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(f)});const name=document.getElementById('p2p-rs-name').value.trim()||code;const newPerms={...perms};document.querySelectorAll('#modal-root [data-p2p-perm]').forEach(i=>{const u=i.dataset.uid,p=i.dataset.p2pPerm;newPerms[u]??={};newPerms[u][p]=i.checked});await update(ref(db,`rooms/${code}/meta`),{name,avatarData:pic,permissions:newPerms});close();const row=document.querySelector(`[data-room="${CSS.escape(code)}"]`);row?.querySelector('span')?.replaceChildren(document.createTextNode(name));}catch(e){console.error(e);alert(`Could not save room settings: ${e?.message||e}`)}finally{if(document.getElementById('p2p-rs-save'))document.getElementById('p2p-rs-save').disabled=false}};
  document.getElementById('p2p-rs-delete').onclick=async()=>{if(!confirm(`Delete ${room.name||code}? This removes the room and all its messages. This cannot be undone.`))return;try{await remove(ref(db,`rooms/${code}`));for(const u of Object.values(members))if(u?.uid)await remove(ref(db,`users/${u.uid}/joinedRooms/${code}`));close();document.querySelector(`[data-room="${CSS.escape(code)}"]`)?.closest('.room-row')?.remove();document.getElementById('content').innerHTML='<div class="welcome"><div class="big-logo">P2P</div><h2>Room deleted</h2><p>The room and its messages are gone.</p></div>';document.getElementById('view-title').textContent='Welcome';document.getElementById('view-sub').textContent='Private conversations and rooms';}catch(e){console.error(e);alert(`Could not delete room: ${e?.message||e}`)}};
 }catch(e){console.error(e);alert(`Could not open room settings: ${e?.message||e}`)}
}

document.addEventListener('click',e=>{const b=e.target.closest('#room-list [data-room-settings]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openRoomSettings(b.dataset.roomSettings)},true);
