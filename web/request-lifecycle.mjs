/** Bounded browser waiting. Abort is advisory to the transport; it is not server-job cancellation. */
export const REQUEST_TIMEOUT_MS = 180000;
function stopped(reason) {
 const error=new Error(reason==='deadline'?'The request timed out. Try again; no replacement passage was selected.':reason==='user'?'Stopped waiting in this browser. The server may still finish; no replacement passage was selected.':'This request was superseded by your new selection.');
 error.code=reason==='deadline'?'REQUEST_DEADLINE':reason==='user'?'REQUEST_STOPPED':'REQUEST_SUPERSEDED';return error;
}
export function createRequestPool({onChange=()=>{},timeoutMs=REQUEST_TIMEOUT_MS,setTimer=setTimeout,clearTimer=clearTimeout}={}) {
 const pending=new Map();let serial=0;
 const emit=()=>onChange([...pending.values()].map(x=>({id:x.id,group:x.group,label:x.label,stop:()=>x.cancel('user')})));
 return {
  get size(){return pending.size;},
  cancelAll(reason='navigation'){for(const x of [...pending.values()])x.cancel(reason);},
  cancelGroup(group,reason='superseded'){for(const x of [...pending.values()])if(x.group===group)x.cancel(reason);},
  async run(task,{group='page',label='Reading request'}={}) {
   const controller=new AbortController();let active=true,reason,rejectStop;
   const stop=new Promise((_,reject)=>{rejectStop=reject;});
   const entry={id:++serial,group,label,cancel(why){if(!active)return false;active=false;reason=why;rejectStop(stopped(why));controller.abort();pending.delete(entry.id);emit();return true;}};
   const timer=setTimer(()=>entry.cancel('deadline'),timeoutMs);pending.set(entry.id,entry);emit();
   try {return await Promise.race([Promise.resolve().then(()=>{if(!active)throw stopped(reason);return task(controller.signal);}),stop]);}
   finally {active=false;clearTimer(timer);if(pending.delete(entry.id))emit();}
  },
 };
}
