/** 宠物像素纹理：猫/狗/兔/鸡 × 五阶段（阶段 5 按分支分立：神兽形态 / 疏忽形态）× 2 帧 × 2 配色。 */

import { PET_TEX, SPECIES, petTexKey, type Palette, type PetForm } from "../config";
import { emit, eye, pxEllipse, rect, span, type G } from "./helpers";

const EYE = 0x22222e;
const TONGUE = 0xff9f9f;

/** 脚底软阴影 */
function shadow(g: G, cx: number, halfW: number): void {
  span(g, 45, cx - halfW, cx + halfW, 0x000000, 0.18);
  span(g, 46, cx - halfW + 2, cx + halfW - 2, 0x000000, 0.1);
}

/** 两只小脚：f=1 时左脚微抬 */
function feet(g: G, p: Palette, f: 0 | 1, x1: number, x2: number, y: number, w = 4, h = 3): void {
  rect(g, x1, y - (f === 1 ? 1 : 0), w, h, p.dark);
  rect(g, x2, y, w, h, p.dark);
}

// ———— 猫 ————

function paintCatS1(g: G, p: Palette, f: 0 | 1): void {
  // 尾巴上卷
  rect(g, 32, 38, 6, 2, p.dark);
  rect(g, 37, 33 + (f === 1 ? -2 : 0), 2, 6, p.dark);
  // 身体 + 头
  pxEllipse(g, 24, 36, 9, 9, p.main);
  pxEllipse(g, 24, 38, 5, 5, p.belly);
  pxEllipse(g, 24, 22, 9, 8, p.main);
  // 耳朵（内耳粉）
  rect(g, 15, 12, 4, 6, p.main);
  rect(g, 16, 10, 2, 2, p.main);
  rect(g, 16, 13, 2, 3, 0xffb3c0, 0.8);
  rect(g, 29, 12, 4, 6, p.main);
  rect(g, 30, 10, 2, 2, p.main);
  rect(g, 30, 13, 2, 3, 0xffb3c0, 0.8);
  eye(g, 19, 21, 3, 4, EYE, false);
  eye(g, 26, 21, 3, 4, EYE, false);
  rect(g, 23, 25, 2, 2, p.accent);
  rect(g, 22, 27, 1, 1, EYE);
  rect(g, 25, 27, 1, 1, EYE);
  rect(g, 15, 25, 2, 2, 0xff9f9f, 0.5);
  rect(g, 30, 25, 2, 2, 0xff9f9f, 0.5);
  feet(g, p, f, 19, 26, 44);
  shadow(g, 24, 12);
}

function paintCatS2(g: G, p: Palette, f: 0 | 1): void {
  // 竖起的尾巴
  rect(g, 33, 22 + (f === 1 ? -1 : 0), 2, 12, p.dark);
  rect(g, 31, 18 + (f === 1 ? -1 : 0), 2, 5, p.dark);
  pxEllipse(g, 24, 33, 8, 8, p.main);
  // 背部条纹
  rect(g, 19, 28, 2, 5, p.dark);
  rect(g, 26, 28, 2, 5, p.dark);
  pxEllipse(g, 24, 35, 5, 4, p.belly);
  pxEllipse(g, 24, 18, 9, 8, p.main);
  rect(g, 15, 8, 4, 6, p.main);
  rect(g, 16, 6, 2, 2, p.main);
  rect(g, 16, 9, 2, 3, 0xffb3c0, 0.8);
  rect(g, 29, 8, 4, 6, p.main);
  rect(g, 30, 6, 2, 2, p.main);
  rect(g, 30, 9, 2, 3, 0xffb3c0, 0.8);
  eye(g, 19, 17, 3, 4, EYE, false);
  eye(g, 26, 17, 3, 4, EYE, false);
  rect(g, 23, 21, 2, 2, p.accent);
  rect(g, 22, 23, 1, 1, EYE);
  rect(g, 25, 23, 1, 1, EYE);
  rect(g, 11, 19, 3, 1, p.light);
  rect(g, 34, 19, 3, 1, p.light);
  feet(g, p, f, 17, 27, 43);
  shadow(g, 24, 13);
}

