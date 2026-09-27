import type Phaser from "phaser";
import { OUTLINE, type MakeTexture } from "./shared";

/** 机体配色（一型钢灰 / 二型熔核 / 三型终焉·寒钢蓝），同一几何保证判定手感一致 */
const BOSS_PALETTES = [
  {
    hull: 0x6e7687,
    head: 0x7d8698,
    seam: 0x49525f,
    shoulder: 0x8a93a5,
    arm: 0x596274,
    eye: 0xff3b30,
    coreRing: 0xff9f1a,
    coreDot: 0xff9f1a,
    cracks: false,
  },
  {
    hull: 0x8a544a,
    head: 0x9c6156,
    seam: 0x4a2f2a,
    shoulder: 0xa86e5e,
    arm: 0x5f4440,
    eye: 0xffd23e,
    coreRing: 0xffd23e,
    coreDot: 0xfff3c4,
    cracks: true,
  },
  {
    hull: 0x4a5a78,
    head: 0x5a6c8c,
    seam: 0x2e3648,
    shoulder: 0x6e80a0,
    arm: 0x3a4458,
    eye: 0x9be8ff,
    coreRing: 0x9be8ff,
    coreDot: 0xe8f8ff,
    cracks: true,
  },
] as const;

/**
 * 马克系列机体（112×112，朝右，背部核心在左侧）：variant 0/1/2 选配色。
 * 同一几何保证各型判定手感一致，仅换甲板与光源色。
 */
function drawBoss(g: Phaser.GameObjects.Graphics, variant: 0 | 1 | 2): void {
  const p = BOSS_PALETTES[variant];
  g.fillStyle(0x3a4150, 1);
  g.fillRect(24, 96, 22, 12);
  g.fillRect(66, 96, 22, 12);
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(14, 26, 84, 74, 10);
  g.fillStyle(p.hull, 1);
  g.fillRoundedRect(16, 28, 80, 70, 8);
  g.fillStyle(p.head, 1);
  g.fillRoundedRect(28, 6, 56, 30, 8);
  g.fillStyle(p.eye, 1);
  g.fillCircle(66, 21, 6);
  g.fillStyle(0xffd1c9, 1);
  g.fillCircle(64, 19, 2);
  g.fillStyle(p.seam, 1);
  g.fillRect(28, 60, 56, 4);
  g.fillRect(28, 80, 56, 4);
  if (p.cracks) {
    // 甲板能量裂纹（二型暖橙 / 三型寒青）
    g.fillStyle(variant === 1 ? 0xff9f1a : 0x9be8ff, 0.85);
    g.fillRect(36, 46, 2, 10);
    g.fillRect(58, 66, 2, 10);
    g.fillRect(76, 44, 2, 8);
  }
  g.fillStyle(p.arm, 1);
  g.fillRoundedRect(94, 40, 16, 38, 5);
  g.fillStyle(p.shoulder, 1);
  g.fillRoundedRect(90, 30, 22, 18, 6);
  g.fillStyle(0x2e3238, 1);
  g.fillCircle(15, 56, 11);
  g.lineStyle(3, p.coreRing, 1);
  g.strokeCircle(15, 56, 11);
  g.fillStyle(p.coreDot, 1);
  g.fillCircle(15, 56, 4);
}

