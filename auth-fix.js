import {getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,updateProfile,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {getDatabase,ref,set,update} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Replace the original auth button handler with a version that reports the
// actual Firebase error and does not let a database/profile failure make
// authentication appear to have failed.
const auth=getAuth();
const db=getDatabase();
const $=id=>document.getElementById(id);
let mode='signup';

function showError(message){
  const el=$('auth-error');
  if(el) el.textContent=message;
  console.error('[Peer2Peer auth]',message);
}

function friendlyError(e){
  switch(e?.code){
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'That email is already registered. Switch to Log in.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled in Firebase Authentication. Enable the Email/Password provider in Firebase Console.';
    case 'auth/network-request-failed':
      return 'Firebase could not be reached. Check your internet connection or try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a little while and try again.';
    default:
      return e?.message||String(e);
  }
}

function setMode(next){
  mode=next;
  $('auth-sub').textContent=mode==='signup'?'Create your account':'Welcome back';
  $('username').classList.toggle('hidden',mode==='login');
  $('auth-btn').textContent=mode==='signup'?'Create account':'Log in';
  $('auth-switch').textContent=mode==='signup'?'Already have an account? Log in':'Need an account? Create one';
  showError('');
}

$('auth-switch').onclick=()=>setMode(mode==='signup'?'login':'signup');

$('auth-btn').onclick=async()=>{
  const button=$('auth-btn');
  const email=$('email').value.trim();
  const password=$('password').value;
  const username=$('username').value.trim();
  showError('');
  if(!email||!password||(mode==='signup'&&!username)){
    showError('Fill in all required fields.');
    return;
  }
  button.disabled=true;
  button.textContent=mode==='signup'?'Creating account…':'Logging in…';
  try{
    if(mode==='login'){
      await signInWithEmailAndPassword(auth,email,password);
      // onAuthStateChanged in app.js handles entering the application.
      return;
    }

    const credential=await createUserWithEmailAndPassword(auth,email,password);
    await updateProfile(credential.user,{displayName:username});

    // Authentication succeeds independently of the database. If these
    // profile writes fail because of database rules, keep the user logged in
    // instead of reporting the whole signup as a failed authentication.
    try{
      const profile={username,status:'Online',pronouns:'',about:'',banner:'#5865f2',accent:'#5865f2'};
      await set(ref(db,`users/${credential.user.uid}/profile`),profile);
      await set(ref(db,`userDirectory/${credential.user.uid}`),{uid:credential.user.uid,username,status:'Online'});
    }catch(dbError){
      console.error('[Peer2Peer profile setup]',dbError);
    }
  }catch(e){
    showError(friendlyError(e));
  }finally{
    if($('auth')?.classList.contains('hidden')) return;
    button.disabled=false;
    button.textContent=mode==='signup'?'Create account':'Log in';
  }
};

// If Firebase restores a session on page load, clear stale auth errors.
onAuthStateChanged(auth,user=>{if(user)showError('')});