function paintCatS3(g: G, p: Palette, f: 0 | 1): void {
  // 虎斑猫：条纹更重 + 小虎牙
  rect(g, 33, 20 + (f === 1 ? -1 : 0), 2, 14, p.dark);
  rect(g, 31, 16 + (f === 1 ? -1 : 0), 2, 5, p.dark);
  pxEllipse(g, 24, 32, 9, 8, p.main);
  rect(g, 18, 28, 2, 6, p.dark);
  rect(g, 22, 27, 2, 7, p.dark);
  rect(g, 26, 28, 2, 6, p.dark);
  pxEllipse(g, 24, 35, 5, 4, p.belly);
  pxEllipse(g, 24, 17, 9, 8, p.main);
  rect(g, 15, 7, 4, 6, p.main);
  rect(g, 16, 5, 2, 2, p.main);
  rect(g, 29, 7, 4, 6, p.main);
  rect(g, 30, 5, 2, 2, p.main);
  rect(g, 16, 8, 2, 3, 0xffb3c0, 0.8);
  rect(g, 30, 8, 2, 3, 0xffb3c0, 0.8);
  rect(g, 20, 11, 7, 1, p.dark);
  rect(g, 23, 10, 2, 3, p.dark);
  eye(g, 19, 16, 3, 4, EYE, false);
  eye(g, 26, 16, 3, 4, EYE, false);
  rect(g, 23, 20, 2, 2, p.accent);
  rect(g, 21, 22, 2, 1, EYE);
  rect(g, 25, 22, 2, 1, EYE);
  rect(g, 24, 23, 1, 2, 0xffffff);
  rect(g, 11, 18, 3, 1, p.light);
  rect(g, 34, 18, 3, 1, p.light);
  feet(g, p, f, 17, 27, 43);
  shadow(g, 24, 13);
}

function paintCatS4(g: G, p: Palette, f: 0 | 1): void {
  // 小白虎：额头王纹 + 粗条纹 + 虎牙
  rect(g, 34, 18 + (f === 1 ? -1 : 0), 3, 14, p.dark);
  rect(g, 32, 14 + (f === 1 ? -1 : 0), 2, 6, p.dark);
  pxEllipse(g, 24, 32, 10, 9, p.main);
  rect(g, 17, 27, 3, 7, p.dark);
  rect(g, 22, 26, 3, 8, p.dark);
  rect(g, 27, 27, 3, 7, p.dark);
  pxEllipse(g, 24, 35, 6, 4, p.belly);
  pxEllipse(g, 24, 16, 10, 9, p.main);
  rect(g, 14, 6, 5, 7, p.main);
  rect(g, 15, 4, 3, 2, p.main);
  rect(g, 29, 6, 5, 7, p.main);
  rect(g, 31, 4, 3, 2, p.main);
  rect(g, 15, 7, 2, 4, 0xffb3c0, 0.8);
  rect(g, 31, 7, 2, 4, 0xffb3c0, 0.8);
  // 额头王纹
  rect(g, 20, 10, 7, 1, p.dark);
  rect(g, 20, 12, 7, 1, p.dark);
  rect(g, 20, 14, 7, 1, p.dark);
  rect(g, 23, 9, 2, 6, p.dark);
  rect(g, 15, 11, 5, 1, p.dark);
  rect(g, 28, 11, 5, 1, p.dark);
  eye(g, 18, 15, 3, 4, EYE, false);
  eye(g, 27, 15, 3, 4, EYE, false);
  pxEllipse(g, 24, 20, 5, 3, p.belly);
  rect(g, 23, 18, 3, 2, p.accent);
  rect(g, 21, 20, 2, 1, EYE);
  rect(g, 25, 20, 2, 1, EYE);
  rect(g, 20, 22, 2, 3, 0xffffff);
  rect(g, 26, 22, 2, 3, 0xffffff);
  // 粗腿
  rect(g, 15, 40, 6, 5, p.dark);
  rect(g, 27, 40, 6, 5, p.dark);
  shadow(g, 24, 15);
}

