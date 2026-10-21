# dsh-enter-swap

DSH（DeepSeek Harness）Web 插件：**输入框 Enter = 换行，Shift+Enter = 发送**。
极简、零依赖、无设置页、行为固定，装完即用。

A minimal DSH web plugin that swaps the composer keys: **Enter inserts a
newline, Shift+Enter sends.** Zero dependencies, no settings page, hardcoded
behavior — install and go.

## 功能

- **Enter → 换行；Shift+Enter → 发送**
- Ctrl/Cmd+Enter（原生加速投递）、Alt+Enter 保持原生
- 中文输入法组词过程不拦截（IME 组帧放行）
- 斜杠命令 / @提及候选菜单打开时，Enter 照常选中菜单项
- 无设置页、无网络请求、无文件读写、零 npm 依赖

## 安装

```bash
dsh plugin --profile web add github:xuqiuba888/dsh-enter-swap
```

其他 profile 同理（`--profile <名>`）。装完重启 dsh（Desktop/NEXT 重启应用），
浏览器/界面硬刷新（Ctrl+Shift+R）生效。

### 卸载与更新

```bash
dsh plugin --profile web update dsh-enter-swap   # 更新到最新
dsh plugin --profile web remove dsh-enter-swap   # 卸载，刷新即回原生
```

## 文件结构

```
├── package.json         # dsh.client（Web 插件）+ dsh.bundle（profile patch）声明
├── cordis.patch.yml     # bundle patch：插入插件行
├── pnpm-lock.yaml       # 依赖快照（零依赖，仅为 link 安装惯例）
├── lib/
│   └── index.js         # Host 半部：空实现（本插件不需要宿主行为）
└── client/
    └── client.js        # Client 半部：捕获阶段按键互换
```

## 实现要点

- 在 document 捕获阶段监听 `keydown`，仅当目标位于输入框
  （`[data-composer-input="true"]`）内才处理
- 手势判定：Alt/Ctrl/Cmd 一律放行；`isComposing` / keyCode 229 放行；
  检测到挂载在 `<body>` 直下的 portal 菜单（`role="menu" / "listbox"`，
  即斜杠/@候选弹层）时放行，Enter 照常选中菜单项
- 命中时 `preventDefault + stopPropagation`，再把互换后的手势以合成
  KeyboardEvent 派发回引擎——**语义（发送/排队/换行）仍由引擎自己决定**
- Client bundle 为纯 JS，`__ModuleLoader__` 工厂格式，无需构建步骤

## 兼容性

DSH 0.2.x（在 0.2.1-rc.2 web 界面上开发并验证）。不使用任何引擎版本特定的
内部 API。

## License

MIT
