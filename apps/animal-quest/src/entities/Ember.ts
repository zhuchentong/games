import Phaser from "phaser";
import type { EmberDef } from "../data/enemies";
import { ENEMY_ANIMS } from "../systems/Textures";
import { burst } from "../systems/Fx";
import { Enemy } from "./Enemy";
import type { Player } from "./Player";

type EmberState = "float" | "dash" | "return";

/** 警戒半径：进入后锁定玩家位置突进 */
const AGGRO_RANGE = 230;
const DASH_SPEED = 300;
const DASH_MS = 460;
const DASH_COOLDOWN_MS = 1500;
const RETURN_SPEED = 130;

/** 焰灵：熔火机厂漂浮火苗，8 字漂浮警戒；玩家靠近后锁定当前位置短距突进（第二关新敌人） */
export class Ember extends Enemy {
  private readonly baseX: number;
  private readonly baseY: number;
  private mode: EmberState = "float";
  private dashCd = 1200;
  private dashUntil = 0;
  private targetX = 0;
  private targetY = 0;

  constructor(scene: Phaser.Scene, def: EmberDef) {
    super(scene, def.x, def.y, "ember0", def.hp, def.touchDamage);
    this.baseX = def.x;
    this.baseY = def.y;
    this.play(ENEMY_ANIMS.emberHover);
  }

  tick(player: Player, time: number, delta: number): void {
    const dt = delta / 1000;
    if (this.mode === "float") {
      // 8 字漂浮：横向慢 + 纵向快
      this.x = this.baseX + Math.sin(time / 460) * 14;
      this.y = this.baseY + Math.sin(time / 300) * 8;
      this.setFlipX(player.x < this.x);
      this.dashCd -= delta;
      if (
        this.dashCd <= 0 &&
        Phaser.Math.Distance.Between(player.x, player.y - 16, this.x, this.y) < AGGRO_RANGE
      ) {
        this.mode = "dash";
        this.targetX = player.x;
        this.targetY = player.y - 16;
        this.dashUntil = time + DASH_MS;
        burst(this.scene, this.x, this.y, {
          color: 0xff9f1a,
          count: 3,
          size: 2,
          grow: 7,
          duration: 200,
          spreadX: 5,
          spreadY: 5,
        });
      }
    } else if (this.mode === "dash") {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 12 || time > this.dashUntil) {
        this.mode = "return";
      } else {
        const step = DASH_SPEED * dt;
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
      }
    } else {
      const dx = this.baseX - this.x;
      const dy = this.baseY - this.y;
      const d = Math.hypot(dx, dy);
      const step = RETURN_SPEED * dt;
      if (d <= step) {
        this.x = this.baseX;
        this.y = this.baseY;
        this.mode = "float";
        this.dashCd = DASH_COOLDOWN_MS;
      } else {
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
      }
    }
  }
}