function paintCatS5Good(g: G, p: Palette, f: 0 | 1): void {
  // 邪谋白虎：威压十足的大型白虎
  rect(g, 35, 12 + (f === 1 ? -2 : 0), 4, 16, p.dark);
  rect(g, 33, 8 + (f === 1 ? -2 : 0), 3, 6, p.main);
  pxEllipse(g, 24, 31, 12, 10, p.main);
  rect(g, 15, 25, 3, 8, p.dark);
  rect(g, 21, 23, 3, 10, p.dark);
  rect(g, 28, 25, 3, 8, p.dark);
  pxEllipse(g, 24, 35, 8, 5, p.belly);
  pxEllipse(g, 24, 14, 12, 10, p.main);
  rect(g, 10, 4, 6, 8, p.main);
  rect(g, 11, 2, 4, 2, p.main);
  rect(g, 32, 4, 6, 8, p.main);
  rect(g, 33, 2, 4, 2, p.main);
  rect(g, 12, 7, 2, 4, 0xffb3c0, 0.8);
  rect(g, 34, 7, 2, 4, 0xffb3c0, 0.8);
  // 额头王纹（大）
  rect(g, 19, 7, 9, 1, p.dark);
  rect(g, 19, 10, 9, 1, p.dark);
  rect(g, 19, 13, 9, 1, p.dark);
  rect(g, 23, 5, 2, 9, p.dark);
  // 凶狠的斜眉
  rect(g, 13, 9, 5, 1, p.dark);
  rect(g, 16, 10, 3, 1, p.dark);
  rect(g, 30, 9, 5, 1, p.dark);
  rect(g, 29, 10, 3, 1, p.dark);
  eye(g, 15, 12, 3, 4, EYE, false);
  eye(g, 30, 12, 3, 4, EYE, false);
  pxEllipse(g, 24, 19, 6, 4, p.belly);
  rect(g, 22, 17, 4, 2, p.accent);
  rect(g, 20, 19, 2, 1, EYE);
  rect(g, 26, 19, 2, 1, EYE);
  // 獠牙
  rect(g, 19, 22, 2, 4, 0xffffff);
  rect(g, 27, 22, 2, 4, 0xffffff);
  // 利爪
  rect(g, 13, 40, 6, 5, p.dark);
  rect(g, 29, 40, 6, 5, p.dark);
  rect(g, 13, 44, 2, 2, 0xffffff, 0.85);
  rect(g, 17, 44, 2, 2, 0xffffff, 0.85);
  rect(g, 29, 44, 2, 2, 0xffffff, 0.85);
  rect(g, 33, 44, 2, 2, 0xffffff, 0.85);
  shadow(g, 24, 17);
}

function paintCatS5Bad(g: G, p: Palette, f: 0 | 1): void {
  // 趴成一团
  pxEllipse(g, 26, 40, 12, 6, p.main);
  // 头枕在地上
  pxEllipse(g, 14, 38, 7, 7, p.main);
  rect(g, 8, 32 - (f === 1 ? 1 : 0), 3, 5, p.main);
  rect(g, 18, 31, 3, 4, p.main);
  rect(g, 11, 37, 4, 1, EYE);
  rect(g, 16, 37, 4, 1, EYE);
  rect(g, 17, 41, 2, 2, p.accent);
  // 尾巴绕到身前
  rect(g, 19, 44, 17, 2, p.dark);
  rect(g, 35, 42, 2, 3, p.dark);
  shadow(g, 24, 14);
}

// ———— 狗 ————

function paintDogS1(g: G, p: Palette, f: 0 | 1): void {
  pxEllipse(g, 24, 36, 9, 9, p.main);
  pxEllipse(g, 24, 38, 5, 4, p.belly);
  pxEllipse(g, 24, 21, 10, 9, p.main);
  // 垂耳
  rect(g, 13, 15 + (f === 1 ? 1 : 0), 4, 10, p.dark);
  rect(g, 31, 15 + (f === 1 ? 1 : 0), 4, 10, p.dark);
  // 奶狗眉毛斑点
  rect(g, 18, 14, 2, 2, p.dark);
  rect(g, 28, 14, 2, 2, p.dark);
  eye(g, 18, 18, 3, 4, EYE, false);
  eye(g, 27, 18, 3, 4, EYE, false);
  pxEllipse(g, 24, 25, 5, 4, p.belly);
  rect(g, 23, 23, 3, 2, EYE);
  rect(g, 23, 27, 3, 3, TONGUE);
  // 小尾巴摇
  rect(g, 32, 34 + (f === 1 ? -1 : 0), 4, 3, p.main);
  feet(g, p, f, 18, 26, 44);
  shadow(g, 24, 13);
}

function paintDogS2(g: G, p: Palette, f: 0 | 1): void {
  // 尾巴上翘
  rect(g, 33, 26 + (f === 1 ? -2 : 0), 2, 7, p.main);
  pxEllipse(g, 24, 33, 9, 8, p.main);
  pxEllipse(g, 24, 18, 10, 9, p.main);
  rect(g, 13, 12 + (f === 1 ? 1 : 0), 4, 12, p.dark);
  rect(g, 31, 12 + (f === 1 ? 1 : 0), 4, 12, p.dark);
  // 项圈
  rect(g, 18, 25, 12, 2, p.accent);
  rect(g, 23, 27, 2, 2, 0xffd32a);
  eye(g, 19, 16, 3, 4, EYE, false);
  eye(g, 26, 16, 3, 4, EYE, false);
  pxEllipse(g, 24, 22, 5, 4, p.belly);
  rect(g, 23, 20, 3, 2, EYE);
  feet(g, p, f, 17, 27, 43);
  shadow(g, 24, 13);
}

