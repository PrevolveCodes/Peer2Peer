import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,get} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const auth=getAuth(),db=getDatabase();
const cache=new Map();

async function fixChannelAvatars(){
  const messages=document.getElementById('messages');
  if(!messages)return;
  const nodes=[...messages.querySelectorAll('.message')];
  await Promise.all(nodes.map(async node=>{
    const body=node.querySelector('.message-body');
    const avatar=node.querySelector('.message-avatar');
    if(!body||!avatar)return;
    const uid=node.dataset.uid;
    if(!uid)return;
    let url=cache.get(uid);
    if(url===undefined){
      try{
        const snap=await get(ref(db,`users/${uid}/profile`));
        const p=snap.val()||{};
        url=p.avatarData||p.avatar||null;
      }catch{url=null}
      cache.set(uid,url);
    }
    if(url){
      avatar.innerHTML=`<img src="${String(url).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" alt="">`;
    }
  }));
}

const observer=new MutationObserver(fixChannelAvatars);
observer.observe(document.body,{childList:true,subtree:true});
fixChannelAvatars();
