import { OUTLINE, type MakeTexture } from "./shared";

/** 世界与通用贴图：白色像素块 / 视差剪影 / 地形 / 锯片弹体 / 弹簧 / 熔岩 / 战斗特效 / 场景物件 */
export function makeWorldTextures(make: MakeTexture): void {
  // 通用白色像素块（可染色）
  make("px", 4, 4, (gg) => {
    gg.fillStyle(0xffffff, 1);
    gg.fillRect(0, 0, 4, 4);
  });

  // 视差背景剪影条带（可横向平铺，边缘落在谷底保证无缝）
  make("bg-mountains", 96, 200, (gg) => {
    gg.fillStyle(0x141d17, 1);
    gg.fillTriangle(2, 200, 26, 60, 56, 200);
    gg.fillTriangle(44, 200, 72, 30, 96, 200);
    gg.fillRect(0, 186, 96, 14);
  });
  make("bg-trees", 64, 160, (gg) => {
    gg.fillStyle(0x0f1a12, 1);
    for (let i = 0; i < 4; i++) {
      const x = i * 16;
      gg.fillTriangle(x + 2, 160, x + 8, 60 + (i % 2) * 18, x + 14, 160);
    }
    gg.fillRect(0, 150, 64, 10);
  });

  // 地形
  make("ground-top", 32, 32, (gg) => {
    gg.fillStyle(0x5d4030, 1);
    gg.fillRect(0, 0, 32, 32);
    gg.fillStyle(0x3f7a3a, 1);
    gg.fillRect(0, 0, 32, 7);
    gg.fillStyle(0x2f5c2c, 1);
    gg.fillRect(0, 7, 32, 2);
  });
  make("ground-fill", 32, 32, (gg) => {
    gg.fillStyle(0x4a3426, 1);
    gg.fillRect(0, 0, 32, 32);
    gg.fillStyle(0x3d2a1e, 1);
    gg.fillRect(0, 0, 32, 2);
  });
  make("plate", 32, 16, (gg) => {
    gg.fillStyle(0x7a8494, 1);
    gg.fillRect(0, 0, 32, 16);
    gg.fillStyle(0x94a0b2, 1);
    gg.fillRect(0, 0, 32, 4);
    gg.fillStyle(0x525c6a, 1);
    gg.fillRect(0, 14, 32, 2);
  });
  make("metal", 32, 32, (gg) => {
    gg.fillStyle(0x55606e, 1);
    gg.fillRect(0, 0, 32, 32);
    gg.fillStyle(0x49525f, 1);
    gg.fillRect(0, 16, 32, 2);
    gg.fillRect(16, 0, 2, 32);
    gg.fillStyle(0x8a93a5, 1);
    gg.fillCircle(6, 6, 2);
    gg.fillCircle(26, 26, 2);
  });

  // 锯片与弹体
  make("saw", 44, 44, (gg) => {
    const teeth = 10;
    gg.fillStyle(0xaeb6c2, 1);
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2;
      const a1 = ((i + 0.5) / teeth) * Math.PI * 2;
      const a2 = ((i + 1) / teeth) * Math.PI * 2;
      gg.fillTriangle(
        22 + Math.cos(a0) * 16,
        22 + Math.sin(a0) * 16,
        22 + Math.cos(a1) * 21,
        22 + Math.sin(a1) * 21,
        22 + Math.cos(a2) * 16,
        22 + Math.sin(a2) * 16,
      );
    }
    gg.fillCircle(22, 22, 16);
    gg.fillStyle(0x525c6a, 1);
    gg.fillCircle(22, 22, 6);
    gg.fillStyle(0xe8edf5, 1);
    gg.fillCircle(22, 22, 2);
  });
  make("gear-shot", 16, 16, (gg) => {
    gg.fillStyle(0xb8873b, 1);
    gg.fillCircle(8, 8, 6);
    gg.fillStyle(0x8a5f24, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      gg.fillCircle(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 2);
    }
    gg.fillStyle(0x3d2a1e, 1);
    gg.fillCircle(8, 8, 2.4);
  });
  make("bullet", 10, 6, (gg) => {
    gg.fillStyle(0xffd23e, 1);
    gg.fillRect(0, 0, 10, 6);
    gg.fillStyle(0xffa62b, 1);
    gg.fillRect(0, 4, 10, 2);
  });
  make("poison", 12, 12, (gg) => {
    gg.fillStyle(0x7ac74f, 1);
    gg.fillCircle(6, 6, 5);
    gg.fillStyle(0x4f9137, 1);
    gg.fillCircle(4, 5, 2);
  });
  make("wind", 18, 8, (gg) => {
    gg.fillStyle(0x9be8ff, 1);
    // 原生朝右（右飞 flipX=false），与 Projectile 的翻转约定一致
    gg.fillTriangle(18, 4, 4, 0, 4, 8);
    gg.fillTriangle(8, 4, 0, 1, 0, 7);
  });
  // 喷火龟火球（抛物线弹）
  make("fireball", 12, 12, (gg) => {
    gg.fillStyle(0xff9f1a, 1);
    gg.fillCircle(6, 6, 5);
    gg.fillStyle(0xffd23e, 1);
    gg.fillCircle(5, 5, 2.6);
  });
  // 震地波（Boss 冲击波弹体：橙红岩屑尖浪，底边贴地）
  make("shock-wave", 20, 18, (gg) => {
    gg.fillStyle(0xd2691e, 1);
    gg.fillTriangle(0, 18, 10, 0, 20, 18);
    gg.fillStyle(0xff9f1a, 1);
    gg.fillTriangle(4, 18, 10, 5, 16, 18);
    gg.fillStyle(0xffd23e, 1);
    gg.fillTriangle(7, 18, 10, 10, 13, 18);
  });
  // 弹簧跳台（弹射时 scaleY 压扁回弹）
  make("spring", 28, 18, (gg) => {
    gg.fillStyle(0x525c6a, 1);
    gg.fillRect(4, 14, 20, 4);
    gg.lineStyle(2, 0x8a93a5, 1);
    gg.beginPath();
    gg.moveTo(8, 14);
    gg.lineTo(20, 10);
    gg.lineTo(8, 6);
    gg.lineTo(20, 3);
    gg.strokePath();
    gg.fillStyle(0x9be8ff, 1);
    gg.fillRect(4, 0, 20, 4);
  });

  // 熔岩表面（可平铺滚动：暗红底 + 亮橙斑块 + 亮黄顶线）
  make("lava", 32, 14, (gg) => {
    gg.fillStyle(0xd23b1a, 1);
    gg.fillRect(0, 0, 32, 14);
    gg.fillStyle(0xff9f1a, 1);
    gg.fillCircle(8, 7, 3);
    gg.fillCircle(24, 10, 2.4);
    gg.fillCircle(17, 4, 1.8);
    gg.fillStyle(0xffd23e, 1);
    gg.fillRect(0, 0, 32, 2);
  });

  // 战斗特效：挥砍月牙（原点即弧心，水平朝右张开，可染色）+ 命中四芒星（可染色）
  make("fx-slash", 72, 72, (gg) => {
    gg.fillStyle(0xffffff, 1);
    gg.beginPath();
    gg.arc(36, 36, 34, -1.0, 1.0);
    gg.arc(36, 36, 15, 0.72, -0.72, true);
    gg.closePath();
    gg.fillPath();
  });
  make("fx-spark", 28, 28, (gg) => {
    gg.fillStyle(0xffffff, 1);
    gg.fillTriangle(14, 0, 17, 11, 11, 11);
    gg.fillTriangle(14, 28, 17, 17, 11, 17);
    gg.fillTriangle(0, 14, 11, 11, 11, 17);
    gg.fillTriangle(28, 14, 17, 11, 17, 17);
    gg.fillTriangle(21, 7, 16, 12, 13, 9);
    gg.fillTriangle(7, 21, 12, 16, 15, 19);
    gg.fillTriangle(7, 7, 12, 12, 15, 9);
    gg.fillTriangle(21, 21, 16, 16, 13, 19);
    gg.fillCircle(14, 14, 4);
  });

  // 粒子系统专用贴图（白色底，发射器按实例染色）：叶片（森林飘叶）+ 软圆点（中枢微光）
  make("pt-leaf", 7, 5, (gg) => {
    gg.fillStyle(0xffffff, 1);
    gg.fillEllipse(3.5, 2.5, 7, 5);
    gg.fillStyle(0xd8d8d8, 1);
    gg.fillRect(3, 2, 1, 1);
  });
  make("pt-glow", 6, 6, (gg) => {
    gg.fillStyle(0xffffff, 1);
    gg.fillCircle(3, 3, 3);
    gg.fillStyle(0xd8d8d8, 1);
    gg.fillCircle(3, 3, 1.4);
  });

  // 场景物件
  make("checkpoint", 22, 44, (gg) => {
    gg.fillStyle(0x8a93a5, 1);
    gg.fillRect(3, 4, 4, 40);
    gg.fillStyle(0x4f9137, 1);
    gg.fillTriangle(7, 4, 21, 9, 7, 15);
    gg.fillStyle(0xd7dee8, 1);
    gg.fillCircle(5, 3, 3);
  });
  make("coin", 12, 12, (gg) => {
    gg.fillStyle(0xb8873b, 1);
    gg.fillCircle(6, 6, 6);
    gg.fillStyle(0xffd23e, 1);
    gg.fillCircle(6, 6, 5);
    gg.fillStyle(0xb8873b, 1);
    gg.fillRect(5, 3, 2, 6);
  });
  make("core-item", 24, 24, (gg) => {
    gg.fillStyle(0xff9f1a, 1);
    gg.fillCircle(12, 12, 11);
    gg.fillStyle(0xffd23e, 1);
    gg.fillCircle(12, 12, 7);
    gg.fillStyle(0xffffff, 1);
    gg.fillCircle(9, 9, 2);
  });
  // 小怪掉落血包（白盒红十字）
  make("medkit", 16, 14, (gg) => {
    gg.fillStyle(OUTLINE, 1);
    gg.fillRoundedRect(1, 1, 14, 12, 2);
    gg.fillStyle(0xf2f4f8, 1);
    gg.fillRoundedRect(2, 2, 12, 10, 2);
    gg.fillStyle(0xe23b30, 1);
    gg.fillRect(7, 4, 2, 6);
    gg.fillRect(5, 6, 6, 2);
  });
}
