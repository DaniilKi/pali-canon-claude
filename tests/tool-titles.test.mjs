import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOL_TITLES } from '../src/server.mjs';
import { expectedToolNames } from '../scripts/expected-tools.mjs';

test('every tool has a human-readable title (connector directory requirement)', () => {
  assert.deepEqual(Object.keys(TOOL_TITLES).sort(), expectedToolNames());
  for (const [name, title] of Object.entries(TOOL_TITLES)) assert.ok(title.length >= 3 && title.length <= 40, name);
});
