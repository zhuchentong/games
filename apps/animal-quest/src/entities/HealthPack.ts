import Phaser from "phaser";
import { burst, floatText } from "../systems/Fx";
import { explosion } from "../systems/Particles";
import { Sfx } from "../systems/Sfx";
import { DEPTH } from "../types";
import type { Player } from "./Player";

const HEAL_AMOUNT = 20;
/** 场景未标注地面时的兜底（三关 groundTop 同为 500） */
const DEFAULT_GROUND_TOP = 500;

/** 小怪掉落的血包：落到地面后漂浮，拾取回血 20（满血时不拾取，留在地上） */
export class HealthPack {
  constructor(scene: Phaser.Scene, x: number, y: number, player: Player, groundY?: number) {
    const ground = groundY ?? DEFAULT_GROUND_TOP;
    const img = scene.add.image(x, y, "medkit").setDepth(DEPTH.items);
    // 从死亡点掉落到地面（Bounce 回弹），随后原地小幅漂浮
    scene.tweens.add({
      targets: img,
      y: ground - 10,
      duration: 260,
      ease: "Bounce.Out",
      onComplete: () => {
        scene.tweens.add({
          targets: img,
          y: ground - 16,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });
      },
    });

    const zone = scene.add.zone(x, ground - 12, 32, 36);
    scene.physics.add.existing(zone, true);
    scene.physics.add.overlap(player, zone, () => {
      if (!img.active || player.hp >= player.config.hp) return;
      const healed = player.heal(HEAL_AMOUNT);
      img.destroy();
      zone.destroy();
      Sfx.healPickup();
      burst(scene, player.x, player.y - 20, {
        color: 0x67e26a,
        count: 4,
        size: 3,
        grow: 8,
        spreadX: 8,
        spreadY: 8,
        duration: 220,
      });
      explosion(scene, player.x, player.y - 20, {
        texture: "pt-glow",
        tints: [0x67e26a, 0xa8f0aa, 0xffffff],
        count: 8,
        speed: [24, 90],
        life: [260, 460],
        gravityY: 0,
      });
      floatText(scene, player.x, player.y - 48, `+${healed}`, {
        color: "#67e26a",
        size: 15,
        rise: 30,
        duration: 650,
      });
    });
  }
}
