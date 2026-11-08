/** Test-only process: synthetic translation bindings in memory; never edits source data or runs in the app. */
import {appendFileSync} from 'node:fs';
import * as canon from '../src/canon.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
import {createHttpServer} from '../src/http-server.mjs';
import {syntheticShared, sharedIds} from '../tests/helpers/shared-translation.mjs';
import {syntheticLink, syntheticText} from '../tests/helpers/partial-translation.mjs';
if(process.env.PALI_SCOPE_FIXTURES!=='1'||!process.env.PALI_SCOPE_LEDGER)throw Error('Explicit isolated test configuration required');
const text=Array(8).fill(syntheticText).join(' '),shared=syntheticShared(),partial=syntheticLink();
shared.shared_scope.text_sha256=scopeHash(text);partial.partial_scope.text_sha256=scopeHash(text);
const data=canon.load();data.translations={...data.translations};for(const id of sharedIds)delete data.translations[id];
data.translations[sharedIds[0]]=[shared];data.translations['patthana1.1']=[partial];
const urls=new Set([shared.url,partial.url]);
globalThis.fetch=async url=>{if(!urls.has(String(url)))throw Error('Unexpected network request in isolated scope fixture');appendFileSync(process.env.PALI_SCOPE_LEDGER,JSON.stringify({url:String(url)})+'\n');return new Response(`<html><head><title>Synthetic scope fixture</title></head><body><div id="sutta"><p>${text}</p></div><div class="footer">Synthetic test footer</div></body></html>`);};
const server=createHttpServer({rateLimitPerMinute:0});server.listen(Number(process.env.PORT),'127.0.0.1');
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
