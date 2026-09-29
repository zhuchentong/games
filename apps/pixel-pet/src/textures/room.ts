/** 房间背景与可交互物件纹理：壁纸/墙裙/地板/地毯为底，窗(昼/夜)/木球/盆栽为独立物件。 */

import { GAME_WIDTH, ROOM_H } from "../config";
import { emit, pxEllipse, rect, span, type G } from "./helpers";

const WALL_BASE = 0xfdebd3;
const WALL_DOT = 0xf5ddba;
const WAINSCOT = 0xe8b98a;
const WAIN_TRIM = 0x8a5a3b;
const FLOOR_BASE = 0xd9a066;
const FLOOR_DARK = 0xc98d55;
const FLOOR_LINE = 0xb87f4a;

function paintWallpaper(g: G): void {
  rect(g, 0, 0, GAME_WIDTH, 336, WALL_BASE);
  // 竖条纹
  for (let x = 0; x < GAME_WIDTH; x += 48) {
    rect(g, x, 0, 5, 300, 0xf9e2c0);
    rect(g, x + 24, 0, 2, 300, 0xf9e2c0);
  }
  // 波点
  for (let y = 12; y < 300; y += 32) {
    for (let x = 18; x < GAME_WIDTH; x += 32) {
      const offset = (y / 32) % 2 === 0 ? 0 : 16;
      rect(g, x + offset, y, 2, 2, WALL_DOT);
    }
  }
  // 墙裙
  rect(g, 0, 300, GAME_WIDTH, 36, WAINSCOT);
  rect(g, 0, 298, GAME_WIDTH, 3, WAIN_TRIM);
  for (let x = 30; x < GAME_WIDTH; x += 60) {
    rect(g, x, 306, 2, 24, 0xd8a878);
  }
}

/** 置物架托板（球和盆栽是独立物件，不烘进背景） */
function paintShelf(g: G): void {
  const x0 = 316;
  const y0 = 132;
  rect(g, x0, y0, 116, 7, 0xa8714a);
  rect(g, x0, y0 + 7, 116, 2, 0x7c4f30);
  rect(g, x0 + 8, y0 + 9, 5, 12, 0x7c4f30);
  rect(g, x0 + 102, y0 + 9, 5, 12, 0x7c4f30);
}

function paintFloor(g: G): void {
  const y0 = 336;
  rect(g, 0, y0, GAME_WIDTH, ROOM_H - y0, FLOOR_BASE);
  // 踢脚线
  rect(g, 0, y0, GAME_WIDTH, 5, WAIN_TRIM);
  // 横向木板
  for (let y = y0 + 5; y < ROOM_H; y += 18) {
    rect(g, 0, y, GAME_WIDTH, 2, FLOOR_LINE);
    // 竖向拼缝（每行错位）
    const offset = ((y - y0) / 18) % 2 === 0 ? 40 : 130;
    for (let x = offset; x < GAME_WIDTH; x += 160) {
      rect(g, x, y + 2, 2, 16, FLOOR_DARK);
    }
  }
}

function paintRug(g: G): void {
  const cx = 240;
  const cy = 412;
  for (let dy = -36; dy <= 36; dy++) {
    const t = 1 - (dy / 36) * (dy / 36);
    if (t <= 0) continue;
    const half = Math.round(118 * Math.sqrt(t));
    span(g, cy + dy, cx - half, cx + half, 0xff8fab);
  }
  for (let dy = -30; dy <= 30; dy++) {
    const t = 1 - (dy / 30) * (dy / 30);
    if (t <= 0) continue;
    const half = Math.round(106 * Math.sqrt(t));
    span(g, cy + dy, cx - half, cx + half, 0xffa8c0);
  }
  for (let dy = -22; dy <= 22; dy += 11) {
    const t = 1 - (dy / 24) * (dy / 24);
    if (t <= 0) continue;
    const half = Math.round(86 * Math.sqrt(t));
    span(g, cy + dy, cx - half, cx + half, 0xffc2d1);
  }
  pxEllipse(g, cx, cy, 40, 12, 0xffd32a, 0.5);
}

