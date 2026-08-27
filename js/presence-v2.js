import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,set,onDisconnect,onValue,update} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
const auth=getAuth(),db=getDatabase();
const IDLE=10*60*1000;
let timer=null,onlineRef=null;
const selectable=new Set(['online','idle','dnd','invisible']);
async function publish(uid,presence){
 const r=ref(db,`users/${uid}/profile`),d=ref(db,`userDirectory/${uid}`);
 await update(r,{presence,status:presence==='dnd'?'Do Not Disturb':presence==='invisible'?'Invisible':presence==='idle'?'Idle':'Online',lastSeen:Date.now()});
 await update(d,{presence,status:presence==='dnd'?'Do Not Disturb':presence==='invisible'?'Invisible':presence==='idle'?'Idle':'Online',lastSeen:Date.now()});
}
function activity(){if(!auth.currentUser)return;clearTimeout(timer);getCurrentChoice(auth.currentUser.uid).then(p=>{if(p==='dnd'||p==='invisible')return;publish(auth.currentUser.uid,'online');timer=setTimeout(()=>publish(auth.currentUser.uid,'idle'),IDLE)})}
async function getCurrentChoice(uid){return new Promise(resolve=>{let done=false;const u=onValue(ref(db,`users/${uid}/profile/presence`),s=>{if(!done){done=true;u();resolve(s.val()||'online')}})})}
async function setup(user){onlineRef=ref(db,`users/${user.uid}/presenceConnection`);await set(onlineRef,true);await onDisconnect(onlineRef).remove();const profile=ref(db,`users/${user.uid}/profile`);onValue(profile,s=>{const p=s.val()||{};const choice=p.presence||'online';if(choice==='dnd'||choice==='invisible')return;activity()});['mousemove','keydown','mousedown','click','scroll','touchstart'].forEach(e=>window.addEventListener(e,activity,{passive:true}));activity()}
onAuthStateChanged(auth,user=>{if(user)setup(user)});
