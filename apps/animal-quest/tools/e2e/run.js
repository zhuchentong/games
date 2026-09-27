// E2E 校验 harness：经 CDP 连本机 Chrome(headless)，真实时间 + 真实键盘驱动游戏页面
// 输入：同目录 job.json（由 run.ps1 生成）=> { url, actions, port, chrome? }
// 动作：wait:ms | press:Key | hold:Key | release:Key | shot:名.png | reload | log:"js表达式"
// 输出：stdout 打印 js-errors 数量；截图落在系统 Temp
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");

const DEFAULT_CHROME =
  process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : "google-chrome";

async function waitForDevtools(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function main() {
  const job = JSON.parse(
    fs.readFileSync(path.join(__dirname, "job.json"), "utf8").replace(/^\uFEFF/, ""),
  );
  const port = job.port || 9223;
  const shotDir = job.shotDir || os.tmpdir();

  const chrome = spawn(
    job.chrome || DEFAULT_CHROME,
    [
      "--headless=new",
      "--no-first-run",
      "--disable-gpu",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${path.join(os.tmpdir(), `chrome-adl-cdp-${port}`)}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  try {
    if (!(await waitForDevtools(port))) {
      console.log("RESULT: no-devtools");
      process.exit(1);
    }
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    const context = browser.contexts()[0] || (await browser.newContext());
    const page = await context.newPage();
    await page.setViewportSize({ width: 960, height: 540 });

    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e instanceof Error ? String(e.stack) : String(e)));

    await page.goto(job.url, { waitUntil: "load" });

    // 每例存档隔离：user-data-dir 按端口跨批次复用，写入型用例（购买/检查点/通关）会在
    // localStorage 留存档，下批同端口用例开场即吃到陈旧进度（升级入存档后尤其致命）。
    // 先清空再以干净状态重载，"每例独立 profile"的语义才真正成立
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "load" });

    for (const step of (job.actions || "").split(",").filter(Boolean)) {
      const idx = step.indexOf(":");
      const kind = idx === -1 ? step : step.slice(0, idx);
      const arg = idx === -1 ? "" : step.slice(idx + 1);
      if (kind === "wait") await page.waitForTimeout(Number(arg));
      else if (kind === "press") {
        // 合成按键 down+up 间隔仅几毫秒，同一帧内 keyup 会清掉 Phaser 的 _justDown，
        // 导致 JustDown 轮询永远读不到——按住一小段真实时间，等价于真人按键
        await page.keyboard.down(arg);
        await page.waitForTimeout(90);
        await page.keyboard.up(arg);
      } else if (kind === "hold") await page.keyboard.down(arg);
      else if (kind === "release") await page.keyboard.up(arg);
      else if (kind === "shot") await page.screenshot({ path: `${shotDir}/${arg}` });
      else if (kind === "reload") await page.reload({ waitUntil: "load" });
      else if (kind === "log") console.log("[page]", await page.evaluate(arg));
    }

    console.log("js-errors:", errors.length);
    errors.slice(0, 6).forEach((e) => console.log("  ERR:", e.slice(0, 700)));
    console.log("RESULT: ok");
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  } catch (e) {
    console.log("RESULT: fail", String(e).slice(0, 300));
    process.exitCode = 1;
  } finally {
    chrome.kill();
  }
}

void main();
