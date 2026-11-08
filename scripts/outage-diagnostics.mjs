// Log bounded tool errors without hiding the later mirrors in a short prefix.
// Network errors contain provider diagnostics, never fetched scripture bodies.
export function outageError(error, limit = 4096) {
  const text = typeof error === 'string' ? error : 'Source returned no error message.';
  const safe = text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ');
  return safe.length <= limit ? safe : safe.slice(0, limit) + ' [diagnostic truncated]';
}
