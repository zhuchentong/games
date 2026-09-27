# 游戏合集迁移实施计划(animal-quest + tower-100)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 dogfight-2d(动物斗恶龙)与 floor-100(是男人就上100层)迁入 games monorepo,更名为 `apps/animal-quest`、`apps/tower-100`,并把 website 改造为游戏合集首页。

**Architecture:** 独立 Vite 应用 + 同源子路径部署;依赖统一 workspace catalog(TS7/vite-plus rc.1/phaser 4.2.1);e2e harness 保持 npm 隔离。

**Tech Stack:** Vite+ (vp), pnpm workspace + catalog, Phaser 4, TypeScript 7.0.2, Playwright (e2e)。

## Global Constraints

- monorepo 根:`C:\Users\zhuchentong\Projects\zhuxuyao\games`
- 源一:`C:\Users\zhuchentong\Projects\zhuxuyao\dogfight-2d` → `apps/animal-quest`(dev 端口 5174)
- 源二:`C:\Users\zhuchentong\Projects\zhuxuyao\games-01\floor-100` → `apps/tower-100`(dev 端口 5175)
- 不迁移:.git、node_modules、dist、pnpm-lock.yaml、pnpm-workspace.yaml、AGENTS.md、.vite-hooks、.vscode;animal-quest 另不迁 docs、.agents、skills-lock.json、.zcodeignore、.tmp-progress-full.md;e2e 另不迁 node_modules、job.json
- 提交序列:基线 → animal-quest → tower-100 → 首页改造(catalog+根脚本)
- robocopy 退出码 0-7 为成功,≥8 为失败

---

### Task 1: 基线提交

- [ ] **Step 1: 提交 starter 与文档**

```powershell
git -C "C:\Users\zhuchentong\Projects\zhuxuyao\games" add -A
git -C "C:\Users\zhuchentong\Projects\zhuxuyao\games" commit -m "chore: Vite+ monorepo starter 基线(含游戏迁移设计)"
```

Expected: 提交成功,包含 apps/packages/文档。

### Task 2: 迁入 animal-quest

- [ ] **Step 1: 复制核心文件**

```powershell
robocopy "C:\Users\zhuchentong\Projects\zhuxuyao\dogfight-2d" "C:\Users\zhuchentong\Projects\zhuxuyao\games\apps\animal-quest" /E /XD .git node_modules dist docs .agents .vscode .vite-hooks /XF pnpm-lock.yaml pnpm-workspace.yaml AGENTS.md skills-lock.json .zcodeignore .tmp-progress-full.md
robocopy "C:\Users\zhuchentong\Projects\zhuxuyao\dogfight-2d\tools\e2e" "C:\Users\zhuchentong\Projects\zhuxuyao\games\apps\animal-quest\tools\e2e" /E /XD node_modules /XF job.json
```

- [ ] **Step 2: 写入 `apps/animal-quest/package.json`**

```json
{
  "name": "animal-quest",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vp dev",
    "build": "tsc && vp build",
    "preview": "vp preview"
  },
  "dependencies": {
    "phaser": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vite": "catalog:",
    "vite-plus": "catalog:"
  }
}
```

- [ ] **Step 3: 写入 `apps/animal-quest/vite.config.ts`**

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  base: "./",
  server: { port: 5174 },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
```

- [ ] **Step 4: e2e 包更名**——`apps/animal-quest/tools/e2e/package.json` 中 `"name": "dogfight-e2e"` → `"animal-quest-e2e"`(其余不动)

- [ ] **Step 5: 校验目录**(确认无 AGENTS.md/pnpm-workspace.yaml/node_modules;有 src、public、tools/e2e/cases、index.html、tsconfig.json、.gitignore)

- [ ] **Step 6: 提交**

```powershell
git add apps/animal-quest && git commit -m "feat: 迁入 animal-quest(原 dogfight-2d 动物斗恶龙)"
```

### Task 3: 迁入 tower-100

- [ ] **Step 1: 复制核心文件**

```powershell
robocopy "C:\Users\zhuchentong\Projects\zhuxuyao\games-01\floor-100" "C:\Users\zhuchentong\Projects\zhuxuyao\games\apps\tower-100" /E /XD .git node_modules dist .vscode .vite-hooks /XF pnpm-lock.yaml pnpm-workspace.yaml AGENTS.md
```

- [ ] **Step 2: 写入 `apps/tower-100/package.json`**(同 Task 2 Step 2,name 改 `"tower-100"`)

- [ ] **Step 3: 写入 `apps/tower-100/vite.config.ts`**

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  base: "./",
  server: { port: 5175 },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
```

- [ ] **Step 4: 校验并提交**

```powershell
git add apps/tower-100 && git commit -m "feat: 迁入 tower-100(原 floor-100 是男人就上100层)"
```

### Task 4: catalog + 根脚本 + 首页改造

- [ ] **Step 1: `pnpm-workspace.yaml` catalog 增加 `phaser: ^4.2.1`**(按字母序插入 `"@types/node"` 与 `typescript` 之间)

- [ ] **Step 2: 根 `package.json` scripts 增加**:`"dev:animal-quest": "vp run animal-quest#dev"`、`"dev:tower-100": "vp run tower-100#dev"`

- [ ] **Step 3: 首页**——重写 `apps/website/index.html`(lang zh-CN,title 游戏合集)、`src/main.ts`(游戏卡片,DEV 链 127.0.0.1:5174|5175,prod 链 `./animal-quest/`、`./tower-100/`)、`src/style.css`(暗色卡片风);删除 `src/counter.ts`、`src/assets/`(hero.png/typescript.svg/vite.svg)、`public/icons.svg`

- [ ] **Step 4: 提交**

```powershell
git add -A && git commit -m "feat: website 改造为游戏合集首页;catalog 增加 phaser;根脚本增加两游戏 dev 入口"
```

### Task 5: 安装与构建验证

- [ ] **Step 1: `vp install`**(期望成功生成 lockfile;e2e 目录不在 workspace 内)
- [ ] **Step 2: `vp run -r build`**(期望 website/animal-quest/tower-100/utils 四包 build 全过;tsc=TS7)
- [ ] **Step 3: `vp check`**(期望 0 error;如有 lint/fmt 报错就地修复后重跑)

### Task 6: e2e 与 dev 冒烟

- [ ] **Step 1: `npm ci`(在 apps/animal-quest/tools/e2e)**
- [ ] **Step 2: 后台启动 `vp run animal-quest#dev`,轮询 `http://127.0.0.1:5174` 就绪**
- [ ] **Step 3: `node run-cases.js`(在 tools/e2e,期望 `SUMMARY: N/N passed`)**
- [ ] **Step 4: tower-100(5175)与 website(5173)dev server 冒烟:HTTP 200 + 页面含预期标记;随后停止所有 dev server**

### Task 7: 清理源目录

- [ ] **Step 1: 全部验证通过后删除源目录**

```powershell
Remove-Item -LiteralPath "C:\Users\zhuchentong\Projects\zhuxuyao\dogfight-2d" -Recurse -Force
Remove-Item -LiteralPath "C:\Users\zhuchentong\Projects\zhuxuyao\games-01\floor-100" -Recurse -Force
```

(games-01 若因此为空则一并删除)
