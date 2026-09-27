import Phaser from "phaser";
import type { PlanterDef } from "../data/enemies";
import { Enemy } from "./Enemy";
import { Projectile } from "./Projectile";
import type { Player } from "./Player";

const FIRE_INTERVAL_MS = 2200;
const MIN_DIST = 40;
/** 抛物线滞空时间（s）：按固定滞空解算初速，落点即玩家当前位置 */
const LOB_TIME_S = 0.85;
/** 世界重力 900 + 弹体附加 1（用 gravityY 选项开启受重力） */
const LOB_GRAVITY = 901;
/** 开火后坐帧时长 */
const RECOIL_MS = 130;

/** 定点抛射手基类：阵地站位，向玩家抛射带重力的弹体（弧线可跳避，与炮台直线弹区分）；
 * 皮肤与弹体贴图经钩子开放给子类（喷火龟 / 食人花） */
export class Spitter extends Enemy {
  private readonly range: number;
  private fireCd = 1000;
  private recoiling = false;
  private recoilUntil = 0;

  constructor(scene: Phaser.Scene, def: PlanterDef) {
    super(scene, def.x, def.y, "spitter", def.hp, def.touchDamage);
    this.range = def.range;
    this.applySkin();
  }

  tick(player: Player, time: number, delta: number): void {
    // 开火后坐帧：发射口放大后回常态
    if (this.recoiling) {
      if (time >= this.recoilUntil) {
        this.setTexture(this.idleTexture());
        this.recoiling = false;
      } else {
        this.setTexture(this.fireTexture());
      }
    }

    this.fireCd -= delta;
    if (this.fireCd > 0) return;

    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    if (dist > this.range || dist < MIN_DIST) return;

    this.fireCd = FIRE_INTERVAL_MS;
    this.setFlipX(dx < 0);
    this.recoiling = true;
    this.recoilUntil = time + RECOIL_MS;
    new Projectile(
      this.scene,
      this.x + Math.sign(dx) * 14,
      this.y - 10,
      this.shotTexture(),
      dx / LOB_TIME_S,
      -(LOB_GRAVITY * LOB_TIME_S) / 2,
      { damage: 8, fromPlayer: false, ttlMs: 3000, gravityY: 1 },
    );
  }

  /** 子类换皮钩子（构造时调用一次） */
  protected applySkin(): void {}

  protected idleTexture(): string {
    return "spitter";
  }

  /** 开火后坐帧贴图 */
  protected fireTexture(): string {
    return "spitter-fire";
  }

  /** 抛射弹体贴图 */
  protected shotTexture(): string {
    return "fireball";
  }
}
