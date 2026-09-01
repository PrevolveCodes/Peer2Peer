import {getApps,getApp} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get,onValue,push} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const app=getApps().length?getApp():null;
const auth=app?getAuth(app):null;
const db=app?getDatabase(app):null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatar=p=>p?.avatarData||p?.avatar||null;
const avatarHTML=(p,name='User')=>avatar(p)?`<img src="${esc(avatar(p))}" alt="">`:`<span class="avatar-fallback">${esc((name||'U').trim().charAt(0).toUpperCase()||'U')}</span>`;

let me=null,currentMode='friends',currentRoom=null,currentChannel=null,channelUnsub=null,messageUnsub=null;

function closeMobileNav(){const t=$('mobile-nav-toggle');if(t)t.checked=false}
function leaveVoice(){window.P2PVoiceRoom?.leave?.().catch?.(()=>{})}

function ensureShell(){
  const appRoot=$('app');
  if(!appRoot||$('p2p-nav-rail'))return;
  const rail=document.createElement('aside');rail.id='p2p-nav-rail';rail.className='p2p-nav-rail';
  rail.innerHTML=`<button id="shell-home" class="shell-home" type="button" title="Friends" aria-label="Friends"><img src="logo.png" alt="Peer2Peer"></button><div id="shell-groups" class="shell-groups"></div><button id="shell-create-group" class="shell-add" type="button" title="Create group" aria-label="Create group">+</button>`;
  const sidebar=appRoot.querySelector('.sidebar');
  appRoot.insertBefore(rail,sidebar||appRoot.firstChild);
  if(sidebar)sidebar.id='legacy-sidebar';
  const secondary=document.createElement('aside');secondary.id='p2p-secondary-nav';secondary.className='p2p-secondary-nav';
  secondary.innerHTML=`<div id="secondary-content"></div>`;
  appRoot.insertBefore(secondary,$('main'));
  $('shell-home').onclick=()=>showFriends();
  $('shell-create-group').onclick=()=>document.getElementById('new-group')?.click();
  renderSecondaryFriends();
}

function renderSecondaryFriends(){
  const box=$('secondary-content');if(!box)return;
  box.innerHTML=`<div class="secondary-header"><b>Friends</b><button id="secondary-add" type="button" title="Add friend" aria-label="Add friend">+</button></div><div class="secondary-tabs"><button class="secondary-tab active" data-secondary-filter="all">All</button><button class="secondary-tab" data-secondary-filter="online">Online</button><button class="secondary-tab" data-secondary-filter="pending">Pending</button></div><div class="secondary-section-label">DIRECT MESSAGES</div><div id="shell-dms" class="secondary-list"></div>`;
  $('secondary-add').onclick=()=>document.getElementById('new-dm')?.click();
  box.querySelectorAll('[data-secondary-filter]').forEach(b=>b.onclick=()=>{box.querySelectorAll('.secondary-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');window.P2PFriendsNav?.showHomeFilter?.(b.dataset.secondaryFilter)});
  renderDMs();
}

function renderDMs(){
  const source=$('dm-list'),target=$('shell-dms');if(!source||!target)return;
  const items=[...source.querySelectorAll('[data-dm]')];
  target.innerHTML=items.length?items.map(b=>`<button class="secondary-dm" data-shell-dm="${esc(b.dataset.dm)}">${avatarHTML({avatarData:b.dataset.avatar||null},b.textContent.trim())}<span>${esc(b.textContent.trim())}</span></button>`).join(''):'<div class="secondary-empty">No friends yet.</div>';
  target.querySelectorAll('[data-shell-dm]').forEach(b=>b.onclick=()=>{const real=source.querySelector(`[data-dm="${CSS.escape(b.dataset.shellDm)}"]`);real?.click();closeMobileNav();currentMode='dm';hideGroupSidebar()});
}

function renderGroups(){
  const source=$('room-list'),target=$('shell-groups');if(!source||!target)return;
  const items=[...source.querySelectorAll('[data-room]')];
  target.innerHTML=items.map(b=>{const row=b.closest('.room-row');const name=b.querySelector('span')?.textContent||b.textContent;return `<button class="shell-group" data-shell-room="${esc(b.dataset.room)}" title="${esc(name)}" aria-label="${esc(name)}">${esc(name.trim().charAt(0).toUpperCase()||'G')}</button>`}).join('');
  target.querySelectorAll('[data-shell-room]').forEach(b=>b.onclick=()=>{const real=source.querySelector(`[data-room="${CSS.escape(b.dataset.shellRoom)}"]`);real?.click();closeMobileNav()});
}

function hideLegacySidebar(){
  $('legacy-sidebar')?.setAttribute('aria-hidden','true');
}
function hideGroupSidebar(){
  $('group-sidebar')?.remove();
  channelUnsub?.();messageUnsub?.();channelUnsub=messageUnsub=null;
  currentRoom=null;currentChannel=null;
}

