function fixProfileVoiceClicks(){for(const id of ['p2p-profile-mic','p2p-profile-headphones']){const b=document.getElementById(id);if(!b||b.dataset.clickFix==='1')continue;b.dataset.clickFix='1';b.addEventListener('click',e=>{e.stopPropagation()},false)}}
new MutationObserver(fixProfileVoiceClicks).observe(document.body,{childList:true,subtree:true});fixProfileVoiceClicks();
