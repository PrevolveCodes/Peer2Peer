import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,remove} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig={apiKey:'AIzaSyAucXMpqBhYbZy1fSbkTKHX23y9bpx1hec',authDomain:'p2pminimalchat.firebaseapp.com',databaseURL:'https://p2pminimalchat-default-rtdb.firebaseio.com',projectId:'p2pminimalchat',storageBucket:'p2pminimalchat.firebasestorage.app',messagingSenderId:'37869407438',appId:'1:37869407438:web:63485dde33bb8710f8d49f'};
const fixApp=initializeApp(firebaseConfig,'friendMessageActions');
const auth=getAuth(fixApp),db=getDatabase(fixApp);
let me=null,activeType=null,activeRoom=null,activeDM=null;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function trackNavigation(){
  document.addEventListener('click',e=>{
    const dm=e.target.closest('[data-dm]');
    if(dm){activeType='dm';activeDM=dm.dataset.dm;activeRoom=null;return;}
    const room=e.target.closest('[data-room]');
    if(room){activeType='room';activeRoom=room.dataset.room;activeDM=null;}
  },true);
}

function addFriendButtonFix(){
  const b=document.getElementById('new-dm');
  if(b)b.textContent='Add Friend';
}

function addRemoveButtons(){
  document.querySelectorAll('#dm-list [data-dm]').forEach(dm=>{
    if(dm.parentElement?.classList.contains('friend-row'))return;
    const uid=dm.dataset.dm;
    const wrap=document.createElement('div');
    wrap.className='friend-row';
    dm.parentNode.insertBefore(wrap,dm);
    wrap.appendChild(dm);
    const removeBtn=document.createElement('button');
    removeBtn.type='button';
    removeBtn.className='remove-friend-button';
    removeBtn.textContent='Remove';
    removeBtn.title='Remove friend';
    removeBtn.onclick=async e=>{
      e.preventDefault();e.stopPropagation();
      if(!confirm(`Remove ${dm.textContent.trim()} from your friends?`))return;
      try{
        await remove(ref(db,`users/${me.uid}/friends/${uid}`));
        await remove(ref(db,`users/${uid}/friends/${me.uid}`));
        if(activeType==='dm'&&activeDM===uid){
          activeType=null;activeDM=null;
          const title=document.getElementById('view-title'),sub=document.getElementById('view-sub'),content=document.getElementById('content');
          if(title)title.textContent='Welcome';
          if(sub)sub.textContent='Private conversations and rooms';
          if(content)content.innerHTML='<div class="welcome"><div class="big-logo">P2P</div><h2>Friend removed</h2><p>You removed this person from your friends.</p></div>';
        }
      }catch(err){alert(err?.message||'Could not remove friend.');}
    };
    wrap.appendChild(removeBtn);
  });
}

function addDeleteButtons(){
  document.querySelectorAll('#messages .message').forEach(msg=>{
    if(msg.querySelector('[data-fix-delete]'))return;
    const uid=msg.querySelector('[data-profile-uid]')?.dataset.profileUid;
    const id=msg.dataset.messageId;
    if(!uid||!id||!me||uid!==me.uid)return;
    const actions=msg.querySelector('.message-actions');
    if(!actions)return;
    const b=document.createElement('button');
    b.type='button';b.dataset.fixDelete='1';b.title='Delete message';b.textContent='🗑';
    b.onclick=async e=>{
      e.preventDefault();e.stopPropagation();
      if(!confirm('Delete this message?'))return;
      try{
        if(activeType==='dm'&&activeDM){
          const ids=[me.uid,activeDM].sort().join('_');
          await remove(ref(db,`dms/${ids}/messages/${id}`));
        }else if(activeType==='room'&&activeRoom){
          await remove(ref(db,`rooms/${activeRoom}/messages/${id}`));
        }else throw new Error('Open the conversation again and try deleting the message.');
      }catch(err){alert(err?.message||'Could not delete message.');}
    };
    actions.appendChild(b);
  });
}

function observe(){
  const observer=new MutationObserver(()=>{
    addFriendButtonFix();
    addRemoveButtons();
    addDeleteButtons();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  addFriendButtonFix();
}

onAuthStateChanged(auth,user=>{me=user;if(me){trackNavigation();observe();}});
