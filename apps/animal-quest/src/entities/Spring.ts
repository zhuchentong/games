import Phaser from "phaser";
import { burst } from "../systems/Fx";
import { Sfx } from "../systems/Sfx";
import type { Player } from "./Player";

/** 弹射初速（高于所有角色跳跃与二段跳，够到上层浮台） */
const SPRING_VELOCITY = -700;

/** 弹簧跳台：玩家落入触发弹射（上升中不重复触发），压扁回弹动画 + 气流 */
export class Spring {
  constructor(scene: Phaser.Scene, x: number, groundTop: number, player: Player) {
    const pad = scene.add.image(x, groundTop, "spring").setOrigin(0.5, 1);
    const zone = scene.add.zone(x, groundTop - 12, 36, 24);
    scene.physics.add.existing(zone, true);
    scene.physics.add.overlap(player, zone, () => {
      const body = player.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.y < -100) return;
      body.setVelocityY(SPRING_VELOCITY);
      Sfx.spring();
      scene.tweens.add({
        targets: pad,
        scaleY: 0.55,
        duration: 70,
        yoyo: true,
        onComplete: () => pad.setScale(1),
      });
      burst(scene, x, groundTop - 8, {
        color: 0x9be8ff,
        count: 4,
        size: 2,
        grow: 9,
        duration: 200,
        spreadX: 8,
        spreadY: 2,
      });
    });
  }
}
