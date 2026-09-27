import Phaser from "phaser";

// 震摇时长须大于最慢角色跨过单板的时间（虎 128px/170 ≈ 750ms），
// 保证持续跑动可通行、停留/迟疑则会塌落
const SHAKE_MS = 900;
const FALL_MS = 400;

/** 断桥板：踩上后震摇 → 塌落（关闭碰撞体）→ 限时后原位重建 */
export class BreakPlank {
  private state: "idle" | "shaking" | "gone" = "idle";
  private readonly visual: Phaser.GameObjects.TileSprite;
  private readonly body: Phaser.Physics.Arcade.StaticBody;
  private readonly rebuildMs: number;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, rebuildMs: number) {
    this.rebuildMs = rebuildMs;
    this.baseY = y;
    this.visual = scene.add.tileSprite(x, y, w, 16, "plate").setOrigin(0);
    scene.physics.add.existing(this.visual, true);
    this.body = this.visual.body as Phaser.Physics.Arcade.StaticBody;
  }

  /** 供场景挂接玩家碰撞体（静态体在视觉 tileSprite 上） */
  getVisual(): Phaser.GameObjects.TileSprite {
    return this.visual;
  }

  /** 作为玩家碰撞回调挂载；反复触发由状态守卫挡掉 */
  trigger(scene: Phaser.Scene): void {
    if (this.state !== "idle") return;
    this.state = "shaking";

    // yoyo 补间自动回位，震摇结束后塌落
    scene.tweens.add({
      targets: this.visual,
      x: this.visual.x + 3,
      duration: 45,
      yoyo: true,
      repeat: Math.floor(SHAKE_MS / 90),
      onComplete: () => this.collapse(scene),
    });
  }

  private collapse(scene: Phaser.Scene): void {
    this.state = "gone";
    this.body.enable = false;
    scene.tweens.add({
      targets: this.visual,
      y: this.visual.y + 220,
      alpha: 0,
      duration: FALL_MS,
      ease: "Quad.In",
    });
    scene.time.delayedCall(this.rebuildMs, () => this.rebuild());
  }

  private rebuild(): void {
    this.visual.setY(this.baseY);
    this.visual.setAlpha(1);
    this.body.enable = true;
    this.state = "idle";
  }
}
