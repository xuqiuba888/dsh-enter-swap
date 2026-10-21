// dsh-enter-swap — host half: no host behavior.
//
// Everything this plugin does happens in the browser (client/client.js):
// a capture-phase keydown listener that swaps plain Enter and Shift+Enter
// for the engine's own composer. No settings, no routes, no files, no network.
export const name = 'enter-swap'

export function apply() {}

export default { name, apply }