function renderGroupSidebar(code,room){
  let side=$('group-sidebar');
  if(!side){side=document.createElement('aside');side.id='group-sidebar';side.className='group-sidebar';$('p2p-secondary-nav').replaceWith(side)}
  side.innerHTML=`<div class="group-sidebar-head"><div class="group-sidebar-title"><b>${esc(room.name||code)}</b><small>Group</small></div><div class="group-sidebar-actions"><button id="group-invite" title="Invite" aria-label="Invite">+</button><button id="group-settings" title="Group settings" aria-label="Group settings">⚙</button></div></div><div id="group-channel-list" class="group-channel-list" data-room="${esc(code)}"><div class="secondary-empty">Loading channels…</div></div>`;
  $('group-invite').onclick=()=>{document.querySelector(`[data-room-settings="${CSS.escape(code)}"]`)?.click()};
  $('group-settings').onclick=()=>document.querySelector(`[data-room-settings="${CSS.escape(code)}"]`)?.click();
  loadChannels(code);
}

function channelIsVoice(ch){const t=String(ch?.type||'').toLowerCase();return t==='voice'||t==='vc'||t==='voice_channel'||ch?.voice===true||ch?.kind==='voice'}

async function loadChannels(code){
  channelUnsub?.();channelUnsub=onValue(ref(db,`rooms/${code}/channels`),snap=>renderChannels(code,snap.val()||{}));
  const snap=await get(ref(db,`rooms/${code}/channels`));renderChannels(code,snap.val()||{});
}
function renderChannels(code,channels){
  const list=$('group-channel-list');if(!list||list.dataset.room!==code)return;
  const entries=Object.entries(channels).sort((a,b)=>(a[1]?.createdAt||0)-(b[1]?.createdAt||0));
  const text=entries.filter(([,c])=>!channelIsVoice(c)),voice=entries.filter(([,c])=>channelIsVoice(c));
  const section=(title,rows,kind)=>rows.length?`<div class="channel-section"><div class="channel-section-title">${esc(title)}</div>${rows.map(([id,ch])=>`<button class="workspace-channel ${currentChannel===id?'active':''}" data-channel="${esc(id)}" data-channel-type="${kind}" type="button"><span class="channel-icon">${kind==='voice'?'🔊':'#'}</span><span>${esc(ch.name||id)}</span></button>`).join('')}</div>`:'';
  list.innerHTML=section('TEXT CHANNELS',text,'text')+section('VOICE CHANNELS',voice,'voice')||'<div class="secondary-empty">No channels yet.</div>';
  list.querySelectorAll('[data-channel]').forEach(b=>b.onclick=()=>selectChannel(code,b.dataset.channel,channels[b.dataset.channel]||{name:b.dataset.channel}));
  window.dispatchEvent(new CustomEvent('p2p:group-channels-rendered',{detail:{room:code,channels}}));
}

async function selectChannel(code,id,ch){
  if(currentRoom!==code)return;
  currentChannel=id;
  document.querySelectorAll('#group-channel-list [data-channel]').forEach(b=>b.classList.toggle('active',b.dataset.channel===id));
  if(channelIsVoice(ch)){
    messageUnsub?.();messageUnsub=null;
    leaveTextView();
    try{await window.P2PVoiceRoom?.join?.(code,id,ch.name||id)}catch(e){console.error('[Peer2Peer] voice join failed',e);showErrorState(e?.message||'Could not join voice channel.')}
    return;
  }
  await window.P2PVoiceRoom?.leave?.().catch?.(()=>{});
  renderTextChannel(code,id,ch);
}
function leaveTextView(){document.getElementById('content')?.querySelector('.workspace-text')?.remove()}
function showErrorState(message){const c=$('content');if(c)c.innerHTML=`<section class="workspace-state"><b>Unable to connect</b><p>${esc(message)}</p></section>`}