/** 熔岩巨人（120×120，朝右）：玄武岩巨躯 + 熔岩裂纹，胸口熔核为弱点（正面暴露） */
function drawLavaGiant(g: Phaser.GameObjects.Graphics): void {
  // 双脚 + 脚下熔岩光
  g.fillStyle(0x2a231f, 1);
  g.fillRect(24, 102, 26, 14);
  g.fillRect(64, 102, 26, 14);
  g.fillStyle(0xff6b2e, 0.9);
  g.fillRect(22, 114, 30, 4);
  g.fillRect(62, 114, 30, 4);
  // 后肩
  g.fillStyle(0x352c26, 1);
  g.fillRoundedRect(4, 30, 30, 26, 8);
  // 躯干（玄武岩）
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(10, 32, 88, 74, 12);
  g.fillStyle(0x3c332e, 1);
  g.fillRoundedRect(12, 34, 84, 70, 10);
  // 岩块拼缝（错位短缝，避免机甲面板感）
  g.fillStyle(0x2b2420, 1);
  g.fillRect(18, 56, 26, 4);
  g.fillRect(52, 56, 22, 4);
  g.fillRect(24, 80, 20, 4);
  g.fillRect(56, 82, 28, 4);
  // 熔岩裂纹（暗红底 + 亮金芯，贯穿岩块缝）
  g.fillStyle(0xff6b2e, 1);
  g.fillRect(30, 38, 3, 16);
  g.fillRect(48, 60, 3, 18);
  g.fillRect(66, 38, 3, 12);
  g.fillRect(38, 86, 3, 14);
  g.fillRect(58, 42, 3, 10);
  g.fillStyle(0xffd23e, 0.9);
  g.fillRect(31, 42, 1, 8);
  g.fillRect(49, 64, 1, 10);
  g.fillRect(59, 45, 1, 6);
  g.fillRect(39, 90, 1, 8);
  // 胸口熔核（弱点）
  g.fillStyle(0xff6b2e, 1);
  g.fillCircle(78, 64, 11);
  g.fillStyle(0xffd23e, 1);
  g.fillCircle(78, 64, 5);
  g.lineStyle(2, 0xffd23e, 0.9);
  g.strokeCircle(78, 64, 11);
  // 头（沉入肩内）+ 熔金双目
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(32, 4, 52, 32, 9);
  g.fillStyle(0x463b34, 1);
  g.fillRoundedRect(34, 6, 48, 28, 7);
  g.fillStyle(0xffd23e, 1);
  g.fillCircle(60, 20, 4);
  g.fillCircle(72, 20, 3);
  // 前肩 + 前臂巨拳
  g.fillStyle(0x4a3e36, 1);
  g.fillRoundedRect(82, 30, 32, 26, 8);
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(90, 50, 28, 48, 9);
  g.fillStyle(0x403630, 1);
  g.fillRoundedRect(92, 52, 24, 44, 7);
  g.fillStyle(0x2b2420, 1);
  g.fillRect(92, 64, 24, 3);
  g.fillRect(92, 78, 24, 3);
  g.fillStyle(0xff9f1a, 1);
  g.fillRect(100, 88, 3, 8);
}

/** 古藤树怪（120×120，朝右）：虬结古树躯干 + 苔藓肩甲，胸口树心为弱点（正面暴露） */
function drawVineTreant(g: Phaser.GameObjects.Graphics): void {
  // 树根足 + 根趾
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(14, 94, 30, 24, 6);
  g.fillRoundedRect(62, 96, 30, 22, 6);
  g.fillStyle(0x33261c, 1);
  g.fillRoundedRect(16, 96, 26, 20, 5);
  g.fillRoundedRect(64, 98, 26, 18, 5);
  g.fillStyle(0x241a12, 1);
  g.fillTriangle(16, 116, 24, 106, 32, 116);
  g.fillTriangle(66, 116, 74, 108, 82, 116);
  // 后侧枝干 + 垂藤叶
  g.fillStyle(0x2c2118, 1);
  g.fillRoundedRect(0, 36, 30, 20, 8);
  g.fillRect(4, 52, 8, 26);
  g.fillStyle(0x3d5c2e, 1);
  g.fillEllipse(8, 80, 8, 12);
  // 躯干（虬结古树）
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(10, 28, 90, 78, 14);
  g.fillStyle(0x3e2f22, 1);
  g.fillRoundedRect(12, 30, 86, 74, 12);
  // 树皮沟壑（纵向错位）
  g.fillStyle(0x2c2118, 1);
  g.fillRect(22, 40, 4, 24);
  g.fillRect(44, 36, 4, 18);
  g.fillRect(30, 78, 4, 22);
  g.fillRect(58, 84, 4, 16);
  g.fillRect(66, 44, 4, 14);
  // 苔藓肩甲（暗绿底 + 亮斑）
  g.fillStyle(0x4f7a3a, 1);
  g.fillEllipse(34, 34, 34, 14);
  g.fillEllipse(74, 32, 28, 12);
  g.fillStyle(0x66a04a, 1);
  g.fillEllipse(38, 31, 16, 7);
  g.fillEllipse(78, 29, 12, 6);
  // 胸口树心（弱点，荧光绿）
  g.fillStyle(0x8fe06a, 1);
  g.fillCircle(76, 62, 10);
  g.fillStyle(0xd4ff7a, 1);
  g.fillCircle(76, 62, 4.5);
  g.lineStyle(2, 0xd4ff7a, 0.85);
  g.strokeCircle(76, 62, 10);
  // 树瘤头 + 枝杈 + 荧光双眼
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(28, 2, 56, 32, 11);
  g.fillStyle(0x463528, 1);
  g.fillRoundedRect(30, 4, 52, 28, 9);
  g.fillStyle(0x2c2118, 1);
  g.fillRect(44, 0, 3, 6);
  g.fillRect(58, 0, 3, 5);
  g.fillStyle(0xd4ff7a, 1);
  g.fillCircle(56, 18, 4);
  g.fillCircle(70, 18, 3);
  g.fillStyle(0x241a12, 1);
  g.fillCircle(57, 18, 1.4);
  g.fillCircle(71, 18, 1.1);
  // 前肩 + 枝状巨臂 + 枝指
  g.fillStyle(0x33261c, 1);
  g.fillRoundedRect(84, 32, 30, 22, 8);
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(92, 48, 26, 50, 9);
  g.fillStyle(0x362a20, 1);
  g.fillRoundedRect(94, 50, 22, 46, 7);
  g.fillStyle(0x241a12, 1);
  g.fillRect(94, 90, 5, 12);
  g.fillRect(102, 92, 5, 10);
  g.fillRect(110, 88, 5, 14);
  // 臂上垂藤 + 叶
  g.fillStyle(0x3d5c2e, 1);
  g.fillRect(96, 66, 3, 22);
  g.fillEllipse(99, 90, 8, 11);
}

