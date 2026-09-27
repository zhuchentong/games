/** 程序化像素纹理：启动时用 Graphics 生成全部美术，无需外部素材。 */

import Phaser from "phaser";

export const TEX = {
  hero: "hero",
  ground: "ground",
  platNormal: "plat-normal",
  platFragile: "plat-fragile",
  platSpring: "plat-spring",
  platSpike: "plat-spike",
  platBoard: "plat-board",
  belt: "belt",
  knife: "knife",
  heart: "heart",
  dust: "dust",
  star: "star",
} as const;

type G = Phaser.GameObjects.Graphics;

function rect(g: G, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillRect(x, y, w, h);
}

function circle(g: G, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillCircle(x, y, r);
}

function triangle(
  g: G,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  color: number,
  alpha = 1,
): void {
  g.fillStyle(color, alpha);
  g.fillTriangle(x1, y1, x2, y2, x3, y3);
}

function hero(g: G): void {
  // 头
  rect(g, 6, 2, 16, 14, 0xf2c9a0);
  rect(g, 6, 2, 16, 5, 0x3a2b20);
  rect(g, 10, 9, 3, 4, 0x222222);
  rect(g, 16, 9, 3, 4, 0x222222);
  rect(g, 12, 13, 5, 2, 0xb3672b);
  // 身体（蓝衣）
  rect(g, 5, 16, 18, 10, 0x2e86de);
  rect(g, 12, 16, 4, 10, 0x1b4f9c);
  rect(g, 2, 17, 3, 7, 0x2e86de);
  rect(g, 23, 17, 3, 7, 0x2e86de);
  rect(g, 2, 24, 3, 3, 0xf2c9a0);
  rect(g, 23, 24, 3, 3, 0xf2c9a0);
  // 腿与鞋
  rect(g, 8, 26, 4, 7, 0x273c75);
  rect(g, 16, 26, 4, 7, 0x273c75);
  rect(g, 7, 33, 6, 3, 0xd63031);
  rect(g, 15, 33, 6, 3, 0xd63031);
}

function ground(g: G): void {
  rect(g, 0, 0, 480, 36, 0x55524c);
  rect(g, 0, 0, 480, 6, 0x7b776e);
  rect(g, 0, 30, 480, 6, 0x3d3b36);
  // 顶部警戒条纹
  for (let x = 0; x < 480; x += 32) {
    rect(g, x, 0, 16, 6, 0xf9ca24);
  }
}

function platNormal(g: G): void {
  rect(g, 0, 4, 96, 14, 0x8b5a2b);
  rect(g, 0, 4, 96, 5, 0xc98a4b);
  rect(g, 0, 15, 96, 3, 0x6b4218);
  circle(g, 6, 11, 2, 0x5a3a1a);
  circle(g, 90, 11, 2, 0x5a3a1a);
}

function platFragile(g: G): void {
  rect(g, 0, 4, 96, 14, 0x82888f);
  rect(g, 0, 4, 96, 5, 0xb8bec6);
  rect(g, 0, 15, 96, 3, 0x5f656c);
  rect(g, 30, 6, 2, 10, 0x4a4f55);
  rect(g, 32, 12, 6, 2, 0x4a4f55);
  rect(g, 60, 5, 2, 9, 0x4a4f55);
  rect(g, 58, 9, 8, 2, 0x4a4f55);
  rect(g, 12, 8, 2, 6, 0x4a4f55);
}

function platSpring(g: G): void {
  // 顶板
  rect(g, 0, 0, 64, 7, 0xc98a4b);
  rect(g, 0, 0, 64, 3, 0xe0a060);
  // 弹簧圈
  rect(g, 8, 7, 48, 3, 0xc8c8c8);
  rect(g, 18, 10, 28, 3, 0x9a9a9a);
  rect(g, 8, 13, 48, 3, 0xc8c8c8);
  // 底座
  rect(g, 0, 17, 64, 6, 0x4f4f4f);
  rect(g, 0, 17, 64, 2, 0x707070);
}

function platSpike(g: G): void {
  // 底板
  rect(g, 0, 12, 96, 10, 0x4a4a55);
  rect(g, 0, 12, 96, 3, 0x6a6a78);
  rect(g, 0, 19, 96, 3, 0x33333c);
  // 红色尖刺
  for (let i = 0; i < 8; i++) {
    const x = 3 + i * 12;
    triangle(g, x, 12, x + 10, 12, x + 5, 2, 0xe74c3c);
    triangle(g, x + 4, 12, x + 5, 12, x + 5, 4, 0xff8a80);
  }
}

function platBoard(g: G): void {
  rect(g, 0, 0, 96, 12, 0x3d3d46);
  rect(g, 0, 0, 96, 2, 0x5a5a66);
  rect(g, 0, 10, 96, 2, 0x26262d);
}

function belt(g: G): void {
  rect(g, 0, 0, 16, 8, 0x2a2a30);
  triangle(g, 4, 1, 4, 7, 12, 4, 0xf9ca24);
}

function knife(g: G): void {
  // 刀柄在上，刀尖朝下（下落时刀尖先着）
  rect(g, 4, 0, 4, 8, 0x8d5524);
  rect(g, 2, 8, 8, 3, 0xb2bec3);
  triangle(g, 1, 11, 11, 11, 6, 30, 0xdfe6e9);
  triangle(g, 5, 12, 7, 12, 6, 28, 0xffffff);
}

function heart(g: G): void {
  circle(g, 5.5, 5.5, 5, 0xe74c3c);
  circle(g, 14.5, 5.5, 5, 0xe74c3c);
  triangle(g, 0.5, 8.5, 19.5, 8.5, 10, 17.5, 0xe74c3c);
  rect(g, 4, 3, 3, 3, 0xffffff, 0.6);
}

function dust(g: G): void {
  rect(g, 0, 0, 6, 6, 0xffffff, 0.9);
}

function star(g: G): void {
  triangle(g, 0, 4.5, 4.5, 0, 9, 4.5, 0xf9ca24);
  triangle(g, 0, 4.5, 4.5, 9, 9, 4.5, 0xf39c12);
}

export function createTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  hero(g);
  g.generateTexture(TEX.hero, 28, 36);
  g.clear();

  ground(g);
  g.generateTexture(TEX.ground, 480, 36);
  g.clear();

  platNormal(g);
  g.generateTexture(TEX.platNormal, 96, 18);
  g.clear();

  platFragile(g);
  g.generateTexture(TEX.platFragile, 96, 18);
  g.clear();

  platSpring(g);
  g.generateTexture(TEX.platSpring, 64, 26);
  g.clear();

  platSpike(g);
  g.generateTexture(TEX.platSpike, 96, 22);
  g.clear();

  platBoard(g);
  g.generateTexture(TEX.platBoard, 96, 12);
  g.clear();

  belt(g);
  g.generateTexture(TEX.belt, 16, 8);
  g.clear();

  knife(g);
  g.generateTexture(TEX.knife, 12, 30);
  g.clear();

  heart(g);
  g.generateTexture(TEX.heart, 20, 18);
  g.clear();

  dust(g);
  g.generateTexture(TEX.dust, 6, 6);
  g.clear();

  star(g);
  g.generateTexture(TEX.star, 9, 9);
  g.clear();

  g.destroy();
}
