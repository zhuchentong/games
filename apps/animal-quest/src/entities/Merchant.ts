import Phaser from "phaser";
import { DEPTH, FONT } from "../types";

/** 补给机（商人 NPC）：纯视觉实体，交互判定由场景按 x 距离做（±70 触发半径） */
export class Merchant extends Phaser.GameObjects.Container {
  readonly x0: number;

  constructor(scene: Phaser.Scene, x: number, groundTop: number) {
    super(scene, x, groundTop);
    this.x0 = x;
    scene.add.existing(this);

    const body = scene.add.sprite(0, 0, "merchant0").setOrigin(0.5, 1);
    this.add(body);
    if (!scene.anims.exists("merchant-idle")) {
      scene.anims.create({
        key: "merchant-idle",
        frames: [{ key: "merchant0" }, { key: "merchant1" }],
        frameRate: 1.6,
        repeat: -1,
      });
    }
    body.play("merchant-idle");

    const sign = scene.add
      .text(0, -58, "补给机", {
        fontFamily: FONT,
        fontSize: "11px",
        color: "#8fdcb5",
      })
      .setOrigin(0.5);
    this.add(sign);
    scene.tweens.add({
      targets: sign,
      y: -62,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    this.setDepth(DEPTH.decor);
  }
}
