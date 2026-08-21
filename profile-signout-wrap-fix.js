import {getAuth,signOut} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
const auth=getAuth();
const addSignOut=()=>{const modal=document.querySelector('#modal-root .modal');if(!modal||modal.dataset.signoutReady)return;if(!modal.querySelector('h2')?.textContent.includes('Edit profile'))return;modal.dataset.signoutReady='1';const actions=modal.querySelector('.modal-actions');if(!actions)return;const b=document.createElement('button');b.type='button';b.className='danger';b.textContent='Sign out';b.addEventListener('click',async()=>{if(!confirm('Sign out of Peer2Peer?'))return;await signOut(auth)});actions.prepend(b)};
new MutationObserver(addSignOut).observe(document.body,{childList:true,subtree:true});
addSignOut();
