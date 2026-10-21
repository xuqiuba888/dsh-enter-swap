// dsh-enter-swap — client (browser) half.
//
// Swaps the composer's Enter gestures, hardcoded (no settings surface):
//   plain Enter    -> newline  (re-dispatches the engine's Shift+Enter)
//   Shift+Enter    -> send     (re-dispatches the engine's plain Enter)
//
// Key swap: the engine's composer keymap is bound on the editor itself, so a
// capture-phase listener on document runs first; we stop the original gesture
// and re-emit the swapped one as a synthetic KeyboardEvent, which drives the
// engine keymap exactly like a trusted one. The engine keeps owning the
// semantics (send, queue, newline).
//
// Hint chips: registered through the engine's own slot system into
// conversation.input.left — the composer bar's leading tool group, left of
// the model selector — so they flow with the real layout and can never
// overlap typed text.
//
// Left untouched, all the time:
//   - Ctrl/Cmd+Enter (native accelerated delivery) and Alt+Enter
//   - IME composition (isComposing / keyCode 229) — Chinese input unaffected
//   - a VISIBLE candidate menu (slash commands, @mentions): portal menus
//     mounted directly under <body> count as open only while actually
//     rendered — hidden leftovers (e.g. the workspace picker after
//     new-session) never disable the swap.
window.__ModuleLoader__.load({
  id: 'dsh-enter-swap',
  factory: (require) => {
    const React = require('react')
    const jsx = require('react/jsx-runtime')

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

    /**
     * True while a portaled candidate menu (slash/@) is OPEN. A portaled menu
     * counts only when it is actually rendered: many engine dropdowns (the
     * workspace picker on new-session, model menus) stay mounted under <body>
     * after closing — hidden portals must not swallow the key swap.
     */
    function menuOpen() {
      for (const el of document.querySelectorAll('[role="menu"], [role="listbox"]')) {
        if (el.parentElement !== document.body) continue
        if (el.hidden) continue
        if (el.getAttribute('aria-hidden') === 'true') continue
        if (el.getClientRects().length === 0) continue
        return true
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

    // --- hint chips (engine slot, composer bar leading group) ---------------

    const STYLE_ID = 'dsh-enter-swap-hint-style'
    const HINT_CSS = `
.enter-swap-hint { display: inline-flex; gap: 4px; align-items: center;
  margin-left: 6px; pointer-events: none; opacity: .75;
  font-size: 11px; line-height: 16px; font-family: system-ui, sans-serif; }
.enter-swap-hint span { padding: 1px 7px; border-radius: 999px;
  white-space: nowrap; background: rgba(127,127,127,.13);
  color: rgba(127,127,127,.95); border: 1px solid rgba(127,127,127,.28); }`

    /** Inject the chips' stylesheet once for the page's lifetime. */
    function installStyles() {
      if (document.getElementById(STYLE_ID) !== null) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = HINT_CSS
      document.head.appendChild(style)
    }

    /** The two keymap chips rendered inside the composer tool bar. */
    function HintChips() {
      return jsx.jsxs('span', {
        className: 'enter-swap-hint',
        'aria-hidden': 'true',
        children: [
          jsx.jsx('span', { children: 'Shift+Enter 发送消息' }),
          jsx.jsx('span', { children: 'Enter 换行' }),
        ],
      })
    }

    // --- plugin face ---------------------------------------------------------

    const name = 'enter-swap'
    const inject = ['slots']

    function apply(ctx) {
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

      installStyles()
      const disposeSlot = ctx.slots.inject('conversation.input.left', () =>
        ctx.slots.register(
          { name: 'conversation.input.left', id: 'enter-swap-hint', order: 0 },
          HintChips,
        ),
      )

      return () => {
        document.removeEventListener('keydown', onKeyDown, true)
        if (typeof disposeSlot === 'function') disposeSlot()
      }
    }

    return { name, inject, apply }
  },
})
