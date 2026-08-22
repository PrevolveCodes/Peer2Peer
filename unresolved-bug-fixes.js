import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get,set,remove,update,onValue} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const auth=getAuth(),db=getDatabase();
let me=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUid=u=>typeof u==='string'&&/^[A-Za-z0-9_-]{20,128}$/.test(u);
const validName=n=>typeof n==='string'&&n.trim().length>0&&n.trim().toLowerCase()!=='username'&&!/[<>]/.test(n);
const fallback=name=>`<span class="avatar-fallback">${esc((name||'User').trim().charAt(0).toUpperCase()||'U')}</span>`;

async function cleanRequests(){
 if(!me)return;
 const [reqSnap,friendsSnap]=await Promise.all([
  get(ref(db,`friendRequests/${me.uid}`)),
  get(ref(db,`users/${me.uid}/friends`))
 ]);
 const requests=reqSnap.val()||{},friends=friendsSnap.val()||{},updates={};
 for(const [uid,r] of Object.entries(requests)){
  const valid=validUid(uid)&&r&&r.toUid===me.uid&&r.status==='pending'&&validName(r.fromUsername);
  if(!valid||friends[uid]){
   updates[`friendRequests/${me.uid}/${uid}`]=null;
   updates[`friendRequestsSent/${uid}/${me.uid}`]=null;
  }
 }
 if(Object.keys(updates).length)await update(ref(db),updates);
}

function keepFriendStateFresh(){
 onValue(ref(db,`friendRequests/${me.uid}`),()=>cleanRequests().catch(console.error));
 onValue(ref(db,`users/${me.uid}/friends`),async s=>{
  const friends=s.val()||{};
  const sent=(await get(ref(db,`friendRequestsSent/${me.uid}`))).val()||{};
  const updates={};
  for(const uid of Object.keys(friends))if(sent[uid])updates[`friendRequestsSent/${me.uid}/${uid}`]=null;
  if(Object.keys(updates).length)await update(ref(db),updates);
  document.querySelectorAll('[data-dm]').forEach(b=>{
   const uid=b.dataset.dm;
   if(uid&&friends[uid])b.dataset.friend='1';
  });
 });
}

function repairDefaultAvatars(){
 const render=()=>{
  document.querySelectorAll('.message-avatar').forEach(b=>{
   if(b.querySelector('img')||b.querySelector('.avatar-fallback'))return;
   const name=b.closest('.message')?.querySelector('.message-body b')?.textContent||'User';
   b.innerHTML=fallback(name);
  });
  document.querySelectorAll('#dm-list [data-dm]').forEach(b=>{
   if(b.querySelector('.dm-avatar'))return;
   const img=b.querySelector('img');
   const name=b.textContent.trim()||'User';
   const a=document.createElement('span');a.className='dm-avatar';
   a.innerHTML=img?.src?`<img src="${esc(img.src)}" alt="">`:fallback(name);
   b.prepend(a);
  });
 };
 const observer=new MutationObserver(render);
 observer.observe(document.body,{childList:true,subtree:true});
 render();
}

function repairRoomPhotos(){
 const style=document.createElement('style');
 style.textContent=`.group-setting-avatar{display:flex;align-items:center;justify-content:center;min-height:72px;margin:8px 0}.group-setting-avatar img{display:block;width:72px;height:72px;object-fit:cover;border-radius:14px}.room-avatar-fix{display:inline-flex;align-items:center;justify-content:center;overflow:hidden}.room-avatar-fix img{display:block;max-width:100%;max-height:100%;object-fit:cover}.p2p-data-image{display:block;max-width:min(320px,65vw);max-height:240px;width:auto;height:auto;border-radius:10px;object-fit:contain}`;
 document.head.appendChild(style);
 const scan=()=>{
  document.querySelectorAll('.group-setting-avatar img').forEach(img=>{img.style.display='block';img.style.objectFit='cover'});
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];let n;while(n=walker.nextNode()){
   if(n.parentElement?.closest('script,style,textarea,input')||n.parentElement?.classList.contains('p2p-data-image'))continue;
   const t=n.nodeValue?.trim();
   if(t&&/^data:image\//i.test(t)&&t.length>100)nodes.push(n);
  }
  for(const node of nodes){const img=document.createElement('img');img.className='p2p-data-image';img.src=node.nodeValue.trim();img.alt='Room picture';node.parentNode.replaceChild(img,node)}
 };
 const observer=new MutationObserver(()=>scan());observer.observe(document.body,{childList:true,subtree:true});scan();
}

