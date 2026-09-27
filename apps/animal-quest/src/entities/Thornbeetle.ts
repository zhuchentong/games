import type { BeetleDef } from "../data/enemies";
import { ENEMY_ANIMS } from "../systems/Textures";
import { GearBug } from "./GearBug";

/** 刺壳甲虫：黑森林地面巡逻虫（齿轮虫同款往返巡逻行为，换森林皮），荆棘背壳随爬行微颤 */
export class Thornbeetle extends GearBug {
  constructor(scene: Phaser.Scene, def: BeetleDef) {
    super(scene, def);
  }

  protected applySkin(): void {
    this.setTexture("beetle0");
  }

  protected crawlAnimKey(): string {
    return ENEMY_ANIMS.beetleCrawl;
  }
}
