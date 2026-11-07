import assert from 'node:assert/strict';
import { MAX_TEXT, MAX_REPORT_BYTES, MAX_TOOL_RESULT_BYTES } from '../../src/find-citations.mjs';

export function largeCitationInput() {
  const forms = ['MN 10', 'ja526', 'MN 999', 'AN ๓.๖๕', 'sn56.11:5.1', 'S i 57'];
  const ids = ['mn10', 'ja526', null, 'an3.65', 'sn56.11', 'sn2.22'];
  let text = 'Ānanda 🙏 '.normalize('NFD');
  const expected = [];
  for (let i = 0; i < 1003; i++) {
    const raw = forms[i % forms.length];
    expected.push({ text: raw, start: text.length, end: text.length + raw.length, id: ids[i % ids.length] });
    text += raw + '; ';
  }
  text += 'x'.repeat(MAX_TEXT - text.length);
  return { text, expected };
}

export async function auditCitationPagination(call, { previousCursor } = {}) {
  let maxReportBytes = 0, maxToolBytes = 0;
  const invoke = async args => {
    const r = await call(args);
    assert.ok(!r.isError, JSON.stringify(r.content));
    assert.deepEqual(JSON.parse(r.content[0].text), r.structuredContent);
    const reportBytes = Buffer.byteLength(JSON.stringify(r.structuredContent));
    const toolBytes = Buffer.byteLength(JSON.stringify(r));
    maxReportBytes = Math.max(maxReportBytes, reportBytes); maxToolBytes = Math.max(maxToolBytes, toolBytes);
    assert.ok(reportBytes <= MAX_REPORT_BYTES); assert.ok(toolBytes <= MAX_TOOL_RESULT_BYTES);
    return r.structuredContent;
  };
  const { text, expected } = largeCitationInput();
  if (previousCursor) {
    const resumed = await invoke({ text, cursor: previousCursor });
    assert.equal(resumed.offset, 37); assert.equal(resumed.citations[0].start, expected[37].start);
  }
  const rows = []; let cursor, first, pages = 0;
  do {
    const r = await invoke({ text, limit: pages ? 500 : 37, ...(cursor ? { cursor } : {}) });
    first ||= r;
    assert.equal(r.found, expected.length); assert.equal(r.offset, rows.length);
    assert.equal(r.resolved + r.unresolved + r.not_checked, r.returned);
    assert.equal(r.not_checked, 0); assert.ok(r.returned > 0 && r.returned <= r.limit);
    assert.deepEqual(r.source, first.source); assert.equal(r.scope, first.scope);
    rows.push(...r.citations); cursor = r.next_cursor; pages++;
    assert.ok(pages <= 5);
  } while (cursor);
  assert.equal(rows.length, expected.length);
  rows.forEach((c, i) => {
    assert.equal(c.text, expected[i].text); assert.equal(c.start, expected[i].start); assert.equal(c.end, expected[i].end);
    assert.equal(text.slice(c.start, c.end), c.text);
    assert.equal(c.status, expected[i].id ? 'resolved' : 'unresolved');
    assert.equal(c.text_id ?? null, expected[i].id);
    if (c.text === 'S i 57') assert.ok(c.also_on_that_page.length);
    if (c.text === 'sn56.11:5.1') assert.match(c.notes.join(' '), /segment/);
  });
  for (const args of [
    { text: text.slice(0, -1) + 'y', cursor: first.next_cursor },
    { text: text.normalize('NFC'), cursor: first.next_cursor },
    { text, cursor: first.next_cursor.split(':').map((v, i) => i === 2 ? '999999' : v).join(':') },
    { text, cursor: first.next_cursor.split(':').map((v, i) => i === 2 ? '38' : v).join(':') },
    ...['', 'v0:bad', null, 'x'.repeat(101)].map(cursor => ({ text, cursor })),
    ...[0, 501, 1.5, null].map(limit => ({ text, limit })),
  ]) assert.equal((await call(args)).isError, true, JSON.stringify(args).slice(0, 150));

  // Native-numeral candidates make the byte budget bind before the item-count limit.
  const dense = Array(180).fill('AN ' + '๑'.repeat(600)).join('; ');
  const denseFirst = await invoke({ text: dense });
  assert.ok(denseFirst.returned > 0 && denseFirst.returned < 180);
  assert.ok(denseFirst.next_cursor); let denseRows = denseFirst.returned, denseCursor = denseFirst.next_cursor;
  while (denseCursor) {
    const r = await invoke({ text: dense, cursor: denseCursor });
    assert.equal(r.offset, denseRows); assert.ok(r.returned > 0); denseRows += r.returned; denseCursor = r.next_cursor;
  }
  assert.equal(denseRows, 180);
  const huge = 'https://suttacentral.net/' + 'x'.repeat(3000);
  const limited = await invoke({ text: huge + '; MN 10' });
  assert.equal(limited.not_checked, 1); assert.equal(limited.resolved, 1); assert.equal(limited.unresolved, 0);
  assert.equal(limited.citations[0].status, 'not_checked');
  assert.equal(limited.citations[0].text, undefined); assert.equal(limited.citations[0].text_omitted, true);
  assert.equal(limited.citations[0].start, 0); assert.equal(limited.citations[0].end, huge.length);
  assert.equal(limited.citations[0].text_length, huge.length);
  assert.equal(limited.next_cursor, null);
  const empty = await invoke({ text: 'No references here.' });
  assert.equal(empty.found, 0); assert.equal(empty.returned, 0); assert.equal(empty.next_cursor, null);
  return { input_characters: text.length, citations: expected.length, pages, byte_bound: MAX_REPORT_BYTES, dense_citations: denseRows, dense_first_page_items: denseFirst.returned, max_report_bytes_observed: maxReportBytes, max_tool_bytes_observed: maxToolBytes, first_cursor: first.next_cursor };
}
