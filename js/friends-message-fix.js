import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getDatabase,ref,get,remove} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig={apiKey:'AIzaSyAucXMpqBhYbZy1fSbkTKHX23y9bpx1hec',authDomain:'p2pminimalchat.firebaseapp.com',databaseURL:'https://p2pminimalchat-default-rtdb.firebaseio.com',projectId:'p2pminimalchat',storageBucket:'p2pminimalchat.firebasestorage.app',messagingSenderId:'37869407438',appId:'1:37869407438:web:63485dde33bb8710f8d49f',measurementId:'G-9JNKBE87C3'};
const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);
const auth=getAuth(app),db=getDatabase(app);
let me=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function currentConversation(){
  const title=$('view-title')?.textContent?.trim()||'';
  const friend=[...document.querySelectorAll('#dm-list [data-dm]')].find(b=>b.textContent.trim()===title);
  if(friend)return {type:'dm',id:friend.dataset.dm};
  const room=[...document.querySelectorAll('#room-list [data-room]')].find(b=>b.textContent.trim()===title);
  if(room)return {type:'room',id:room.dataset.room};
  return null;
}

async function removeFriend(uid,name){
  if(!me||!uid)return;
  if(!confirm(`Remove ${name||'this friend'}?`))return;
  await Promise.all([
    remove(ref(db,`users/${me.uid}/friends/${uid}`)),
    remove(ref(db,`users/${uid}/friends/${me.uid}`)),
    remove(ref(db,`friendRequestsSent/${me.uid}/${uid}`)),
    remove(ref(db,`friendRequestsSent/${uid}/${me.uid}`)),
    remove(ref(db,`friendRequests/${me.uid}/${uid}`)),
    remove(ref(db,`friendRequests/${uid}/${me.uid}`))
  ]);
}

function addFriendButtons(){
  document.querySelectorAll('#dm-list [data-dm]').forEach(b=>{
    if(b.parentElement?.querySelector('[data-remove-friend]'))return;
    const wrap=document.createElement('div');
    wrap.className='friend-row';
    b.parentNode.insertBefore(wrap,b);
    wrap.appendChild(b);
    const x=document.createElement('button');
    x.type='button';x.dataset.removeFriend=b.dataset.dm;x.className='remove-friend';x.title='Remove friend';x.textContent='×';
    x.onclick=e=>{e.preventDefault();e.stopPropagation();removeFriend(b.dataset.dm,b.textContent.trim())};
    wrap.appendChild(x);
  });
}

function addDeleteButtons(){
  document.querySelectorAll('#messages .message[data-message-id]').forEach(message=>{
    if(message.querySelector('[data-delete-message]'))return;
    const actions=message.querySelector('.message-actions');
    if(!actions)return;
    const b=document.createElement('button');
    b.type='button';b.dataset.deleteMessage=message.dataset.messageId;b.title='Delete message';b.textContent='🗑';
    b.onclick=()=>deleteMessage(message.dataset.messageId);
    actions.appendChild(b);
  });
}

async function deleteMessage(messageId){
  if(!me||!messageId)return;
  const c=currentConversation();
  if(!c)return alert('Could not determine the current conversation.');
  const path=c.type==='dm'?`dms/${[me.uid,c.id].sort().join('_')}/messages/${messageId}`:`rooms/${c.id}/messages/${messageId}`;
  const snap=await get(ref(db,path));
  if(!snap.exists())return;
  const msg=snap.val();
  if(msg.uid!==me.uid)return alert('You can only delete your own messages.');
  if(!confirm('Delete this message?'))return;
  await remove(ref(db,path));
}

const observer=new MutationObserver(()=>{addFriendButtons();addDeleteButtons()});
observer.observe(document.body,{childList:true,subtree:true});

auth.onAuthStateChanged(user=>{me=user;if(user){setTimeout(()=>{addFriendButtons();addDeleteButtons()},300)}});
