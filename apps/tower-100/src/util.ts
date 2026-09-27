/** 公共工具：中文字体与最高纪录存取。 */

import { BEST_KEY } from "./config";

export const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';

export function loadBest(): number {
  const raw = localStorage.getItem(BEST_KEY);
  const n = raw === null ? 0 : Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

export function saveBest(floor: number): void {
  localStorage.setItem(BEST_KEY, String(Math.max(floor, loadBest())));
}
