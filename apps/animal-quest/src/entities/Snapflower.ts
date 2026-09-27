import type { SnapflowerDef } from "../data/enemies";
import { Spitter } from "./Spitter";

/** 食人花：黑森林的定点食肉植物（喷火龟同款抛射行为，换皮），向玩家吐出弧线毒孢子；
 * 开火后坐帧换成张口咬合姿态 */
export class Snapflower extends Spitter {
  constructor(scene: Phaser.Scene, def: SnapflowerDef) {
    super(scene, def);
  }

  protected applySkin(): void {
    this.setTexture("snapflower");
  }

  protected idleTexture(): string {
    return "snapflower";
  }

  protected fireTexture(): string {
    return "snapflower-snap";
  }

  protected shotTexture(): string {
    // 毒孢子弹：自带绿色拖尾（Projectile 弹体拖尾表已登记 poison 色）
    return "poison";
  }
}
