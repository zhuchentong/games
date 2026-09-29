/** 公共工具：中文字体 / 数值钳制 / 随机数 / 年龄显示。 */

export const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** 年龄显示：1 游戏日 = 1「天」 */
export function formatAge(ageDays: number): string {
  return `第 ${Math.max(1, Math.floor(ageDays) + 1)} 天`;
}
