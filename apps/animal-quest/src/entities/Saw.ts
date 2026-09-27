import Phaser from "phaser";
import { pingPong01 } from "../utils/math";
import type { SawDef } from "../data/levels";
import type { Player } from "./Player";

/** 巡逻锯片：参数化往返运动 + 旋转视觉，近距离半径判定受伤（玩家无敌帧防连击） */
export class Saw extends Phaser.GameObjects.Image {
  private readonly x1: number;
  private readonly y1: number;
  private readonly x2: number;
  private readonly y2: number;
  private readonly durMs: number;
  private readonly damage: number;
  private readonly radius = 30;
  private readonly t0: number;

  constructor(scene: Phaser.Scene, def: SawDef) {
    super(scene, def.x1, def.y1, "saw");
    this.x1 = def.x1;
    this.y1 = def.y1;
    this.x2 = def.x2;
    this.y2 = def.y2;
    this.durMs = def.durMs;
    this.damage = def.damage;
    this.t0 = 0;
    scene.add.existing(this);
  }

  tick(player: Player, time: number): void {
    // 三角波 0..1..0 往返
    const t = pingPong01(time - this.t0, this.durMs);
    this.x = this.x1 + (this.x2 - this.x1) * t;
    this.y = this.y1 + (this.y2 - this.y1) * t;
    this.angle += 6;

    if (Phaser.Math.Distance.Between(player.x, player.y - 18, this.x, this.y) < this.radius) {
      player.damage(this.damage, this.x);
    }
  }
}
