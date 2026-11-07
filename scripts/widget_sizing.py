"""Dynamic intrinsic-height gate using hosts that resize actual iframe elements."""
import json


def check_sizing(browser, payload):
    results = []
    for bridge in ['MCP Apps', 'Apps SDK']:
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('**/*', lambda route: (requests.append(route.request.url), route.abort()))
        page.set_content('<style>body{margin:0}iframe{display:block;border:0;width:100%;height:60px}</style>')
        html = payload['html']
        if bridge == 'Apps SDK':
            # The legacy runtime is inside the embedded view, as in an actual host.
            shim = "<script>window.openai={callTool:()=>new Promise(()=>{}),notifyIntrinsicHeight:h=>parent.postMessage({fixtureHeight:h},'*')};</script>"
            html = html.replace('<script>', shim + '<script>', 1)
        page.evaluate('''x=>{
          window.heights=[];window.messages=[];window.cap=null;
          const f=document.createElement('iframe'); f.id='reader';
          window.addEventListener('message',ev=>{
            if(ev.source!==f.contentWindow)return;
            const m=ev.data;window.messages.push(m);
            if(m.method==='ui/initialize'&&x.bridge==='MCP Apps')f.contentWindow.postMessage({jsonrpc:'2.0',id:1,result:{hostCapabilities:{serverTools:{}}}},'*');
            const h=m.method==='ui/notifications/size-changed'?m.params.height:m.fixtureHeight;
            if(h!==undefined){if(!Number.isFinite(h)||h<=0)throw Error('Invalid height');window.heights.push(h);f.style.height=Math.min(h,window.cap||h)+'px'}
          });f.srcdoc=x.html;document.body.append(f);
        }''', {'html': html, 'bridge': bridge})
        frame = page.frames[1]

        def fitted():
            page.wait_for_function('''()=>{const f=document.querySelector('iframe');return window.heights.length&&Math.abs(f.getBoundingClientRect().height-Math.ceil(f.contentDocument.body.getBoundingClientRect().height))<=1}''')
            count = page.evaluate('window.heights.length')
            page.wait_for_timeout(100)
            assert page.evaluate('window.heights.length') == count, 'host height feedback must settle'
            return page.evaluate('window.heights.at(-1)')

        def output(data):
            if bridge == 'Apps SDK':
                frame.evaluate("data=>{window.openai.toolOutput=data;window.dispatchEvent(new Event('openai:set_globals'))}", data)
            else:
                page.evaluate("data=>document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:data}},'*')", data)
            frame.wait_for_function('x=>document.querySelector("#title").textContent.includes(x)', arg=data.get('citation', 'Could not open'))

        fitted()
        output(payload['fixture']); short = fitted()
        long = json.loads(json.dumps(payload['fixture']))
        # English browser fixtures are explicitly synthetic; no scripture is expanded.
        long['english'] = json.loads(json.dumps(payload['continuation']['fallback']['english']))
        long['english']['text'] = '\n\n'.join([long['english']['text']] * 3)
        output(long)
        frame.wait_for_function('text=>document.querySelector(".en").textContent===text', arg=long['english']['text'])
        tall = fitted(); assert tall > short
        page.set_viewport_size({'width': 320, 'height': 900})
        narrow = fitted(); assert narrow > tall
        assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), '320px view must not overflow horizontally'
        assert frame.get_by_role('main').count() == 1
        button = frame.get_by_role('button', name='Continue Pāli', exact=True)
        button.focus()
        frame.locator('body').evaluate("e=>e.style.fontSize='30px'")
        enlarged = fitted(); assert enlarged > narrow
        assert button.evaluate('e=>e===document.activeElement'), 'sizing must not steal keyboard focus'
        assert frame.get_by_role('region', name='Pāli', exact=True).count() == 1
        page.evaluate("()=>{window.cap=300;document.querySelector('iframe').style.height='300px'}")
        frame.locator('#title').focus()
        for _ in range(8):
            frame.locator('body').press('Tab')
            if button.evaluate('e=>e===document.activeElement'):
                break
        assert button.evaluate('e=>e===document.activeElement'), 'keyboard tab order must reach navigation'
        assert frame.evaluate('document.scrollingElement.scrollHeight>innerHeight'), 'capped host retains scrolling'
        assert button.evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1}'), 'keyboard controls remain reachable in capped host'
        page.evaluate('window.cap=null')
        output({'error': 'Synthetic sizing failure fixture'})
        frame.wait_for_function("()=>!document.querySelector('.en')")
        small = fitted(); assert small < enlarged, 'error state must shrink the host frame'
        output(payload['fixture']); fitted()
        page.evaluate("()=>document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',id:'close',method:'ui/resource-teardown'},'*')")
        frame.get_by_role('heading', name='Reader closed', exact=True).wait_for()
        count = page.evaluate('window.heights.length')
        frame.locator('body').evaluate("e=>e.style.paddingBottom='500px'")
        page.set_viewport_size({'width': 1000, 'height': 900})
        page.wait_for_timeout(100)
        assert page.evaluate('window.heights.length') == count, 'no resize publications after teardown'
        assert not errors, errors
        assert not requests, requests
        results.append({'bridge': bridge, 'height_updates': count, 'short': short, 'long': tall, 'narrow': narrow, 'enlarged': enlarged, 'error': small,
                        'checks': ['grow and shrink', '320px reflow', '200% text size', 'stable feedback', 'focus retained', 'capped-host scrolling and keyboard-tab reachable controls', 'teardown disconnect', 'zero network requests']})
        page.close()
    return results