function paintDogS3(g: G, p: Palette, f: 0 | 1): void {
  // 月牙狼：竖耳 + 胸前月牙纹
  rect(g, 33, 24 + (f === 1 ? -1 : 0), 2, 10, p.main);
  rect(g, 35, 22 + (f === 1 ? -1 : 0), 2, 4, p.light);
  pxEllipse(g, 24, 32, 10, 8, p.main);
  // 胸前月牙
  pxEllipse(g, 24, 34, 5, 5, p.light);
  pxEllipse(g, 26, 33, 5, 5, p.main);
  pxEllipse(g, 24, 18, 10, 9, p.main);
  // 狼的竖耳
  rect(g, 14, 8, 4, 7, p.main);
  rect(g, 15, 6, 2, 2, p.main);
  rect(g, 30, 8, 4, 7, p.main);
  rect(g, 32, 6, 2, 2, p.main);
  rect(g, 15, 9, 2, 3, p.dark, 0.6);
  rect(g, 31, 9, 2, 3, p.dark, 0.6);
  eye(g, 19, 16, 3, 4, EYE, false);
  eye(g, 26, 16, 3, 4, EYE, false);
  pxEllipse(g, 24, 22, 5, 4, p.belly);
  rect(g, 23, 20, 3, 2, EYE);
  rect(g, 17, 10, 5, 1, p.dark);
  rect(g, 26, 10, 5, 1, p.dark);
  rect(g, 16, 40, 5, 5, p.dark);
  rect(g, 27, 40, 5, 5, p.dark);
  shadow(g, 24, 14);
}

function paintDogS4(g: G, p: Palette, f: 0 | 1): void {
  // 银月狼：鬃毛 + 獠牙 + 更大的月牙
  rect(g, 34, 20 + (f === 1 ? -2 : 0), 3, 12, p.main);
  rect(g, 36, 16 + (f === 1 ? -2 : 0), 2, 6, p.light);
  pxEllipse(g, 24, 31, 11, 9, p.main);
  pxEllipse(g, 24, 34, 6, 6, p.light);
  pxEllipse(g, 26, 33, 6, 6, p.main);
  pxEllipse(g, 24, 15, 11, 9, p.main);
  // 鬃毛
  rect(g, 11, 8 + (f === 1 ? 1 : 0), 3, 8, p.light);
  rect(g, 34, 8 + (f === 1 ? 1 : 0), 3, 8, p.light);
  rect(g, 13, 5, 3, 5, p.main);
  rect(g, 32, 5, 3, 5, p.main);
  // 竖耳
  rect(g, 13, 2, 4, 7, p.main);
  rect(g, 31, 2, 4, 7, p.main);
  rect(g, 14, 3, 2, 3, p.dark, 0.6);
  rect(g, 32, 3, 2, 3, p.dark, 0.6);
  rect(g, 16, 9, 5, 1, p.dark);
  rect(g, 27, 9, 5, 1, p.dark);
  eye(g, 18, 12, 3, 4, EYE, false);
  eye(g, 27, 12, 3, 4, EYE, false);
  pxEllipse(g, 24, 19, 5, 4, p.belly);
  rect(g, 23, 16, 3, 2, EYE);
  rect(g, 19, 21, 2, 3, 0xffffff);
  rect(g, 27, 21, 2, 3, 0xffffff);
  rect(g, 15, 40, 6, 5, p.dark);
  rect(g, 27, 40, 6, 5, p.dark);
  shadow(g, 24, 16);
}

function paintDogS5Good(g: G, p: Palette, f: 0 | 1): void {
  // 君威狼王：王冠鬃毛 + 披风 + 君临天下的气势
  rect(g, 35, 16 + (f === 1 ? -2 : 0), 4, 14, p.main);
  rect(g, 38, 12 + (f === 1 ? -2 : 0), 3, 8, p.light);
  pxEllipse(g, 24, 30, 12, 10, p.main);
  // 披风
  rect(g, 32, 26, 4, 12, p.dark);
  rect(g, 36, 28, 3, 10, p.light);
  rect(g, 31, 24, 8, 3, p.accent);
  // 胸前月牙
  pxEllipse(g, 22, 34, 6, 6, 0xffd32a);
  pxEllipse(g, 24, 33, 6, 6, p.main);
  pxEllipse(g, 24, 14, 12, 10, p.main);
  // 王冠式鬃毛（尖刺一圈）
  rect(g, 10, 4, 3, 8, p.light);
  rect(g, 14, 1, 3, 6, p.light);
  rect(g, 18, 0, 2, 5, p.light);
  rect(g, 22, 0, 3, 5, p.main);
  rect(g, 26, 1, 2, 5, p.light);
  rect(g, 30, 1, 3, 6, p.light);
  rect(g, 34, 5, 3, 8, p.light);
  rect(g, 12, 8, 5, 1, p.dark);
  rect(g, 30, 8, 5, 1, p.dark);
  eye(g, 17, 11, 3, 4, EYE, false);
  eye(g, 28, 11, 3, 4, EYE, false);
  pxEllipse(g, 24, 18, 5, 4, p.belly);
  rect(g, 23, 15, 3, 2, EYE);
  // 獠牙
  rect(g, 18, 20, 2, 4, 0xffffff);
  rect(g, 28, 20, 2, 4, 0xffffff);
  // 前爪
  rect(g, 14, 40, 6, 5, p.dark);
  rect(g, 28, 40, 6, 5, p.dark);
  rect(g, 14, 44, 2, 2, 0xffffff, 0.85);
  rect(g, 18, 44, 2, 2, 0xffffff, 0.85);
  rect(g, 28, 44, 2, 2, 0xffffff, 0.85);
  rect(g, 32, 44, 2, 2, 0xffffff, 0.85);
  shadow(g, 24, 17);
}

