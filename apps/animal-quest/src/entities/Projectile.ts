import Phaser from "phaser";
import { CombatSystem } from "../systems/CombatSystem";

export interface ProjectileOptions {
  damage: number;
  /** true=玩家弹（打敌人），false=敌人弹（打玩家） */
  fromPlayer: boolean;
  /** 存活时长，超时自动销毁；命中/出屏也会提前销毁 */
  ttlMs?: number;
  /** 附加垂直重力，0 或缺省为直线飞行 */
  gravityY?: number;
}

/** 弹体拖尾颜色（按纹理键），未登记的弹体退回金色 */
const TRAIL_COLORS: Record<string, number> = {
  wind: 0x9be8ff,
  poison: 0x7ac74f,
  bullet: 0xffd23e,
  "gear-shot": 0xc9a25e,
  "lava-bomb": 0xff6b2e,
};

/** 敌我共用的通用弹体：构造时注册进场景 CombatSystem，命中判定由其统一结算 */
export class Projectile extends Phaser.Physics.Arcade.Image {
  readonly damage: number;
  readonly fromPlayer: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    vx: number,
    vy: number,
    options: ProjectileOptions,
  ) {
    super(scene, x, y, texture);
    this.damage = options.damage;
    this.fromPlayer = options.fromPlayer;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const gravityY = options.gravityY ?? 0;
    body.setAllowGravity(gravityY !== 0);
    if (gravityY !== 0) body.setGravityY(gravityY);
    this.setVelocity(vx, vy);
    this.setFlipX(vx < 0);
    this.setRotation(Math.atan2(vy, vx));

    const combat = CombatSystem.get(scene);
    combat?.addProjectile(this);

    // 拖尾：飞行途中按固定间隔落下收缩淡出的色点
    const trailColor = TRAIL_COLORS[texture] ?? 0xffd23e;
    const trail = scene.time.addEvent({
      delay: 40,
      loop: true,
      callback: () => {
        if (!this.active) return;
        const dot = scene.add.circle(this.x, this.y, 3.5, trailColor, 0.6).setDepth(-1);
        scene.tweens.add({
          targets: dot,
          radius: 1,
          alpha: 0,
          duration: 220,
          onComplete: () => dot.destroy(),
        });
      },
    });

    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      trail.remove();
      combat?.removeProjectile(this);
    });

    scene.time.delayedCall(options.ttlMs ?? 1400, () => {
      if (this.active) this.destroy();
    });
  }

  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.displayWidth / 2,
      this.y - this.displayHeight / 2,
      this.displayWidth,
      this.displayHeight,
    );
  }
}
