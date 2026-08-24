import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get,update,set,remove,push,onValue} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
const auth=getAuth(),db=getDatabase();
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const avatar=p=>p?.avatarData||p?.avatar||null;
const avatarHTML=(p,n='R')=>avatar(p)?`<img src="${esc(avatar(p))}" alt="">`:`<span class="avatar-fallback">${esc((n||'R').trim().charAt(0).toUpperCase()||'R')}</span>`;
const root=()=>document.getElementById('modal-root');
async function openRoomSettings(code){
 const uid=auth.currentUser?.uid;if(!uid||!code)return;
 try{
  const snap=await get(ref(db,`rooms/${code}`));const data=snap.val()||{},room=data.meta||{},members=data.members||{};
  if(!room.owner){alert('This room has no owner.');return}
  if(room.owner!==uid){alert('Only the room owner can change room settings.');return}
  window.__p2pRoomSettingsCode=code;
  const perms=room.permissions||{};const others=Object.values(members).filter(m=>m?.uid&&m.uid!==room.owner);
  root().innerHTML=`<div class="modal-bg"><div class="modal"><button class="x" id="p2p-rs-x">×</button><h2>Room settings</h2><label>Room name<input id="p2p-rs-name" value="${esc(room.name||code)}" maxlength="50"></label><label>Room picture<input id="p2p-rs-pic" type="file" accept="image/*"></label><div id="p2p-rs-preview" class="group-setting-avatar">${avatarHTML(room,room.name)}</div><h3>Permissions</h3>${others.length?`<details class="permission-dropdown" open><summary>Manage member permissions (${others.length})</summary><div class="permission-list">${others.map(u=>{const p=perms[u.uid]||{};return `<div class="permission-user"><b>${esc(u.username||u.uid)}</b><label><input type="checkbox" data-p2p-perm="manageSettings" data-uid="${esc(u.uid)}" ${p.manageSettings?'checked':''}> Manage settings</label><label><input type="checkbox" data-p2p-perm="manageMembers" data-uid="${esc(u.uid)}" ${p.manageMembers?'checked':''}> Manage members</label><label><input type="checkbox" data-p2p-perm="invite" data-uid="${esc(u.uid)}" ${p.invite?'checked':''}> Invite members</label><label><input type="checkbox" data-p2p-perm="deleteMessages" data-uid="${esc(u.uid)}" ${p.deleteMessages?'checked':''}> Delete messages</label><label><input type="checkbox" data-p2p-perm="pinMessages" data-uid="${esc(u.uid)}" ${p.pinMessages?'checked':''}> Pin messages</label><label><input type="checkbox" data-p2p-perm="sendMessages" data-uid="${esc(u.uid)}" ${p.sendMessages?'checked':''}> Send messages</label></div>`}).join('')}</div></details>`:'<p class="muted">No other members yet.</p>'}<p class="muted">You are the room owner.</p><div class="modal-actions"><button id="p2p-rs-delete" class="danger">Delete room</button><button id="p2p-rs-close">Cancel</button><button class="primary" id="p2p-rs-save">Save changes</button></div></div></div>`;
  const close=()=>{root().innerHTML='';window.__p2pRoomSettingsCode=null};
  document.getElementById('p2p-rs-x').onclick=close;document.getElementById('p2p-rs-close').onclick=close;
  document.getElementById('p2p-rs-pic').onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>2e6){alert('Use an image under 2 MB.');e.target.value='';return}const r=new FileReader();r.onload=()=>document.getElementById('p2p-rs-preview').innerHTML=avatarHTML({avatarData:r.result},document.getElementById('p2p-rs-name').value);r.readAsDataURL(f)};
  document.getElementById('p2p-rs-save').onclick=async()=>{const btn=document.getElementById('p2p-rs-save');btn.disabled=true;try{let pic=room.avatarData||null;const f=document.getElementById('p2p-rs-pic').files[0];if(f)pic=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(f)});const name=document.getElementById('p2p-rs-name').value.trim()||code;const permissions={};document.querySelectorAll('#modal-root [data-p2p-perm]').forEach(i=>{const u=i.dataset.uid,p=i.dataset.p2pPerm;permissions[u]??={};permissions[u][p]=!!i.checked});await update(ref(db,`rooms/${code}/meta`),{name,avatarData:pic});await set(ref(db,`rooms/${code}/meta/permissions`),permissions);close();const row=document.querySelector(`[data-room="${CSS.escape(code)}"]`);row?.querySelector('span')?.replaceChildren(document.createTextNode(name));}catch(e){console.error(e);alert(`Could not save room settings: ${e?.message||e}`)}finally{if(document.getElementById('p2p-rs-save'))document.getElementById('p2p-rs-save').disabled=false}};
  document.getElementById('p2p-rs-delete').onclick=async()=>{if(!confirm(`Delete ${room.name||code}? This removes the room and all its messages. This cannot be undone.`))return;try{await remove(ref(db,`rooms/${code}`));for(const u of Object.values(members))if(u?.uid)await remove(ref(db,`users/${u.uid}/joinedRooms/${code}`));close();document.querySelector(`[data-room="${CSS.escape(code)}"]`)?.closest('.room-row')?.remove();document.getElementById('content').innerHTML='<div class="welcome"><div class="big-logo">P2P</div><h2>Room deleted</h2><p>The room and its messages are gone.</p></div>';document.getElementById('view-title').textContent='Welcome';document.getElementById('view-sub').textContent='Private conversations and rooms';}catch(e){console.error(e);alert(`Could not delete room: ${e?.message||e}`)}};
 }catch(e){console.error(e);alert(`Could not open room settings: ${e?.message||e}`)}
}
document.addEventListener('click',e=>{const b=e.target.closest('#room-list [data-room-settings]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openRoomSettings(b.dataset.roomSettings)},true);

// Navigation fallback: only takes over when the normal app click did not open a chat.
let fallbackUnsub=null;
async function fallbackOpenChat(kind,id,label){
 const uid=auth.currentUser?.uid;if(!uid||!id)return;
 if(fallbackUnsub){fallbackUnsub();fallbackUnsub=null}
 const isDM=kind==='dm';let title=label||'Chat';
 if(!isDM){const s=await get(ref(db,`rooms/${id}/meta`));const room=s.val()||{};title=room.name||id}
 const content=document.getElementById('content'),vt=document.getElementById('view-title'),vs=document.getElementById('view-sub');if(!content||!vt||!vs)return;
 vt.textContent=title;vs.textContent=isDM?'Private conversation':'Room';
 const path=isDM?`dms/${[uid,id].sort().join('_')}/messages`:`rooms/${id}/messages`;
 content.innerHTML=`<div id="messages" class="messages"></div><div class="composer"><textarea id="msg" placeholder="Write a message..."></textarea><button id="send">Send</button></div>`;
 const messages=document.getElementById('messages');
 fallbackUnsub=onValue(ref(db,path),s=>{const data=s.val()||{};messages.innerHTML=Object.entries(data).sort((a,b)=>(a[1]?.time||0)-(b[1]?.time||0)).map(([mid,v])=>`<div class="message"><button class="message-avatar" type="button">${avatarHTML(v,v?.name||'User')}</button><div class="message-body"><b>${esc(v?.name||'User')}</b><p>${esc(v?.text||'')}</p></div></div>`).join('');messages.scrollTop=messages.scrollHeight});
 const send=async()=>{const input=document.getElementById('msg'),text=input?.value.trim();if(!text)return;const ps=await get(ref(db,`users/${uid}/profile`)),p=ps.val()||{};await push(ref(db,path),{uid,name:p.username||auth.currentUser.displayName||'User',avatar:p.avatarData||p.avatar||null,text,time:Date.now()});input.value='';input.focus()};
 document.getElementById('send').onclick=send;document.getElementById('msg').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
}
document.addEventListener('click',e=>{
 const dm=e.target.closest('#dm-list [data-dm]');const room=e.target.closest('#room-list [data-room]');if(!dm&&!room||e.target.closest('[data-room-settings]'))return;
 const before=document.getElementById('messages');setTimeout(async()=>{if(document.getElementById('messages')!==before)return;if(dm)await fallbackOpenChat('dm',dm.dataset.dm,dm.textContent.trim());else if(room)await fallbackOpenChat('room',room.dataset.room,room.textContent.trim())},100);
},true);