function paintDogS5Bad(g: G, p: Palette, f: 0 | 1): void {
  // 趴着打瞌睡
  pxEllipse(g, 26, 40, 12, 6, p.main);
  pxEllipse(g, 14, 37, 8, 7, p.main);
  // 一只耳朵搭在眼睛上
  rect(g, 9, 34 + (f === 1 ? 1 : 0), 4, 9, p.dark);
  rect(g, 18, 31, 4, 5, p.dark);
  rect(g, 16, 37, 4, 1, EYE);
  rect(g, 16, 42, 3, 3, TONGUE);
  rect(g, 34, 42, 6, 2, p.main);
  shadow(g, 24, 14);
}

// ———— 兔 ————

function paintRabbitS1(g: G, p: Palette, f: 0 | 1): void {
  // 长耳朵
  rect(g, 19, 7, 4, 12, p.main);
  rect(g, 20, 8, 2, 9, p.accent, 0.55);
  rect(g, 26, 7 + (f === 1 ? -1 : 0), 4, 12, p.main);
  rect(g, 27, 8 + (f === 1 ? -1 : 0), 2, 9, p.accent, 0.55);
  pxEllipse(g, 24, 37, 8, 8, p.main);
  pxEllipse(g, 24, 24, 9, 8, p.main);
  eye(g, 20, 23, 3, 4, EYE, false);
  eye(g, 26, 23, 3, 4, EYE, false);
  rect(g, 23, 27, 2, 2, p.accent);
  rect(g, 22, 29, 1, 1, EYE);
  rect(g, 25, 29, 1, 1, EYE);
  rect(g, 16, 26, 2, 2, 0xff9f9f, 0.45);
  rect(g, 30, 26, 2, 2, 0xff9f9f, 0.45);
  // 圆尾球
  pxEllipse(g, 33, 40, 3, 3, p.light);
  // 大脚板
  rect(g, 16, 44, 7, 2, p.belly);
  rect(g, 26, 44, 7, 2, p.belly);
  shadow(g, 24, 12);
}

function paintRabbitS2(g: G, p: Palette, f: 0 | 1): void {
  rect(g, 19, 4, 4, 15, p.main);
  rect(g, 20, 5, 2, 12, p.accent, 0.55);
  rect(g, 26, 4, 4, 15, p.main);
  rect(g, 27, 5, 2, 12, p.accent, 0.55);
  pxEllipse(g, 24, 36, 9, 9, p.main);
  pxEllipse(g, 24, 38, 5, 5, p.belly);
  pxEllipse(g, 24, 23, 9, 8, p.main);
  // 举着小爪子
  rect(g, 14, 30 - (f === 1 ? 1 : 0), 4, 3, p.main);
  rect(g, 30, 30 - (f === 1 ? 1 : 0), 4, 3, p.main);
  eye(g, 20, 22, 3, 4, EYE, false);
  eye(g, 26, 22, 3, 4, EYE, false);
  rect(g, 23, 26, 2, 2, p.accent);
  rect(g, 22, 28, 1, 1, EYE);
  rect(g, 25, 28, 1, 1, EYE);
  pxEllipse(g, 33, 40, 3, 3, p.light);
  feet(g, p, f, 17, 27, 44);
  shadow(g, 24, 13);
}

