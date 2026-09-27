import Phaser from "phaser";
import type { FlyerDef } from "../data/enemies";
import { ENEMY_ANIMS } from "../systems/Textures";
import { Enemy } from "./Enemy";
import type { Player } from "./Player";

type DroneState = "hover" | "dive" | "return";

const CHASE_RANGE = 300;
const CHASE_SPEED = 85;
const DIVE_TRIGGER_X = 200;
const DIVE_SPEED = 260;
const DIVE_TIMEOUT_MS = 800;
const RETURN_SPEED = 150;
const DIVE_COOLDOWN_MS = 1600;

/** 飞行敌基类：悬停追踪玩家水平位置，接近头顶后周期性俯冲（俯冲低空即蛙/鸟弹道的打击窗口）；
 * 皮肤与俯扑特效经钩子开放给子类（侦察机 / 孢翼蛾） */
export class ScoutDrone extends Enemy {
  private readonly baseY: number;
  private mode: DroneState = "hover";
  private diveCd = 1200;
  private diveUntil = 0;
  private targetX = 0;
  private targetY = 0;

  constructor(scene: Phaser.Scene, def: FlyerDef) {
    super(scene, def.x, def.y, "drone0", def.hp, def.touchDamage);
    this.baseY = def.y;
    this.applySkin();
    this.play(this.hoverAnimKey());
  }

  tick(player: Player, time: number, delta: number): void {
    const dt = delta / 1000;
    if (this.mode === "hover") {
      this.y = this.baseY + Math.sin(time / 280) * 6;
      const dx = player.x - this.x;
      if (Math.abs(dx) < CHASE_RANGE) {
        this.x += Math.max(-CHASE_SPEED * dt, Math.min(CHASE_SPEED * dt, dx));
      }
      this.diveCd -= delta;
      if (this.diveCd <= 0 && Math.abs(dx) < DIVE_TRIGGER_X) {
        this.mode = "dive";
        this.targetX = player.x;
        this.targetY = player.y - 12;
        this.diveUntil = time + DIVE_TIMEOUT_MS;
        this.onDiveStart();
      }
    } else if (this.mode === "dive") {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 14 || time > this.diveUntil) {
        this.mode = "return";
      } else {
        const step = DIVE_SPEED * dt;
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
      }
    } else {
      const dy = this.baseY - this.y;
      const step = RETURN_SPEED * dt;
      if (Math.abs(dy) <= step) {
        this.y = this.baseY;
        this.mode = "hover";
        this.diveCd = DIVE_COOLDOWN_MS;
      } else {
        this.y += Math.sign(dy) * step;
      }
    }
  }

  /** 子类换皮钩子（构造时调用一次） */
  protected applySkin(): void {}

  /** 子类悬停动画键 */
  protected hoverAnimKey(): string {
    return ENEMY_ANIMS.droneHover;
  }

  /** 俯扑启动瞬间特效钩子 */
  protected onDiveStart(): void {}
}
