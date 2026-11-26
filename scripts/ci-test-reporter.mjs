// Node20 public TestsStream events, plus the unchanged built-in TAP rendering.
import {tap} from 'node:test/reporters';
import {readFileSync} from 'node:fs';
import {eventCollector,writeExclusive,digest} from './ci-test-partitions.mjs';
export default async function* reporter(source){const path=process.env.PALI_CI_TEST_CONTEXT;if(!path)throw Error('Explicit CI test context required');const {root,context,events_file}=JSON.parse(readFileSync(path,'utf8'));const collector=eventCollector(root,context);let complete=false;async function* observed(){for await(const event of source){collector.accept(event);yield event;}complete=true;}try{yield* tap(observed());if(!complete)throw Error('Incomplete test event stream');writeExclusive(events_file,collector.seal());}catch(error){writeExclusive(events_file,{schema:'complete-ci-test-events-v1',context,context_sha256:digest(JSON.stringify(context)),complete:false,error_category:error.name});throw error;}}
