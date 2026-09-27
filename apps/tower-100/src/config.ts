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
export const WIN_FLOOR = 100;

/** 镜头最低/最高上移速度（像素/秒），随层数增长 */
export const SCROLL_SPEED_MIN = 26;
export const SCROLL_SPEED_MAX = 118;

/** 最佳纪录存档键 */
export const BEST_KEY = "floor100.best";

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
