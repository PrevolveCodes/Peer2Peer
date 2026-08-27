import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const auth=getAuth(),db=getDatabase();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function style(){
  if(document.getElementById('p2p-channel-header-actions-style'))return;
  const s=document.createElement('style');s.id='p2p-channel-header-actions-style';
  s.textContent=`
  .p2p-channel-system-header{justify-content:space-between!important;min-width:0}
  .p2p-channel-system-header-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
  .p2p-channel-system-header-actions{display:flex;gap:4px;flex:none}
  .p2p-channel-system-header-actions button{width:32px;height:32px;border:0;border-radius:7px;background:transparent;color:var(--muted);cursor:pointer;font-size:17px;display:grid;place-items:center}
  .p2p-channel-system-header-actions button:hover{background:var(--panel2);color:var(--text)}
  `;document.head.appendChild(s);
}

async function findRoom(){
  const user=auth.currentUser;if(!user)return null;
  const title=document.querySelector('.p2p-channel-system-header-title')?.textContent?.trim()||document.querySelector('.p2p-channel-system-header')?.firstElementChild?.textContent?.trim();
  if(!title)return null;
  const joined=(await get(ref(db,`users/${user.uid}/joinedRooms`))).val()||{};
  for(const code of Object.keys(joined)){
    const snap=await get(ref(db,`rooms/${code}/meta`));const room=snap.val()||{};
    if((room.name||code)===title)return {code,room};
  }
  return null;
}

function openInvite(found){
  const root=document.getElementById('modal-root');if(!root)return;
  const {code,room}=found;
  root.innerHTML=`<div class="modal-bg"><div class="modal"><button class="x" id="p2p-cha-close">×</button><h2>Invite to ${esc(room.name||code)}</h2><p class="muted">Share this room code with someone so they can join the group.</p><div style="display:flex;gap:8px"><input id="p2p-cha-code" value="${esc(code)}" readonly><button id="p2p-cha-copy">Copy code</button></div><div class="modal-actions"><button id="p2p-cha-close2">Close</button></div></div></div>`;
  const close=()=>root.innerHTML='';document.getElementById('p2p-cha-close').onclick=close;document.getElementById('p2p-cha-close2').onclick=close;
  document.getElementById('p2p-cha-copy').onclick=async()=>{try{await navigator.clipboard.writeText(code);document.getElementById('p2p-cha-copy').textContent='Copied';setTimeout(()=>{const b=document.getElementById('p2p-cha-copy');if(b)b.textContent='Copy code'},1200)}catch{alert(`Room code: ${code}`)}};
}

async function inject(){
  const h=document.querySelector('.p2p-channel-system-header');if(!h||h.dataset.actionsReady==='1')return;
  h.dataset.actionsReady='1';
  const title=document.createElement('span');title.className='p2p-channel-system-header-title';title.textContent=h.firstElementChild?.textContent?.trim()||'Group';
  const actions=document.createElement('div');actions.className='p2p-channel-system-header-actions';
  const invite=document.createElement('button');invite.type='button';invite.title='Invite people';invite.setAttribute('aria-label','Invite people');invite.textContent='♧';
  const settings=document.createElement('button');settings.type='button';settings.title='Server settings';settings.setAttribute('aria-label','Server settings');settings.textContent='⚙';
  actions.append(invite,settings);h.innerHTML='';h.append(title,actions);
  invite.onclick=async()=>{const found=await findRoom();if(!found)return alert('Could not find this group.');if(found.room.owner!==auth.currentUser?.uid)return alert('Only the group owner can invite people.');openInvite(found)};
  settings.onclick=async()=>{const found=await findRoom();if(!found)return alert('Could not find this group.');const cog=document.querySelector(`#room-list [data-room-settings="${CSS.escape(found.code)}"]`);if(cog)cog.click();else alert('Group settings are unavailable.');};
}

style();
new MutationObserver(()=>setTimeout(inject,0)).observe(document.body,{childList:true,subtree:true});
setInterval(inject,500);