function renderTextChannel(code,id,ch){
  window.P2PVoiceRoom?.leave?.().catch?.(()=>{});
  const title=$('view-title'),sub=$('view-sub'),content=$('content');if(!content)return;
  title.textContent='# '+(ch.name||id);sub.textContent=currentRoom?.name||'Group';$('header-actions').innerHTML='';
  content.innerHTML=`<section class="workspace-text"><div id="workspace-messages" class="workspace-messages"></div><div class="workspace-composer"><button id="workspace-emoji" type="button" class="workspace-tool" title="Emoji" aria-label="Emoji">☺</button><textarea id="workspace-input" placeholder="Message #${esc(ch.name||id)}..."></textarea><button id="workspace-send" type="button">Send</button></div></section>`;
  const path=ref(db,`rooms/${code}/channels/${id}/messages`);messageUnsub?.();messageUnsub=onValue(path,snap=>{if(currentChannel!==id)return;renderWorkspaceMessages(snap.val()||{})});
  $('workspace-send').onclick=sendWorkspaceMessage;$('workspace-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendWorkspaceMessage()}};
  $('workspace-emoji').onclick=()=>window.P2PEmoji?.picker?.($('workspace-emoji'),e=>{$('workspace-input').value+=e;$('workspace-input').focus()});
}
function renderWorkspaceMessages(data){
  const box=$('workspace-messages');if(!box)return;
  const messages=Object.entries(data).sort((a,b)=>(a[1]?.time||0)-(b[1]?.time||0));
  box.innerHTML=messages.map(([id,v])=>`<article class="workspace-message" data-group-uid="${esc(v.uid||'')}" data-group-time="${esc(v.time||0)}"><div class="workspace-message-avatar">${avatarHTML(v,v.name)}</div><div class="workspace-message-body"><b>${esc(v.name||'User')}</b><small>${new Date(v.time||Date.now()).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</small><p>${esc(v.text||'')}</p></div></article>`).join('')||'<div class="workspace-empty">No messages yet.</div>';
  window.P2PMessageGrouping?.apply?.(box,{itemSelector:'.workspace-message',senderAttribute:'data-group-uid',timeAttribute:'data-group-time',avatarSelector:'.workspace-message-avatar',nameSelector:'.workspace-message-body > b'});
  box.scrollTop=box.scrollHeight;
}
async function sendWorkspaceMessage(){const input=$('workspace-input');if(!input||!currentRoom||!currentChannel)return;const text=input.value.trim();if(!text)return;const p=(await get(ref(db,`users/${me.uid}/profile`))).val()||{};await push(ref(db,`rooms/${currentRoom}/channels/${currentChannel}/messages`),{uid:me.uid,name:p.username||me.displayName||'User',avatar:p.avatarData||p.avatar||null,text,time:Date.now()});input.value='';input.focus()}

async function showFriends(){currentMode='friends';currentRoom=null;currentChannel=null;leaveVoice();hideGroupSidebar();renderSecondaryFriends();const home=$('p2p-home');home?.classList.add('active');closeMobileNav();}
async function enterGroup(code){
  const snap=await get(ref(db,`rooms/${code}/meta`));if(!snap.exists())return;
  leaveVoice();currentMode='group';currentRoom=code;currentChannel=null;document.getElementById('p2p-home')?.classList.remove('active');
  renderGroupSidebar(code,snap.val()||{});closeMobileNav();
  $('view-title').textContent=snap.val()?.name||code;$('view-sub').textContent='Group';$('header-actions').innerHTML='';
  $('content').innerHTML='<section class="workspace-state"><b>Select a channel</b><p>Choose a text or voice channel.</p></section>';
}

function openProfilePanel(uid){
  if(!uid||!db)return;
  get(ref(db,`users/${uid}/profile`)).then(s=>{const p=s.val()||{},name=p.username||'User';let panel=$('profile-panel');if(panel)panel.remove();panel=document.createElement('aside');panel.id='profile-panel';panel.className='profile-panel';panel.innerHTML=`<div class="profile-panel-head"><b>Profile</b><button id="profile-panel-close" type="button" aria-label="Close profile">×</button></div><div class="profile-panel-body">${avatarHTML(p,name)}<h2>${esc(name)}</h2>${p.status?`<p class="profile-panel-status">${esc(p.status)}</p>`:''}${p.pronouns?`<div class="profile-panel-field"><b>Pronouns</b><span>${esc(p.pronouns)}</span></div>`:''}${p.about?`<div class="profile-panel-field"><b>About</b><span>${esc(p.about)}</span></div>`:''}</div>`;document.querySelector('.app')?.appendChild(panel);$('profile-panel-close').onclick=()=>panel.remove()})
}

function bindShell(){
  ensureShell();hideLegacySidebar();
  const roomSource=$('room-list'),dmSource=$('dm-list');
  const observer=new MutationObserver(()=>{renderGroups();renderDMs()});
  if(roomSource)observer.observe(roomSource,{childList:true,subtree:true});
  if(dmSource)observer.observe(dmSource,{childList:true,subtree:true});
  renderGroups();renderDMs();
  window.addEventListener('click',e=>{
    const room=e.target.closest?.('#room-list [data-room]');if(room){setTimeout(()=>enterGroup(room.dataset.room),0);return}
    const home=e.target.closest?.('#p2p-home');if(home){setTimeout(showFriends,0);return}
    const profile=e.target.closest?.('[data-profile-uid]');if(profile){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openProfilePanel(profile.dataset.profileUid);return}
  },true);
}

onAuthStateChanged(auth,u=>{me=u;if(u)bindShell();else{hideGroupSidebar();$('p2p-nav-rail')?.remove();$('p2p-secondary-nav')?.remove()}});
window.P2PUIShell={showFriends,enterGroup,openProfilePanel};
