# dsh-enter-swap

DSH (DeepSeek Harness) web 插件：**输入框 Enter = 换行，Shift+Enter = 发送**。

A minimal DSH web plugin that swaps the composer keys:
**Enter inserts a newline, Shift+Enter sends.**

## 安装 / Install

```bash
dsh plugin --profile web add github:<你的用户名>/dsh-enter-swap
```

装完重启 dsh（Desktop/NEXT 重启应用），浏览器/界面硬刷新（Ctrl+Shift+R）生效。

## 行为 / Behavior（固定，无需配置）

- **Enter → 换行；Shift+Enter → 发送**
- Ctrl/Cmd+Enter、Alt+Enter 保持原生
- 输入法组词过程不拦截（中文输入无影响）
- 斜杠命令 / @提及候选菜单打开时，Enter 照常选中菜单项

## 原理 / How it works

宿主半边（`lib/index.js`）是空实现；浏览器半边（`client/client.js`）只有一个
document 捕获阶段的 keydown 监听器：命中输入框（`[data-composer-input="true"]`）
的 Enter 手势时，阻止默认行为并把互换后的手势原样派发回引擎。语义（发送/排队/
换行、IME、候选菜单仲裁）仍由引擎自己决定。零依赖、无设置页、无网络请求、无文件读写。

## 卸载 / Uninstall

```bash
dsh plugin --profile web remove dsh-enter-swap
```

## 兼容性 / Compatibility

DSH 0.2.x（在 0.2.1-rc.2 web 界面上开发并验证）。插件不使用任何引擎版本特定
的内部 API。
