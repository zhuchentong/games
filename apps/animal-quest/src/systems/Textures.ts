import type Phaser from "phaser";
import { makeBossTextures } from "./textures/boss";
import { makeCharacterTextures } from "./textures/characters";
import { makeEnemyTextures } from "./textures/enemies";
import type { MakeTexture } from "./textures/shared";
import { makeWorldTextures } from "./textures/world";

export {
  charAnim,
  ENEMY_ANIMS,
  registerCharacterAnims,
  registerEnemyAnims,
} from "./textures/anims";
export type { CharKind } from "./textures/characters";

/**
 * 程序化贴图生成（BootScene 调用一次）：共用一个 Graphics 逐key 固化。
 * 分组实现见 textures/ 各模块（世界 / 角色 / 敌人 / Boss），生成顺序不影响功能。
 */
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  const make: MakeTexture = (key, w, h, draw) => {
    draw(g);
    g.generateTexture(key, w, h);
    g.clear();
  };
  makeWorldTextures(make);
  makeCharacterTextures(make);
  makeEnemyTextures(make);
  makeBossTextures(make);
  g.destroy();
}
