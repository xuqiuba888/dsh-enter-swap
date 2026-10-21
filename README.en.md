# dsh-enter-swap

[中文](README.md) | English

A minimal DSH (DeepSeek Harness) web plugin that swaps the composer keys:
**Enter inserts a newline, Shift+Enter sends.** Zero dependencies, no settings
page, hardcoded behavior — install and go.

## Features

- **Enter → newline; Shift+Enter → send**
- **Persistent keymap badge pinned to the composer's bottom-right corner:
  〔Shift+Enter 发送消息〕〔Enter 换行〕** (since 0.1.2; never intercepts the
  mouse, theme-neutral grays, follows the composer as it grows or remounts)
- Ctrl/Cmd+Enter (native accelerated delivery) and Alt+Enter stay native
- IME composition is never intercepted (Chinese/Japanese/Korean input safe)
- While a candidate menu (slash commands / @mentions) is open, Enter keeps
  selecting menu items as usual
- No settings page, no network requests, no file I/O, zero npm dependencies

## Install

```bash
dsh plugin --profile web add github:xuqiuba888/dsh-enter-swap
```

Same for any other profile (`--profile <name>`). Restart dsh afterwards
(restart the Desktop/NEXT app), then hard-refresh the browser/UI
(Ctrl+Shift+R) to activate.

### Update & uninstall

```bash
dsh plugin --profile web update dsh-enter-swap   # update to latest
dsh plugin --profile web remove dsh-enter-swap   # uninstall; refresh restores native keys
```

## Repository layout

```
├── package.json         # dsh.client (web plugin) + dsh.bundle (profile patch) declarations
├── cordis.patch.yml     # bundle patch: inserts the plugin line
├── pnpm-lock.yaml       # dependency snapshot (zero deps; lockfile-only convention)
├── lib/
│   └── index.js         # Host half: empty apply() (no host behavior needed)
└── client/
    └── client.js        # Client half: capture-phase key swap + hint badge
```

## How it works

- Listens for `keydown` in the capture phase on `document`, and only acts
  when the target sits inside the composer (`[data-composer-input="true"]`)
- Gesture rules: Alt/Ctrl/Cmd combos always pass through; `isComposing` /
  keyCode 229 passes through; a portal menu mounted directly under `<body>`
  **and actually visible** (`role="menu"` / `"listbox"`, i.e. the slash/@
  candidate popups) passes through so Enter selects the item — hidden leftover
  portals (e.g. the workspace picker after creating a new session) do NOT
  count as an open menu
- On a hit: `preventDefault + stopPropagation`, then re-dispatches the swapped
  gesture as a synthetic KeyboardEvent to the engine — **the engine keeps
  owning the semantics (send / queue / newline)**
- The client bundle is plain JS in the `__ModuleLoader__` factory format; no
  build step

## Compatibility

DSH 0.2.x (developed and verified against the 0.2.1-rc.2 web UI). Uses no
engine-version-specific internal APIs.

## License

MIT
