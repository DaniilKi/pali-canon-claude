import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {contentSha256} from '../web/content-sha256.mjs';

test('editorial integrity SHA-256 matches FIPS vectors and UTF-8 boundaries in both function copies', () => {
  const embedded = runInNewContext('(' + contentSha256.toString() + ')', {TextEncoder});
  for (const [text, expected] of [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
    ['abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu', 'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1'],
  ]) for (const digest of [contentSha256, embedded]) assert.equal(digest(text), expected);
  const values = [55,56,63,64,65,119,120,127,128,10000].map(n => 'a'.repeat(n));
  values.push('Pāli āṇḍ 😀 𐀀', '\ud800', '\udfff', 'a\ud800z\udfff', '😀'.repeat(63), 'a'.repeat(100000));
  let seed=0x12345678;
  for (let i=0; i<64; i++) {
    let value='';
    for (let j=0; j<i*13; j++) {seed=(Math.imul(seed,1664525)+1013904223)>>>0; value+=String.fromCharCode(seed>>>16);}
    values.push(value);
  }
  for (const value of values) {
    const expected=createHash('sha256').update(value).digest('hex');
    assert.equal(contentSha256(value),expected); assert.equal(embedded(value),expected);
  }
});

test('editorial integrity hash refuses unsupported or unbounded input synchronously', () => {
  for (const value of [null,{},[],1,undefined,'a'.repeat(100001)]) assert.throws(() => contentSha256(value),/integrity/);
  const unsupported=runInNewContext('(' + contentSha256.toString() + ')', {TextEncoder:undefined});
  assert.throws(()=>unsupported('bounded'),/integrity/);
});
