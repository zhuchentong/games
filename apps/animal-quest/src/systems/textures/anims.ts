import type Phaser from "phaser";
import { CHARACTER_IDS, type CharacterId } from "../../types";
import type { CharKind } from "./characters";

/** 角色动画键约定：`${id}-${kind}`（registerCharacterAnims 注册、Player.updateAnim 播放共用） */
export function charAnim(id: CharacterId, kind: CharKind): string {
  return `${id}-${kind}`;
}

/** 敌人动画键：注册与实体播放共用 */
export const ENEMY_ANIMS = {
  gearbugCrawl: "gearbug-crawl",
  droneHover: "drone-hover",
  turretFire: "turret-fire",
  emberHover: "ember-hover",
  beetleCrawl: "beetle-crawl",
  mothFlutter: "moth-flutter",
  thornburWobble: "thornbur-wobble",
} as const;

/** 为五角色注册 idle/run/atk/jump/fall 动画（BootScene 调用一次；动画管理器为全局） */
export function registerCharacterAnims(scene: Phaser.Scene): void {
  CHARACTER_IDS.forEach((id) => {
    if (scene.anims.exists(charAnim(id, "run"))) return;
    const frames = (kind: CharKind, n: number): Array<{ key: string }> =>
      Array.from({ length: n }, (_, i) => ({ key: `char-${id}-${kind}${i}` }));
    scene.anims.create({
      key: charAnim(id, "idle"),
      frames: frames("idle", 2),
      frameRate: 3,
      repeat: -1,
    });
    scene.anims.create({
      key: charAnim(id, "run"),
      frames: frames("run", 4),
      frameRate: 10,
      repeat: -1,
    });
    scene.anims.create({
      key: charAnim(id, "atk"),
      frames: frames("atk", 4),
      frameRate: 16,
      repeat: 0,
    });
    // 跳跃/下落为单帧姿态，统一走 play() 保持状态机一致
    scene.anims.create({
      key: charAnim(id, "jump"),
      frames: [{ key: `char-${id}-jump` }],
      frameRate: 1,
    });
    scene.anims.create({
      key: charAnim(id, "fall"),
      frames: [{ key: `char-${id}-fall` }],
      frameRate: 1,
    });
  });
}

/** 为五类敌人注册动画（BootScene 调用一次） */
export function registerEnemyAnims(scene: Phaser.Scene): void {
  if (scene.anims.exists(ENEMY_ANIMS.gearbugCrawl)) return;
  scene.anims.create({
    key: ENEMY_ANIMS.gearbugCrawl,
    frames: [0, 1, 2, 3].map((i) => ({ key: `gearbug${i}` })),
    frameRate: 8,
    repeat: -1,
  });
  scene.anims.create({
    key: ENEMY_ANIMS.droneHover,
    frames: [{ key: "drone0" }, { key: "drone1" }],
    frameRate: 6,
    repeat: -1,
  });
  scene.anims.create({
    key: ENEMY_ANIMS.turretFire,
    frames: [{ key: "turret-fire" }],
    frameRate: 1,
  });
  scene.anims.create({
    key: ENEMY_ANIMS.emberHover,
    frames: [{ key: "ember0" }, { key: "ember1" }],
    frameRate: 8,
    repeat: -1,
  });
  scene.anims.create({
    key: ENEMY_ANIMS.beetleCrawl,
    frames: [{ key: "beetle0" }, { key: "beetle1" }],
    frameRate: 8,
    repeat: -1,
  });
  scene.anims.create({
    key: ENEMY_ANIMS.mothFlutter,
    frames: [{ key: "moth0" }, { key: "moth1" }],
    frameRate: 10,
    repeat: -1,
  });
  scene.anims.create({
    key: ENEMY_ANIMS.thornburWobble,
    frames: [{ key: "thornbur0" }, { key: "thornbur1" }],
    frameRate: 7,
    repeat: -1,
  });
}
