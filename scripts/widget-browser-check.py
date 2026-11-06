# Optional acceptance runner: pip install playwright; playwright install chromium.
# Run from any directory; --browser can select a preinstalled Chromium.
import argparse
import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

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
    payload = json.loads(
        subprocess.run(
            [
                "node",
                "--input-type=module",
                "-e",
                "import {WIDGET_HTML,readPassage} from './src/chatgpt-widget.mjs'; process.stdout.write(JSON.stringify({html:WIDGET_HTML,fixture:await readPassage({uid:'MN 10',english:false,limit:3})}));",
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
            page = browser.new_page(viewport={"width": width, "height": 900})
            page.route(
                "**/*",
                lambda route: (requests.append(route.request.url), route.abort()),
            )
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.set_content(
                "<style>body{margin:0}iframe{border:0;width:100%;height:850px}</style>"
            )
            page.evaluate(
                """html => {
              window.bridgeMessages=[];
              const frame=document.createElement('iframe'); frame.id='reader';
              window.addEventListener('message', ev=> {
                window.bridgeMessages.push(ev.data);
                if(ev.data.method==='ui/initialize') frame.contentWindow.postMessage({jsonrpc:'2.0',id:1,result:{hostContext:{theme:'dark'}}},'*');
              });
              frame.srcdoc=html;document.body.append(frame);
            }""",
                html,
            )
            reader = page.frame_locator("#reader")
            page.wait_for_function(
                "window.bridgeMessages.some(m=>m.method==='ui/notifications/initialized')"
            )
            assert reader.locator("html").get_attribute("data-theme") == "dark"
            send = lambda params: page.evaluate(
                "params=>document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params},'*')",
                params,
            )
            send({"structuredContent": fixture})
            reader.locator("#title").filter(has_text="MN 10").wait_for()
            for s in fixture["pali"]["segments"]:
                assert s["text"] in reader.locator("#pali").inner_text()
            assert page.frames[1].evaluate(
                "document.documentElement.scrollWidth<=innerWidth"
            )
            columns = page.frames[1].evaluate(
                "getComputedStyle(document.querySelector('main')).gridTemplateColumns.split(' ').length"
            )
            assert columns == (1 if width == 390 else 2)
            reader.locator("a").click()
            page.wait_for_function(
                "window.bridgeMessages.some(m=>m.method==='ui/open-link')"
            )
            opened = page.evaluate(
                "window.bridgeMessages.find(m=>m.method==='ui/open-link').params.url"
            )
            assert opened == fixture["links"]["suttacentral"]
            send(
                {
                    "isError": True,
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(
                                {"error": "Browser fixture error <img src=x>"}
                            ),
                        }
                    ],
                }
            )
            reader.locator("#title").filter(has_text="Could not open").wait_for()
            assert (
                "Browser fixture error <img src=x>"
                in reader.locator("#pali").inner_text()
            )
            assert reader.locator("img").count() == 0
            assert reader.locator("#footer").inner_text() == ""
            assert (
                fixture["pali"]["segments"][0]["text"]
                not in reader.locator("#pali").inner_text()
            )
            send({"structuredContent": fixture})
            reader.locator("#title").filter(has_text="MN 10").wait_for()
            assert not errors, errors
            checks.append(
                {
                    "bridge": "MCP Apps",
                    "width": width,
                    "source_segments": len(fixture["pali"]["segments"]),
                    "checks": [
                        "handshake",
                        "theme",
                        "source text",
                        "responsive columns",
                        "no horizontal overflow",
                        "open-link",
                        "plain error",
                        "stale text cleared",
                        "recovery",
                        "no JS errors",
                    ],
                }
            )
            page.close()
        page = browser.new_page()
        page.route(
            "**/*", lambda route: (requests.append(route.request.url), route.abort())
        )
        page.evaluate(
            'fixture=>{window.openai={theme:"light",toolOutput:fixture}}', fixture
        )
        page.set_content(html)
        page.locator("#title").filter(has_text="MN 10").wait_for()
        page.evaluate(
            "window.openai.toolOutput={error:'Apps fixture failure'};window.dispatchEvent(new Event('openai:set_globals'))"
        )
        page.locator("#title").filter(has_text="Could not open").wait_for()
        assert page.locator("#footer").inner_text() == ""
        page.evaluate(
            'fixture=>{window.openai.toolOutput=fixture;window.dispatchEvent(new Event("openai:set_globals"))}',
            fixture,
        )
        page.locator("#title").filter(has_text="MN 10").wait_for()
        checks.append(
            {
                "bridge": "Apps SDK",
                "checks": [
                    "initial render",
                    "globals error",
                    "stale attribution cleared",
                    "recovery",
                ],
            }
        )
        assert not requests, requests
        report = {
            "status": "passed",
            "browser": "Chromium " + browser.version,
            "checks": checks,
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
