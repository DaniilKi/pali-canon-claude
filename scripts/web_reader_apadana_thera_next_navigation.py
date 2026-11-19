"""Destination-specific AP chapter navigation and a test-only event-delivery probe."""
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect


GATE = r"""(() => {
  const state = window.__theraNextNavigationTiming = {armed: false, held: null, released: false};
  window.addEventListener('hashchange', event => {
    if (!state.armed) return;
    const hash = new URL(event.newURL).hash;
    if (!hash.startsWith('#read?') || new URLSearchParams(hash.slice(6)).get('uid') !== 'tha-ap42') return;
    state.armed = false;
    state.held = {oldURL: event.oldURL, newURL: event.newURL};
    event.stopImmediatePropagation();
  }, true);
})();"""


def install_navigation_timing_probe(context):
    context.add_init_script(GATE)


def destination_response(response, uid):
    request = response.request
    if request.method != 'POST' or not request.url.endswith('/mcp'):
        return False
    command = (request.post_data_json or {}).get('params', {})
    return command.get('name') == 'get_text' and command.get('arguments', {}).get('uid') == uid


def open_chapter_summary(page, link, delayed_event=False):
    """Await the requested MCP response and its fresh DOM, never the prior passage."""
    old_reference = None
    if delayed_event:
        page.evaluate('() => {const s=window.__theraNextNavigationTiming; s.armed=true; s.held=null; s.released=false;}')
    with page.expect_response(lambda response: destination_response(response, 'tha-ap42')) as received:
        link.focus()
        page.keyboard.press('Enter')
        if delayed_event:
            page.wait_for_function('() => Boolean(window.__theraNextNavigationTiming.held)')
            # The old readiness pair is satisfied by source33 while the native
            # hashchange is queued. This deterministically exposes the CI race.
            page.locator('.passage').first.wait_for()
            page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
            old_reference = page.locator('.segment-label a').first.inner_text()
            assert old_reference == 'tha-ap33/1'
            page.evaluate("""() => {
              const s=window.__theraNextNavigationTiming, event=s.held;
              s.held=null; s.released=true;
              window.dispatchEvent(new HashChangeEvent('hashchange', event));
            }""")
    response = received.value
    assert response.ok, 'Destination MCP request failed'
    result = response.json()['result']
    assert not result.get('isError') and result['structuredContent']['text_id'] == 'tha-ap42'
    page.wait_for_function("() => location.hash.startsWith('#read?') && new URLSearchParams(location.hash.slice(6)).get('uid') === 'tha-ap42'")
    assert parse_qs(urlsplit(page.url).fragment.split('?', 1)[1])['uid'] == ['tha-ap42']
    expect(page.locator('.segment-label a').first).to_have_text('tha-ap42/1')
    page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
    assert page.locator('.passage').first.inner_text() == result['structuredContent']['segments'][0]['text']
    if delayed_event:
        assert page.evaluate('window.__theraNextNavigationTiming.released')
    return {'event_delivery': 'controlled-hashchange' if delayed_event else 'native-hashchange',
            'old_wait_reference': old_reference, 'destination_reference': 'tha-ap42/1',
            'destination_response_uid': result['structuredContent']['text_id']}
