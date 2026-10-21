// dsh-enter-swap — client (browser) half.
//
// Swaps the composer's Enter gestures, hardcoded (no settings surface):
//   plain Enter    -> newline  (re-dispatches the engine's Shift+Enter)
//   Shift+Enter    -> send     (re-dispatches the engine's plain Enter)
//
// Mechanism verified against the live engine: the engine's composer keymap is
// bound on the editor itself, so a capture-phase listener on document runs
// first; we stop the original gesture and re-emit the swapped one as a
// synthetic KeyboardEvent, which drives the engine keymap exactly like a
// trusted one. The engine keeps owning the semantics (send, queue, newline).
//
// Left untouched, all the time:
//   - Ctrl/Cmd+Enter (native accelerated delivery) and Alt+Enter
//   - IME composition (isComposing / keyCode 229) — Chinese input unaffected
//   - an open candidate menu (slash commands, @mentions): menus portal
//     directly under <body>, so a menu/listbox that is a direct body child
//     means "menu open" and Enter passes through natively (item selection).
//     Roles living deep inside the app tree never trigger this guard.
window.__ModuleLoader__.load({
  id: 'dsh-enter-swap',
  factory: () => {
    const COMPOSER_SELECTOR = '[data-composer-input="true"]'

    /** Which of our two gestures a keydown is; null = not ours. */
    function gestureOf(event) {
      if (event.key !== 'Enter') return null
      if (event.altKey) return null
      if (event.ctrlKey || event.metaKey) return null
      return event.shiftKey ? 'shiftEnter' : 'enter'
    }

    /** IME composition keydowns must never be intercepted. */
    function isComposing(event) {
      return event.isComposing === true || event.keyCode === 229
    }

    /** True while a portaled candidate menu (slash/@) is open. */
    function menuOpen() {
      for (const el of document.querySelectorAll('[role="menu"], [role="listbox"]')) {
        if (el.parentElement === document.body) return true
      }
      return false
    }

    /** The synthetic event that re-emits one native engine gesture. */
    function nativeGestureEvent(shift) {
      return new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        shiftKey: shift,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    }

    function apply() {
      let reentrant = false
      const onKeyDown = (event) => {
        if (reentrant) return
        if (isComposing(event)) return
        const target = event.target
        if (!target || typeof target.closest !== 'function') return
        if (target.closest(COMPOSER_SELECTOR) === null) return
        if (menuOpen()) return
        const gesture = gestureOf(event)
        if (gesture === null) return
        event.preventDefault()
        event.stopPropagation()
        reentrant = true
        try {
          // enter -> Shift+Enter (newline); shiftEnter -> plain Enter (send)
          target.dispatchEvent(nativeGestureEvent(gesture === 'enter'))
        } finally {
          reentrant = false
        }
      }
      document.addEventListener('keydown', onKeyDown, true)
      return () => document.removeEventListener('keydown', onKeyDown, true)
    }

    return { name: 'enter-swap', inject: [], apply }
  },
})
