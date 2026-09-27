import type { UpgradeId } from "../data/upgrades";

/** 逻辑分辨率与主场景 zoom：像素化渲染——可视世界 = width/zoom × height/zoom，纹理 1 像素呈 2×2 屏幕像素 */
export const GAME = { width: 960, height: 540, zoom: 2 } as const;

export const FONT = '"Microsoft YaHei", "PingFang SC", sans-serif';

/** 渲染层级约定：数值越小越靠后，全项目 setDepth 只用这里的命名值 */
export const DEPTH = {
  /** 关卡底色分段矩形 */
  bg: -20,
  /** 视差远山 */
  parallaxFar: -19,
  /** 视差近树 */
  parallaxNear: -18,
  /** 背景分段名文字 */
  bgLabel: -10,
  /** 场景装饰剪影（齿轮/烟囱/门） */
  decor: -9,
  /** 场景拾取物（Boss 掉落核心） */
  items: 4,
  boss: 5,
  bossCore: 6,
  /** 战斗特效（斩击弧/命中火花/冲击环/残影） */
  fx: 12,
  /** 战斗飘字 */
  floatText: 15,
  /** 全屏提示（警告横幅/门顶叹号） */
  overlay: 20,
} as const;

/** 运行时类型守卫：调试参数/存档里的角色 id 校验 */
export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && (CHARACTER_IDS as readonly string[]).includes(value);
}

export type CharacterId = "tiger" | "wolf" | "frog" | "bird" | "rabbit";

export type SkillKind = "aoe" | "dash" | "projectile" | "heal" | "shield";

export interface SkillConfig {
  name: string;
  kind: SkillKind;
  cooldownMs: number;
  damage: number;
  desc: string;
  /** 护盾类技能：免疫时长 ms */
  durationMs?: number;
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  role: string;
  texture: string;
  hp: number;
  speed: number;
  jumpVelocity: number;
  attackDamage: number;
  attackIntervalMs: number;
  skill: SkillConfig;
  passiveName: string;
  passiveDesc: string;
  doubleJump?: boolean;
  glide?: boolean;
}

export const CHARACTER_IDS: readonly CharacterId[] = ["tiger", "wolf", "frog", "bird", "rabbit"];

export interface SaveData {
  version: number;
  lastCharacter: CharacterId | null;
  cleared: boolean;
  bestGrade: string | null;
  coins: number;
  /** 所在关卡序号（1=森林·机龙巢径，2=熔火机厂，3=黑暗森林）；checkpointX 属于该关 */
  level: number;
  /** 最近激活的检查点 x 坐标（死亡/坠落重生用），null = 未激活 */
  checkpointX: number | null;
  /** 补给机三轨升级等级（购买即落盘；跨关/续玩保留，清档归零） */
  upgrades: Record<UpgradeId, number>;
}

export interface RunStats {
  characterId: CharacterId;
  /** 通关的关卡序号（结算标题用） */
  levelId: number;
  timeMs: number;
  hitsTaken: number;
  coins: number;
  victory: boolean;
}