function paintRabbitS3(g: G, p: Palette, f: 0 | 1): void {
  // 望月兔：胸前月牙纹
  rect(g, 18, 2, 4, 16, p.main);
  rect(g, 19, 3, 2, 13, p.accent, 0.55);
  rect(g, 26, 2 + (f === 1 ? -1 : 0), 4, 16, p.main);
  rect(g, 27, 3 + (f === 1 ? -1 : 0), 2, 13, p.accent, 0.55);
  pxEllipse(g, 24, 36, 10, 9, p.main);
  // 胸前月牙
  pxEllipse(g, 24, 38, 4, 4, p.light);
  pxEllipse(g, 26, 37, 4, 4, p.main);
  pxEllipse(g, 24, 22, 10, 9, p.main);
  eye(g, 20, 20, 3, 4, EYE, false);
  eye(g, 26, 20, 3, 4, EYE, false);
  rect(g, 23, 24, 2, 2, p.accent);
  rect(g, 22, 26, 1, 1, EYE);
  rect(g, 25, 26, 1, 1, EYE);
  rect(g, 15, 23, 2, 2, 0xff9f9f, 0.45);
  rect(g, 31, 23, 2, 2, 0xff9f9f, 0.45);
  pxEllipse(g, 34, 40, 3, 3, p.light);
  rect(g, 15, 43, 8, 3, p.belly);
  rect(g, 25, 43, 8, 3, p.belly);
  shadow(g, 24, 14);
}

function paintRabbitS4(g: G, p: Palette, f: 0 | 1): void {
  // 捣药玉兔：抱着药杵
  rect(g, 16, 2, 4, 16, p.main);
  rect(g, 17, 3, 2, 13, p.accent, 0.55);
  rect(g, 27, 2 + (f === 1 ? -1 : 0), 4, 16, p.main);
  rect(g, 28, 3 + (f === 1 ? -1 : 0), 2, 13, p.accent, 0.55);
  pxEllipse(g, 23, 35, 10, 9, p.main);
  pxEllipse(g, 23, 37, 5, 5, p.belly);
  pxEllipse(g, 23, 21, 10, 9, p.main);
  eye(g, 19, 20, 3, 4, EYE, false);
  eye(g, 25, 20, 3, 4, EYE, false);
  rect(g, 22, 24, 2, 2, p.accent);
  rect(g, 21, 26, 1, 1, EYE);
  rect(g, 24, 26, 1, 1, EYE);
  // 药杵与药钵
  rect(g, 32, 30 + (f === 1 ? -1 : 0), 2, 9, 0x8a6a4a);
  rect(g, 29, 39, 11, 3, p.dark);
  rect(g, 30, 42, 9, 2, 0x8a6a4a);
  rect(g, 13, 43, 8, 3, p.belly);
  shadow(g, 23, 15);
}

function paintRabbitS5Good(g: G, p: Palette, f: 0 | 1): void {
  // 神龙：蜿蜒龙身 + 龙角龙须
  const dy = f === 1 ? -1 : 0;
  // 蜿蜒的身体（S 形三段）
  pxEllipse(g, 30, 36, 9, 5, p.main);
  pxEllipse(g, 22, 40, 7, 4, p.main);
  rect(g, 24, 30, 7, 6, p.main);
  pxEllipse(g, 33, 28 + dy, 5, 4, p.main);
  // 尾鳍
  rect(g, 38, 24 + dy, 3, 8, p.light);
  rect(g, 42, 27 + dy, 2, 6, p.accent, 0.8);
  // 龙头
  pxEllipse(g, 22, 18, 10, 9, p.main);
  pxEllipse(g, 24, 21, 6, 4, p.belly);
  // 龙角
  rect(g, 15, 6, 2, 7, p.dark);
  rect(g, 13, 3 + dy, 2, 4, p.dark);
  rect(g, 27, 6, 2, 7, p.dark);
  rect(g, 30, 3 + dy, 2, 4, p.dark);
  // 龙须
  rect(g, 10, 20, 6, 1, p.light);
  rect(g, 9, 22, 4, 1, p.light, 0.8);
  rect(g, 32, 20, 6, 1, p.light);
  rect(g, 37, 22, 4, 1, p.light, 0.8);
  eye(g, 17, 16, 3, 4, EYE, false);
  eye(g, 25, 16, 3, 4, EYE, false);
  rect(g, 18, 12, 5, 1, p.dark);
  rect(g, 24, 12, 5, 1, p.dark);
  rect(g, 21, 23, 2, 2, p.accent);
  // 前爪
  rect(g, 18, 44, 5, 2, p.dark);
  rect(g, 28, 44, 5, 2, p.dark);
  // 头顶光环
  pxEllipse(g, 22, 2 + dy, 5, 2, 0xffd32a, 0.6);
  shadow(g, 26, 16);
}

function paintRabbitS5Bad(g: G, p: Palette, f: 0 | 1): void {
  // 耷拉着的耳朵
  rect(g, 16, 10, 4, 9, p.main);
  rect(g, 14, 18, 4, 5, p.main);
  rect(g, 28, 10 + (f === 1 ? 1 : 0), 4, 9, p.main);
  rect(g, 31, 18 + (f === 1 ? 1 : 0), 4, 5, p.main);
  pxEllipse(g, 24, 39, 10, 7, p.main);
  pxEllipse(g, 24, 26, 9, 8, p.main);
  rect(g, 20, 25, 4, 1, EYE);
  rect(g, 25, 25, 4, 1, EYE);
  rect(g, 23, 30, 3, 1, EYE);
  rect(g, 33, 42, 3, 3, p.light);
  shadow(g, 24, 13);
}

