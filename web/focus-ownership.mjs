/** A short-lived UI focus lease; no inputs, routes or personal data are retained. */
export function createFocusOwnership({activeElement,hasFocus}) {
 let revision=0;
 return {
  changed(){revision++;},
  capture(){return {revision,element:activeElement()};},
  owns(ticket){return Boolean(ticket)&&ticket.revision===revision&&ticket.element===activeElement()&&hasFocus();},
 };
}
