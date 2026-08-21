import {getDatabase,ref,push,set,get,update} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const db=getDatabase(),auth=getAuth();
const MOD_EMAIL='prevolveyt@gmail.com';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isMod=()=>auth.currentUser?.email?.toLowerCase()===MOD_EMAIL;

async function reportUser(uid,name){
 if(!auth.currentUser||uid===auth.currentUser.uid)return;
 const reason=prompt(`Why are you reporting ${name||'this user'}?`);if(!reason?.trim())return;
 await push(ref(db,'reports'),{type:'user',reportedUid:uid,reportedName:name||'User',reporterUid:auth.currentUser.uid,reporterEmail:auth.currentUser.email,reason:reason.trim(),time:Date.now(),status:'open'});
 alert('Report submitted.');
}
async function reportMessage(message){
 if(!auth.currentUser||!message)return;
 const reason=prompt('Why are you reporting this message?');if(!reason?.trim())return;
 await push(ref(db,'reports'),{type:'message',reportedUid:message.uid||'',reportedName:message.name||'User',message:message.text||'',reporterUid:auth.currentUser.uid,reporterEmail:auth.currentUser.email,reason:reason.trim(),time:Date.now(),status:'open'});
 alert('Report submitted.');
}
function board(){if(!isMod())return;const root=document.getElementById('modal-root');root.innerHTML=`<div class="modal-bg"><div class="modal moderation-board"><button class="x" id="mod-close">×</button><h2>Moderator Board</h2><div class="mod-tabs"><button data-tab="reports">Reports</button><button data-tab="users">Users</button></div><div id="mod-content">Loading...</div></div></div>`;root.querySelector('#mod-close').onclick=()=>root.innerHTML='';root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>loadTab(b.dataset.tab));loadTab('reports')}
async function loadTab(tab){const c=document.getElementById('mod-content');if(!c)return;if(tab==='users'){const s=await get(ref(db,'userDirectory'));const users=Object.values(s.val()||{});c.innerHTML=`<input id="mod-user-search" placeholder="Search users..."><div id="mod-users">${users.map(u=>`<div class="mod-row"><div><b>${esc(u.username||'User')}</b><small>${esc(u.status||'')}</small></div><button data-profile="${esc(u.uid)}">View profile</button></div>`).join('')||'<p class="muted">No users.</p>'}</div>`;const filter=()=>{const q=document.getElementById('mod-user-search').value.toLowerCase();document.querySelectorAll('#mod-users .mod-row').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q)?'flex':'none')};document.getElementById('mod-user-search').oninput=filter;return}
 const s=await get(ref(db,'reports')),reports=Object.entries(s.val()||{}).sort((a,b)=>(b[1].time||0)-(a[1].time||0));c.innerHTML=reports.length?reports.map(([id,r])=>`<div class="mod-report"><div><b>${r.type==='message'?'Message report':'User report'}</b><small>${new Date(r.time||Date.now()).toLocaleString()}</small></div><p><b>Reported:</b> ${esc(r.reportedName||r.reportedUid)}</p>${r.type==='message'?`<p><b>Message:</b> ${esc(r.message)}</p>`:''}<p><b>Reason:</b> ${esc(r.reason)}</p><p><b>Reporter:</b> ${esc(r.reporterEmail||r.reporterUid)}</p><div class="mod-actions"><button data-report-status="${esc(id)}" data-status="reviewed">Mark reviewed</button><button data-report-status="${esc(id)}" data-status="dismissed">Dismiss</button></div></div>`).join(''):'<p class="muted">No reports yet.</p>';c.querySelectorAll('[data-report-status]').forEach(b=>b.onclick=async()=>{await update(ref(db,`reports/${b.dataset.reportStatus}`),{status:b.dataset.status,reviewedBy:auth.currentUser.uid,reviewedAt:Date.now()});loadTab('reports')})}

window.P2PModeration={reportUser,reportMessage,open:board,isMod};
