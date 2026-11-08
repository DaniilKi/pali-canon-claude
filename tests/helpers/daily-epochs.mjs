// Frozen historical eligibility metadata; never re-authorizes a withheld translation.
import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import{parseDate,cyclePosition}from'../../src/daily.mjs';
export const epochs=JSON.parse(readFileSync(new URL('../fixtures/daily-sutta-epochs.json',import.meta.url),'utf8'));
export function historicalSutta(epoch,date='2026-11-01'){
 const e=epochs.epochs[epoch];if(!e)throw Error('Unknown test data epoch');
 const hash=createHash('sha256').update(JSON.stringify(epochs.baseline_entries)).digest('hex');if(hash!==epochs.baseline_entries_sha256)throw Error('Historical eligibility fixture changed');
 const valid=t=>Array.isArray(t)&&t.length===3&&typeof t[0]==='string'&&t[0].length>0&&t.slice(1).every(n=>Number.isSafeInteger(n)&&n>=0);
 if(!Array.isArray(e.add)||![...epochs.baseline_entries,...e.add].every(valid))throw Error('Invalid historical tuple');
 const entries=[...epochs.baseline_entries,...e.add].sort((a,b)=>a[1]-b[1]||a[2]-b[2]);
 if(new Set(entries.map(e=>e[0])).size!==entries.length||entries.length!==e.expected_count)throw Error('Invalid historical eligibility fixture');
 return{of:entries.length,id:entries[cyclePosition(parseDate(date).dayNumber,entries.length)][0]};
}
