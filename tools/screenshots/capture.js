// README 截图生成：启动各游戏 dev server → headless Chrome(CDP) 驱动至实机画面 → 截图到 docs/screenshots/
// 前提：本机 Chrome(与 animal-quest e2e 相同)；依赖经 workspace `vp install` 安装
// 用法：仓库根 `vp run shots`，或 `node tools/screenshots/capture.js`
// 驱动要点：
//   animal-quest ?scene=Level1&char=frog&auto=1&x=4800 调试参数直入战斗(BootScene 支持)
//   tower-100 标题页 keydown 任意键开始(M 除外)，250ms 淡出后进 GameScene
//   pixel-pet 纯按钮 UI 无键盘入口：先种 pixelpet.save.v1 最小存档，再经 __game.scene.start("game") 进房间
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");

const ROOT = path.join(__dirname, "..", "..");
const OUT_DIR = path.join(ROOT, "docs", "screenshots");
const CDP_PORT = 9226;

const DEFAULT_CHROME =
  process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : "google-chrome";

const SHOTS = [
  {
    name: "animal-quest",
    port: 5174,
    dev: "dev:animal-quest",
    viewport: { width: 960, height: 540 },
    // vite 默认绑 localhost(::1)，不要写 127.0.0.1
    url: "http://localhost:5174/?scene=Level1&char=frog&auto=1&x=4800",
    async drive(page) {
      await page.waitForTimeout(2600);
    },
  },
  {
    name: "tower-100",
    port: 5175,
    dev: "dev:tower-100",
    viewport: { width: 480, height: 720 },
    url: "http://localhost:5175/",
    async drive(page) {
      await page.waitForTimeout(1200);
      // 合成按键需真实按压时长，同 e2e run.js 的 90ms 约定
      await page.keyboard.down("Enter");
      await page.waitForTimeout(90);
      await page.keyboard.up("Enter");
      await page.waitForTimeout(1600);
    },
  },
  {
    name: "pixel-pet",
    port: 5176,
    dev: "dev:pixel-pet",
    viewport: { width: 480, height: 720 },
    url: "http://localhost:5176/?e2e",
    async drive(page) {
      // 无档时标题页只有"开始养成"按钮；种一份最小存档走"继续养育"路径，
      // SaveManager.load() 逐字段钳制，仅 speciesId 合法即可通过
      await page.evaluate(() => {
        localStorage.setItem("pixelpet.save.v1", JSON.stringify({ speciesId: "cat", variant: 0 }));
      });
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(1200);
      await page.evaluate(() => window.__game.scene.start("game"));
      await page.waitForTimeout(1800);
    },
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function portOpen(port) {
  try {
    const res = await fetch(`http://localhost:${port}/`);
    return res.ok;
  } catch {
    return false;
  }
}

function killTree(pid) {
  if (pid === undefined) return;
  if (process.platform === "win32") {
    // vp → vite 是进程树，proc.kill() 杀不干净
    spawn("taskkill", ["/F", "/T", "/PID", String(pid)], { stdio: "ignore" });
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // 进程已退出
    }
  }
}

// 端口已被占用(如开发者已手动起服)则复用且不清理；否则 spawn `vp run dev:*` 并等就绪
async function ensureServer(shot, started) {
  if (await portOpen(shot.port)) {
    console.log(`[dev] :${shot.port} 已在运行，复用`);
    return;
  }
  const proc = spawn("vp", ["run", shot.dev], { cwd: ROOT, stdio: "ignore" });
  started.push(proc);
  for (let i = 0; i < 120; i++) {
    if (await portOpen(shot.port)) {
      console.log(`[dev] ${shot.dev} 就绪 :${shot.port}`);
      return;
    }
    await sleep(500);
  }
  throw new Error(`${shot.dev} 60s 未就绪 :${shot.port}`);
}

async function waitForDevtools(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return true;
    } catch {
      // 尚未就绪，继续等
    }
    await sleep(250);
  }
  return false;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const started = [];
  const chrome = spawn(
    DEFAULT_CHROME,
    [
      "--headless=new",
      "--no-first-run",
      "--disable-gpu",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${path.join(os.tmpdir(), `chrome-games-shots-${CDP_PORT}`)}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  const errors = [];
  try {
    if (!(await waitForDevtools(CDP_PORT))) throw new Error("Chrome devtools 未就绪");
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
    const context = browser.contexts()[0] || (await browser.newContext());

    for (const shot of SHOTS) {
      await ensureServer(shot, started);
      const page = await context.newPage();
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(`${shot.name}: ${m.text()}`);
      });
      page.on("pageerror", (e) =>
        errors.push(`${shot.name}: ${e instanceof Error ? e.stack : String(e)}`),
      );
      await page.setViewportSize(shot.viewport);
      await page.goto(shot.url, { waitUntil: "load" });
      // 每游戏独立起跑：清掉临时 profile 里上次运行的存档/最高分
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload({ waitUntil: "load" });
      await shot.drive(page);
      const file = path.join(OUT_DIR, `${shot.name}.png`);
      await page.screenshot({ path: file });
      console.log(`[shot] ${file}`);
      await page.close().catch(() => {});
    }

    console.log("js-errors:", errors.length);
    errors.slice(0, 6).forEach((e) => console.log("  ERR:", e.slice(0, 500)));
    if (errors.length > 0) process.exitCode = 1;
    console.log("RESULT: ok");
  } catch (e) {
    console.log("RESULT: fail", String(e).slice(0, 300));
    process.exitCode = 1;
  } finally {
    chrome.kill();
    started.forEach((p) => killTree(p.pid));
  }
}

void main();
