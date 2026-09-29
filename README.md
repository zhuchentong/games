# 游戏合集

Vite+ monorepo,收录自研小游戏。

## 应用

| 应用                | 游戏                          | dev 端口 |
| ------------------- | ----------------------------- | -------- |
| `apps/website`      | 游戏合集首页                  | 5173     |
| `apps/animal-quest` | 动物斗恶龙(原 dogfight-2d)    | 5174     |
| `apps/tower-100`    | 是男人就上100层(原 floor-100) | 5175     |
| `apps/pixel-pet`    | 像素电子宠物                  | 5176     |

## Development

- Check everything is ready:

```bash
vp run ready
```

- Run the tests:

```bash
vp run -r test
```

- Build the monorepo:

```bash
vp run -r build
```

- Run the development server:

```bash
vp run dev
```

- Run a game dev server:

```bash
vp run dev:animal-quest
vp run dev:tower-100
vp run dev:pixel-pet
```

- 动物斗恶龙 E2E(需本机 Chrome,先起 dev server):

```bash
cd apps/animal-quest/tools/e2e
npm ci
node run-cases.js
```
