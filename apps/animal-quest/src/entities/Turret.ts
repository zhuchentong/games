import Phaser from "phaser";
import type { TurretDef } from "../data/enemies";
import { ENEMY_ANIMS } from "../systems/Textures";
import { Enemy } from "./Enemy";
import { Projectile } from "./Projectile";
import type { Player } from "./Player";

const FIRE_INTERVAL_MS = 1900;
const BULLET_SPEED = 240;

/** 炮台：固定阵地，玩家进入射程后定时朝玩家发射子弹 */
export class Turret extends Enemy {
  private readonly range: number;
  private fireCd = 800;
  private recoiling = false;
  private recoilUntil = 0;

  constructor(scene: Phaser.Scene, def: TurretDef) {
    super(scene, def.x, def.y, "turret", def.hp, def.touchDamage);
    this.range = def.range;
  }

  tick(player: Player, time: number, delta: number): void {
    // 开火后坐帧：短暂切换到 fire 纹理再回常态
    if (this.recoiling) {
      if (time >= this.recoilUntil) {
        this.setTexture("turret");
        this.recoiling = false;
      } else {
        this.play(ENEMY_ANIMS.turretFire, true);
      }
    }

    this.fireCd -= delta;
    if (this.fireCd > 0) return;

    const dx = player.x - this.x;
    const dy = player.y - 14 - (this.y - 12);
    const dist = Math.hypot(dx, dy);
    if (dist > this.range || dist < 24) return;

    this.fireCd = FIRE_INTERVAL_MS;
    this.recoiling = true;
    this.recoilUntil = time + 130;
    this.setFlipX(dx < 0);
    new Projectile(
      this.scene,
      this.x + Math.sign(dx) * 16,
      this.y - 12,
      "bullet",
      (dx / dist) * BULLET_SPEED,
      (dy / dist) * BULLET_SPEED,
      { damage: 8, fromPlayer: false, ttlMs: 2400 },
    );
  }
}
