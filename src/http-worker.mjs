import {parentPort} from 'node:worker_threads';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from './server.mjs';
import {liveCache} from './cache.mjs';

// Use the public MCP transport contract, including normal schema validation and error/source envelopes.
async function start() {
 const server=createServer(),client=new Client({name:'pali-hosted-tools',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
 await server.connect(a);await client.connect(b);
 parentPort.on('message',async({id,name,args})=>{
  try{const result=await client.callTool({name,arguments:args},undefined,{timeout:180000});parentPort.postMessage({id,result,cache:liveCache.stats()});}
  catch{parentPort.postMessage({id,error:true,cache:liveCache.stats()});}
 });
}
start().catch(()=>{process.exitCode=1;parentPort.close();});
