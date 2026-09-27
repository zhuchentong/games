/** 敌人点位类型（y 为精灵中心坐标）；具体点位表在各关 level1.ts / level2.ts / level3.ts 的 spawns 里 */

/** 地面往返巡逻型公共字段（齿轮虫 / 刺壳甲虫） */
export interface PatrolDef {
  x1: number;
  x2: number;
  y: number;
  hp: number;
  touchDamage: number;
  /** 巡逻速度 px/s */
  speed: number;
}

/** 飞行悬停-俯扑型公共字段（侦察机 / 孢翼蛾） */
export interface FlyerDef {
  x: number;
  /** 悬停基准高度（中心） */
  y: number;
  hp: number;
  touchDamage: number;
}

/** 定点抛射型公共字段（喷火龟 / 食人花） */
export interface PlanterDef {
  x: number;
  y: number;
  hp: number;
  touchDamage: number;
  /** 抛射射程 px */
  range: number;
}

export interface GearBugDef extends PatrolDef {
  kind: "gearbug";
}

export interface DroneDef extends FlyerDef {
  kind: "drone";
}

export interface TurretDef {
  kind: "turret";
  x: number;
  y: number;
  hp: number;
  touchDamage: number;
  /** 开火射程 px */
  range: number;
}

export interface SpitterDef extends PlanterDef {
  kind: "spitter";
}

/** 焰灵：漂浮火苗，玩家靠近后锁定短距突进（第二关新敌人） */
export interface EmberDef {
  kind: "ember";
  x: number;
  /** 漂浮基准高度（中心） */
  y: number;
  hp: number;
  touchDamage: number;
}

/** 刺壳甲虫：荆棘背壳的地面巡逻虫（黑暗森林版齿轮虫生态位） */
export interface BeetleDef extends PatrolDef {
  kind: "beetle";
}

/** 孢翼蛾：荧光鳞粉飞蛾，悬停追踪玩家后短距俯扑（黑暗森林版侦察机生态位） */
export interface MothDef extends FlyerDef {
  kind: "moth";
}

/** 食人花：定点食肉植物，向玩家抛射弧线毒孢子弹（黑暗森林版喷火龟生态位） */
export interface SnapflowerDef extends PlanterDef {
  kind: "snapflower";
}

/** 爆刺栗：荆棘栗苞地面追击玩家，贴近后尖刺竖起自爆散出荆棘（黑暗森林版自爆蛛生态位） */
export interface ThornburDef {
  kind: "thornbur";
  x: number;
  /** 地面中心 y（同齿轮虫 489） */
  y: number;
  hp: number;
  touchDamage: number;
  /** 自爆范围伤害 */
  boomDamage: number;
}

export type EnemyDef =
  | GearBugDef
  | DroneDef
  | TurretDef
  | SpitterDef
  | EmberDef
  | BeetleDef
  | MothDef
  | SnapflowerDef
  | ThornburDef;
