# 游戏合集 monorepo 迁移设计

日期:2026-09-27
状态:已批准

## 目标

将两个独立 Phaser 4 游戏迁入 Vite+ monorepo `games`,并把 `apps/website` 改造为游戏合集首页。

| 原位置                               | 原包名      | 新名           | 游戏内标题      |
| ------------------------------------ | ----------- | -------------- | --------------- |
| `C:\...\zhuxuyao\dogfight-2d`        | `game`      | `animal-quest` | 动物斗恶龙      |
| `C:\...\zhuxuyao\games-01\floor-100` | `floor-100` | `tower-100`    | 是男人就上100层 |

## 已确认决策

1. **Git 历史**:全新提交,不合并原 47 次提交历史(原 GitHub 仓库 `zhuchentong/dogfight-2d` 保留不动)。
2. **依赖对齐**:全部统一到 workspace catalog——`typescript ^7.0.2`、`vite-plus 1.0.0-rc.1`、`vite`(@voidzero-dev/vite-plus-core rc.1);`phaser ^4.2.1` 新增进 catalog(两游戏原解析版本均为 4.2.1,无漂移)。
3. **迁移范围**:核心工程文件 + animal-quest 的 `tools/e2e`;丢弃 docs/、.agents/、skills-lock.json、.zcodeignore、.tmp-progress-full.md、AGENTS.md(与根重复)、.vite-hooks/(vp 生成)、.vscode/、node_modules/、dist/、各自 pnpm-lock.yaml 与 pnpm-workspace.yaml。
4. **集成方式**:独立 Vite 应用 + 同源子路径部署;游戏代码零重构。
5. **源目录处置**:验证通过后删除两个本地源目录。
6. **首页**:website 从模板演示改造为游戏合集卡片首页。

## 目标结构

```
games/
├── apps/
│   ├── website/               # 游戏合集首页(卡片链接两游戏)
│   ├── animal-quest/          # 动物斗恶龙
│   │   ├── src/ public/ index.html tsconfig.json vite.config.ts package.json .gitignore
│   │   └── tools/e2e/         # Playwright e2e harness(npm 隔离,不在 pnpm workspace)
│   └── tower-100/             # 是男人就上100层
│       └── src/ public/ index.html tsconfig.json vite.config.ts package.json .gitignore
├── packages/utils/
└── pnpm-workspace.yaml        # catalog 增加 phaser: ^4.2.1
```

## 配置要点

- **animal-quest/package.json**:name `animal-quest`;`phaser: "catalog:"`;devDeps typescript/vite/vite-plus 全部 `"catalog:"`;scripts 仅 `dev/build/preview`(对齐 website,去掉 prepare)。
- **tower-100/package.json**:同上,name `tower-100`。
- **vite.config.ts**:
  - animal-quest:保留 `base: "./"`,新增 `server: { port: 5174 }`(e2e 默认 BASE=5174,零改动兼容);
  - tower-100:新增 `base: "./"` 与 `server: { port: 5175 }`;
  - 两者的 staged/fmt/lint 配置原样保留(与根一致)。
- **根 package.json scripts**:新增 `dev:animal-quest`、`dev:tower-100`(语法 `vp run <pkg>#dev`);现有 `ready` 递归覆盖新 app。
- **tools/e2e**:package 名 `dogfight-e2e` → `animal-quest-e2e`;保持 npm 隔离安装(位于 `apps/animal-quest/tools/e2e`,不被 workspace `tools/*` 通配命中);用例按 URL 参数驱动,无需改动。
- **tsconfig**:两游戏各自保留(bundler 模式)。已实测 monorepo 的 TS 7.0.2 编译 dogfight-2d 源码通过(EXIT 0)。
- **首页**:卡片两枚——动物斗恶龙、是男人就上100层;dev 模式链到 `http://127.0.0.1:5174|5175/`,生产链到 `./animal-quest/`、`./tower-100/`。

## 提交序列

1. starter 基线(含本设计文档与实施计划)
2. `feat: 迁入 animal-quest(原 dogfight-2d)`
3. `feat: 迁入 tower-100(原 floor-100)`
4. `feat: website 改造为游戏合集首页`(含 catalog phaser 与根脚本)

## 验证清单

1. `vp install` 成功;
2. 三 app `vp run <app>#build`(tsc + vite build)全部通过——tower-100 的 TS7 编译在此验证(其原 node_modules 为指向 `games\floor-100` 的失效 junction,本地已不可构建,属重建而非迁移回归);
3. animal-quest e2e 全量用例通过(需本机 Chrome,CDP 驱动);
4. tower-100 / website dev server 冒烟(页面加载无 js-error);
5. `vp check` 全仓库通过;
6. 全部通过后删除 `C:\...\dogfight-2d` 与 `C:\...\games-01\floor-100`。

## 风险与预案

| 风险                            | 预案                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| floor-100 在 TS7 下编译失败     | 同栈同依赖且 dogfight-2d 已通过,置信度高;若失败按报错修正或临时固定 TS ~6.0.2(non-catalog) |
| oxlint typeAware 对游戏代码报错 | lint 配置与根一致;个别规则违规就地修复                                                     |
| vite-plus rc.0→rc.1 运行时差异  | 配置格式已确认兼容;构建/运行时验证                                                         |
