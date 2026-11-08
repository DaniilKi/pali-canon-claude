#!/usr/bin/env python3
"""Repeatable axe-core DOM audit. CSP is unchanged and tested separately; only the audit context allows injection."""
import argparse, json, os, pathlib, socket, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(); parser.add_argument('--report'); args=parser.parse_args()
with socket.socket() as sock:
 sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
server=subprocess.Popen(['node','server/http.cjs'],cwd=ROOT,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
base=f'http://127.0.0.1:{port}'; results=[]
try:
 for _ in range(100):
  try: urllib.request.urlopen(base+'/healthz',timeout=1); break
  except Exception: time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
  for width in [390,1280]:
   for theme in ['light','dark']:
    # Browser-only override permits the testing library. Production CSP is not weakened.
    context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=True)
    context.add_init_script("localStorage.setItem('pali-library-v1',JSON.stringify("+json.dumps({'theme':theme,'saved':[{'uid':'dhp183','ref':'dhp183/1','title':'Dhp 183','offset':0,'note':'Synthetic personal note for accessibility testing'}]})+"))")
    page=context.new_page()
    for route in ['#browse?node=canon','#read?uid=dhp183','#saved','#glossary','#glossary?term=mindfulness&direction=en-pa','#browse?node=commentary','#browse?node=post','#read?kind=commentary&uid=commentary%3Aabh01a.att.xml','#read?kind=post&uid=Vism%201.1']:
     page.goto(base+'/'+route); page.locator('main h2').wait_for()
     # Wait for completed rendering through browser locators; no CSP bypass is needed by the app.
     page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
     page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
     data=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
     results.append({'width':width,'theme':theme,'route':route,'violations':[{'id':v['id'],'impact':v['impact'],'description':v['description'],'targets':[n['target'] for n in v['nodes']]} for v in data['violations']],'manual_review_rules':[v['id'] for v in data['incomplete']]})
    for label in ['Study words in dhp183/1','Related texts']:
     page.goto(base+'/#read?uid=dhp183'); page.get_by_role('button',name=label,exact=True).wait_for(); page.get_by_role('button',name=label,exact=True).click(); page.locator('#study h3').wait_for()
     page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
     data=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
     results.append({'width':width,'theme':theme,'route':'#read?uid=dhp183','study':label,'violations':[{'id':v['id'],'impact':v['impact'],'description':v['description'],'targets':[n['target'] for n in v['nodes']]} for v in data['violations']],'manual_review_rules':[v['id'] for v in data['incomplete']]})
    context.close()
  browser.close()
 result={'engine':'axe-core 4.14.0','scans':len(results),'violations':sum(len(r['violations']) for r in results),'results':results,'limitations':'Automated DOM checks only; not human accessibility certification. The audit context bypasses CSP to inject the checker; production policy is covered independently.'}
 text=json.dumps(result,indent=2); print(text)
 if args.report: pathlib.Path(args.report).write_text(text+'\n')
 if result['violations']: raise SystemExit(1)
finally:
 server.terminate();server.wait(timeout=10)
