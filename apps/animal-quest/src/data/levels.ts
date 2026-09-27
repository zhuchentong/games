/** 关卡配置通用类型：level1.ts / level2.ts 同构，LevelBuild 按此铺设（不引入 Tiled） */

import type { EnemyDef } from "./enemies";
import type { BossDef } from "./boss";
export interface SegmentDef {
  x0: number;
  x1: number;
  color: number;
  name: string;
}

export interface GroundDef {
  x: number;
  w: number;
}

export interface PlatformDef {
  x: number;
  y: number;
  w: number;
}

export interface BeltDef {
  x: number;
  w: number;
  /** 推送方向：-1 向左 / 1 向右 */
  direction: -1 | 1;
  speed: number;
}

export interface SawDef {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  durMs: number;
  damage: number;
}

export interface PlankDef {
  x: number;
  w: number;
}

export interface SpringDef {
  x: number;
}

export interface CoinDef {
  x: number;
  y: number;
}

export interface MerchantDef {
  x: number;
}

/** 熔岩坑：主地面缺口处的岩浆面，坠入受伤并被弹起（非致死坑） */
export interface LavaPitDef {
  x: number;
  w: number;
}

/** 移动吊台：水平往返的浮台（y 固定），站上去随台移动 */
export interface MovPlatDef {
  x: number;
  y: number;
  w: number;
  /** 往返幅度（相对 x 的位移） */
  dx: number;
  /** 单程时长 ms */
  durMs: number;
}

/** 激光闸门：垂直光柱周期启闭，预警闪烁后实柱开启，接触受伤 */
export interface LaserGateDef {
  x: number;
  /** 光柱顶端 y */
  top: number;
  /** 光柱长度 */
  h: number;
  periodMs: number;
  /** 开启时长 ms（随后 500ms 预警闪烁） */
  onMs: number;
  /** 相位偏移 ms（多座错开节奏） */
  offsetMs: number;
}

/** 幻影平台：踩踏后闪烁消散，限时后原位重建（悬空段路线） */
export interface FadingPlatDef {
  x: number;
  y: number;
  w: number;
}

/** 上升气流：从地面到 top 的升力柱，柱内持续抬升玩家 */
export interface UpdraftDef {
  x: number;
  w: number;
  /** 柱顶 y（柱底固定为地面顶） */
  top: number;
}

export type LevelTheme = "forest" | "forge" | "darkwood";

/** 关卡完整配置：地图 + 机关 + 敌配 + Boss 引用 */
export interface LevelConfig {
  worldWidth: number;
  groundTop: number;
  segments: SegmentDef[];
  grounds: GroundDef[];
  platforms: PlatformDef[];
  belts: BeltDef[];
  saws: SawDef[];
  springs: SpringDef[];
  /** 断桥（第一关特色机关；可选） */
  bridge?: {
    y: number;
    rebuildMs: number;
    planks: PlankDef[];
  };
  lavaPits?: LavaPitDef[];
  movers?: MovPlatDef[];
  laserGates?: LaserGateDef[];
  fadingPlatforms?: FadingPlatDef[];
  updrafts?: UpdraftDef[];
  checkpoints: { x: number }[];
  merchants: MerchantDef[];
  coins: CoinDef[];
  /** 敌人点位表（死亡重置时按此重建） */
  spawns: EnemyDef[];
  /** 本关 Boss 机体（门前警示/出场/核心拾取文案同源） */
  boss: BossDef;
  theme: LevelTheme;
  /** 终点拾取物名称（机器人核心/熔核） */
  coreLabel: string;
  doorX: number;
  coreX: number;
}
