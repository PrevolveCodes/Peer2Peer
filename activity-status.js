import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,onValue,update} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
const auth=getAuth(),db=getDatabase(),ONLINE_WINDOW=10*60*1000;
const online=last=>Number(last)>Date.now()-ONLINE_WINDOW;
const statusText=last=>online(last)?'Online':'Invisible';
const statusDot=last=>`<span class="activity-status-dot ${online(last)?'activity-online':'activity-invisible'}" title="${statusText(last)}"></span>`;
let directory={};
function refresh(){document.querySelectorAll('[data-activity-uid]').forEach(el=>{const u=directory[el.dataset.activityUid]||{};el.innerHTML=`${statusDot(u.lastMessageAt)}<span>${statusText(u.lastMessageAt)}</span>`});document.querySelectorAll('[data-activity-name]').forEach(el=>{const u=directory[el.dataset.activityName]||{};el.querySelector('.activity-status')?.replaceChildren(document.createTextNode(statusText(u.lastMessageAt)))})}
function decorate(){document.querySelectorAll('#dm-list [data-dm]').forEach(el=>{const uid=el.dataset.dm;if(!el.querySelector('.activity-status-inline'))el.insertAdjacentHTML('beforeend',`<span class="activity-status-inline">${statusDot(directory[uid]?.lastMessageAt)}</span>`)});refresh()}
let tracked=false;function trackOwnMessages(){if(tracked)return;tracked=true;const send=()=>{const user=auth.currentUser;if(user)update(ref(db,`userDirectory/${user.uid}`),{lastMessageAt:Date.now()}).catch(()=>{})};document.addEventListener('click',e=>{if(e.target.closest('#send'))send()},true);document.addEventListener('keydown',e=>{if(e.target?.id==='msg'&&e.key==='Enter'&&!e.shiftKey)send()},true)}
onValue(ref(db,'userDirectory'),s=>{directory=s.val()||{};decorate()});auth.onAuthStateChanged(user=>{if(user)trackOwnMessages()});setInterval(refresh,30000);
window.P2PActivityStatus={isOnline:online,statusText,statusDot,directory};
