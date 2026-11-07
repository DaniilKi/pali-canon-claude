# Real-browser CI/local gate: pip install playwright==1.62.0; playwright install chromium.
# Run from any directory; --browser can select a preinstalled Chromium.
import argparse
import json
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(
    description="Run the actual reader HTML in Chromium with simulated host bridges; no model or signed-in ChatGPT session."
)
parser.add_argument(
    "--browser", help="Chromium executable; omit to use Playwright Chromium"
)
parser.add_argument("--report", type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
if args.report:
    args.report.write_text(json.dumps({"status": "running"}) + "\n")


def check():
    from playwright.sync_api import sync_playwright
    payload = json.loads(
        subprocess.run(
            [
                "node",
                "scripts/widget-browser-fixtures.mjs",
            ],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        ).stdout
    )
    html = payload["html"]
    fixture = payload["fixture"]
    checks = []
    requests = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.browser, headless=True)
        for width in [390, 1280]:
            for bridge in ["MCP Apps", "Apps SDK"]:
                page = browser.new_page(viewport={"width": width, "height": 900})
                page.route("**/*", lambda route: (requests.append(route.request.url), route.abort()))
                errors = []
                navigation_calls = 0
                page.on("pageerror", lambda e: errors.append(str(e)))
                if bridge == "MCP Apps":
                    page.set_content("<style>body{margin:0}iframe{border:0;width:100%;height:850px}</style>")
                    page.evaluate("""input => {
                      const html=input.html, modalities={[input.modality]:{}};
                      window.bridgeMessages=[]; window.navQueue=[]; window.contextQueue=[]; window.contextHistory=[]; window.contextAutoAck=true;
                      const frame=document.createElement('iframe'); frame.id='reader';
                      window.addEventListener('message', ev=> {
                        window.bridgeMessages.push(ev.data);
                        if(ev.data.method==='ui/initialize') frame.contentWindow.postMessage({jsonrpc:'2.0',id:1,result:{hostContext:{theme:'dark'},hostCapabilities:{serverTools:{},updateModelContext:modalities}}},'*');
                        if(ev.data.method==='tools/call') window.navQueue.push(ev.data);
                        if(ev.data.method==='ui/update-model-context') {
                          const payload=ev.data.params.structuredContent||JSON.parse(ev.data.params.content[0].text);
                          window.contextHistory.push(payload.pali_reader);
                          if(window.contextAutoAck) frame.contentWindow.postMessage({jsonrpc:'2.0',id:ev.data.id,result:{}},'*'); else window.contextQueue.push(ev.data);
                        }
                      });
                      frame.srcdoc=html;document.body.append(frame);
                    }""", {"html": html, "modality": "structuredContent" if width == 390 else "text"})
                    page.wait_for_function("window.bridgeMessages.some(m=>m.method==='ui/notifications/initialized')")
                    frame = page.frames[1]
                    send = lambda data: page.evaluate(
                        "data=>document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:data}},'*')", data)
                else:
                    page.evaluate("""() => {window.opened=[];window.navQueue=[];window.contextHistory=[];window.widgetStateAttempts=0;window.openai={theme:'dark',openExternal:args=>window.opened.push(args.href),callTool:(name,args)=>new Promise((resolve,reject)=>window.navQueue.push({params:{name,arguments:args},resolve,reject})),setWidgetState:state=>{window.widgetStateAttempts++;if(window.widgetStateThrows)throw Error('Fixture state failure');window.openai.widgetState=state;window.contextHistory.push(JSON.parse(state.modelContent).pali_reader);window.dispatchEvent(new Event('openai:set_globals'))}}}""")
                    page.set_content(html)
                    frame = page.main_frame
                    send = lambda data: page.evaluate(
                        "data=>{window.openai.toolOutput=data;window.dispatchEvent(new Event('openai:set_globals'))}", data)

                def verified(data):
                    frame.locator("#title").filter(has_text=data["citation"]).wait_for()
                    expected = data["pali"]["segments"][0]["text"]
                    frame.wait_for_function("text=>document.querySelector('#pali').textContent.includes(text)", arg=expected)
                    for segment in data["pali"]["segments"]:
                        assert segment["text"] in frame.locator("#pali").inner_text()
                    if data.get("english"):
                        frame.wait_for_function("text=>document.querySelector('.en')?.textContent===text", arg=data["english"]["text"])
                        assert data["english"]["license"] in frame.locator("#footer").inner_text()
                    else:
                        frame.wait_for_function("()=>!document.querySelector('.en')")

                def displayed(data):
                    send(data)
                    verified(data)

                def context_verified(data):
                    refs=[s["ref"] for s in data["pali"]["segments"]]
                    page.wait_for_function("x=>{const d=window.contextHistory.at(-1);return d?.state==='displayed'&&d.citation===x.citation&&JSON.stringify(d.pali.refs)===JSON.stringify(x.refs)}", arg={"citation": data["citation"], "refs": refs})
                    meta=page.evaluate("window.contextHistory.at(-1)")
                    assert meta["source"] == data["source"]
                    assert meta.get("text_id") == data.get("text_id")
                    assert meta.get("canonical") == data.get("canonical")
                    assert meta.get("selection") == data.get("selection")
                    assert meta["script"] == data.get("script", "roman")
                    assert meta.get("available") == data.get("available")
                    assert meta["approximate"] == bool(data.get("approximate"))
                    assert meta.get("alignment_note") == data.get("alignment_note")
                    assert meta.get("context_for") == data.get("context_for")
                    assert meta["notes"] == data.get("notes", [])
                    assert meta["pali"]["read_with"] == data["pali"]["read_with"]
                    assert "segments" not in meta["pali"] and "text" not in meta["english"]
                    if data.get("english"):
                        assert meta["english"]["translation_id"] == data["english"]["translation_id"]
                        assert meta["english"]["read_with"] == data["english"]["read_with"]
                    frame.wait_for_function("()=>document.querySelector('#context-status').textContent.includes('Model delivery is not verified')")

                def reply(command, data=None, error=None):
                    nonlocal navigation_calls
                    navigation_calls += 1
                    page.wait_for_function("window.navQueue.length===1")
                    assert page.evaluate("window.navQueue[0].params") == command
                    page.evaluate("""x=>{
                      const item=window.navQueue.shift();
                      if(x.bridge==='MCP Apps') document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',id:item.id,...(x.error?{error:{code:-1,message:x.error}}:{result:{structuredContent:x.data}})},'*');
                      else if(x.error) item.reject(new Error(x.error)); else item.resolve({structuredContent:x.data});
                    }""", {"bridge": bridge, "data": data, "error": error})

                def activate(label, command, data, keyboard=False):
                    button=frame.get_by_role("button", name=label, exact=True)
                    if keyboard:
                        button.focus(); button.press("Enter")
                    else:
                        button.click()
                    assert frame.locator("#navigation").get_attribute("aria-busy") == "true"
                    assert frame.locator("#navigation button").evaluate_all("buttons=>buttons.every(b=>b.disabled)")
                    reply(command, data)
                    verified(data)
                    frame.wait_for_function("()=>document.querySelector('#navigation').getAttribute('aria-busy')==='false'")
                    assert frame.evaluate("document.activeElement.id") == "title"
                    context_verified(data)
                    if bridge == "Apps SDK":
                        page.evaluate("()=>{window.openai.theme='dark';window.dispatchEvent(new Event('openai:set_globals'))}")
                        verified(data)

                displayed(fixture)
                context_verified(fixture)
                assert frame.locator("html").get_attribute("data-theme") == "dark"
                assert frame.get_by_role("main").count() == 1
                assert frame.get_by_role("heading", level=1).count() == 1
                assert frame.get_by_role("region", name="Pāli", exact=True).count() == 1
                assert frame.get_by_role("region", name="English", exact=True).count() == 1
                status = frame.get_by_role("status")
                assert status.get_attribute("aria-live") == "polite"
                assert status.get_attribute("aria-atomic") == "true"
                assert "segments 1 to 3" in status.text_content()
                assert frame.evaluate("document.documentElement.scrollWidth<=innerWidth")
                columns = frame.evaluate("getComputedStyle(document.querySelector('main')).gridTemplateColumns.split(' ').length")
                assert columns == (1 if width == 390 else 2)
                # Check real keyboard navigation and host-routed activation, without leaving the page.
                frame.locator("body").press("Tab")
                assert frame.evaluate("document.activeElement.tagName") == "BUTTON"
                frame.locator("a").focus()
                frame.locator("a").press("Enter")
                if bridge == "MCP Apps":
                    page.wait_for_function("window.bridgeMessages.some(m=>m.method==='ui/open-link')")
                    opened = page.evaluate("window.bridgeMessages.find(m=>m.method==='ui/open-link').params.url")
                else:
                    opened = page.evaluate("window.opened[0]")
                assert opened == fixture["links"]["suttacentral"]
                frame.evaluate("document.body.style.zoom='2'")
                assert frame.evaluate("document.documentElement.scrollWidth<=innerWidth"), "overflow at 200% zoom"
                frame.evaluate("document.body.style.zoom='1'")

                continuation = payload["continuation"]
                activate("Continue Pāli", fixture["pali"]["continue_with"], continuation["next"], keyboard=True)
                displayed(continuation["next"])
                assert fixture["pali"]["segments"][0]["text"] not in frame.locator("#pali").inner_text()
                assert "segments 4 to 6" in status.text_content()
                displayed(continuation["fallback"])
                assert "earlier version" in frame.locator("#english").inner_text()
                activate("Continue English", continuation["fallback"]["english"]["continue_with"], continuation["pinned"])
                displayed(continuation["pinned"])
                assert "Continuing from character 6000" in frame.locator("#english").inner_text()
                assert "character 6000" in status.text_content()
                assert continuation["fallback"]["english"]["text"] not in frame.locator("#english").inner_text()
                displayed(continuation["unpinned"])
                assert "translation_id" in frame.locator("#english").inner_text()
                assert "English:" not in frame.locator("#footer").inner_text()
                displayed(continuation["primary"])
                displayed(continuation["refused"])
                assert continuation["refused"]["english_error"] in frame.locator("#english").inner_text()
                assert "English:" not in frame.locator("#footer").inner_text()
                assert continuation["primary"]["english"]["text"] not in frame.locator("#english").inner_text()
                comment = payload["commentary"]
                displayed(comment["first"])
                assert "Commentary · not the canon" in frame.locator("#meta").inner_text()
                assert "Post-canonical · not the canon" not in frame.locator("#meta").inner_text()
                assert "Commentary, not the canon" in status.text_content()
                assert "Commentary PTS Ps i 225" in frame.locator("#pali").inner_text()
                assert "On root VRI ¶105" in frame.locator("#pali").inner_text()
                assert frame.locator("#footer a").count() == 0
                displayed(comment["next"])
                displayed(comment["anchor"])
                assert frame.locator("#pali .seg").count() == 1
                activate("Surrounding Pāli", comment["anchor"]["pali"]["context_with"], comment["context"])
                displayed(comment["context"])
                assert "Source context for mn10/c66" in frame.locator("#meta").inner_text()
                assert frame.locator("#pali .seg").count() == 5
                assert "mn10/c64" in frame.locator("#pali").inner_text()
                assert "mn10/c68" in frame.locator("#pali").inner_text()
                activate("Return to exact segment", comment["context"]["pali"]["exact_with"], comment["returned"])
                displayed(comment["returned"])
                assert frame.locator("#pali .seg").count() == 1
                assert "Source context for" not in frame.locator("#meta").inner_text()
                displayed(comment["book_anchor"])
                activate("Surrounding Pāli", comment["book_anchor"]["pali"]["context_with"], comment["book_context"])
                assert "Source context for commentary:" in frame.locator("#meta").inner_text()
                assert "does not assert an alignment" in frame.locator("#pali").inner_text()
                assert "transliterated" in frame.locator("#pali").inner_text()
                displayed(comment["direct"])
                assert "does not assert an alignment" in frame.locator("#pali").inner_text()
                assert "transliterated" in frame.locator("#pali").inner_text()
                send(comment["absent"])
                frame.locator("#title").filter(has_text="AN 1.9").wait_for()
                frame.wait_for_function("()=>document.querySelector('#pali').textContent.includes('No verified commentary alignment')")
                assert frame.locator("#pali .seg").count() == 0
                assert "No verified commentary alignment" in status.text_content()
                context_verified(comment["absent"])
                assert frame.locator("#footer a").count() == 0
                displayed(comment["uncertain"])
                if comment["uncertain"].get("approximate"):
                    assert "approximate mapping" in frame.locator("#meta").inner_text()
                post = payload["postcanonical"]
                displayed(post["first"])
                assert "Post-canonical · not the canon" in frame.locator("#meta").inner_text()
                assert "not the canon" in frame.locator("#pali").inner_text()
                assert "post-canonical" in frame.locator("#english").inner_text()
                assert frame.locator("#footer a").count() == 0
                assert "Post-canonical, not the canon" in status.text_content()
                activate("Continue Pāli", post["first"]["pali"]["continue_with"], post["next"])
                displayed(post["next"])
                assert "segments 3 to 4" in status.text_content()
                displayed(post["native"])
                assert "transliterated" in frame.locator("#pali").inner_text()
                assert frame.evaluate("document.documentElement.scrollWidth<=innerWidth")
                displayed(post["uncertain"])
                assert "approximate mapping" in frame.locator("#meta").inner_text()
                source = payload["source_file"]
                displayed(source["first"])
                assert "Complete source file" in frame.locator("#meta").inner_text()
                assert "not individual sutta or rule" in frame.locator("#pali").inner_text()
                assert "vri-book:vin02m1/7" in frame.locator("#pali").inner_text()
                assert "individual citation" in frame.locator("#english").inner_text()
                assert frame.locator("#footer a").count() == 0
                assert frame.evaluate("document.documentElement.scrollWidth<=innerWidth")
                activate("Continue Pāli", source["first"]["pali"]["continue_with"], source["next"])
                displayed(source["next"])
                assert "vri-book:vin02m1/8" in frame.locator("#pali").inner_text()
                displayed(payload["exact"])
                assert frame.locator("#pali .seg").count() == 1
                assert "mn10/66" in frame.locator("#pali").inner_text()
                assert "no verified segment-level English alignment" in frame.locator("#english").inner_text()
                assert "Showing Pāli segments 66 to 66" in status.text_content()
                assert frame.locator("#pali button").count() == 0
                assert "Ask for surrounding Pāli" in frame.locator("#pali").inner_text()
                activate("Surrounding Pāli", payload["exact"]["pali"]["context_with"], payload["context"])
                displayed(payload["context"])
                assert frame.locator("#pali .seg").count() == 5
                assert "Source context for mn10/66" in frame.locator("#meta").inner_text()
                assert "mn10/64" in frame.locator("#pali").inner_text()
                assert "mn10/68" in frame.locator("#pali").inner_text()
                assert "Ask to return to the exact" in frame.locator("#pali").inner_text()
                activate("Return to exact segment", payload["context"]["pali"]["exact_with"], payload["returned"])
                displayed(payload["returned"])
                assert frame.locator("#pali .seg").count() == 1
                assert "Source context for" not in frame.locator("#meta").inner_text()
                if bridge == "MCP Apps":
                    context_verified(payload["returned"])
                    page.evaluate("window.contextAutoAck=false")
                    displayed(fixture)
                    page.wait_for_function("window.contextQueue.length===1")
                    displayed(post["native"])
                    assert page.evaluate("window.contextQueue.length") == 1
                    page.evaluate("()=>{const m=window.contextQueue.shift();window.oldContextID=m.id;document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',id:m.id,result:{}},'*')}")
                    page.wait_for_function("window.contextQueue.length===1")
                    assert page.evaluate("window.contextHistory.at(-1).citation") == post["native"]["citation"]
                    assert "Updating" in frame.locator("#context-status").inner_text()
                    page.evaluate("()=>document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',id:window.oldContextID,error:{code:-1,message:'Stale context error'}},'*')")
                    page.wait_for_timeout(30)
                    assert "Updating" in frame.locator("#context-status").inner_text()
                    page.evaluate("()=>{const m=window.contextQueue.shift();document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',id:m.id,result:{}},'*')}")
                    context_verified(post["native"])
                    page.evaluate("window.contextAutoAck=true")
                for late_error in [False, True]:
                    displayed(fixture)
                    frame.get_by_role("button", name="Continue Pāli", exact=True).click()
                    page.wait_for_function("window.navQueue.length===1")
                    displayed(post["native"])
                    reply(fixture["pali"]["continue_with"], continuation["next"], "Late host error" if late_error else None)
                    page.wait_for_timeout(30)
                    assert "Vism 1.1" in frame.locator("#title").inner_text()
                    assert "transliterated" in frame.locator("#pali").inner_text()
                    assert "Late host error" not in status.text_content()
                displayed(fixture)
                frame.get_by_role("button", name="Continue Pāli", exact=True).click()
                reply(fixture["pali"]["continue_with"], error="Navigation <img src=x> failed")
                frame.locator("#title").filter(has_text="Could not open").wait_for()
                assert "Navigation <img src=x> failed" in frame.locator("#pali").inner_text()
                assert frame.locator("#pali .seg").count() == 0
                assert frame.locator("#footer").inner_text() == ""
                page.wait_for_function("window.contextHistory.at(-1)?.state==='error'")
                cleared = page.evaluate("window.contextHistory.at(-1)")
                assert "source" not in cleared and "pali" not in cleared
                assert "Navigation <img" not in json.dumps(cleared)
                assert frame.locator("img").count() == 0
                assert frame.locator("#navigation button").count() == 0
                displayed(fixture)
                assert "Complete source file" not in frame.locator("#meta").inner_text()
                assert "Post-canonical · not the canon" not in frame.locator("#meta").inner_text()
                assert frame.locator("#footer a").count() == 1
                envelope = {"isError": True, "content": [{"type": "text", "text": json.dumps({"error": "Browser fixture error <img src=x>"})}]}
                if bridge == "MCP Apps":
                    page.evaluate("params=>document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params},'*')", envelope)
                else:
                    page.evaluate("result=>{window.openai.toolOutput=undefined;window.openai.toolResponseMetadata={call_tool_result:result};window.dispatchEvent(new Event('openai:set_globals'))}", envelope)
                frame.locator("#title").filter(has_text="Could not open").wait_for()
                assert "Browser fixture error <img src=x>" in frame.locator("#pali").inner_text()
                assert "Could not open" in status.text_content()
                assert frame.locator("img").count() == 0
                assert frame.locator("#footer").inner_text() == ""
                if bridge == "Apps SDK":
                    page.evaluate("window.openai.toolResponseMetadata=undefined")
                displayed(fixture)
                context_verified(fixture)
                if bridge == "MCP Apps":
                    page.evaluate("window.contextAutoAck=false")
                    displayed(post["native"])
                    page.wait_for_function("window.contextQueue.length===1")
                    page.evaluate("()=>{const m=window.contextQueue.shift();document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'Fixture unsupported context'}},'*')}")
                    frame.wait_for_function("()=>document.querySelector('#context-status').textContent.includes('rejected')")
                    sent = page.evaluate("window.contextHistory.length")
                    displayed(source["first"])
                    assert page.evaluate("window.contextHistory.length") == sent
                else:
                    page.evaluate("window.widgetStateThrows=true")
                    displayed(post["native"])
                    frame.wait_for_function("()=>document.querySelector('#context-status').textContent.includes('could not store')")
                    sent = page.evaluate("window.widgetStateAttempts")
                    displayed(source["first"])
                    assert page.evaluate("window.widgetStateAttempts") == sent
                assert "Model delivery is not verified" not in frame.locator("#context-status").inner_text()
                assert not errors, errors
                checks.append({"bridge": bridge, "width": width, "navigation_calls": navigation_calls, "context_updates": page.evaluate("window.contextHistory.length"), "context_mode": ("structuredContent" if width == 390 else "text") if bridge == "MCP Apps" else "widget-state",
                    "checks": ["initialization", "theme", "source text", "responsive columns", "no horizontal overflow",
                        "named landmarks and headings", "keyboard link activation", "200% zoom", "live status updates",
                        "Pāli continuation", "English pinned continuation after primary recovery", "unpinned offset refused",
                        "cross-version fallback refused", "stale text and attribution cleared", "plain error", "recovery", "commentary labels and availability", "unaligned source caution", "post-canonical labels and continuation", "native Pali display", "source-file identity and front matter", "exact Pali segment without invented English alignment", "source-preserving context and exact return", "direct navigation controls and keyboard activation", "late success and rejection ignored", "navigation failure clears stale content", "local navigation survives globals updates", "model-context capability and modality checks", "metadata-only source context and replay commands", "late context acknowledgements coalesce to current state", "context errors leave the reader usable", "cleared reading state on error", "no invented post-canonical/source-file links", "no JS errors"]})
                page.close()
        assert not requests, requests
        report = {
            "status": "passed",
            "browser": "Chromium " + browser.version,
            "checks": checks,
            "fixtures": {"pali": "bundled VRI", "english": "synthetic HTTP responses", "transport": "in-memory MCP", "simulated_fetches": payload["fixture_fetches"]},
            "scope": "Local browser with simulated host bridges; not signed-in ChatGPT acceptance",
        }
        if args.report:
            args.report.write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps(report))
        browser.close()


try:
    check()
except Exception as error:
    if args.report:
        args.report.write_text(
            json.dumps({"status": "failed", "error": str(error)}, indent=2) + "\n"
        )
    raise
