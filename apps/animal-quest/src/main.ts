import "./style.css";

// 动态加载游戏主体：HTML/CSS 加载占位即时绘制，Phaser 大包分块异步拉取（首屏不再是白屏等待）
const app = document.getElementById("app");
void import("./game").catch(() => {
  if (app) app.innerHTML = '<div class="boot-loading">加载失败，请刷新重试</div>';
});
