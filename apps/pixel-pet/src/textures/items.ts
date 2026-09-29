/** 道具与元素图标纹理：蛋 / 食物 / 药 / 便便 / 特效 / 元素图标。 */

import { SPECIES } from "../config";
import { emit, pxEllipse, rect, span, type G } from "./helpers";

// —— 蛋：底色米白 + 元素色斑点 ——

function paintEgg(g: G, spot: number): void {
  const SHELL = 0xfff6e8;
  const SHADE = 0xe8d8c0;
  for (let y = 2; y <= 29; y++) {
    const t = Math.min(1, (y - 2) / 12);
    let half: number;
    if (y <= 14) {
      half = Math.max(2, Math.round(2 + 9 * Math.sqrt(t)));
    } else {
      half = 11 - Math.round(((y - 14) / 16) * 4);
    }
    span(g, y, 12 - half, 12 + half, y > 22 ? SHADE : SHELL);
  }
  span(g, 30, 6, 18, SHADE);
  // 斑点
  rect(g, 9, 10, 2, 2, spot);
  rect(g, 15, 16, 3, 2, spot);
  rect(g, 10, 22, 2, 2, spot);
  rect(g, 15, 5, 2, 2, spot);
  // 高光
  rect(g, 7, 8, 2, 6, 0xffffff, 0.85);
}

// —— 食物 / 道具 ——

function paintRice(g: G): void {
  // 饭团
  for (let y = 3; y <= 13; y++) {
    const t = (y - 3) / 10;
    const half = Math.round(2 + 5 * Math.sqrt(t));
    span(g, y, 8 - half, 8 + half, 0xffffff);
  }
  rect(g, 4, 3, 9, 1, 0xeef4f8);
  // 海苔
  rect(g, 6, 10, 5, 4, 0x2d3436);
  rect(g, 8, 8, 1, 1, 0xeef4f8, 0.7);
}

function paintPudding(g: G): void {
  // 焦糖顶
  for (let y = 3; y <= 6; y++) {
    const half = Math.round(5 * Math.sqrt((y - 2) / 5));
    span(g, y, 7 - half, 7 + half, 0xb8713a);
  }
  // 布丁身
  for (let y = 7; y <= 12; y++) {
    const half = 6 - Math.round(((y - 7) / 6) * 2);
    span(g, y, 7 - half, 7 + half, 0xffd32a);
  }
  rect(g, 3, 10, 9, 1, 0xf9ca24, 0.8);
  // 盘子
  span(g, 13, 1, 13, 0xdfe6e9);
  span(g, 14, 3, 11, 0xb2bec3);
  rect(g, 5, 5, 2, 1, 0xfff3b0, 0.9);
}

function paintMedicine(g: G): void {
  // 瓶身
  rect(g, 3, 6, 10, 9, 0xf5f6fa);
  rect(g, 3, 6, 10, 2, 0xdfe6e9);
  rect(g, 5, 3, 6, 3, 0x74b9ff);
  rect(g, 5, 2, 6, 1, 0x0984e3);
  // 红十字
  rect(g, 7, 8, 2, 6, 0xd63031);
  rect(g, 5, 10, 6, 2, 0xd63031);
  rect(g, 4, 14, 10, 1, 0xb2bec3);
}

function paintPoop(g: G, f: 0 | 1): void {
  const BROWN = 0x8a5a3b;
  const DARK = 0x6b4226;
  const dx = f === 1 ? 1 : 0;
  pxEllipse(g, 8 + dx, 9, 6, 3, BROWN);
  pxEllipse(g, 8 - dx, 6, 4, 2, BROWN);
  pxEllipse(g, 8 + dx, 3, 2, 2, BROWN);
  rect(g, 9 + dx, 1, 2, 2, DARK);
  rect(g, 5 - dx, 8, 2, 1, DARK);
  rect(g, 9 + dx, 6, 2, 1, DARK);
  rect(g, 5, 11, 7, 1, DARK, 0.6);
}

function paintBubble(g: G): void {
  pxEllipse(g, 6, 6, 5, 5, 0xb8ecff, 0.75);
  span(g, 3, 4, 6, 0xe8f8ff, 0.95);
  rect(g, 3, 4, 1, 3, 0xffffff, 0.95);
}

// —— 特效 ——

function paintHeart(g: G): void {
  const RED = 0xff6b81;
  const LIGHT = 0xffa1b0;
  rect(g, 2, 1, 3, 2, RED);
  rect(g, 7, 1, 3, 2, RED);
  rect(g, 1, 2, 10, 3, RED);
  rect(g, 2, 5, 8, 2, RED);
  rect(g, 4, 7, 4, 1, RED);
  rect(g, 5, 8, 2, 1, RED);
  rect(g, 2, 2, 2, 1, LIGHT);
  rect(g, 7, 2, 1, 1, LIGHT);
}

