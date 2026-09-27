import Phaser from "phaser";
import { floatText } from "../systems/Fx";
import type { Player } from "./Player";

/** 检查点旗：触碰后回满血 + 写入存档（checkpointX），一次性激活（旗变金色） */
export class Checkpoint {
  private activated = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    groundTop: number,
    player: Player,
    onActivate: (x: number) => void,
  ) {
    const flag = scene.add.image(x, groundTop, "checkpoint").setOrigin(0.5, 1);

    const zone = scene.add.zone(x, groundTop - 30, 36, 60);
    scene.physics.add.existing(zone, true);
    scene.physics.add.overlap(player, zone, () => {
      if (this.activated) return;
      this.activated = true;
      flag.setTint(0xffd23e);
      // 旗面 wave 两下
      scene.tweens.add({
        targets: flag,
        scaleX: 0.65,
        duration: 90,
        yoyo: true,
        repeat: 1,
        onComplete: () => flag.setScale(1),
      });
      player.heal(player.config.hp);
      onActivate(x);

      floatText(scene, x, groundTop - 70, "检查点已激活", {
        color: "#8fdcb5",
        size: 15,
        rise: 26,
        duration: 1100,
      });
    });
  }
}
