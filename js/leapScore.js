/* Public-ledger game scoring. No keys, wallet connection, or persistent database. */
(function(global){
'use strict';
const ISSUER='rh7SidU91xGW2Za5RvoKiCgS2YB2psTBgq';
const DISTRIBUTOR='rnbmFoUKhnMZ8QCJ6kA5J2uwfP8rm9cUdU';
const CURRENCY='4C45415000000000000000000000000000000000';
const txOf=e=>e.tx||e.tx_json||{};
const valid=e=>e.validated===true&&e.meta?.TransactionResult==='tesSUCCESS';
const order=e=>[e.ledger_index??txOf(e).ledger_index,e.meta?.TransactionIndex??0];
const compare=(a,b)=>a[0]-b[0]||a[1]-b[1];
const leap=a=>a&&typeof a==='object'&&a.issuer===ISSUER&&(a.currency===CURRENCY||a.currency==='LEAP')&&Number(a.value)>0;
function checkFields(e,kind){return (e.meta?.AffectedNodes||[]).map(n=>n[kind]).find(n=>n?.LedgerEntryType==='Check');}
function receipts(records){
 const rows=[];
 for(const e of records){
  if(!valid(e))continue;const tx=txOf(e);let sender,destination,amount;
  if(tx.TransactionType==='Payment'){
   sender=tx.Account;destination=tx.Destination;
   amount=e.meta.delivered_amount??e.meta.DeliveredAmount;
   if(!amount&&!(Number(tx.Flags||0)&0x20000))amount=tx.Amount;
  }else if(tx.TransactionType==='CheckCash'){
   const node=checkFields(e,'DeletedNode');if(!node)continue;
   const f=node.FinalFields;sender=f?.Account;destination=f?.Destination;
   amount=e.meta.delivered_amount??e.meta.DeliveredAmount??tx.Amount;
  }else continue;
  if(leap(amount)&&sender&&destination)rows.push({sender,destination,amount:Number(amount.value),at:order(e),transactionType:tx.TransactionType,id:e.hash||tx.hash||order(e).join(':')});
 }
 return rows.sort((a,b)=>compare(a.at,b.at));
}
function score(records,start,latest,enabledAt,address){
 const first=new Map();
 for(const r of receipts(records))if(r.sender===address&&r.destination!==address&&r.destination!==ISSUER&&r.destination!==DISTRIBUTOR&&compare(r.at,start)>0&&!first.has(r.destination))first.set(r.destination,r);
 let points=0,cyclePoints=0;
 for(const [recipient,r] of first){
  points+=3;if(compare(r.at,latest)>0)cyclePoints+=3;
  const enabled=enabledAt.get(recipient);
  if(enabled){const at=compare(enabled,r.at)>0?enabled:r.at;points+=7;if(compare(at,latest)>0)cyclePoints+=7;}
 }
 return {points,cyclePoints};
}
async function load(request){
 const ledger=await request({command:'ledger',ledger_index:'validated'});
 const end=Number(ledger.ledger_index||ledger.ledger?.ledger_index);
 if(!Number.isFinite(end))throw Error('Cannot pin ledger');
 const cache=new Map();
 function history(account){
  if(!cache.has(account))cache.set(account,(async()=>{
   let marker,minimum,maximum;const records=[];
   for(let page=0;page<100;page++){
    const r=await request({command:'account_tx',account,ledger_index_min:-1,ledger_index_max:end,limit:200,binary:false,forward:true,...(marker===undefined?{}:{marker})});
    minimum=r.ledger_index_min;maximum=r.ledger_index_max;
    records.push(...(r.transactions||[]));marker=r.marker;
    if(marker===undefined){
     // The first funding transaction proves history reaches this account's creation.
     const creation=records.find(e=>valid(e)&&(e.meta?.AffectedNodes||[]).some(n=>n.CreatedNode?.LedgerEntryType==='AccountRoot'&&n.CreatedNode.NewFields?.Account===account));
     if(!creation||!Number.isFinite(minimum)||maximum<end)throw Error('Incomplete ledger history');
     return records;
    }
   }
   throw Error('History limit reached');
  })());
  return cache.get(account);
 }
 const issued=await history(DISTRIBUTOR);
 const allotments=receipts(issued).filter(r=>r.sender===DISTRIBUTOR&&[100,200].includes(r.amount));
 const players=new Map();
 for(const r of allotments){
  if(r.amount===100&&!players.has(r.destination))players.set(r.destination,{address:r.destination,start:r.at,latest:r.at,cycleId:r.id});
  else if(r.amount===200&&players.has(r.destination))Object.assign(players.get(r.destination),{latest:r.at,cycleId:r.id});
 }
 const rows=[];
 // Sequential cached lookups keep public RPC traffic bounded and IDs unambiguous.
 for(const player of players.values()){
  const records=await history(player.address);const enabledAt=new Map();
  const recipients=new Set(receipts(records).filter(r=>r.sender===player.address&&r.destination!==player.address&&r.destination!==ISSUER&&r.destination!==DISTRIBUTOR&&compare(r.at,player.start)>0).map(r=>r.destination));
  for(const recipient of recipients){
   const events=await history(recipient);
   const established=events.filter(e=>valid(e)&&txOf(e).TransactionType==='TrustSet'&&txOf(e).Account===recipient&&leap(txOf(e).LimitAmount)).sort((a,b)=>compare(order(a),order(b)))[0];
   if(established)enabledAt.set(recipient,order(established));
  }
  const lines=await request({command:'account_lines',account:player.address,peer:ISSUER,ledger_index:end});
  const line=(lines.lines||[]).find(l=>l.currency===CURRENCY||l.currency==='LEAP');
  const balance=line?Number(line.balance):0;
  if(!Number.isFinite(balance))throw Error('Invalid balance');
  const pending=issued.some(e=>{
   const tx=txOf(e);if(!valid(e)||tx.TransactionType!=='CheckCreate'||tx.Account!==DISTRIBUTOR||tx.Destination!==player.address||!leap(tx.SendMax)||Number(tx.SendMax.value)!==200||compare(order(e),player.latest)<=0)return false;
   const id=checkFields(e,'CreatedNode')?.LedgerIndex;
   return id&&!issued.some(c=>valid(c)&&['CheckCash','CheckCancel'].includes(txOf(c).TransactionType)&&txOf(c).CheckID===id);
  });
  rows.push({...player,balance,pending,...score(records,player.start,player.latest,enabledAt,player.address)});
 }
 return rows;
}
global.leapScore={load,score,receipts,compare};
})(window);
