"""Use ordinary disclosure controls rather than bypassing the responsive reader UI."""
def read_tool(page, name):
    page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
    panel = page.locator('.study-actions')
    if name in ['English sources', 'Traditional commentary', 'Related texts', 'Copy reading link'] and panel.count() and panel.get_attribute('open') is None:
        panel.locator('summary').click()
    return page.get_by_role('button', name=name, exact=True)

def find_control(page, selector):
    panel = page.locator('#find-panel')
    if panel.count() and panel.get_attribute('open') is None:
        panel.locator('summary').click()
    return page.locator(selector)
