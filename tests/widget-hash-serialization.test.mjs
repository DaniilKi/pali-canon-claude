import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {contentSha256} from '../web/content-sha256.mjs';
import {WIDGET_HTML,WIDGET_URI,SKYBRIDGE_URI} from '../src/chatgpt-widget.mjs';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
async function widgetBundle(freeze){
 const result=await build({
  stdin:{contents:'export {WIDGET_HTML,WIDGET_URI,SKYBRIDGE_URI} from "./src/chatgpt-widget.mjs";\nexport const text=1,constants=2,words=3;',resolveDir:root,sourcefile:'widget-serialization-regression.mjs',loader:'js'},
  bundle:true,platform:'node',target:'node20',format:'cjs',minify:false,write:false,logOverride:{'empty-import-meta':'silent'},
  ...(freeze?{define:{__PALI_WIDGET_HASH_SOURCE__:JSON.stringify(contentSha256.toString())}}:{}),
 });
 const module={exports:{}};
 runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require:createRequire(import.meta.url),__dirname:join(root,'server'),__filename:join(root,'server/http.cjs'),process,console,Buffer,URL,TextEncoder,TextDecoder,setTimeout,clearTimeout});
 return module.exports;
}

test('production build freezes the unchanged helper source for every Node bundle',()=>{
 const source=readFileSync(join(root,'scripts/build.mjs'),'utf8');
 assert.match(source,/import \{ contentSha256 \} from '\.\.\/web\/content-sha256\.mjs'/);
 const common=source.slice(source.indexOf('const common = {'),source.indexOf('// server/index.cjs:'));
 assert.match(common,/define: \{ __PALI_WIDGET_HASH_SOURCE__: JSON\.stringify\(contentSha256\.toString\(\)\) \}/);
 assert.equal((source.match(/await build\(\{\s*\.\.\.common,/g)||[]).length,3,'stdio, HTTP and hosted worker share the same pre-bundle literal');
});

test('exact widget HTML survives compiler formatting while the unfrozen negative control reproduces drift',async()=>{
 const original=contentSha256.toString();
 assert.ok(WIDGET_HTML.includes('var hash = '+original+';'),'source fallback embeds the unchanged helper exactly');
 const unfrozen=await widgetBundle(false);
 assert.notEqual(unfrozen.WIDGET_HTML,WIDGET_HTML,'the negative control exposes compiler-dependent function serialization');
 const frozen=await widgetBundle(true);
 assert.equal(frozen.WIDGET_HTML,WIDGET_HTML,'both registered widget resources must retain strict byte equality with the source');
 assert.equal(frozen.WIDGET_URI,WIDGET_URI);assert.equal(frozen.SKYBRIDGE_URI,SKYBRIDGE_URI);
 assert.equal(contentSha256.toString(),original,'bundling never rewrites the source helper');
});
