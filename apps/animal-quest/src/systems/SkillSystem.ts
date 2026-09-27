import Phaser from "phaser";
import { Projectile } from "../entities/Projectile";
import type { Player } from "../entities/Player";
import type { SkillConfig } from "../types";
import { CombatSystem } from "./CombatSystem";
import { afterimage, burst, floatText, shockRing } from "./Fx";
import { explosion } from "./Particles";

/**
 * 五类技能的视觉与结算出口（场景经 Player.onSkill 注入调用）：
 * aoe 双冲击环+放射迸发+地面尘土 / dash 残影+反向气流线 / projectile 出膛闪光（拖尾在 Projectile 内） /
 * heal 上升微粒+上升辉光 / shield 护盾展开+金屑环（气泡跟随视觉在 Player 内）。
 * 视觉只放大演出，伤害判定范围保持原值。
 */
export function castSkill(scene: Phaser.Scene, player: Player, skill: SkillConfig): void {
  switch (skill.kind) {
    case "aoe": {
      shockRing(scene, player.x, player.y - 18, {
        from: 14,
        to: 130,
        lineWidth: 5,
        duration: 340,
      });
      scene.time.delayedCall(60, () => {
        shockRing(scene, player.x, player.y - 18, {
          from: 8,
          to: 85,
          color: 0xffffff,
          lineWidth: 2,
          duration: 260,
        });
      });
      burst(scene, player.x, player.y - 4, {
        color: 0xffd23e,
        count: 6,
        size: 3,
        grow: 16,
        spreadX: 26,
        spreadY: 5,
        duration: 300,
      });
      // 放射迸发：金白碎屑沿地面外圈抛洒
      explosion(scene, player.x, player.y - 4, {
        tints: [0xffd23e, 0xffffff, 0xff9f1a],
        count: 16,
        speed: [110, 230],
        life: [280, 460],
        gravityY: 60,
      });
      const combat = CombatSystem.get(scene);
      if (!combat) break;
      for (const e of combat.enemiesInRadius(player.x, player.y - 18, 110)) {
        e.hit(skill.damage);
      }
      break;
    }
    case "dash": {
      player.applyDash(scene.time.now);
      for (const delay of [0, 70, 140]) {
        scene.time.delayedCall(delay, () => {
          if (player.active) afterimage(scene, player);
        });
      }
      burst(scene, player.x - player.facing * 14, player.y - 16, {
        color: 0x9be8ff,
        count: 5,
        size: 3,
        grow: 6,
        spreadX: 5,
        spreadY: 11,
        duration: 240,
      });
      // 反向气流线：青白微粒向身后高速抽走
      explosion(scene, player.x, player.y - 18, {
        tints: [0x9be8ff, 0xffffff],
        count: 8,
        speed: [180, 320],
        angle: player.facing > 0 ? [160, 200] : [-20, 20],
        life: [160, 260],
        gravityY: 0,
        scale: 0.8,
      });
      break;
    }
    case "projectile": {
      const isBird = player.config.id === "bird";
      burst(scene, player.x + player.facing * 18, player.y - 20, {
        color: isBird ? 0x9be8ff : 0x7ac74f,
        count: 4,
        size: 3,
        grow: 8,
        spreadX: 3,
        spreadY: 3,
        duration: 180,
      });
      // 出膛辉光：按弹体元素染色的小簇闪光
      explosion(scene, player.x + player.facing * 18, player.y - 20, {
        tints: isBird ? [0x9be8ff, 0xe8ffff] : [0x7ac74f, 0xc0eda0],
        count: 6,
        speed: [30, 95],
        life: [150, 260],
        gravityY: 0,
        scale: 0.8,
      });
      new Projectile(
        scene,
        player.x + player.facing * 18,
        player.y - 20,
        isBird ? "wind" : "poison",
        player.facing * (isBird ? 540 : 400),
        0,
        { damage: skill.damage, fromPlayer: true, ttlMs: isBird ? 1500 : 1100 },
      );
      break;
    }
    case "heal": {
      const healed = player.heal(skill.damage);
      for (const delay of [0, 140]) {
        scene.time.delayedCall(delay, () => {
          if (!player.active) return;
          burst(scene, player.x, player.y - 14, {
            color: 0x67e26a,
            count: 4,
            size: 3,
            grow: 3,
            spreadX: 13,
            spreadY: 16,
            duration: 480,
            alpha: 0.8,
          });
        });
      }
      // 上升辉光：绿色微粒从周身缓缓浮起
      explosion(scene, player.x, player.y - 12, {
        texture: "pt-glow",
        tints: [0x67e26a, 0xa8f0aa, 0xe0ffe0],
        count: 10,
        speed: [12, 46],
        angle: [250, 290],
        life: [600, 950],
        gravityY: -70,
        alpha: 0.85,
      });
      floatText(scene, player.x, player.y - 48, `+${healed}`, {
        color: "#67e26a",
        size: 18,
        rise: 34,
        duration: 700,
      });
      break;
    }
    case "shield": {
      // 免疫判定在 Player.damage 内结算；此处只做展开演出（气泡跟随视觉由 Player 每帧维护）
      player.applyShield(scene.time.now, skill.durationMs ?? 3000);
      shockRing(scene, player.x, player.y - 18, {
        from: 10,
        to: 46,
        lineWidth: 3,
        duration: 320,
      });
      burst(scene, player.x, player.y - 18, {
        color: 0xffd23e,
        count: 5,
        size: 3,
        grow: 12,
        spreadX: 14,
        spreadY: 10,
        duration: 280,
      });
      // 金屑环：周身一圈短暂悬浮的金色碎屑
      explosion(scene, player.x, player.y - 18, {
        tints: [0xffd23e, 0xffe9a0, 0xffffff],
        count: 10,
        speed: [50, 130],
        life: [260, 420],
        gravityY: 0,
        alpha: 0.9,
      });
      break;
    }
  }
}
