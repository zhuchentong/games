import "./style.css";
import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./config";
import { BootScene } from "./scenes/BootScene";
import { DexScene } from "./scenes/DexScene";
import { EndScene } from "./scenes/EndScene";
import { GameScene } from "./scenes/GameScene";
import { HatchScene } from "./scenes/HatchScene";
import { TitleScene } from "./scenes/TitleScene";

// E2E / 冒烟测试:?e2e 时用 setTimeout 驱动循环(RAF 在后台/遮挡窗口会被节流)
const isE2E = new URLSearchParams(window.location.search).has("e2e");

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#141829",
  pixelArt: true,
  roundPixels: true,
  fps: { forceSetTimeOut: isE2E },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, HatchScene, GameScene, EndScene, DexScene],
});

// E2E / 冒烟测试调试后门（与 animal-quest 同款做法）
(window as unknown as { __game: Phaser.Game }).__game = game;
void game;
