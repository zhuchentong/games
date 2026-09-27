import Phaser from "phaser";
import { HealthPack } from "./entities/HealthPack";
import { BaseLevelScene } from "./scenes/BaseLevelScene";
import { BootScene } from "./scenes/BootScene";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene";
import { Level1Scene } from "./scenes/Level1Scene";
import { Level2Scene } from "./scenes/Level2Scene";
import { Level3Scene } from "./scenes/Level3Scene";
import { LEVEL_SCENE_KEYS } from "./scenes/levelKeys";
import { ResultScene } from "./scenes/ResultScene";
import { TitleScene } from "./scenes/TitleScene";
import { UIScene } from "./scenes/UIScene";
import { Music } from "./systems/Music";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 540,
  pixelArt: true,
  backgroundColor: "#101418",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 900 }, debug: false },
  },
  scene: [
    BootScene,
    TitleScene,
    CharacterSelectScene,
    Level1Scene,
    Level2Scene,
    Level3Scene,
    UIScene,
    ResultScene,
  ],
});

// 移除 HTML 加载占位（Phaser 已把画布挂进 #app）
document.querySelector(".boot-loading")?.remove();

// 调试后门：E2E 经 window.__game 断言玩家状态（坐标/血量/冷却），__music 断言 BGM 曲目，
// __dropPack() 在玩家脚下生成血包（无参签名：E2E 动作串按逗号分割，log 禁半角逗号）
(window as unknown as { __game?: Phaser.Game }).__game = game;
(window as unknown as { __music?: typeof Music }).__music = Music;
(window as unknown as { __pack?: typeof HealthPack }).__pack = HealthPack;
// 任意活动关卡场景的玩家脚下生成血包（原来只认第一关）
(window as unknown as { __dropPack?: () => void }).__dropPack = () => {
  for (const key of LEVEL_SCENE_KEYS) {
    const scene = game.scene.getScene(key) as BaseLevelScene | null;
    if (scene?.sys.isActive() && scene.player) {
      new HealthPack(scene, scene.player.x + 40, 470, scene.player);
      return;
    }
  }
};

export default game;