function preventMobileJump(){
 if(document.querySelector('#p2p-unresolved-mobile-fix'))return;
 const style=document.createElement('style');style.id='p2p-unresolved-mobile-fix';style.textContent=`html{-webkit-text-size-adjust:100%;text-size-adjust:100%;overscroll-behavior-x:none}body{overflow-x:hidden}input,textarea,select{font-size:16px!important}@media(max-width:700px){.main{min-width:0}.content{overflow-x:hidden}.composer{padding-bottom:calc(8px + env(safe-area-inset-bottom))}.message-image,.p2p-data-image{max-width:min(320px,65vw)!important;max-height:240px!important}button{touch-action:manipulation}}`;
 document.head.appendChild(style);
 document.addEventListener('focusin',e=>{if(!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;setTimeout(()=>{try{e.target.scrollIntoView({block:'nearest',inline:'nearest'})}catch{}} ,50)},true);
}

function interceptPermissionSave(){
 document.addEventListener('click',async e=>{
  const b=e.target.closest('#p2p-rs-save');
  if(!b||b.dataset.v2==='1')return;
  b.dataset.v2='1';
  const modal=document.getElementById('modal-root');
  const code=window.__p2pRoomSettingsCode;
  if(!code)return;
  e.preventDefault();e.stopImmediatePropagation();
  try{
   const roomSnap=await get(ref(db,`rooms/${code}/meta`));
   const room=roomSnap.val()||{};
   if(room.owner!==me?.uid)throw Error('Only the room owner can change permissions.');
   const permissions={...(room.permissions||{})};
   modal.querySelectorAll('[data-p2p-perm]').forEach(i=>{const uid=i.dataset.uid,p=i.dataset.p2pPerm;permissions[uid]??={};permissions[uid][p]=!!i.checked});
   await update(ref(db,`rooms/${code}/meta`),{permissions});
   const verify=(await get(ref(db,`rooms/${code}/meta/permissions`))).val()||{};
   for(const i of modal.querySelectorAll('[data-p2p-perm]'))if(!!verify?.[i.dataset.uid]?.[i.dataset.p2pPerm]!==!!i.checked)throw Error('Firebase rejected the permission change.');
   modal.innerHTML='';
  }catch(err){console.error(err);alert(`Could not save permissions: ${err?.message||err}`)}finally{b.dataset.v2=''}
 },true);
}

function watchRoomSettings(){
 const observer=new MutationObserver(()=>{
  const h=document.querySelector('#p2p-rs-save');
  if(h){
   const title=document.getElementById('view-title')?.textContent?.trim();
   const joined=me&&get(ref(db,`users/${me.uid}/joinedRooms`)).then(s=>s.val()||{}).then(async rooms=>{for(const code of Object.keys(rooms)){const r=(await get(ref(db,`rooms/${code}/meta`))).val()||{};if((r.name||code)===title){window.__p2pRoomSettingsCode=code;break}}});
  }
 });
 observer.observe(document.body,{childList:true,subtree:true});
}

onAuthStateChanged(auth,u=>{me=u;if(!u)return;cleanRequests().catch(console.error);keepFriendStateFresh();repairDefaultAvatars();repairRoomPhotos();preventMobileJump();interceptPermissionSave();watchRoomSettings()});