// ———— 鸡 ————

function paintChickS1(g: G, p: Palette, f: 0 | 1): void {
  pxEllipse(g, 24, 35, 10, 10, p.main);
  // 头顶绒毛
  rect(g, 22, 20, 2, 3, p.light);
  rect(g, 25, 19 + (f === 1 ? -1 : 0), 2, 3, p.light);
  eye(g, 19, 31, 3, 4, EYE, false);
  eye(g, 26, 31, 3, 4, EYE, false);
  rect(g, 15, 34, 2, 2, 0xff9f9f, 0.5);
  rect(g, 30, 34, 2, 2, 0xff9f9f, 0.5);
  // 小嘴
  rect(g, 22, 35, 4, 2, p.accent);
  rect(g, 23, 37, 2, 1, p.accent);
  // 小翅膀
  rect(g, 13, 33 + (f === 1 ? 1 : 0), 3, 7, p.dark);
  rect(g, 32, 33 + (f === 1 ? 1 : 0), 3, 7, p.dark);
  // 脚
  rect(g, 20, 44, 2, 3, p.accent);
  rect(g, 26, 44, 2, 3, p.accent);
  shadow(g, 24, 12);
}

function paintChickS2(g: G, p: Palette, f: 0 | 1): void {
  pxEllipse(g, 24, 34, 9, 11, p.main);
  pxEllipse(g, 24, 37, 5, 5, p.belly);
  rect(g, 21, 19, 2, 3, p.light);
  rect(g, 24, 18 + (f === 1 ? -1 : 0), 2, 3, p.light);
  rect(g, 27, 20, 1, 2, p.light);
  eye(g, 20, 29, 3, 4, EYE, false);
  eye(g, 26, 29, 3, 4, EYE, false);
  rect(g, 21, 33, 5, 3, p.accent);
  rect(g, 22, 36, 3, 1, p.accent);
  // 张开的翅膀
  rect(g, 11, 31 + (f === 1 ? -1 : 0), 4, 8, p.dark);
  rect(g, 33, 31 + (f === 1 ? -1 : 0), 4, 8, p.dark);
  rect(g, 19, 44, 3, 3, p.accent);
  rect(g, 26, 44, 3, 3, p.accent);
  shadow(g, 24, 13);
}

function paintChickS3(g: G, p: Palette, f: 0 | 1): void {
  // 锦鸡：尾羽渐成
  pxEllipse(g, 23, 33, 9, 10, p.main);
  pxEllipse(g, 23, 36, 5, 5, p.belly);
  rect(g, 20, 18, 2, 3, p.light);
  rect(g, 23, 17 + (f === 1 ? -1 : 0), 2, 3, p.light);
  eye(g, 19, 28, 3, 4, EYE, false);
  eye(g, 25, 28, 3, 4, EYE, false);
  rect(g, 20, 32, 5, 3, p.accent);
  // 初生的尾羽
  rect(g, 30, 26 + (f === 1 ? -1 : 0), 3, 9, p.dark);
  rect(g, 33, 29, 3, 9, p.main);
  rect(g, 36, 32, 2, 8, p.light);
  rect(g, 12, 30 + (f === 1 ? 1 : 0), 4, 8, p.dark);
  rect(g, 18, 44, 3, 3, p.accent);
  rect(g, 25, 44, 3, 3, p.accent);
  shadow(g, 24, 13);
}

function paintChickS4(g: G, p: Palette, f: 0 | 1): void {
  // 火雏：头顶燃起小火苗
  rect(g, 20, 14, 2, 4, 0xe0413e);
  rect(g, 23, 11 + (f === 1 ? -1 : 0), 2, 6, p.accent);
  rect(g, 26, 14, 2, 4, 0xe0413e);
  pxEllipse(g, 24, 32, 9, 10, p.main);
  pxEllipse(g, 24, 35, 5, 5, p.belly);
  eye(g, 20, 27, 3, 4, EYE, false);
  eye(g, 26, 27, 3, 4, EYE, false);
  rect(g, 21, 31, 5, 3, p.accent);
  rect(g, 22, 34, 3, 1, p.accent);
  // 焰色尾羽
  rect(g, 31, 20 + (f === 1 ? -1 : 0), 3, 12, p.dark);
  rect(g, 34, 23, 3, 12, p.main);
  rect(g, 37, 26, 2, 10, p.accent, 0.85);
  rect(g, 12, 28 + (f === 1 ? 1 : 0), 4, 9, p.dark);
  rect(g, 19, 44, 3, 3, p.accent);
  rect(g, 26, 44, 3, 3, p.accent);
  shadow(g, 24, 13);
}

