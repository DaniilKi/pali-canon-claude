export const verificationLimit = 2000000;
export const tailQuote = 'velvet otters weave purple hammocks';
const prefixUnit = 'Synthetic fixture prefix amber lantern. ';
export const prefix = prefixUnit.repeat(Math.ceil(verificationLimit / prefixUnit.length)).slice(0, verificationLimit);
export const largeText = prefix + tailQuote + '.';
export const completeText = 'Synthetic complete fixture: ' + tailQuote + '.';
export const html = text => `<html><head><title>Synthetic source only</title></head><body><div id="sutta"><p>${text}</p></div><div class="footer">Synthetic footer</div></body></html>`;
export const fullLink = (name = 'LARGE', translator = 'Synthetic fixture translator') => ({ source: 'dhammatalks', url: `https://www.dhammatalks.org/suttas/SYNTHETIC/${name}.html`, translator, reference: 'Synthetic fixture only', match: 'synthetic-test-only' });