function paintHeartSmall(g: G, filled: boolean): void {
  const c = filled ? 0xff6b81 : 0x5a6472;
  rect(g, 1, 0, 2, 2, c);
  rect(g, 5, 0, 2, 2, c);
  rect(g, 0, 1, 8, 3, c);
  rect(g, 1, 4, 6, 1, c);
  rect(g, 3, 5, 2, 1, c);
  if (filled) rect(g, 1, 1, 1, 1, 0xffa1b0);
}

function paintZzz(g: G): void {
  const c = 0x9dd6ff;
  // 大 Z
  rect(g, 6, 0, 6, 1, c);
  rect(g, 9, 1, 1, 1, c);
  rect(g, 8, 2, 1, 1, c);
  rect(g, 7, 3, 1, 1, c);
  rect(g, 6, 4, 6, 1, c);
  // 小 Z
  rect(g, 0, 6, 4, 1, c);
  rect(g, 2, 7, 1, 1, c);
  rect(g, 1, 8, 1, 1, c);
  rect(g, 0, 9, 4, 1, c);
}

function paintSweat(g: G): void {
  rect(g, 3, 0, 2, 2, 0x74b9ff);
  rect(g, 2, 2, 4, 4, 0x74b9ff);
  rect(g, 3, 6, 2, 2, 0x74b9ff);
  rect(g, 2, 3, 1, 2, 0xd8f4ff, 0.9);
}

function paintAnger(g: G): void {
  const RED = 0xff4757;
  // 十字爆筋
  rect(g, 5, 0, 2, 4, RED);
  rect(g, 5, 8, 2, 4, RED);
  rect(g, 0, 5, 4, 2, RED);
  rect(g, 8, 5, 4, 2, RED);
  rect(g, 4, 4, 4, 4, RED);
  rect(g, 3, 3, 2, 2, RED);
  rect(g, 7, 3, 2, 2, RED);
  rect(g, 3, 7, 2, 2, RED);
  rect(g, 7, 7, 2, 2, RED);
}

function paintNote(g: G): void {
  const c = 0xff9ff3;
  rect(g, 6, 0, 1, 9, c);
  rect(g, 7, 0, 3, 1, c);
  pxEllipse(g, 4, 10, 3, 2, c);
  rect(g, 3, 9, 1, 1, 0xffffff, 0.7);
}

function paintSparkle(g: G): void {
  const c = 0xfff3b0;
  rect(g, 4, 0, 2, 10, c);
  rect(g, 0, 4, 10, 2, c);
  rect(g, 3, 3, 4, 4, 0xffffff);
}

// —— 物种头像图标 ——

function paintTagCat(g: G): void {
  rect(g, 2, 2, 3, 3, 0xf0932b);
  rect(g, 3, 1, 2, 2, 0xf0932b);
  rect(g, 7, 2, 3, 3, 0xf0932b);
  rect(g, 7, 1, 2, 2, 0xf0932b);
  rect(g, 2, 4, 8, 6, 0xf0932b);
  rect(g, 3, 10, 6, 1, 0xf0932b);
  rect(g, 4, 6, 1, 2, 0x22222e);
  rect(g, 7, 6, 1, 2, 0x22222e);
  rect(g, 5, 8, 2, 1, 0xd63031);
  rect(g, 0, 7, 2, 1, 0xffffff, 0.85);
  rect(g, 10, 7, 2, 1, 0xffffff, 0.85);
}

function paintTagDog(g: G): void {
  rect(g, 2, 3, 8, 7, 0xdd9440);
  rect(g, 3, 2, 6, 1, 0xdd9440);
  rect(g, 0, 4, 2, 5, 0xb06d24);
  rect(g, 10, 4, 2, 5, 0xb06d24);
  rect(g, 4, 5, 1, 2, 0x22222e);
  rect(g, 7, 5, 1, 2, 0x22222e);
  rect(g, 5, 8, 2, 1, 0x22222e);
  rect(g, 5, 9, 2, 1, 0xff9f9f);
}

function paintTagRabbit(g: G): void {
  rect(g, 3, 0, 2, 5, 0xf3ede4);
  rect(g, 7, 0, 2, 5, 0xf3ede4);
  rect(g, 3, 0, 1, 4, 0xffc9d4, 0.9);
  rect(g, 8, 0, 1, 4, 0xffc9d4, 0.9);
  rect(g, 2, 5, 8, 5, 0xf3ede4);
  rect(g, 4, 6, 1, 2, 0x22222e);
  rect(g, 7, 6, 1, 2, 0x22222e);
  rect(g, 5, 8, 2, 1, 0xff8fab);
}

