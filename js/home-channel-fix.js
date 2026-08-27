// Keep the group channel sidebar visible only while a group is selected.
const channelPanel=()=>document.getElementById('p2p-group-channel-panel');
const hideChannelPanel=()=>{const p=channelPanel();if(p)p.style.display='none'};
const showChannelPanel=()=>{const p=channelPanel();if(p)p.style.display='flex'};

hideChannelPanel();

document.addEventListener('click',e=>{
  if(e.target.closest('#p2p-home')){
    hideChannelPanel();
    return;
  }
  if(e.target.closest('#room-list [data-room]')){
    setTimeout(showChannelPanel,0);
  }
},true);

new MutationObserver(()=>{
  const p=channelPanel();
  if(p && document.getElementById('view-title')?.textContent?.trim()==='Welcome') hideChannelPanel();
}).observe(document.body,{childList:true,subtree:true});
