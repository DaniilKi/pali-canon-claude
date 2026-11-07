// Inspect MCP surfaces and follow only offline reader guidance. This does not run an LLM.
import assert from 'node:assert/strict';
import * as canon from '../../src/canon.mjs';
import { GUIDE as PRONUNCIATION } from '../../src/pronunciation.mjs';

export async function auditMcpContracts(client, call) {
  const counts = { prompts: 0, prompt_cases: 0, prompt_rejections: 0, resources: 0, resource_rejections: 0, guide_readings: 0, postcanonical_readings: 0 };
  const definitions = [
    ['study_passage', 'reference', ['Dhp 1', 'Vism 1.1', 'AN 1.82'], ['resolve_reference', 'get_text', 'get_post_canonical']],
    ['compare_translations', 'reference', ['Dhp 1', 'Vism 1.1', 'Pj 1'], ['resolve_reference', 'compare_translations', 'get_text', 'get_post_canonical']],
    ['topic_research', 'topic', ['mettā', '  emptiness  '], ['search_texts', 'lookup_pali', 'search_access_to_insight', 'get_text']],
    ['memorise_passage', 'reference', ['Dhp 1', 'Vism 1.1', 'AN 1.82'], ['resolve_reference', 'get_text', 'get_post_canonical', 'lookup_pali']],
  ];
  const prompts = (await client.listPrompts()).prompts;
  assert.deepEqual(prompts.map(p => p.name).sort(), definitions.map(d => d[0]).sort());
  const tools = new Set((await client.listTools()).tools.map(t => t.name));
  for (const [name, field, values, requiredTools] of definitions) {
    const descriptor = prompts.find(p => p.name === name);
    assert.deepEqual(descriptor.arguments.map(a => [a.name, a.required]), [[field, true]]);
    assert.ok(descriptor.description?.trim());
    for (const value of values) {
      const result = await client.getPrompt({ name, arguments: { [field]: value } });
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(message.role, 'user'); assert.equal(message.content.type, 'text');
      const text = message.content.text;
      assert.ok(text.includes(value.trim())); assert.doesNotMatch(text, /\{\{[^}]+\}\}|\$\{/);
      for (const tool of requiredTools) { assert.ok(tools.has(tool)); assert.ok(text.includes(tool), `${name}: missing ${tool} guidance`); }
      if (['study_passage', 'memorise_passage'].includes(name)) {
        assert.match(text, /canonical: false/); assert.match(text, /post-canonical label/);
        assert.match(text, /does not prove source abbreviation or omission/);
      }
      if (name === 'compare_translations') assert.match(text, /no comparison is available/);
      if (name === 'topic_research') assert.match(text, /separate canonical text, dictionary glosses/);
      if (name === 'memorise_passage') {
        assert.match(text, /never recite from memory/);
        assert.match(text, /MCP tools do not set reminders or store progress/);
      }
      counts.prompt_cases++;
    }
    for (const args of [{}, { [field]: '' }, { [field]: ' \n\t ' }, { [field]: 'x'.repeat(field === 'topic' ? 201 : 301) }]) {
      await assert.rejects(() => client.getPrompt({ name, arguments: args }), `${name}: invalid prompt arguments accepted`);
      counts.prompt_rejections++;
    }
    counts.prompts++;
  }
  await assert.rejects(() => client.getPrompt({ name: 'not_a_prompt', arguments: {} })); counts.prompt_rejections++;
  const expected = new Map([['pali://sources', 'application/json'], ['pali://canon-guide', 'text/plain'], ['pali://pronunciation', 'text/markdown']]);
  const resources = (await client.listResources()).resources;
  assert.deepEqual(resources.map(r => r.uri).sort(), [...expected.keys()].sort());
  const bodies = new Map();
  for (const item of resources) {
    assert.equal(item.mimeType, expected.get(item.uri)); assert.ok(item.description?.trim());
    const result = await client.readResource({ uri: item.uri });
    assert.equal(result.contents.length, 1);
    const content = result.contents[0]; assert.equal(content.uri, item.uri);
    assert.equal(content.mimeType, item.mimeType); assert.ok(content.text?.trim());
    bodies.set(item.uri, content.text); counts.resources++;
  }
  assert.deepEqual(JSON.parse(bodies.get('pali://sources')), await call('list_sources', {}));
  assert.equal(bodies.get('pali://pronunciation'), PRONUNCIATION);
  assert.match(bodies.get('pali://pronunciation'), /reference material, not scripture/);
  const guide = bodies.get('pali://canon-guide');
  assert.match(guide, /flag alone does not prove source abbreviation or omission/);
  assert.match(guide, /canonical: false.*get_post_canonical/);
  assert.match(guide, /not individual sutta or rule identities/);
  assert.match(guide, /SuttaCentral is linked only; do not fetch its content/);
  for (const reference of ['MN 10', 'SN 56.11', 'AN 3.65', 'M i 55', 'S v 420', 'Vin iii 1', 'Thai MN 1.103', 'Thai Dhp 15', 'VRI SN 1.20 (Nidānavaggo)', 'AN 1.296', 'Dhp 1', 'SN 46.143', 'AN 1.82']) {
    const metadata = await call('resolve_reference', { reference });
    const page = await call('get_text', { uid: metadata.id, limit: 1 });
    assert.equal(page.text_id, metadata.id); assert.deepEqual(page.source, canon.source());
    assert.deepEqual(page.segments, canon.segments(canon.resolve(metadata.id).unit).slice(0, 1));
    if (reference === 'AN 1.82') { assert.equal(metadata.approximate, true); assert.ok(metadata.alignment?.note); }
    counts.guide_readings++;
  }
  for (const reference of ['Vism 1.1', 'Abhidh-s 1']) {
    const metadata = await call('resolve_reference', { reference });
    assert.equal(metadata.canonical, false); assert.equal(metadata.read_with.tool, 'get_post_canonical');
    const { tool, ...args } = metadata.read_with;
    const page = await call(tool, { ...args, limit: 1 });
    assert.equal(page.canonical, false); assert.match(page.label, /not the canon/i);
    assert.ok(page.segments.length); assert.deepEqual(page.source, metadata.source);
    counts.postcanonical_readings++;
  }
  assert.equal((await call('resolve_reference', { reference: 'Pj 1' })).english.length, 0);
  await assert.rejects(() => client.readResource({ uri: 'pali://not-a-resource' })); counts.resource_rejections++;
  return counts;
}
