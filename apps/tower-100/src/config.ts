/** 全局配置：尺寸、物理、手感参数与平台类型定义。 */

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 720;

export const GRAVITY_Y = 1500;

/** 左右移动速度（像素/秒） */
export const MOVE_SPEED = 275;
/** 普通平台弹跳初速度（约 163px 跳高） */
export const BOUNCE_VELOCITY = -700;
/** 弹簧平台弹跳初速度（约 400px 跳高） */
export const SPRING_VELOCITY = -1100;

export const MAX_HP = 3;
/** 生命上限可成长到的最大值（心之容器道具） */
export const MAX_HP_CAP = 6;
export const WIN_FLOOR = 100;

/** 弹跳强化道具：持续时长（毫秒）与弹跳力倍率 */
export const BOUNCE_BOOST_MS = 10000;
export const BOUNCE_BOOST_MULTIPLIER = 1.25;

/** 时间减缓道具：持续时长（毫秒）与上移速度倍率 */
export const SLOW_MS = 8000;
export const SLOW_FACTOR = 0.5;

/** 掉落物种类：飞刀伤害，其余为增益道具 */
export const DROP_KIND = {
  Knife: "knife",
  Heart: "heart",
  MaxHp: "maxhp",
  Bounce: "bounce",
  Shield: "shield",
  Slow: "slow",
} as const;

export type DropKind = (typeof DROP_KIND)[keyof typeof DROP_KIND];

/** 掉落物权重（随层数微调），道具比飞刀更慢落下方便接住 */
export function dropWeights(floor: number): Record<DropKind, number> {
  return {
    knife: 66,
    heart: floor < 12 ? 20 : 13,
    maxhp: 3,
    bounce: 5,
    shield: 4,
    slow: 4,
  };
}

/** 镜头最低/最高上移速度（像素/秒） */
export const SCROLL_SPEED_MIN = 26;
export const SCROLL_SPEED_MAX = 140;
/** 每层增加的上移速度（像素/秒/层），约在 84 层触及上限 */
export const SCROLL_SPEED_PER_FLOOR = 1.35;

/** 最佳纪录存档键 */
export const BEST_KEY = "floor100.best";
/** 静音偏好存档键 */
export const MUTED_KEY = "floor100.muted";

const PlatformType = {
  Normal: "normal",
  Fragile: "fragile",
  Spring: "spring",
  Conveyor: "conveyor",
  Spike: "spike",
} as const;

export type PlatformType = (typeof PlatformType)[keyof typeof PlatformType];

export const PLATFORM_TYPE = PlatformType;

/**
 * 各平台在给定层数下的出现权重。
 * 越往上，易碎/钉板越多，普通板越少。
 */
export function platformWeights(floor: number): Record<PlatformType, number> {
  if (floor < 12) {
    return { normal: 68, fragile: 4, spring: 8, conveyor: 20, spike: 0 };
  }
  if (floor < 35) {
    return { normal: 55, fragile: 12, spring: 10, conveyor: 18, spike: 5 };
  }
  if (floor < 65) {
    return { normal: 44, fragile: 20, spring: 10, conveyor: 17, spike: 9 };
  }
  return { normal: 36, fragile: 26, spring: 10, conveyor: 15, spike: 13 };
}
