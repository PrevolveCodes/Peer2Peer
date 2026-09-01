// One authoritative message-grouping engine shared by DMs and group text channels.
const GROUP_GAP_MS=10*60*1000;
function senderOf(item,attr,avatarSelector){return item.getAttribute(attr)||item.querySelector(avatarSelector)?.dataset.profileUid||''}
function timeOf(item,attr){const raw=item.getAttribute(attr);if(raw){const n=Number(raw);if(Number.isFinite(n))return n}const small=item.querySelector('.message-body > small');if(!small)return null;const parsed=new Date(`1970-01-01 ${small.textContent.trim()}`);if(Number.isNaN(parsed.getTime()))return null;return parsed.getHours()*3600000+parsed.getMinutes()*60000+parsed.getSeconds()*1000}
function apply(container,{itemSelector='.message',senderAttribute='data-group-uid',timeAttribute='data-group-time',avatarSelector='.message-avatar',nameSelector='.message-body > b'}={}){
  if(!container)return;
  const items=[...container.querySelectorAll(`:scope > ${itemSelector}`)];
  let previousSender=null,previousTime=null;
  items.forEach((item,index)=>{
    item.classList.remove('message-grouped','message-group-start');
    const sender=senderOf(item,senderAttribute,avatarSelector),time=timeOf(item,timeAttribute);
    let gap=Infinity;if(time!==null&&previousTime!==null){gap=time-previousTime;if(gap<0)gap+=86400000}
    const grouped=index>0&&sender&&sender===previousSender&&gap<GROUP_GAP_MS;
    item.classList.add(grouped?'message-grouped':'message-group-start');
    item.querySelector(avatarSelector)?.classList.toggle('group-hidden',grouped);
    item.querySelector(nameSelector)?.classList.toggle('group-hidden',grouped);
    previousSender=sender;previousTime=time;
  });
}
window.P2PMessageGrouping={apply};
function watchDM(){const container=document.getElementById('messages');if(!container||container.dataset.groupingReady)return;container.dataset.groupingReady='1';const run=()=>apply(container);run();new MutationObserver(()=>requestAnimationFrame(run)).observe(container,{childList:true,subtree:true})}
new MutationObserver(watchDM).observe(document.body,{childList:true,subtree:true});watchDM();
const style=document.createElement('style');style.textContent=`.message.message-grouped{margin-top:0!important;padding-top:1px!important;padding-bottom:1px!important}.message.message-group-start{margin-top:10px!important}.message.message-grouped .message-avatar,.message.message-grouped .message-body>b{visibility:hidden}.message.message-grouped .message-body>b{display:none}.message .message-body>small{display:none!important}.workspace-message.grouped .workspace-message-avatar,.workspace-message.grouped .workspace-message-body>b{visibility:hidden}.workspace-message.grouped .workspace-message-body>b{display:none}`;document.head.appendChild(style);