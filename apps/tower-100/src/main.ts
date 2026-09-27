import "./style.css";
import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, GRAVITY_Y } from "./config";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { ResultScene } from "./scenes/ResultScene";
import { TitleScene } from "./scenes/TitleScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#10142a",
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: GRAVITY_Y },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, GameScene, ResultScene],
});
