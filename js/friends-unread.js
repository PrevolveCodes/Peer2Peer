import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,onValue} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
const auth=getAuth(),db=getDatabase();
function badge(row,count){let b=row.querySelector('.unread-count');if(count<=0){b?.remove();row.classList.remove('has-unread');return}if(!b){b=document.createElement('span');b.className='unread-count';b.setAttribute('aria-label','Unread messages');row.appendChild(b)}b.textContent=count>99?'99+':String(count);row.classList.add('has-unread')}
function watch(uid){onValue(ref(db,`users/${uid}/readState/dm`),readSnap=>{const states=readSnap.val()||{};document.querySelectorAll('#friends-home-list .friend-home-row').forEach(row=>{const friend=row.dataset.uid;if(!friend)return;const last=states[friend]?.time||0;onValue(ref(db,`dms/${[uid,friend].sort().join('_')}/messages`),snap=>{let n=0;Object.values(snap.val()||{}).forEach(m=>{if((m.time||0)>last&&m.uid!==uid)n++});badge(row,n)},{onlyOnce:true})})})}
function scan(){if(!auth.currentUser)return;document.querySelectorAll('#friends-home-list .friend-home-row').forEach(row=>{if(row.dataset.unreadReady)return;row.dataset.unreadReady='1'});watch(auth.currentUser.uid)}
onAuthStateChanged(auth,u=>{if(!u)return;new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});scan()});
