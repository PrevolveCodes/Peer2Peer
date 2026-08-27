const loadingScreen=document.getElementById('p2p-loading-screen');
if(loadingScreen){
  const delay=2000+Math.floor(Math.random()*8001);
  window.setTimeout(()=>{
    loadingScreen.classList.add('hidden');
    window.setTimeout(()=>loadingScreen.remove(),400);
  },delay);
}