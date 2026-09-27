import Phaser from "phaser";
import type { BeltDef } from "../data/levels";
import type { Player } from "./Player";

/** 传送带：站在其水平范围内时附加推送速度（在 Player.tick 设定基础速度之后调用），视觉用贴图滚动指示方向 */
export class Conveyor {
  private readonly x: number;
  private readonly w: number;
  private readonly direction: -1 | 1;
  private readonly speed: number;
  private readonly visual: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene, groundTop: number, def: BeltDef) {
    this.x = def.x;
    this.w = def.w;
    this.direction = def.direction;
    this.speed = def.speed;
    this.visual = scene.add.tileSprite(def.x, groundTop - 10, def.w, 10, "metal").setOrigin(0);
  }

  apply(player: Player, deltaMs: number): void {
    const body = player.body as Phaser.Physics.Arcade.Body;
    if (!(body.blocked.down || body.touching.down)) return;
    if (player.x < this.x || player.x > this.x + this.w) return;

    body.velocity.x += this.direction * this.speed;
    this.visual.tilePositionX += (this.direction * this.speed * deltaMs) / 1000;
  }
}
