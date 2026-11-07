// One shared compute isolate for the hosted server; the HTTP loop keeps serving health and transport requests.
import {Worker} from 'node:worker_threads';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {HostedToolError} from './hosted-tool-error.mjs';
let here;try{here=__dirname;}catch{here=join(dirname(fileURLToPath(import.meta.url)),'..','server');}
const workerPath=()=>join(here,'http-worker.cjs');

export class HttpToolWorker {
 constructor({maxPending=32,timeoutMs=180000,workerFactory=()=>new Worker(workerPath())}={}) {
  this.maxPending=maxPending;this.timeoutMs=timeoutMs;this.workerFactory=workerFactory;this.pending=new Map();this.nextId=0;this.worker=null;this.failure=null;this.closed=false;this.cache=null;
 }
 status() {return {state:this.closed?'closed':this.failure?'failed':this.worker?'running':'idle',pending:this.pending.size,limit:this.maxPending};}
 fail() {
  this.failure=new HostedToolError('HOSTED_TOOL_UNAVAILABLE');
  for(const {reject,timer}of this.pending.values()){clearTimeout(timer);reject(this.failure);}this.pending.clear();
 }
 execute(name,args) {
  if(this.closed||this.failure)return Promise.reject(this.failure||new HostedToolError('HOSTED_TOOL_CLOSED'));
  if(this.pending.size>=this.maxPending)return Promise.reject(new HostedToolError('HOSTED_TOOL_BUSY'));
  if(!this.worker){
   try{this.worker=this.workerFactory();}catch{this.fail();return Promise.reject(this.failure);}
   this.worker.on('message',message=>{const job=this.pending.get(message.id);if(!job)return;clearTimeout(job.timer);this.pending.delete(message.id);if(message.cache)this.cache=message.cache;if(message.result)job.resolve(message.result);else job.reject(new HostedToolError('HOSTED_TOOL_EXECUTION_FAILED'));});
   this.worker.on('error',()=>this.fail());this.worker.on('exit',()=>{if(!this.closed)this.fail();});
  }
  const id=++this.nextId;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{this.fail();void this.worker.terminate().catch(()=>{});},this.timeoutMs);timer.unref();
   this.pending.set(id,{resolve,reject,timer});try{this.worker.postMessage({id,name,args});}catch{clearTimeout(timer);this.pending.delete(id);reject(new HostedToolError('HOSTED_TOOL_DISPATCH_FAILED'));}
  });
 }
 async close() {this.closed=true;for(const {reject,timer}of this.pending.values()){clearTimeout(timer);reject(new HostedToolError('HOSTED_TOOL_CLOSED'));}this.pending.clear();if(this.worker)await this.worker.terminate();}
}
