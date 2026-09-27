/** 第二关「熔火机厂」地图配置：熔岩坑 / 移动吊台 / 激光闸门三类新机关 + 焰灵 + 熔岩巨人 */

import { BOSS2 } from "./boss";
import type { EnemyDef } from "./enemies";
import type { LevelConfig } from "./levels";

export const LEVEL2: LevelConfig = {
  worldWidth: 6720,
  groundTop: 500,
  theme: "forge",
  coreLabel: "熔核",

  // 九段落：冷却廊→熔渣带→熔岩坑道→吊装车间→激光闸门→焰灵巢径→检查点→Boss 房→熔核终点
  segments: [
    { x0: 0, x1: 760, color: 0x2b1d18, name: "入口·冷却廊" },
    { x0: 760, x1: 1560, color: 0x2e221a, name: "熔渣带" },
    { x0: 1560, x1: 2360, color: 0x33201a, name: "熔岩坑道" },
    { x0: 2360, x1: 3160, color: 0x2a2430, name: "吊装车间" },
    { x0: 3160, x1: 3960, color: 0x301a22, name: "激光闸门" },
    { x0: 3960, x1: 4760, color: 0x33202a, name: "焰灵巢径" },
    { x0: 4760, x1: 5340, color: 0x223038, name: "检查点" },
    { x0: 5340, x1: 6280, color: 0x33202e, name: "Boss 房" },
    { x0: 6280, x1: 6720, color: 0x3a1f1c, name: "熔核终点" },
  ],

  // 主地面块（缺口 = 熔岩坑：1560/1930/3960，坠入受伤弹起非致死）
  grounds: [
    { x: 0, w: 1560 },
    { x: 1700, w: 230 },
    { x: 2090, w: 1870 },
    { x: 4100, w: 2620 },
  ],

  platforms: [
    { x: 2740, y: 380, w: 96 },
    { x: 4340, y: 330, w: 96 },
    { x: 4560, y: 300, w: 96 },
    { x: 6420, y: 396, w: 96 },
  ],

  // 传送带（熔渣带向左推 / Boss 房内向左推回门口）
  belts: [
    { x: 1050, w: 200, direction: -1, speed: 130 },
    { x: 5560, w: 160, direction: -1, speed: 150 },
  ],

  saws: [
    // 吊装车间：地面水平锯，压低走位逼玩家上层吊台
    { x1: 2420, y1: 478, x2: 2680, y2: 478, durMs: 1400, damage: 16 },
    // 激光闸门末：垂直锯与激光节奏叠签
    { x1: 3660, y1: 478, x2: 3660, y2: 330, durMs: 1200, damage: 16 },
  ],

  // 弹簧跳台（焰灵巢径上层币线 / Boss 门前弹台）
  springs: [{ x: 4260 }, { x: 5250 }],

  // 熔岩坑（坠入受伤并被弹起；坑口 coins 引导跳跃线）
  lavaPits: [
    { x: 1560, w: 140 },
    { x: 1930, w: 160 },
    { x: 3960, w: 140 },
  ],

  // 移动吊台（吊装车间）：两座反向往返，上层路线
  movers: [
    { x: 2620, y: 384, w: 96, dx: 300, durMs: 2400 },
    { x: 3140, y: 340, w: 96, dx: -260, durMs: 2200 },
  ],

  // 激光闸门：三座相位错开 800ms，900ms 开启 / 500ms 预警 / 其余关闭，可蹲节奏穿过或跳越
  laserGates: [
    { x: 3260, top: 300, h: 200, periodMs: 2400, onMs: 900, offsetMs: 0 },
    { x: 3400, top: 300, h: 200, periodMs: 2400, onMs: 900, offsetMs: 800 },
    { x: 3540, top: 300, h: 200, periodMs: 2400, onMs: 900, offsetMs: 1600 },
  ],

  // 检查点：激光闸门后 + 焰灵巢径后
  checkpoints: [{ x: 3860 }, { x: 4880 }],

  // 补给机：入口教学位 + Boss 门前后勤位（均在敌人射程外：喷火龟 2900±340、焰灵 4660 警戒 230）
  merchants: [{ x: 360 }, { x: 5080 }],

  coins: [
    { x: 320, y: 468 },
    { x: 360, y: 468 },
    { x: 480, y: 468 },
    { x: 640, y: 468 },
    // 熔渣带：逆传送带推进沿线
    { x: 1150, y: 440 },
    { x: 1240, y: 424 },
    // 熔岩坑道：坑口弧线
    { x: 1630, y: 430 },
    { x: 2010, y: 430 },
    // 吊装车间：固定台 / 吊台高点
    { x: 2560, y: 468 },
    { x: 2780, y: 330 },
    { x: 3000, y: 296 },
    { x: 3160, y: 290 },
    // 激光闸门：低穿越线
    { x: 3330, y: 430 },
    { x: 3470, y: 430 },
    { x: 3610, y: 430 },
    // 焰灵巢径：坑口弧线 + 弹簧上层币线
    { x: 4030, y: 420 },
    { x: 4380, y: 278 },
    { x: 4600, y: 268 },
    { x: 4700, y: 468 },
    // 检查点 / Boss 门前
    { x: 4980, y: 424 },
    { x: 5250, y: 350 },
    { x: 5980, y: 468 },
    // 熔核终点
    { x: 6540, y: 424 },
  ],

  // 敌配（较一关整体 +30% 血量；炮台缺席，主打焰灵）
  spawns: [
    // 齿轮虫：熔渣带前哨 / 激光闸门
    { kind: "gearbug", x1: 900, x2: 1100, y: 489, hp: 40, touchDamage: 14, speed: 100 },
    { kind: "gearbug", x1: 3680, x2: 3800, y: 489, hp: 40, touchDamage: 14, speed: 95 },
    // 侦察机：熔岩坑道低空 / 吊装车间上空 / 焰灵巢径高空
    { kind: "drone", x: 1800, y: 470, hp: 32, touchDamage: 12 },
    { kind: "drone", x: 3060, y: 290, hp: 32, touchDamage: 12 },
    { kind: "drone", x: 4560, y: 260, hp: 32, touchDamage: 12 },
    // 喷火龟：吊装车间阵地（340 射程避开两侧补给位）
    { kind: "spitter", x: 2900, y: 487, hp: 44, touchDamage: 12, range: 340 },
    // 焰灵 ×3：巢径主敌，漂浮警戒 230px 后锁定突进
    { kind: "ember", x: 4140, y: 380, hp: 26, touchDamage: 12 },
    { kind: "ember", x: 4420, y: 360, hp: 26, touchDamage: 12 },
    { kind: "ember", x: 4660, y: 390, hp: 26, touchDamage: 12 },
  ] as EnemyDef[],

  boss: BOSS2,

  doorX: 5420,
  coreX: 6540,
};