function paintTagChick(g: G): void {
  pxEllipse(g, 6, 7, 5, 5, 0xffd32a);
  rect(g, 5, 1, 2, 2, 0xffe98a);
  rect(g, 7, 0, 1, 2, 0xffe98a);
  rect(g, 4, 6, 1, 2, 0x22222e);
  rect(g, 7, 6, 1, 2, 0x22222e);
  rect(g, 5, 9, 3, 2, 0xff7946);
}

// —— 蛋壳裂纹（画布与蛋一致：24×32，居中对齐） ——

function paintCrack(g: G, stage: 0 | 1): void {
  const c = 0x6b4226;
  span(g, 12, 8, 13, c);
  span(g, 13, 10, 16, c);
  span(g, 14, 13, 17, c);
  span(g, 15, 11, 15, c);
  if (stage === 1) {
    span(g, 10, 9, 12, c);
    span(g, 16, 6, 12, c);
    span(g, 17, 12, 18, c);
    span(g, 18, 8, 16, c);
    span(g, 19, 11, 14, c);
  }
}

// —— 烘焙 ——

export function bakeItems(g: G): void {
  for (const species of SPECIES) {
    for (const variant of [0, 1] as const) {
      emit(g, `egg-${species.id}-${variant}`, 24, 32, (gg) =>
        paintEgg(gg, species.palettes[variant].accent),
      );
    }
  }
  emit(g, "crack-0", 24, 32, (gg) => paintCrack(gg, 0));
  emit(g, "crack-1", 24, 32, (gg) => paintCrack(gg, 1));
  emit(g, "rice", 16, 15, paintRice);
  emit(g, "pudding", 15, 16, paintPudding);
  emit(g, "medicine", 16, 16, paintMedicine);
  emit(g, "poop-0", 16, 13, (gg) => paintPoop(gg, 0));
  emit(g, "poop-1", 16, 13, (gg) => paintPoop(gg, 1));
  emit(g, "bubble", 12, 12, paintBubble);
  emit(g, "heart", 12, 10, paintHeart);
  emit(g, "heart-s", 9, 7, (gg) => paintHeartSmall(gg, true));
  emit(g, "heart-s-0", 9, 7, (gg) => paintHeartSmall(gg, false));
  emit(g, "zzz", 13, 11, paintZzz);
  emit(g, "sweat", 7, 9, paintSweat);
  emit(g, "anger", 12, 12, paintAnger);
  emit(g, "note", 11, 13, paintNote);
  emit(g, "sparkle", 10, 10, paintSparkle);
  emit(g, "tag-cat", 12, 12, paintTagCat);
  emit(g, "tag-dog", 12, 12, paintTagDog);
  emit(g, "tag-rabbit", 12, 12, paintTagRabbit);
  emit(g, "tag-chick", 12, 12, paintTagChick);
  emit(g, "gift", 16, 15, paintGift);
  emit(g, "butterfly", 12, 10, paintButterfly);
}

// —— 房间事件物件 ——

function paintGift(g: G): void {
  rect(g, 1, 5, 14, 9, 0xff6b81);
  rect(g, 1, 5, 14, 2, 0xff8fab);
  rect(g, 2, 13, 12, 1, 0xd64560);
  rect(g, 7, 5, 2, 9, 0xffd32a);
  rect(g, 0, 3, 16, 2, 0xff6b81);
  rect(g, 7, 3, 2, 2, 0xffd32a);
  // 蝴蝶结
  rect(g, 5, 1, 2, 2, 0xffd32a);
  rect(g, 9, 1, 2, 2, 0xffd32a);
  rect(g, 7, 2, 2, 1, 0xffd32a);
}

function paintButterfly(g: G): void {
  // 双翅
  pxEllipse(g, 3, 4, 3, 3, 0xff9ff3);
  pxEllipse(g, 9, 4, 3, 3, 0xff9ff3);
  pxEllipse(g, 3, 4, 1, 2, 0xffffff, 0.8);
  pxEllipse(g, 9, 4, 1, 2, 0xffffff, 0.8);
  // 身体
  rect(g, 5, 3, 2, 5, 0x5b3a21);
  rect(g, 5, 1, 1, 2, 0x5b3a21);
  rect(g, 6, 1, 1, 2, 0x5b3a21);
}
