/** 第三关「黑暗森林」地图配置（最终关）：幻影平台 / 上升气流双新机关 + 森林系小怪 + 古藤树怪 */

import { BOSS3 } from "./boss";
import type { EnemyDef } from "./enemies";
import type { LevelConfig } from "./levels";

export const LEVEL3: LevelConfig = {
  worldWidth: 6800,
  groundTop: 500,
  theme: "darkwood",
  coreLabel: "森林之心",

  // 九段落：林门→荆棘回廊→腐木栈道→孢子之井→爆栗巢径→悬空树桥→林中空地→Boss 房→森林之心
  segments: [
    { x0: 0, x1: 700, color: 0x0e1a12, name: "入口·林门" },
    { x0: 700, x1: 1500, color: 0x102116, name: "荆棘回廊" },
    { x0: 1500, x1: 2300, color: 0x0f2018, name: "腐木栈道" },
    { x0: 2300, x1: 3100, color: 0x12241a, name: "孢子之井" },
    { x0: 3100, x1: 3900, color: 0x142018, name: "爆栗巢径" },
    { x0: 3900, x1: 4700, color: 0x0f1f16, name: "悬空树桥" },
    { x0: 4700, x1: 5300, color: 0x14261c, name: "林中空地" },
    { x0: 5300, x1: 6300, color: 0x1a1420, name: "树心禁地" },
    { x0: 6300, x1: 6800, color: 0x12281c, name: "森林之心" },
  ],

  // 主地面块（缺口 = 深渊：1560~2240 腐木栈道 / 4020~4160 树桥越隙，坠入即坠落重生）
  grounds: [
    { x: 0, w: 1560 },
    { x: 2240, w: 1780 },
    { x: 4160, w: 2640 },
  ],

  platforms: [
    { x: 2740, y: 300, w: 96 },
    { x: 3060, y: 280, w: 96 },
    { x: 4400, y: 340, w: 96 },
    { x: 4620, y: 300, w: 96 },
    { x: 6640, y: 396, w: 96 },
  ],

  // 残存机簧（机龙时代的遗迹机关，被古藤半缠）：荆棘回廊入口缓推 / Boss 房内压回门口
  belts: [
    { x: 760, w: 160, direction: -1, speed: 120 },
    { x: 5560, w: 160, direction: -1, speed: 150 },
  ],

  saws: [
    // 爆栗巢径：遗迹锯盘与爆刺栗双压迫
    { x1: 3480, y1: 478, x2: 3740, y2: 478, durMs: 1300, damage: 16 },
    // 林中空地段：垂直锯（远离补给机交互半径）
    { x1: 5020, y1: 478, x2: 5020, y2: 330, durMs: 1150, damage: 16 },
  ],

  // 弹簧跳台（悬空树桥高层币线 / Boss 门前）
  springs: [{ x: 4680 }, { x: 5240 }],

  // 幻影平台（腐木栈道 1560~2240 深渊）：踩踏闪烁后消散，限时重建，连续跑动可通行
  fadingPlatforms: [
    { x: 1620, y: 452, w: 88 },
    { x: 1752, y: 418, w: 88 },
    { x: 1884, y: 452, w: 88 },
    { x: 2016, y: 418, w: 88 },
    { x: 2148, y: 452, w: 88 },
  ],

  // 孢子气流（孢子之井）：柱内持续抬升，顶端侧移落到浮台
  updrafts: [
    { x: 2700, w: 80, top: 270 },
    { x: 2960, w: 80, top: 250 },
  ],

  // 移动吊台（悬空树桥区越隙）
  movers: [{ x: 4040, y: 380, w: 96, dx: 240, durMs: 2000 }],

  // 遗迹荆棘闸（电网残骸被藤蔓半缠，三连相位 0/730/1460 + 悬空树桥高位闸）
  laserGates: [
    { x: 980, top: 300, h: 200, periodMs: 2200, onMs: 850, offsetMs: 0 },
    { x: 1130, top: 300, h: 200, periodMs: 2200, onMs: 850, offsetMs: 730 },
    { x: 1280, top: 300, h: 200, periodMs: 2200, onMs: 850, offsetMs: 1460 },
    { x: 4510, top: 280, h: 220, periodMs: 2600, onMs: 900, offsetMs: 400 },
  ],

  // 检查点：孢子之井后 + 悬空树桥后
  checkpoints: [{ x: 3960 }, { x: 4880 }],

  // 补给机：入口教学位 + Boss 门前后勤位（爆刺栗 4760 警戒 260 → 5020 止，锯 5020 垂直，均不进 ±70）
  merchants: [{ x: 320 }, { x: 5180 }],

  coins: [
    { x: 300, y: 468 },
    { x: 360, y: 468 },
    { x: 500, y: 468 },
    // 荆棘回廊：低穿越线
    { x: 1030, y: 430 },
    { x: 1180, y: 430 },
    { x: 1330, y: 430 },
    // 腐木栈道：每座幻影平台上方引导
    { x: 1664, y: 400 },
    { x: 1796, y: 366 },
    { x: 1928, y: 400 },
    { x: 2060, y: 366 },
    { x: 2192, y: 400 },
    // 孢子之井：气流柱内垂直币线 + 顶端浮台
    { x: 2740, y: 440 },
    { x: 2740, y: 360 },
    { x: 2788, y: 252 },
    { x: 3108, y: 232 },
    // 爆栗巢径
    { x: 3200, y: 468 },
    { x: 3610, y: 430 },
    { x: 3860, y: 468 },
    // 悬空树桥：吊台高点 + 阶梯
    { x: 4160, y: 330 },
    { x: 4448, y: 292 },
    { x: 4668, y: 252 },
    { x: 4700, y: 468 },
    // 林中空地 / Boss 门前
    { x: 4980, y: 424 },
    { x: 5240, y: 350 },
    { x: 5980, y: 468 },
    // 森林之心
    { x: 6560, y: 424 },
  ],

  // 敌配（最终关森林生态：刺壳甲虫/孢翼蛾/食人花/爆刺栗，总数与旧配持平）
  spawns: [
    // 刺壳甲虫：荆棘回廊 / 悬空树桥
    { kind: "beetle", x1: 1360, x2: 1500, y: 489, hp: 46, touchDamage: 15, speed: 105 },
    { kind: "beetle", x1: 4260, x2: 4400, y: 489, hp: 46, touchDamage: 15, speed: 100 },
    // 孢翼蛾：荆棘回廊上空 / 腐木栈道俯扑 / 悬空树桥高空
    { kind: "moth", x: 1200, y: 300, hp: 38, touchDamage: 13 },
    { kind: "moth", x: 1900, y: 330, hp: 38, touchDamage: 13 },
    { kind: "moth", x: 4560, y: 250, hp: 38, touchDamage: 13 },
    // 食人花：孢子之井阵地（340 射程覆盖两座气流柱，迫使顶风作战）
    { kind: "snapflower", x: 2620, y: 487, hp: 50, touchDamage: 12, range: 340 },
    // 爆刺栗 ×4：爆栗巢径主敌 + 悬空树桥尾哨
    { kind: "thornbur", x: 3250, y: 489, hp: 30, touchDamage: 12, boomDamage: 22 },
    { kind: "thornbur", x: 3560, y: 489, hp: 30, touchDamage: 12, boomDamage: 22 },
    { kind: "thornbur", x: 3820, y: 489, hp: 30, touchDamage: 12, boomDamage: 22 },
    { kind: "thornbur", x: 4760, y: 489, hp: 30, touchDamage: 12, boomDamage: 22 },
  ] as EnemyDef[],

  boss: BOSS3,

  doorX: 5380,
  coreX: 6560,
};
