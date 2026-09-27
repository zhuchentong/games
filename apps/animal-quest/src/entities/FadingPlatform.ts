import Phaser from "phaser";
import type { FadingPlatDef } from "../data/levels";
import type { Player } from "./Player";

// 闪烁时长需大于慢速角色跳到下一座的滞空（落板即走，迟疑则踏空）
const BLINK_MS = 420;
const GONE_MS = 1500;

/** 幻影平台：踩踏后急促闪烁 → 消散（关闭碰撞体）→ 限时后原位重建。
 * 与 BreakPlank 同款状态机，视觉差异在能量青色调与闪烁（不塌落而是相位消散） */
export class FadingPlatform {
  private state: "solid" | "blinking" | "gone" = "solid";
  private readonly spr: Phaser.GameObjects.TileSprite;
  private readonly body: Phaser.Physics.Arcade.StaticBody;

  constructor(scene: Phaser.Scene, player: Player, def: FadingPlatDef) {
    this.spr = scene.add
      .tileSprite(def.x, def.y, def.w, 16, "plate")
      .setOrigin(0)
      .setTint(0x9bdce8);
    scene.physics.add.existing(this.spr, true);
    this.body = this.spr.body as Phaser.Physics.Arcade.StaticBody;
    scene.physics.add.collider(player, this.spr, () => this.touch(scene));
  }

  /** 作为玩家碰撞回调挂载；反复触发由状态守卫挡掉 */
  private touch(scene: Phaser.Scene): void {
    if (this.state !== "solid") return;
    this.state = "blinking";
    scene.tweens.add({
      targets: this.spr,
      alpha: 0.25,
      duration: 70,
      yoyo: true,
      repeat: Math.floor(BLINK_MS / 140),
      onComplete: () => this.vanish(scene),
    });
  }

  private vanish(scene: Phaser.Scene): void {
    this.state = "gone";
    this.body.enable = false;
    this.spr.setAlpha(0);
    scene.time.delayedCall(GONE_MS, () => this.rebuild());
  }

  private rebuild(): void {
    this.spr.setAlpha(1);
    this.body.enable = true;
    this.state = "solid";
  }
}
