// One authoritative message-grouping engine shared by DMs and group text channels.
const GROUP_GAP_MS=10*60*1000;
function apply(container,{itemSelector='.message',senderAttribute='data-group-uid',timeAttribute='data-group-time',avatarSelector='.message-avatar',nameSelector='.message-body > b'}={}){
  if(!container)return;
  const items=[...container.querySelectorAll(`:scope > ${itemSelector}`)];
  let previousSender=null,previousTime=null;
  items.forEach((item,index)=>{
    item.classList.remove('message-grouped','message-group-start');
    const sender=item.getAttribute(senderAttribute)||'';
    const time=Number(item.getAttribute(timeAttribute));
    const gap=Number.isFinite(time)&&Number.isFinite(previousTime)?Math.max(0,time-previousTime):Infinity;
    const grouped=index>0&&sender&&sender===previousSender&&gap<GROUP_GAP_MS;
    item.classList.add(grouped?'message-grouped':'message-group-start');
    item.querySelector(avatarSelector)?.classList.toggle('group-hidden',grouped);
    item.querySelector(nameSelector)?.classList.toggle('group-hidden',grouped);
    previousSender=sender;previousTime=Number.isFinite(time)?time:null;
  });
}
window.P2PMessageGrouping={apply};
function watchDM(){const container=document.getElementById('messages');if(!container||container.dataset.groupingReady)return;container.dataset.groupingReady='1';const run=()=>apply(container,{itemSelector:'.message',senderAttribute:'data-group-uid',timeAttribute:'data-group-time',avatarSelector:'.message-avatar',nameSelector:'.message-body > b'});run();new MutationObserver(()=>requestAnimationFrame(run)).observe(container,{childList:true,subtree:true})}
new MutationObserver(watchDM).observe(document.body,{childList:true,subtree:true});watchDM();
const style=document.createElement('style');style.textContent=`.message.message-grouped{margin-top:0!important;padding-top:1px!important;padding-bottom:1px!important}.message.message-group-start{margin-top:10px!important}.message.message-grouped .message-avatar,.message.message-grouped .message-body>b{visibility:hidden}.message.message-grouped .message-body>b{display:none}.message .message-body>small{display:none!important}.workspace-message.grouped .workspace-message-avatar,.workspace-message.grouped .workspace-message-body>b{visibility:hidden}.workspace-message.grouped .workspace-message-body>b{display:none}`;document.head.appendChild(style);