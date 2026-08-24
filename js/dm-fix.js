import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get,push,onValue} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const auth=getAuth();
const db=getDatabase();
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const avatar=p=>p?.avatarData||p?.avatar||null;
const avatarHTML=(p,name='User')=>avatar(p)?`<img src="${esc(avatar(p))}" alt="">`:`<span class="avatar-fallback">${esc((name||'U').trim().charAt(0).toUpperCase()||'U')}</span>`;
let unsubscribe=null;

async function openDMDirect(uid,button){
  const me=auth.currentUser;
  if(!me||!uid||uid===me.uid)return;
  try{
    const userSnap=await get(ref(db,`users/${uid}/profile`));
    const directorySnap=await get(ref(db,`userDirectory/${uid}`));
    const user=userSnap.val()||{};
    const directory=directorySnap.val()||{};
    const name=user.username||directory.username||button?.textContent?.trim()||'User';
    const dmId=[me.uid,uid].sort().join('_');
    const path=`dms/${dmId}/messages`;
    const content=document.getElementById('content');
    const title=document.getElementById('view-title');
    const sub=document.getElementById('view-sub');
    const actions=document.getElementById('header-actions');
    if(!content||!title||!sub)return;

    if(unsubscribe){unsubscribe();unsubscribe=null;}
    title.textContent=name;
    sub.textContent='Private conversation';
    if(actions)actions.innerHTML='';
    content.innerHTML=`<div id="messages" class="messages"></div><div class="composer"><button type="button" id="composer-emoji" class="emoji-button" title="Emoji">☺</button><textarea id="msg" placeholder="Write a message..."></textarea><button id="send">Send</button></div>`;

    const messages=document.getElementById('messages');
    unsubscribe=onValue(ref(db,path),snap=>{
      const data=snap.val()||{};
      messages.innerHTML=Object.entries(data).sort((a,b)=>(a[1]?.time||0)-(b[1]?.time||0)).map(([id,v])=>`<div class="message" data-message-id="${esc(id)}"><button class="message-avatar" type="button">${avatarHTML(v,v?.name||'User')}</button><div class="message-body"><b>${esc(v?.name||'User')}</b><p>${esc(v?.text||'')}</p></div></div>`).join('');
      messages.scrollTop=messages.scrollHeight;
    });

    const send=async()=>{
      const input=document.getElementById('msg');
      const text=input?.value.trim();
      if(!text)return;
      const meProfile=(await get(ref(db,`users/${me.uid}/profile`))).val()||{};
      await push(ref(db,path),{uid:me.uid,name:meProfile.username||me.displayName||'User',avatar:meProfile.avatarData||meProfile.avatar||null,text,time:Date.now()});
      input.value='';
      input.focus();
    };
    document.getElementById('send').onclick=send;
    document.getElementById('msg').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
    const emoji=document.getElementById('composer-emoji');
    if(window.P2PEmoji?.picker)emoji.onclick=()=>window.P2PEmoji.picker(emoji,e=>{document.getElementById('msg').value+=e;document.getElementById('msg').focus();});
  }catch(e){console.error('[Peer2Peer DM]',e);alert(`Could not open this DM: ${e?.message||e}`);}
}

document.addEventListener('click',e=>{
  const button=e.target.closest('#dm-list [data-dm]');
  if(!button)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  openDMDirect(button.dataset.dm,button);
},true);
