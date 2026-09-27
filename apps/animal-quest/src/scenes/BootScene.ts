import Phaser from "phaser";
import { generateTextures, registerCharacterAnims, registerEnemyAnims } from "../systems/Textures";
import { isCharacterId } from "../types";
import { CharacterSelectScene } from "./CharacterSelectScene";
import { LEVEL_SCENE_KEYS } from "./levelKeys";
import { ResultScene } from "./ResultScene";
import { TitleScene } from "./TitleScene";

export class BootScene extends Phaser.Scene {
  static readonly KEY = "Boot";

  constructor() {
    super(BootScene.KEY);
  }

  create(): void {
    generateTextures(this);
    registerCharacterAnims(this);
    registerEnemyAnims(this);

    // 调试参数（无头截图/E2E 校验用）：?scene=Level1&char=frog&auto=1&x=4800
    const params = new URLSearchParams(location.search);
    this.game.registry.set("debugAuto", params.get("auto") === "1");
    const xParam = params.get("x");
    const x = xParam === null ? NaN : Number(xParam);
    this.game.registry.set("debugSpawnX", Number.isNaN(x) ? null : x);
    const charParam = params.get("char");
    this.game.registry.set("debugChar", isCharacterId(charParam) ? charParam : null);

    const target = params.get("scene");
    const known = [TitleScene.KEY, CharacterSelectScene.KEY, ...LEVEL_SCENE_KEYS, ResultScene.KEY];
    this.scene.start(target && known.includes(target) ? target : TitleScene.KEY);
  }
}
