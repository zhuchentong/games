/** UI 纹理：按钮 / 对话框 / 状态图标。 */

import { BTN_H, BTN_W, C } from "../config";
import { emit, panel, pxEllipse, rect, span, type G } from "./helpers";

function paintButton(g: G): void {
  panel(g, 0, 0, BTN_W, BTN_H, C.btnFace, C.btnBorder);
  // 顶部高光 / 底部阴影
  span(g, 2, 3, BTN_W - 4, 0xfff6e2);
  span(g, BTN_H - 2, 3, BTN_W - 4, 0xc9996b);
  span(g, BTN_H - 3, 3, BTN_W - 4, 0xe8c9a0);
}

function paintDialog(g: G): void {
  panel(g, 0, 0, 260, 170, 0xfdf3e0, 0x8a5a3b);
  rect(g, 4, 4, 252, 3, 0xfff8ea);
  rect(g, 4, 163, 252, 3, 0xe8cfab);
}

/** 宠物台词气泡：216×40 圆角面板 + 左下小尾巴（整幅 216×52） */
function paintSpeech(g: G): void {
  panel(g, 0, 0, 216, 40, 0xfdf8ec, 0x8a5a3b);
  // 尾巴：三段阶梯，尖端朝下；两侧 1px 描边
  rect(g, 38, 39, 14, 3, 0xfdf8ec);
  rect(g, 42, 42, 8, 3, 0xfdf8ec);
  rect(g, 45, 45, 3, 4, 0xfdf8ec);
  rect(g, 38, 39, 1, 3, 0x8a5a3b);
  rect(g, 51, 39, 1, 3, 0x8a5a3b);
  rect(g, 42, 42, 1, 3, 0x8a5a3b);
  rect(g, 49, 42, 1, 3, 0x8a5a3b);
  rect(g, 45, 45, 1, 4, 0x8a5a3b);
  rect(g, 47, 45, 1, 4, 0x8a5a3b);
  rect(g, 38, 41, 14, 1, 0xe8cfab);
}

function paintIcHunger(g: G): void {
  // 米饭堆
  span(g, 0, 4, 8, 0xffffff);
  span(g, 1, 2, 10, 0xffffff);
  span(g, 2, 3, 9, 0xffffff);
  span(g, 3, 1, 10, 0xffffff);
  span(g, 4, 2, 9, 0xf0f4f8);
  rect(g, 3, 0, 1, 1, 0xdfe6e9, 0.8);
  // 饭碗
  const c = 0xe8563b;
  span(g, 5, 1, 10, c);
  for (let y = 6; y <= 9; y++) span(g, y, 1, 11, c);
  span(g, 10, 2, 10, 0xb8382a);
  span(g, 11, 3, 9, 0xb8382a);
}

function paintIcEnergy(g: G): void {
  const c = 0xffd32a;
  span(g, 1, 6, 9, c);
  span(g, 2, 4, 7, c);
  span(g, 3, 3, 6, c);
  span(g, 4, 2, 7, c);
  span(g, 5, 4, 7, c);
  span(g, 6, 3, 8, c);
  span(g, 7, 2, 6, c);
  span(g, 8, 1, 5, c);
  span(g, 9, 0, 4, c);
  span(g, 10, 1, 3, c);
}

function paintIcClean(g: G): void {
  const c = 0x54a0ff;
  span(g, 1, 5, 6, c);
  span(g, 2, 4, 7, c);
  for (let y = 3; y <= 8; y++) span(g, y, 2, 9, c);
  span(g, 9, 3, 8, c);
  span(g, 10, 4, 7, c);
  rect(g, 3, 5, 2, 3, 0x9dd6ff);
}

function paintCoin(g: G): void {
  const gold = 0xffd32a;
  const dark = 0xe1a800;
  pxEllipse(g, 6, 6, 5, 5, dark);
  pxEllipse(g, 6, 6, 4, 4, gold);
  span(g, 3, 4, 6, 0xfff6c8);
  rect(g, 5, 4, 2, 4, dark);
}

/** 商店装饰:墙面装饰画 26×20 */
function paintDecorArt(g: G): void {
  const frame = 0x8a5a3b;
  rect(g, 0, 0, 26, 20, frame);
  rect(g, 2, 2, 22, 16, 0xbfe8f5);
  // 远山与太阳
  rect(g, 4, 10, 18, 6, 0x7ec850);
  rect(g, 6, 7, 6, 3, 0x4a9d5f);
  rect(g, 13, 5, 7, 5, 0x4a9d5f);
  pxEllipse(g, 19, 6, 2, 2, 0xffd32a);
  rect(g, 24, 2, 1, 16, 0x6b4227);
}

/** 商店装饰:地板小窝 40×22 */
function paintDecorBed(g: G): void {
  const basket = 0xc9996b;
  const dark = 0x8a5a3b;
  pxEllipse(g, 20, 12, 18, 9, dark);
  pxEllipse(g, 20, 11, 16, 8, basket);
  pxEllipse(g, 20, 10, 12, 5, 0xf2d3ac);
  rect(g, 4, 8, 32, 1, dark);
  rect(g, 6, 5, 28, 1, dark);
  rect(g, 34, 9, 2, 5, dark);
  rect(g, 4, 9, 2, 5, dark);
}

export function bakeUi(g: G): void {
  emit(g, "btn", BTN_W, BTN_H, paintButton);
  emit(g, "dialog", 260, 170, paintDialog);
  emit(g, "speech", 216, 52, paintSpeech);
  emit(g, "ic-hunger", 12, 12, paintIcHunger);
  emit(g, "ic-energy", 12, 12, paintIcEnergy);
  emit(g, "ic-clean", 12, 12, paintIcClean);
  emit(g, "coin", 12, 12, paintCoin);
  emit(g, "decor-art", 26, 20, paintDecorArt);
  emit(g, "decor-bed", 40, 22, paintDecorBed);
}
