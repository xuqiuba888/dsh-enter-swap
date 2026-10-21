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

    /**
     * Hint badge pinned to the composer's bottom-right corner:
     * [Shift+Enter 发送消息] [Enter 换行]. pointer-events:none, theme-neutral
     * grays, re-anchored on resize/scroll/typing growth and re-attached if the
     * engine remounts the composer (SPA navigation).
     */
    function mountHint() {
      const BADGE_ID = 'dsh-enter-swap-hint'
      const style = document.createElement('style')
      style.id = 'dsh-enter-swap-hint-style'
      style.textContent = `
#${BADGE_ID} { position: fixed; z-index: 2147483000; display: flex; gap: 4px;
  pointer-events: none; opacity: .78; font-size: 11px; line-height: 16px;
  font-family: system-ui, sans-serif; }
#${BADGE_ID} span { padding: 1px 7px; border-radius: 999px; white-space: nowrap;
  background: rgba(127,127,127,.13); color: rgba(127,127,127,.95);
  border: 1px solid rgba(127,127,127,.28); }`
      document.head.appendChild(style)

      const badge = document.createElement('div')
      badge.id = BADGE_ID
      const chipSend = document.createElement('span')
      chipSend.textContent = 'Shift+Enter 发送消息'
      const chipNewline = document.createElement('span')
      chipNewline.textContent = 'Enter 换行'
      badge.appendChild(chipSend)
      badge.appendChild(chipNewline)
      badge.style.display = 'none'
      document.body.appendChild(badge)

      let queued = false
      const position = () => {
        queued = false
        const composer = document.querySelector(COMPOSER_SELECTOR)
        if (!composer || !composer.isConnected) { badge.style.display = 'none'; return }
        const r = composer.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) { badge.style.display = 'none'; return }
        if (!badge.isConnected) document.body.appendChild(badge)
        badge.style.display = ''
        const br = badge.getBoundingClientRect()
        badge.style.left = Math.round(r.right - br.width - 8) + 'px'
        badge.style.top = Math.round(r.bottom - br.height - 5) + 'px'
      }
      const schedule = () => {
        if (queued) return
        queued = true
        requestAnimationFrame(position)
      }

      const onResize = () => schedule()
      const onScroll = () => schedule()
      window.addEventListener('resize', onResize)
      window.addEventListener('scroll', onScroll, { capture: true, passive: true })

      const observer = new MutationObserver(schedule)
      observer.observe(document.body, { childList: true, subtree: true })

      const timer = setInterval(schedule, 600)
      schedule()

      return () => {
        window.removeEventListener('resize', onResize)
        window.removeEventListener('scroll', onScroll, { capture: true })
        observer.disconnect()
        clearInterval(timer)
        badge.remove()
        style.remove()
      }
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
      const disposeHint = mountHint()
      return () => {
        document.removeEventListener('keydown', onKeyDown, true)
        disposeHint()
      }
    }

    return { name: 'enter-swap', inject: [], apply }
  },
})
