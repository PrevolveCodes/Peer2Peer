import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get,update} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const auth=getAuth(),db=getDatabase();
const STATUS={online:{label:'Online',icon:'●'},idle:{label:'Idle',icon:'◐'},dnd:{label:'Do Not Disturb',icon:'⛔'},offline:{label:'Invisible',icon:'○'}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusKey=p=>p?.presence||'online';
const statusHTML=(key,cls='')=>{const s=STATUS[key]||STATUS.online;return `<span class="p2p-status-dot p2p-status-${esc(key)} ${cls}" title="${esc(s.label)}">${s.icon}</span>`};

function addStatusToProfileModal(){
 const modal=document.querySelector('#modal-root .modal');
 if(!modal||modal.dataset.statusReady)return;
 const title=modal.querySelector('h2');
 if(!title||title.textContent.trim()!=='Edit profile')return;
 modal.dataset.statusReady='1';
 const label=document.createElement('label');
 label.innerHTML=`Status<select id="p2p-presence"><option value="online">Online</option><option value="idle">Idle</option><option value="dnd">Do Not Disturb</option><option value="offline">Invisible</option></select></label>`;
 const about=modal.querySelector('#pa')?.closest('label');
 (about||modal.querySelector('.modal-actions'))?.before(label);
 get(ref(db,`users/${auth.currentUser?.uid}/profile`)).then(s=>{const p=s.val()||{};const select=document.getElementById('p2p-presence');if(select)select.value=statusKey(p)});
 const save=modal.querySelector('#save');
 if(save&&!save.dataset.statusWrapped){
  save.dataset.statusWrapped='1';
  save.addEventListener('click',async()=>{const select=document.getElementById('p2p-presence');if(!select||!auth.currentUser)return;const key=select.value;await update(ref(db,`users/${auth.currentUser.uid}/profile`),{presence:key});await update(ref(db,`userDirectory/${auth.currentUser.uid}`),{presence:key});},true);
 }
}

function addStatusToUserProfile(){
 const card=document.querySelector('#modal-root .user-profile-card');
 if(!card||card.dataset.statusReady)return;
 const name=card.querySelector('h2');if(!name)return;
 card.dataset.statusReady='1';
 const uid=card.dataset.uid;
 if(!uid)return;
 get(ref(db,`users/${uid}/profile`)).then(s=>{
  const p=s.val()||{};
  const row=document.createElement('div');row.className='p2p-profile-status';row.innerHTML=`${statusHTML(statusKey(p),'p2p-status-profile')}<span>${esc((STATUS[statusKey(p)]||STATUS.online).label)}</span>`;
  name.before(row);
 });
}

const observer=new MutationObserver(()=>{addStatusToProfileModal();addStatusToUserProfile()});
observer.observe(document.body,{childList:true,subtree:true});
addStatusToProfileModal();
addStatusToUserProfile();
