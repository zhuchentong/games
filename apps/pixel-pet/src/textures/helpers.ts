/** 像素绘图助手：全部基于 1px 矩形/行填充，保证棱角分明的像素风。 */

import type Phaser from "phaser";

export type G = Phaser.GameObjects.Graphics;

export function rect(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  alpha = 1,
): void {
  g.fillStyle(color, alpha);
  g.fillRect(x, y, w, h);
}

/** 单像素行：x0..x1 闭区间 */
export function span(g: G, y: number, x0: number, x1: number, color: number, alpha = 1): void {
  if (x1 < x0) return;
  rect(g, x0, y, x1 - x0 + 1, 1, color, alpha);
}

/** 像素椭圆：逐行扫描线填充（rx/ry 为半径） */
export function pxEllipse(
  g: G,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
  alpha = 1,
): void {
  for (let dy = -ry; dy <= ry; dy++) {
    const t = 1 - (dy / ry) * (dy / ry);
    if (t <= 0) continue;
    const half = Math.round(rx * Math.sqrt(t));
    span(g, cy + dy, cx - half, cx + half, color, alpha);
  }
}

/** 像素圆角面板：1px 描边 + 切角 */
export function panel(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
  border: number,
): void {
  rect(g, x + 2, y, w - 4, h, border);
  rect(g, x, y + 2, w, h - 4, border);
  rect(g, x + 1, y + 1, w - 2, h - 2, border);
  rect(g, x + 2, y + 1, w - 4, h - 2, fill);
  rect(g, x + 1, y + 2, w - 2, h - 4, fill);
}

/** 眼睛：closed 时画一条短线 */
export function eye(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  closed = false,
): void {
  if (closed) {
    rect(g, x, y + h - 1, w, 1, color);
    return;
  }
  rect(g, x, y, w, h, color);
  if (w >= 2 && h >= 2) rect(g, x, y, 1, 1, 0xffffff, 0.9);
}

/** 烘焙一个纹理：画 → generateTexture → clear */
export function emit(g: G, key: string, w: number, h: number, draw: (g: G) => void): void {
  draw(g);
  g.generateTexture(key, w, h);
  g.clear();
}
