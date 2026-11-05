/* Leaderboard admission, optional payment setup, scores and re-up requests. */
(function(){

'use strict';
const ISSUER = 'rh7SidU91xGW2Za5RvoKiCgS2YB2psTBgq';
const CURRENCY = '4C45415000000000000000000000000000000000';
const DISTRIBUTOR = 'rnbmFoUKhnMZ8QCJ6kA5J2uwfP8rm9cUdU';
const SERVERS = ['wss://s1.ripple.com/', 'wss://s2.ripple.com/'];
const results = document.getElementById('results');
const progressCard=document.getElementById('progress-card');
const progressCount=document.getElementById('progress-count');
const progressMessage=document.getElementById('progress-message');
const requestMore=document.getElementById('request-more');
const meter=document.getElementById('points-meter');
const sortPoints=document.getElementById('sort-points');
const sortLeap=document.getElementById('sort-leap');
let sortBy='balance', playerRows=[], currentPlayer=null;

function requestKey(player){return 'leap.distributionRequest:'+player.address+':'+player.cycleId;}
function requestSent(player){try{return sessionStorage.getItem(requestKey(player))==='sent';}catch{return false;}}
function updateProgress(){
  const participantAddress=admittedAddress;
 currentPlayer=playerRows.find(p=>p.address===participantAddress)||null;
 if(!participantAddress)return;
 if(!currentPlayer){requestMore.disabled=true;progressCount.textContent='Points unavailable';progressMessage.textContent='Your starting LEAP is confirmed. Your score could not be found in this snapshot; please reload to try again.';return;}
 const p=currentPlayer;meter.value=Math.min(100,p.cyclePoints);progressCount.textContent=p.cyclePoints+' / 100 points';
 const pending=p.pending||requestSent(p);
 requestMore.disabled=pending||p.cyclePoints<100;requestMore.textContent=pending?'Request pending':'Request 200 more LEAP';
 progressMessage.textContent=pending?'Your meter resets when you receive your next distribution.':p.cyclePoints>=100?'You qualify to request 200 more LEAP.':'100 new points since your last distribution.';
}
function sortLeaderboard(by){
 sortBy=by;sortPoints.setAttribute('aria-pressed',String(by==='points'));sortLeap.setAttribute('aria-pressed',String(by==='balance'));render(playerRows);
}
sortPoints.addEventListener('click',()=>sortLeaderboard('points'));
sortLeap.addEventListener('click',()=>sortLeaderboard('balance'));
requestMore.addEventListener('click',async()=>{
 const ticket=generation;const p=currentPlayer;if(!admittedAddress||!p||p.cyclePoints<100||p.pending||requestSent(p)||requestMore.disabled)return;
 requestMore.disabled=true;progressMessage.textContent='Sending your request…';
 const body=new FormData();body.set('xrpl_address',p.address);body.set('request_type',"Sailing Frog's LEAP — Request 200 more LEAP");body.set('cycle_id',p.cycleId);body.set('cycle_points',String(p.cyclePoints));body.set('lifetime_points',String(p.points));
 try{
  const response=await fetch('https://usebasin.com/f/93034286b67b',{method:'POST',body,headers:{'Accept':'application/json'}});
  if(!response.ok)throw Error('Submission failed');
  p.pending=true;try{sessionStorage.setItem(requestKey(p),'sent');}catch{}
  if(ticket===generation)updateProgress();
 }catch{if(ticket===generation){progressMessage.textContent='Could not confirm delivery. Please try again.';requestMore.disabled=false;}}
});
const infoDialog = document.getElementById('wallet-info');
const format = new Intl.NumberFormat('en-US', {maximumFractionDigits:6});
let rpcId=0;
const sockets=new Set();
function rpc(ws, payload, timeout=18000){
  return new Promise((resolve,reject)=>{
    const id=++rpcId;
    const cleanup=()=>{clearTimeout(timer);ws.removeEventListener('message',onMessage);ws.removeEventListener('close',onClose);ws.removeEventListener('error',onClose);};
    const onClose=()=>{cleanup();reject(new Error('Connection closed'));};
    const timer=setTimeout(()=>{cleanup();reject(new Error('XRPL request timed out'));},timeout);
    function onMessage(event){
      let msg;try{msg=JSON.parse(event.data);}catch{return;}
      if(msg.id!==id)return;
      cleanup();
      if(msg.status==='error'||msg.result?.error)reject(new Error('XRPL request failed'));
      else resolve(msg.result||msg);
    }
    ws.addEventListener('message',onMessage);ws.addEventListener('close',onClose);ws.addEventListener('error',onClose);
    try{ws.send(JSON.stringify({...payload,id}));}catch(error){cleanup();reject(error);}
  });
}
function connect(url){return new Promise((resolve,reject)=>{
  const ws=new WebSocket(url);sockets.add(ws);
  const cleanup=()=>{clearTimeout(timer);ws.removeEventListener('open',onOpen);ws.removeEventListener('error',onError);ws.removeEventListener('close',onError);};
  const onOpen=()=>{cleanup();resolve(ws);};
  const onError=()=>{cleanup();sockets.delete(ws);ws.close();reject(new Error('Cannot connect to XRPL'));};
  const timer=setTimeout(onError,12000);
  ws.addEventListener('open',onOpen);ws.addEventListener('error',onError);ws.addEventListener('close',onError);
});}
function showStatus(message){results.replaceChildren();const el=document.createElement('div');el.className='status';el.textContent=message;results.append(el)}
function render(holders){
  const participantAddress=admittedAddress;
  results.replaceChildren();
  if(!holders.length){showStatus('No onboarded players found.');return}
  holders=[...holders].sort((a,b)=>b[sortBy]-a[sortBy]||a.address.localeCompare(b.address));
  const ownIndex=participantAddress ? holders.findIndex(item=>item.address===participantAddress) : -1;
  function addRow(item,index,isYou){
    const row=document.createElement('div');row.className='holder';
    if(isYou){row.classList.add('is-you');row.dataset.currentParticipant='true'}
    const rank=document.createElement('span');rank.className='rank';rank.textContent=String(index+1);
    const walletCell=document.createElement('span');walletCell.className='wallet-cell';
    const addr=document.createElement('span');addr.className='address';
    addr.textContent=isYou?'Me':item.address.slice(0,6)+'…'+item.address.slice(-6);
    walletCell.append(addr);
    if(!isYou){
      const info=document.createElement('button');info.type='button';info.className='info-button';info.textContent='i';
      info.setAttribute('aria-label','Why are wallet addresses abbreviated?');
      info.addEventListener('click',()=>infoDialog.showModal());walletCell.append(info);
    }
    const bal=document.createElement('span');bal.className='balance';bal.textContent=format.format(item.balance);
    const points=document.createElement('span');points.className='points';points.textContent=String(item.points);
    row.append(rank,walletCell,points,bal);results.append(row);
  }
  holders.slice(0,10).forEach((item,i)=>addRow(item,i,i===ownIndex));
  if(ownIndex>=10){
    const divider=document.createElement('div');divider.className='personal-divider';divider.textContent='My standing';
    results.append(divider);
    addRow(holders[ownIndex],ownIndex,true);
  }
}

async function load(ticket){
  showStatus('Connecting to the XRP Ledger…');
  for(const server of SERVERS){let ws;
    if(ticket!==generation||!admittedAddress)return;
    try{
      ws=await connect(server);
      if(ticket!==generation)return;
      showStatus('Reading player points and LEAP balances…');
      const rows=await window.leapScore.load(payload=>{
        if(ticket!==generation)throw new Error('Lookup cancelled');
        return rpc(ws,payload);
      });
      if(ticket!==generation)return;
      playerRows=rows;render(playerRows);sortPoints.disabled=false;sortLeap.disabled=false;updateProgress();return;
    }catch(error){/* Try the next ledger server. */}
    finally{if(ws){sockets.delete(ws);ws.close();}}
  }
  if(ticket!==generation)return;
  showStatus('Unable to verify complete player history. Please reload the page.');
  progressCount.textContent='Points unavailable';progressMessage.textContent='Complete ledger history is needed to verify eligibility.';requestMore.disabled=true;
}

const gate=document.getElementById('admission-gate');
const gateMessage=document.getElementById('admission-message');
const gateRetry=document.getElementById('admission-retry');
const playerContent=document.getElementById('player-content');
let generation=0, admissionController=null, admittedAddress=null;
function closeAdmission(){
  generation++;admissionController?.abort();admissionController=null;admittedAddress=null;
  for(const ws of sockets)ws.close();sockets.clear();
  playerContent.hidden=true;gate.hidden=false;gateRetry.hidden=true;
  playerRows=[];currentPlayer=null;results.replaceChildren();
  requestMore.disabled=true;sortPoints.disabled=true;sortLeap.disabled=true;
  progressCount.textContent='Checking points…';progressMessage.textContent='100 new points since your last distribution.';
  requestMore.textContent='Request 200 more LEAP';meter.value=0;
}
async function verifyAdmission(){
  closeAdmission();const ticket=generation;
  let address;
  try{address=window.leap.participantHelpers.getParticipant()?.address;}
  catch{gateMessage.textContent='This browser cannot remember your address. Allow session storage, then return to the home page.';return;}
  if(!address){gateMessage.textContent='Enter your XRPL address on the home page. Receive your starting 100 LEAP to enter the Player’s Leaderboard.';return;}
  gateMessage.textContent='Checking your starting 100 LEAP on the XRP Ledger…';
  admissionController=new AbortController();
  let status;
  try{status=await window.leapOnboarding.checkAddress(address,{signal:admissionController.signal});}
  catch{status={state:'unknown'};}
  if(ticket!==generation)return;
  if(status?.state==='player'&&status.address===address){
    admittedAddress=address;
    // The player approves this optional TrustSet in Xaman. No transaction is submitted here.
    const tx={TransactionType:'TrustSet',Account:address,Flags:131072,LimitAmount:{currency:CURRENCY,issuer:ISSUER,value:'1000000'}};
    const hex=Array.from(new TextEncoder().encode(JSON.stringify(tx)),b=>b.toString(16).padStart(2,'0')).join('');
    document.getElementById('enable-leap').href='https://xaman.app/detect/'+hex;
    gate.hidden=true;playerContent.hidden=false;progressCard.hidden=false;
    await load(ticket);return;
  }
  gateRetry.hidden=false;
  switch(status?.state){
    case 'check_pending':gateMessage.textContent='Your 100 LEAP Check is ready. Cash it in Xaman, then select Check again to enter the Player’s Leaderboard.';break;
    case 'new':gateMessage.textContent='Receive your starting 100 LEAP to enter. Return to the home page to request it or check your request status.';break;
    case 'invalid':gateMessage.textContent='Please return to the home page and enter a valid XRPL address.';gateRetry.hidden=true;break;
    case 'unactivated':gateMessage.textContent='Activate your account in your wallet, then check again.';break;
    default:gateMessage.textContent='Unable to verify this account. Please try again. If this keeps happening and you’re new to the game using an older account, try a newer XRPL account that you control.';
  }
}
gateRetry.addEventListener('click',verifyAdmission);
window.addEventListener('pagehide',()=>{closeAdmission();gateMessage.textContent='Checking player access…';});
window.addEventListener('pageshow',event=>{if(event.persisted)verifyAdmission();});
verifyAdmission();

})();