function paintChickS5Good(g: G, p: Palette, f: 0 | 1): void {
  // 凤凰：焰冠 + 拖曳的流光尾羽
  const dy = f === 1 ? -1 : 0;
  // 焰冠
  rect(g, 18, 8, 2, 5, 0xe0413e);
  rect(g, 21, 4, 3, 8, p.accent);
  rect(g, 25, 2 + dy, 3, 6, 0xe0413e);
  rect(g, 28, 6, 2, 5, p.accent, 0.85);
  pxEllipse(g, 24, 20, 9, 8, p.main);
  // 喙
  rect(g, 20, 22, 6, 3, p.accent);
  eye(g, 18, 17, 3, 4, EYE, false);
  eye(g, 26, 17, 3, 4, EYE, false);
  // 身体
  pxEllipse(g, 24, 32, 10, 10, p.main);
  pxEllipse(g, 24, 35, 6, 6, p.belly);
  // 扬起的翅膀
  rect(g, 11, 22 + dy, 5, 11, p.dark);
  rect(g, 9, 18 + dy, 3, 7, p.main);
  // 流光尾羽
  rect(g, 30, 36, 4, 10, p.dark);
  rect(g, 34, 32, 4, 12, p.main);
  rect(g, 38, 28 + dy, 3, 14, p.accent, 0.9);
  rect(g, 41, 34, 2, 10, p.light);
  rect(g, 35, 30, 2, 2, 0xffffff, 0.9);
  rect(g, 39, 26, 2, 2, 0xffffff, 0.9);
  // 脚
  rect(g, 19, 42, 3, 4, p.accent);
  rect(g, 27, 42, 3, 4, p.accent);
  span(g, 46, 17, 22, p.accent);
  span(g, 46, 25, 30, p.accent);
  shadow(g, 24, 16);
}

function paintChickS5Bad(g: G, p: Palette, f: 0 | 1): void {
  // 趴成一团毛球
  pxEllipse(g, 24, 38, 11, 8, p.main);
  rect(g, 21, 26 + (f === 1 ? 1 : 0), 2, 3, 0xe0413e);
  rect(g, 25, 26 + (f === 1 ? 1 : 0), 2, 3, 0xe0413e);
  rect(g, 19, 32, 4, 1, EYE);
  rect(g, 25, 32, 4, 1, EYE);
  rect(g, 22, 36, 4, 2, p.accent);
  rect(g, 12, 36, 3, 6, p.dark);
  rect(g, 33, 36, 3, 6, p.dark);
  shadow(g, 24, 13);
}

// ———— 烘焙 ————

type PetPainter = (g: G, p: Palette, f: 0 | 1) => void;

const PET_FORMS: PetForm[] = ["s1", "s2", "s3", "s4", "s5good", "s5bad"];

const PAINTERS: Record<string, PetPainter> = {
  "cat-s1": paintCatS1,
  "cat-s2": paintCatS2,
  "cat-s3": paintCatS3,
  "cat-s4": paintCatS4,
  "cat-s5good": paintCatS5Good,
  "cat-s5bad": paintCatS5Bad,
  "dog-s1": paintDogS1,
  "dog-s2": paintDogS2,
  "dog-s3": paintDogS3,
  "dog-s4": paintDogS4,
  "dog-s5good": paintDogS5Good,
  "dog-s5bad": paintDogS5Bad,
  "rabbit-s1": paintRabbitS1,
  "rabbit-s2": paintRabbitS2,
  "rabbit-s3": paintRabbitS3,
  "rabbit-s4": paintRabbitS4,
  "rabbit-s5good": paintRabbitS5Good,
  "rabbit-s5bad": paintRabbitS5Bad,
  "chick-s1": paintChickS1,
  "chick-s2": paintChickS2,
  "chick-s3": paintChickS3,
  "chick-s4": paintChickS4,
  "chick-s5good": paintChickS5Good,
  "chick-s5bad": paintChickS5Bad,
};

export function bakePets(g: G): void {
  for (const species of SPECIES) {
    for (const variant of [0, 1] as const) {
      const pal = species.palettes[variant];
      for (const form of PET_FORMS) {
        const painter = PAINTERS[`${species.id}-${form}`];
        if (!painter) continue;
        for (const frame of [0, 1] as const) {
          emit(g, petTexKey(species.id, form, variant, frame), PET_TEX, PET_TEX, (gg) =>
            painter(gg, pal, frame),
          );
        }
      }
    }
  }
}