/** 窗户（172×140，含窗框与窗台）：昼间阳光白云 / 夜间月亮星星 */
function paintWindowInto(g: G, night: boolean): void {
  rect(g, 4, 0, 162, 130, WAIN_TRIM);
  for (let y = 0; y < 118; y += 2) {
    const t = y / 118;
    const color = night
      ? (Math.round(0x18 + t * 0x18) << 16) |
        (Math.round(0x20 + t * 0x1a) << 8) |
        Math.round(0x50 + t * 0x20)
      : (Math.round(0x6e + t * 0x50) << 16) | (Math.round(0xc8 + t * 0x20) << 8) | 0xff;
    rect(g, 10, 6 + y, 150, 2, color);
  }
  if (!night) {
    pxEllipse(g, 44, 40, 16, 6, 0xffffff);
    pxEllipse(g, 58, 36, 12, 5, 0xffffff);
    pxEllipse(g, 114, 80, 14, 5, 0xffffff, 0.92);
    pxEllipse(g, 132, 32, 11, 11, 0xffd32a);
    pxEllipse(g, 132, 32, 7, 7, 0xfff3b0);
  } else {
    pxEllipse(g, 132, 32, 11, 11, 0xfff3b0);
    pxEllipse(g, 137, 28, 8, 8, 0x26304f);
    rect(g, 30, 20, 2, 2, 0xffffff);
    rect(g, 70, 52, 2, 2, 0xfff3b0);
    rect(g, 120, 90, 2, 2, 0xffffff);
    rect(g, 146, 24, 2, 2, 0xfff3b0);
    rect(g, 60, 100, 2, 2, 0xffffff);
  }
  rect(g, 83, 6, 5, 118, WAIN_TRIM);
  rect(g, 10, 63, 150, 5, WAIN_TRIM);
  rect(g, 0, 128, 172, 7, 0xa8714a);
  rect(g, 0, 135, 172, 2, 0x7c4f30);
}

export function bakeRoom(g: G): void {
  paintWallpaper(g);
  paintShelf(g);
  paintFloor(g);
  paintRug(g);
  g.generateTexture("room", GAME_WIDTH, ROOM_H);
  g.clear();
}

export function bakeWindow(g: G): void {
  emit(g, "window-day", 172, 140, (gg) => paintWindowInto(gg, false));
  emit(g, "window-night", 172, 140, (gg) => paintWindowInto(gg, true));
}

/** 窗内天气覆盖层(172×140,透明底):雨为斜向蓝丝,雪为白点 */
export function bakeWeather(g: G): void {
  emit(g, "weather-rain", 172, 140, (gg) => {
    for (let i = 0; i < 34; i++) {
      const x = 12 + Math.floor(Math.random() * 146);
      const y = Math.floor(Math.random() * 120);
      rect(gg, x, y, 1, 5 + Math.floor(Math.random() * 4), 0x9dd6ff, 0.75);
      rect(gg, x + 1, y + 3, 1, 3, 0x54a0ff, 0.6);
    }
  });
  emit(g, "weather-snow", 172, 140, (gg) => {
    for (let i = 0; i < 40; i++) {
      const x = 12 + Math.floor(Math.random() * 146);
      const y = Math.floor(Math.random() * 122);
      const size = Math.random() < 0.3 ? 2 : 1;
      rect(gg, x, y, size, size, 0xffffff, 0.9);
    }
  });
}

export function bakeBall(g: G): void {
  emit(g, "ball", 20, 20, (gg) => {
    pxEllipse(gg, 10, 10, 8, 8, 0xff8fab);
    pxEllipse(gg, 7, 7, 3, 3, 0xffc2d1);
  });
}

export function bakePlant(g: G): void {
  const draw = (bloom: boolean) => (gg: G) => {
    rect(gg, 12, 10, 3, 8, 0x38a844);
    pxEllipse(gg, 8, 8, 6, 4, 0x6ddb6a);
    pxEllipse(gg, 19, 7, 6, 4, 0x6ddb6a);
    rect(gg, 6, 18, 16, 12, 0xc0653a);
    rect(gg, 4, 16, 20, 3, 0xa85630);
    if (bloom) {
      pxEllipse(gg, 13, 6, 4, 4, 0xff9ff3);
      rect(gg, 12, 5, 3, 3, 0xfff3b0);
    }
  };
  emit(g, "plant", 28, 30, draw(false));
  emit(g, "plant-bloom", 28, 30, draw(true));
}