/** Boss 三型贴图（几何一致仅换色）+ 熔岩巨人 / 古藤树怪专属贴图 */
export function makeBossTextures(make: MakeTexture): void {
  make("boss", 112, 112, (gg) => drawBoss(gg, 0));
  make("boss2", 112, 112, (gg) => drawBoss(gg, 1));
  make("boss3", 112, 112, (gg) => drawBoss(gg, 2));
  make("lava-giant", 120, 120, drawLavaGiant);
  make("vine-treant", 120, 120, drawVineTreant);
  make("boss-core", 18, 18, (gg) => {
    gg.fillStyle(0xff9f1a, 1);
    gg.fillCircle(9, 9, 8);
    gg.fillStyle(0xffd23e, 1);
    gg.fillCircle(9, 9, 4);
  });
  // 熔岩弹（巨人抛射/天降熔火）：暗壳包裹亮芯
  make("lava-bomb", 14, 14, (gg) => {
    gg.fillStyle(0x7a3226, 1);
    gg.fillCircle(7, 7, 6);
    gg.fillStyle(0xff6b2e, 1);
    gg.fillCircle(7, 7, 4);
    gg.fillStyle(0xffd23e, 1);
    gg.fillCircle(6, 6, 2);
  });
  // 火山喷发岩浆柱（origin 底部中心，向上渐细）
  make("lava-geyser", 26, 72, (gg) => {
    gg.fillStyle(0xff6b2e, 1);
    gg.fillTriangle(0, 72, 13, 0, 26, 72);
    gg.fillStyle(0xffd23e, 1);
    gg.fillTriangle(7, 72, 13, 12, 19, 72);
  });
  // 荧光树心（树怪弱点暴露贴层）
  make("tree-heart", 18, 18, (gg) => {
    gg.fillStyle(0x8fe06a, 1);
    gg.fillCircle(9, 9, 8);
    gg.fillStyle(0xd4ff7a, 1);
    gg.fillCircle(9, 9, 4);
  });
  // 带刺种子（树怪迫击/荆棘之雨弹体）：硬壳 + 荆棘尖 + 荧光芽点
  make("seed-bomb", 14, 14, (gg) => {
    gg.fillStyle(0x4f7a3a, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      gg.fillTriangle(
        7 + c * 3.5,
        7 + s * 3.5,
        7 + c * 7,
        7 + s * 7,
        7 + c * 3 + -s * 2.4,
        7 + s * 3 + c * 2.4,
      );
    }
    gg.fillStyle(OUTLINE, 1);
    gg.fillCircle(7, 7, 6);
    gg.fillStyle(0x5c4130, 1);
    gg.fillCircle(7, 7, 5);
    gg.fillStyle(0x8fe06a, 1);
    gg.fillCircle(5.5, 5.5, 1.8);
  });
  // 根刺（树怪根刺突袭/藤蔓缠绕，origin 底部中心，向上渐细的荆棘柱）
  make("thorn-spike", 22, 64, (gg) => {
    gg.fillStyle(0x4a3828, 1);
    gg.fillTriangle(0, 64, 4, 38, 8, 64);
    gg.fillTriangle(14, 64, 18, 38, 22, 64);
    gg.fillTriangle(0, 64, 11, 0, 22, 64);
    gg.fillStyle(0x5c4a34, 1);
    gg.fillTriangle(4, 64, 11, 10, 18, 64);
    gg.fillStyle(0x7ac74f, 1);
    gg.fillTriangle(8, 64, 11, 22, 14, 64);
  });
}
