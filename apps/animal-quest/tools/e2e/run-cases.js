// E2E 用例批量执行器：遍历 cases/*.json，逐个写 job.json 并调用 run.js，汇总 PASS/FAIL
// 用法：node run-cases.js [BASE]   （BASE 默认 http://localhost:5174）
const fs = require("node:fs");
const path = require("node:path");

const base = process.argv[2] || "http://localhost:5174";
const casesDir = path.join(__dirname, "cases");
const files = fs
  .readdirSync(casesDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

let pass = 0;
const failures = [];

for (const [i, file] of files.entries()) {
  const testCase = JSON.parse(
    fs.readFileSync(path.join(casesDir, file), "utf8").replace(/^\uFEFF/, ""),
  );
  const url = testCase.url.replace("{BASE}", base);
  const port = 9400 + i;
  fs.writeFileSync(
    path.join(__dirname, "job.json"),
    JSON.stringify({ url, actions: testCase.actions, port }),
  );
  const { spawnSync } = require("node:child_process");
  const r = spawnSync("node", [path.join(__dirname, "run.js")], {
    encoding: "utf8",
    timeout: 120000,
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const expects = testCase.expect || [];
  const ok =
    out.includes("RESULT: ok") &&
    out.includes("js-errors: 0") &&
    expects.every((s) => out.includes(s));
  if (ok) {
    pass++;
    console.log(`PASS  ${testCase.name}`);
  } else {
    failures.push(testCase.name);
    console.log(`FAIL  ${testCase.name}`);
    console.log(
      out
        .split("\n")
        .filter((l) => l.startsWith("[page]") || l.includes("ERR") || l.includes("RESULT"))
        .join("\n"),
    );
  }
}

console.log(`\nSUMMARY: ${pass}/${files.length} passed`);
if (failures.length) {
  console.log("failed: " + failures.join(" | "));
  process.exitCode = 1;
}
