import { isCanonicalReopenRoute } from '../src/locator-policy.mjs';
/** MCP failures can contain plain SDK validation text rather than JSON. */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function readingToolResult(result) {
  if (!object(result)) throw Error('The text service returned an incomplete response.');
  const text = result.content?.find(item => item.type === 'text')?.text;
  let data = result.structuredContent;
  if (data === undefined) {
    try { data = JSON.parse(text || '{}'); }
    catch {
      if (result.isError && typeof text === 'string' && text.trim()) throw Error(text);
      throw Error('The text service returned an unreadable response. No passage was substituted. Try again or open its source from the Library.');
    }
  }
  if (result.isError || data?.error) {
    const error = Error(typeof data?.error === 'string' && data.error ? data.error : 'This selection could not be retrieved.');
    if (data?.code === 'READING_SOURCE_CHANGED') error.code = data.code;
    if (['READING_SOURCE_CHANGED', 'READING_LOCATOR_AMBIGUOUS'].includes(data?.code) && isCanonicalReopenRoute(data?.reopen)) {
      error.code = data.code; error.reopen = data.reopen;
    }
    throw error;
  }
  return data;
}
