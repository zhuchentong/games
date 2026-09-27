# E2E 浏览器校验工具

用本机 Chrome（headless + CDP）以**真实时间、真实键盘事件**驱动游戏页面，输出截图与 JS 错误计数。每阶段验收必用（`js-errors: 0` 为硬性标准）。

## 准备（一次性）

```powershell
cd tools/e2e
npm i   # playwright-core（本目录 package.json 已与主工程隔离，用 npm 安装）
```

## 使用

先起游戏（二选一）：

```powershell
pnpm run dev        # 开发服务器，默认 http://localhost:5173（被占用时自动换端口，以启动日志为准）
pnpm run preview    # 预览 dist 构建产物
```

跑校验（Windows PowerShell 需 `-ExecutionPolicy Bypass`）：

```powershell
powershell -ExecutionPolicy Bypass -File run.ps1 -Url "http://localhost:5174/?scene=Level1&char=tiger" `
  -Actions "wait:1200,hold:D,wait:1000,release:D,log:window.P.x,shot:tiger.png"
```

- 截图输出到系统 Temp 目录
- 动作关键字：`wait:ms`｜`press:Key`（如 `Enter` `ArrowRight` `j` `k`）｜`hold:Key`｜`release:Key`｜`shot:名.png`｜`reload`｜`log:js表达式`
- `log` 动作可在页面里执行任意 JS（配合游戏调试后门 `window.__game` 断言玩家状态）

### 写动作串的三条硬规则（踩过的坑）

1. **整个动作串不能含半角逗号**：harness 按逗号分割动作，`log` 里的 JS 表达式也不能有逗号（`Math.max(a,b)` 都不行，多参数调用换成多次赋值或单参数）
2. **`press` 已内置 90ms 按住**：合成按键 down+up 同帧到达时，Phaser keyup 会立刻清掉 `_justDown`，JustDown 轮询永远读不到；harness 已改为按住 90ms 再松开，等价真人按键（2026-09-26 起）
3. **`log` 表达式不用包引号**：`log:window.P.x` 即可；表达式内需要字符串时用单引号（`log:window.P.config.id==='wolf'`）

## 注意事项

- 每次运行用独立端口 + 独立 Chrome profile（避免 profile 锁）；localStorage 按 profile 隔离——需要验证存档持久化时，在同一次运行内用 `reload` 动作
- Chrome headless 的 `--virtual-time-budget` 模式下 Phaser 主循环不推进（不要用它做带时间的校验，本工具走真实时间）
- 键盘事件发往页面焦点：动作序列里保证先 `wait` 一小段让画布获得焦点
- job.json 由 PowerShell 5.1 写出带 BOM，run.js 读取时已剥离，两侧（WSL/Windows）均可跑
