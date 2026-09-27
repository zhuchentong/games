/** 第一关地图配置：地图即配置，LevelBuild 按此铺设（不引入 Tiled） */

import { BOSS } from "./boss";
import type { EnemyDef } from "./enemies";
import type { LevelConfig } from "./levels";

export const LEVEL1: LevelConfig = {
  worldWidth: 6480,
  groundTop: 500,
  theme: "forest",
  coreLabel: "机器人核心",

  // 九段落：森林起点→机械足迹→断桥平台→废弃锯木厂→齿轮回廊→警报走廊→检查点→Boss 房→机器人核心
  segments: [
    { x0: 0, x1: 800, color: 0x1c2b1a, name: "森林起点" },
    { x0: 800, x1: 1600, color: 0x232a20, name: "机械足迹" },
    { x0: 1600, x1: 2400, color: 0x1f272e, name: "断桥平台" },
    { x0: 2400, x1: 3200, color: 0x30241a, name: "废弃锯木厂" },
    { x0: 3200, x1: 4080, color: 0x1a2b26, name: "齿轮回廊" },
    { x0: 4080, x1: 4880, color: 0x2b2030, name: "警报走廊" },
    { x0: 4880, x1: 5200, color: 0x223038, name: "检查点" },
    { x0: 5200, x1: 6120, color: 0x2a2333, name: "Boss 房" },
    { x0: 6120, x1: 6480, color: 0x1f3038, name: "机器人核心" },
  ],

  // 主地面块（缺口 = 坠落坑：1120/1680桥/3360/4080/5040）
  grounds: [
    { x: 0, w: 1120 },
    { x: 1240, w: 440 },
    { x: 2240, w: 1120 },
    { x: 3480, w: 600 },
    { x: 4200, w: 840 },
    { x: 5160, w: 1320 },
  ],

  platforms: [
    { x: 400, y: 390, w: 96 },
    { x: 2560, y: 360, w: 128 },
    { x: 3600, y: 310, w: 96 },
    { x: 3860, y: 330, w: 96 },
    { x: 6300, y: 390, w: 96 },
  ],

  // 传送带（机械足迹向左推 / 警报走廊向左推回坑口）
  belts: [
    { x: 1270, w: 180, direction: -1, speed: 120 },
    { x: 4320, w: 160, direction: -1, speed: 140 },
  ],

  // 锯片（废弃锯木厂）：往返巡逻，接触受伤
  saws: [
    { x1: 2480, y1: 478, x2: 2800, y2: 478, durMs: 1300, damage: 15 },
    { x1: 2960, y1: 478, x2: 2960, y2: 320, durMs: 1100, damage: 15 },
  ],

  // 弹簧跳台（齿轮回廊）：踩上弹射到上层浮台
  springs: [{ x: 3560 }, { x: 3820 }],

  // 断桥（断桥平台）：踩踏后震摇塌落，限时后重建
  bridge: {
    y: 500,
    rebuildMs: 2200,
    planks: [
      { x: 1680, w: 128 },
      { x: 1824, w: 128 },
      { x: 1968, w: 128 },
      { x: 2112, w: 128 },
    ],
  },

  // 检查点：齿轮回廊末 + 警报走廊后（原单检查点随世界扩容右移）
  checkpoints: [{ x: 3900 }, { x: 4940 }],

  // 补给机（商人）：森林起点首只齿轮虫（540 巡逻）前的教学位 + 检查点后 Boss 门前的补给位
  // （两处均在敌人射程外：炮台 4620 射程 280 → 4900 止，喷火龟 4260 射程 320 → 4580 止）
  merchants: [{ x: 400 }, { x: 5000 }],

  // 齿轮币（y 为漂浮中心；坑口/浮台/弹簧弧线上的需要跳跃拾取）
  coins: [
    { x: 320, y: 468 },
    { x: 360, y: 468 },
    { x: 480, y: 468 },
    { x: 640, y: 468 },
    { x: 1180, y: 424 },
    { x: 1560, y: 468 },
    { x: 1760, y: 445 },
    { x: 1968, y: 445 },
    { x: 2180, y: 445 },
    { x: 2624, y: 330 },
    { x: 3060, y: 468 },
    // 齿轮回廊：弹簧弧线 + 浮台
    { x: 3630, y: 268 },
    { x: 3680, y: 268 },
    { x: 3880, y: 288 },
    { x: 3930, y: 288 },
    // 警报走廊：坑口弧线 + 传送带沿线
    { x: 4140, y: 430 },
    { x: 4260, y: 468 },
    { x: 4420, y: 468 },
    { x: 4580, y: 468 },
    // 尾段
    { x: 5100, y: 424 },
    { x: 5540, y: 468 },
    { x: 5980, y: 468 },
  ],

  // 敌人点位（原 data/enemies.ts 表，第二关起随关配置）
  spawns: [
    // 齿轮虫：森林 / 机械足迹传送带后 / 断桥出口 / 齿轮回廊前后哨
    { kind: "gearbug", x1: 540, x2: 760, y: 489, hp: 30, touchDamage: 12, speed: 90 },
    { kind: "gearbug", x1: 1460, x2: 1660, y: 489, hp: 30, touchDamage: 12, speed: 90 },
    { kind: "gearbug", x1: 2260, x2: 2420, y: 489, hp: 30, touchDamage: 12, speed: 90 },
    { kind: "gearbug", x1: 3500, x2: 3640, y: 489, hp: 30, touchDamage: 12, speed: 80 },
    { kind: "gearbug", x1: 3920, x2: 4040, y: 489, hp: 30, touchDamage: 12, speed: 80 },
    // 侦察机：断桥上空低空掠行守桥（水平弹道可稳定命中）/ 锯木厂高空俯冲 / 警报走廊哨戒
    // （原 3700/3960 两个点位落在 Boss 房内，Boss 战变成 1v3，平衡调优时移出/移除）
    { kind: "drone", x: 1960, y: 475, hp: 24, touchDamage: 10 },
    { kind: "drone", x: 2680, y: 280, hp: 24, touchDamage: 10 },
    { kind: "drone", x: 3400, y: 300, hp: 24, touchDamage: 10 },
    { kind: "drone", x: 4500, y: 280, hp: 24, touchDamage: 10 },
    // 炮台：锯木厂深处 / 警报走廊（射程避开走廊后检查点）
    { kind: "turret", x: 3100, y: 487, hp: 40, touchDamage: 10, range: 460 },
    { kind: "turret", x: 4620, y: 487, hp: 40, touchDamage: 10, range: 280 },
    // 喷火龟：齿轮回廊 / 警报走廊口，抛物线火球压制
    { kind: "spitter", x: 3660, y: 487, hp: 34, touchDamage: 10, range: 360 },
    { kind: "spitter", x: 4260, y: 487, hp: 34, touchDamage: 10, range: 320 },
  ] as EnemyDef[],

  boss: BOSS,

  doorX: 5240,
  coreX: 6330,
};
