import Phaser from "phaser";
import type { UpdraftDef } from "../data/levels";
import { DEPTH } from "../types";
import type { Player } from "./Player";

/** 柱内升力加速度（px/s²）与终端上升速度 */
const LIFT_ACCEL = 1600;
const LIFT_MAX_RISE = 330;
/** 气流可见粒子数 */
const STREAKS = 5;

/** 上升气流：地面到柱顶的升力柱，柱内每帧抬升玩家（松开方向即可乘风到顶层浮台）；
 * 视觉为淡青柱体 + 循环上升的气流粒子 */
export class Updraft {
  private readonly def: UpdraftDef;
  private readonly bottom: number;

  constructor(scene: Phaser.Scene, def: UpdraftDef, groundTop: number) {
    this.def = def;
    this.bottom = groundTop;

    scene.add
      .rectangle(def.x, def.top, def.w, groundTop - def.top, 0x39d0ff, 0.07)
      .setOrigin(0, 0)
      .setDepth(DEPTH.decor);
    scene.add
      .rectangle(def.x - 2, def.top, 2, groundTop - def.top, 0x39d0ff, 0.28)
      .setOrigin(0, 0)
      .setDepth(DEPTH.decor);
    scene.add
      .rectangle(def.x + def.w, def.top, 2, groundTop - def.top, 0x39d0ff, 0.28)
      .setOrigin(0, 0)
      .setDepth(DEPTH.decor);
    // 底部出风口栅格
    scene.add
      .rectangle(def.x, groundTop - 4, def.w, 4, 0x39d0ff, 0.4)
      .setOrigin(0, 0)
      .setDepth(DEPTH.decor);

    for (let i = 0; i < STREAKS; i++) {
      const dot = scene.add
        .circle(def.x + 10 + ((def.w - 20) * i) / (STREAKS - 1), groundTop - 10, 2, 0x9be8ff, 0.55)
        .setDepth(DEPTH.decor);
      scene.tweens.add({
        targets: dot,
        y: def.top + 8,
        alpha: 0,
        duration: 750,
        repeat: -1,
        delay: i * 150,
        ease: "Linear",
      });
    }
  }

  /** 每帧由场景驱动：玩家在柱内则持续施加升力（钳制终端速度） */
  tick(player: Player, deltaMs: number): void {
    const body = player.body as Phaser.Physics.Arcade.Body;
    const insideX = player.x > this.def.x && player.x < this.def.x + this.def.w;
    const insideY = player.y > this.def.top && player.y < this.bottom + 20;
    if (!insideX || !insideY) return;
    const nextVy = body.velocity.y - LIFT_ACCEL * (deltaMs / 1000);
    body.setVelocityY(Math.max(nextVy, -LIFT_MAX_RISE));
  }
}
