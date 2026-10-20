import { readPreference, writePreference } from '../shared/device-storage.js';
﻿// Only emitted hosted production builds register a worker. file:// and dev never register.
export async function initPwa() {
 if (!__HOSTED_PRODUCTION__ || !import.meta.env.PROD || !/^https?:$/.test(location.protocol) || !('serviceWorker' in navigator)) return;
 const ui=document.createElement('div'); ui.className='pwa-actions no-print';
 ui.setAttribute('role','region'); ui.setAttribute('aria-label','App status');
 const status=document.createElement('span'); status.id='pwa-status-message'; status.setAttribute('role','status');
 const toggle=document.createElement('button'); toggle.type='button'; toggle.className='btn btn-secondary pwa-status-toggle'; toggle.setAttribute('aria-controls',status.id);
 let minimized=readPreference('pwa-status-minimized',false)===true;
 const renderStatus=()=>{
  status.hidden=minimized; ui.dataset.minimized=String(minimized);
  toggle.textContent=minimized?'Offline status':'Minimize';
  toggle.setAttribute('aria-label',minimized?'Show offline status':'Minimize offline status');
  toggle.setAttribute('aria-expanded',String(!minimized));
 };
 const setStatus=(message,attention=false)=>{status.textContent=message;if(attention)minimized=false;renderStatus();};
 toggle.onclick=()=>{minimized=!minimized;writePreference('pwa-status-minimized',minimized);renderStatus();};
 ui.append(status,toggle); document.body.append(ui); renderStatus();
 // Detail can scroll its actions clear of this fixed status region at any size.
 const statusSize = new ResizeObserver(() => {
  document.documentElement.style.setProperty('--pwa-status-clearance', Math.ceil(ui.getBoundingClientRect().height + 12) + 'px');
 });
 statusSize.observe(ui);
 let registration;
 const channel='BroadcastChannel' in window ? new BroadcastChannel('bodhana-update:'+__APP_BASE__) : null;
 const clientId=crypto.randomUUID();
 let consent=false, reloaded=false, hadController=!!navigator.serviceWorker.controller;
 const pending=new Map();
 const vote=()=>window.confirm('Update Bodhana? Current unsaved work in this tab will reset. Every open Bodhana tab must approve.');
 if(channel) channel.onmessage=event=>{
  const m=event.data;
  if(m.type==='request') { const accepted=vote(); consent=accepted; channel.postMessage({type:'vote',id:m.id,client:clientId,accepted}); }
  if(m.type==='vote') pending.get(m.id)?.(m);
 };
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  const firstControl=!hadController; hadController=true;
  if(!registration?.waiting) ui.querySelector('[data-update]')?.remove();
  if(consent && !reloaded) { reloaded=true; location.reload(); }
  else setStatus(firstControl ? 'Offline files ready.' : 'An update is active. Save your work, then reload when ready.',!firstControl);
 });
 try {
  registration=await navigator.serviceWorker.register(__APP_BASE__+'sw.js',{scope:__APP_BASE__,updateViaCache:'none'});
  const offer=()=>{
   if(!registration.active || !registration.waiting || ui.querySelector('[data-update]')) return;
   const button=document.createElement('button');button.className='btn btn-secondary';button.dataset.update='';button.textContent='Update available';ui.append(button);
   button.onclick=async()=>{
    if(!vote()) return;
    consent=true;
    // Worker enumerates controlled AND uncontrolled same-scope clients via MessageChannel.
    const worker=registration.waiting;
    const clients=await new Promise(resolve=>{const pipe=new MessageChannel();pipe.port1.onmessage=e=>resolve(e.data);worker.postMessage({type:'CLIENTS'},[pipe.port2]);});
    if(clients.length>1) {
     if(!channel) {setStatus('Close other Bodhana tabs before updating.',true);consent=false;return;}
     const id=crypto.randomUUID();const votes=new Set();let rejected=false;
     const approved=await new Promise(resolve=>{
      pending.set(id,m=>{if(!m.accepted) {rejected=true;resolve(false);} else {votes.add(m.client);if(votes.size>=clients.length-1)resolve(true);}});
      channel.postMessage({type:'request',id,client:crypto.randomUUID()});
      setTimeout(()=>resolve(!rejected && votes.size>=clients.length-1),15000);
     });pending.delete(id);
     if(!approved) {setStatus('Update deferred. All open tabs must approve; close unresponsive tabs and retry.',true);consent=false;return;}
    }
    worker.postMessage({type:'ACTIVATE_APPROVED'});
   };
  };
  offer(); registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed') {offer();if(!registration.waiting)setStatus('Offline files ready.');} if(worker.state==='redundant')setStatus('Offline update failed; the previous release remains available.',true);});});
  navigator.serviceWorker.ready.then(async readyRegistration=>{
   registration=readyRegistration;
   const worker=navigator.serviceWorker.controller || registration.active;
   const complete=await new Promise(resolve=>{
    const pipe=new MessageChannel();
    const timer=setTimeout(()=>resolve(false),5000);
    pipe.port1.onmessage=event=>{clearTimeout(timer);resolve(event.data.complete);pipe.port1.close();};
    worker.postMessage({type:'CHECK_OFFLINE'},[pipe.port2]);
   });
   if(complete) setStatus('Offline files ready. Dictionary lookup and external links need internet; speech depends on device voices.');
   else {
    setStatus('Offline files are missing. Reconnect and repair before using Bodhana offline.',true);
    const repair=document.createElement('button');repair.className='btn btn-secondary';repair.textContent='Repair offline files';ui.append(repair);
    repair.onclick=async()=>{
     if(!navigator.onLine) {setStatus('Reconnect to repair offline files.',true);return;}
     if(!window.confirm('Repair offline files and reload this tab? Current unsaved work in this tab will reset. Other tabs keep their work.')) return;
     await registration.unregister(); location.reload();
    };
   }
   worker.postMessage({type:'PRUNE'});
  });
  window.addEventListener('focus',()=>registration.update().catch(()=>{}));
 } catch {setStatus('Offline setup unavailable. You can continue using Bodhana online.',true);}
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault(); const button=document.createElement('button');button.className='btn btn-secondary';button.textContent='Install Bodhana';ui.append(button);
  button.onclick=async()=>{await event.prompt();button.remove();};
 });
}
