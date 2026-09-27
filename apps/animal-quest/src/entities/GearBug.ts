import Phaser from "phaser";
import { pingPong01 } from "../utils/math";
import type { PatrolDef } from "../data/enemies";
import { ENEMY_ANIMS } from "../systems/Textures";
import { Enemy } from "./Enemy";
import type { Player } from "./Player";

/** 巡逻虫基类：地面往返巡逻，接触伤害（纹理原生朝右，向左移动时翻转）；
 * 皮肤经 applySkin/crawlAnimKey 钩子开放给子类换皮（齿轮虫 / 刺壳甲虫） */
export class GearBug extends Enemy {
  private readonly x1: number;
  private readonly x2: number;
  private readonly durMs: number;

  constructor(scene: Phaser.Scene, def: PatrolDef) {
    super(scene, (def.x1 + def.x2) / 2, def.y, "gearbug0", def.hp, def.touchDamage);
    this.x1 = def.x1;
    this.x2 = def.x2;
    this.durMs = ((def.x2 - def.x1) / def.speed) * 1000;
    this.applySkin();
    this.play(this.crawlAnimKey());
  }

  tick(_player: Player, time: number, _delta: number): void {
    this.x = this.x1 + (this.x2 - this.x1) * pingPong01(time, this.durMs);
    this.setFlipX(Math.floor(time / this.durMs) % 2 === 1);
  }

  /** 子类换皮钩子（构造时调用一次） */
  protected applySkin(): void {}

  /** 子类爬行动画键 */
  protected crawlAnimKey(): string {
    return ENEMY_ANIMS.gearbugCrawl;
  }
}
