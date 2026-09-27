import Phaser from "phaser";
import type { MovPlatDef } from "../data/levels";
import { pingPong01 } from "../utils/math";
import type { Player } from "./Player";

/** 移动吊台：水平往返浮台（吊装车间上层路线）。静态碰撞体每帧同步位置，
 * 站立其上的玩家按帧位移携带（只处理水平，垂直抖动不可接受） */
export class MovPlatform {
  private readonly def: MovPlatDef;
  private readonly spr: Phaser.GameObjects.TileSprite;
  private readonly player: Player;
  private cx: number;

  constructor(scene: Phaser.Scene, player: Player, def: MovPlatDef) {
    this.def = def;
    this.player = player;
    this.cx = def.x;
    this.spr = scene.add.tileSprite(def.x, def.y, def.w, 16, "plate").setOrigin(0);
    scene.physics.add.existing(this.spr, true);
    scene.physics.add.collider(player, this.spr);
    // 吊索装饰
    scene.add.rectangle(def.x + def.w / 2, def.y - 26, 2, 26, 0x525c6a).setOrigin(0.5, 0);
  }

  tick(time: number): void {
    const nx = this.def.x + this.def.dx * pingPong01(time, this.def.durMs);
    const dx = nx - this.cx;
    this.cx = nx;
    this.spr.x = nx;
    (this.spr.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    // 携带站立玩家（顶面接触 + 水平落在台面上）
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down && Math.abs(this.player.x - (nx + this.def.w / 2)) < this.def.w / 2 + 8) {
      this.player.x += dx;
    }
  }
}
