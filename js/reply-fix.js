// Safe reply-button handler.
// This runs in the capture phase so the older reply handler in app.js cannot
// throw or interfere with the click. Replies are inserted as a quoted message
// in the composer, matching the existing reply behavior.
document.addEventListener('click',e=>{
  const button=e.target.closest?.('[data-action="reply"]');
  if(!button)return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const id=button.dataset.id;
  const message=document.querySelector(`[data-message-id="${CSS.escape(id||'')}"]`);
  if(!message)return;

  const name=message.querySelector('.message-body b')?.textContent?.trim()||'User';
  const text=message.querySelector('.message-body p')?.textContent||'';
  const input=document.getElementById('msg');
  if(!input)return;

  const quote=`> ${name}: ${text}`;
  input.value=input.value.trim()?`${input.value}\n${quote}\n`:`${quote}\n`;
  input.focus();
  input.setSelectionRange(input.value.length,input.value.length);
},true);
