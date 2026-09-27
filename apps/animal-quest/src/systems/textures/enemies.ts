import type Phaser from "phaser";
import { OUTLINE, type MakeTexture } from "./shared";

/** 齿轮虫：齿轮辐条随帧旋转（f=0..3） */
function drawGearbug(g: Phaser.GameObjects.Graphics, f: number): void {
  g.fillStyle(OUTLINE, 1);
  g.fillEllipse(16, 13, 30, 18);
  g.fillStyle(0x8a6f4a, 1);
  g.fillEllipse(16, 13, 28, 16);
  g.fillStyle(0xb8873b, 1);
  g.fillCircle(16, 6, 6);
  g.fillStyle(0x8a5f24, 1);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + f * (Math.PI / 6);
    g.fillCircle(16 + Math.cos(a) * 4, 6 + Math.sin(a) * 4, 2);
  }
  g.fillStyle(0x3d2a1e, 1);
  g.fillCircle(16, 6, 2);
  g.fillStyle(0xffd23e, 1);
  g.fillCircle(25, 11, 2.4);
}

/** 无人机：顶部旋翼左右摆动（f=0/1） */
function drawDrone(g: Phaser.GameObjects.Graphics, f: number): void {
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(3, 5, 22, 11, 4);
  g.fillStyle(0x8a93a5, 1);
  g.fillRoundedRect(4, 6, 20, 9, 3);
  g.fillStyle(0x525c6a, 1);
  if (f === 0) {
    g.fillRect(8, 2, 12, 3);
  } else {
    g.fillRect(13, 2, 2, 3);
  }
  g.fillStyle(0xd7dee8, 1);
  g.fillRect(4, 3, 20, 2);
  g.fillStyle(0xff3b30, 1);
  g.fillCircle(20, 11, 2.6);
}

/** 炮台：常态 / 开火后坐（炮管缩进+炮口闪光） */
function drawTurret(g: Phaser.GameObjects.Graphics, firing: boolean): void {
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(2, 10, 26, 14, 3);
  g.fillStyle(0x596274, 1);
  g.fillRoundedRect(3, 11, 24, 12, 2);
  if (firing) {
    g.fillRect(13, 5, 4, 8);
    g.fillStyle(0xffd23e, 1);
    g.fillCircle(15, 4, 3);
  } else {
    g.fillRect(12, 2, 6, 12);
  }
  g.fillStyle(0xff3b30, 1);
  g.fillCircle(15, 16, 2.6);
}

/** 喷火龟（朝右）：龟壳 + 前伸炮口，开火帧炮口放大火光 */
function drawSpitter(g: Phaser.GameObjects.Graphics, firing: boolean): void {
  g.fillStyle(OUTLINE, 1);
  g.fillEllipse(15, 15, 28, 18);
  g.fillStyle(0x4f9137, 1);
  g.fillEllipse(15, 15, 26, 16);
  g.fillStyle(0x2f5c2c, 1);
  g.fillEllipse(15, 13, 18, 9);
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(20, 7, 9, 8, 2);
  g.fillStyle(0xffd23e, 1);
  g.fillCircle(9, 11, 2);
  if (firing) {
    g.fillStyle(0xff9f1a, 1);
    g.fillCircle(29, 11, 4);
  } else {
    g.fillStyle(0xff9f1a, 1);
    g.fillCircle(28, 11, 2.2);
  }
}

/** 补给机（商人 NPC）：两帧屏幕眨眼 */
function drawMerchant(g: Phaser.GameObjects.Graphics, awake: boolean): void {
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(1, 2, 24, 34, 4);
  g.fillStyle(0x2e4a5c, 1);
  g.fillRoundedRect(2, 3, 22, 32, 3);
  // 屏幕"脸"：眨眼帧双眼熄灭
  g.fillStyle(0x16222c, 1);
  g.fillRect(5, 7, 16, 12);
  g.fillStyle(awake ? 0x9be8ff : 0x2c4a58, 1);
  g.fillCircle(10, 12, 2);
  g.fillCircle(16, 12, 2);
  // 投币口 + 出货按钮
  g.fillStyle(0xffd23e, 1);
  g.fillRect(9, 23, 8, 3);
  g.fillStyle(0xff3b30, 1);
  g.fillCircle(13, 30, 2);
  // 底座
  g.fillStyle(0x1a2430, 1);
  g.fillRect(2, 34, 22, 4);
}

/** 焰灵：两帧火苗摆动（尖端火舌位置微变） */
function drawEmber(g: Phaser.GameObjects.Graphics, flicker: boolean): void {
  const tip = flicker ? 1 : 4;
  g.fillStyle(OUTLINE, 1);
  g.fillCircle(9, 14, 8);
  g.fillTriangle(4, 9, 9, tip, 14, 9);
  g.fillStyle(0xff5722, 1);
  g.fillCircle(9, 14, 7);
  g.fillTriangle(5, 10, 9, tip + 2, 13, 10);
  g.fillStyle(0xffd23e, 1);
  g.fillCircle(9, 16, 3.6);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(6.5, 13, 1.6);
  g.fillCircle(11.5, 13, 1.6);
  g.fillStyle(0x111111, 1);
  g.fillCircle(7, 13, 0.8);
  g.fillCircle(12, 13, 0.8);
}

/** 爆刺栗：荆棘栗苞（两帧），冠刺微摆 + 荧光眼点，小短足交替倒腾 */
function drawThornbur(g: Phaser.GameObjects.Graphics, step: boolean): void {
  // 小短足：两根交替
  g.fillStyle(0x241a12, 1);
  const lift = step ? 1 : -1;
  g.fillRect(6, 15, 3, 4 + lift);
  g.fillRect(15, 15, 3, 4 - lift);
  // 栗苞弹体
  g.fillStyle(OUTLINE, 1);
  g.fillEllipse(12, 10, 22, 18);
  g.fillStyle(0x6a4a30, 1);
  g.fillEllipse(12, 10, 20, 16);
  g.fillStyle(0x7d5a3c, 1);
  g.fillEllipse(12, 12, 14, 9);
  // 荆棘冠刺（上半圈五根，两帧微摆）
  g.fillStyle(0x4f7a3a, 1);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.5 + (step ? 0.12 : -0.12);
    const c = Math.cos(a);
    const s = Math.sin(a);
    g.fillTriangle(
      12 + c * 7,
      9 + s * 6,
      12 + c * 12,
      9 + s * 10,
      12 + c * 6 + -s * -2.8,
      9 + s * 5 + c * 2.8,
    );
  }
  // 荧光眼点
  g.fillStyle(0xd4ff7a, 1);
  g.fillCircle(9, 10, 1.7);
  g.fillCircle(15, 10, 1.7);
  g.fillStyle(0x241a12, 1);
  g.fillCircle(9, 10, 0.7);
  g.fillCircle(15, 10, 0.7);
}

/** 刺壳甲虫：荆棘背壳小甲虫（两帧），背刺随爬行微摆 */
function drawBeetle(g: Phaser.GameObjects.Graphics, step: boolean): void {
  // 小短足：左右各两根，两帧交替
  g.fillStyle(0x241a12, 1);
  const lift = step ? 1 : -1;
  g.fillRect(6, 16, 3, 4 + lift);
  g.fillRect(15, 16, 3, 4 - lift);
  // 躯体（深棕甲壳）
  g.fillStyle(OUTLINE, 1);
  g.fillEllipse(12, 11, 22, 16);
  g.fillStyle(0x5c4130, 1);
  g.fillEllipse(12, 11, 20, 14);
  g.fillStyle(0x4a3324, 1);
  g.fillRect(11, 5, 2, 12);
  // 荆棘背刺（上半圈五根，两帧微摆）
  g.fillStyle(0x4f7a3a, 1);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55 + (step ? 0.1 : -0.1);
    const c = Math.cos(a);
    const s = Math.sin(a);
    g.fillTriangle(
      12 + c * 6,
      10 + s * 5,
      12 + c * 11,
      10 + s * 9,
      12 + c * 5 + -s * -2.6,
      10 + s * 4 + c * 2.6,
    );
  }
  // 荧光眼点
  g.fillStyle(0xd4ff7a, 1);
  g.fillCircle(8, 10, 1.6);
  g.fillCircle(16, 10, 1.6);
  g.fillStyle(0x241a12, 1);
  g.fillCircle(8, 10, 0.7);
  g.fillCircle(16, 10, 0.7);
}

/** 孢翼蛾：荧光鳞粉飞蛾（两帧），翅膀上扬/放平扑动 + 翅斑荧光点 */
function drawMoth(g: Phaser.GameObjects.Graphics, up: boolean): void {
  // 双翅：上扬帧翅在体侧上方，放平帧翅在体侧中部
  g.fillStyle(0x8a6aa8, 1);
  if (up) {
    g.fillEllipse(6, 6, 13, 10);
    g.fillEllipse(20, 6, 13, 10);
  } else {
    g.fillEllipse(5, 12, 13, 8);
    g.fillEllipse(21, 12, 13, 8);
  }
  // 翅斑荧光
  g.fillStyle(0xd4ff7a, 1);
  if (up) {
    g.fillCircle(5, 5, 1.4);
    g.fillCircle(21, 5, 1.4);
  } else {
    g.fillCircle(4, 12, 1.4);
    g.fillCircle(22, 12, 1.4);
  }
  // 绒毛躯体
  g.fillStyle(OUTLINE, 1);
  g.fillEllipse(13, 11, 9, 15);
  g.fillStyle(0x4a3858, 1);
  g.fillEllipse(13, 11, 7, 13);
  // 触角
  g.fillStyle(0x241a12, 1);
  g.fillRect(10, 2, 1, 4);
  g.fillRect(15, 2, 1, 4);
}

/** 食人花：紫红斗瓣 + 垂叶茎（两帧），常态抿口 / 开咬露齿 */
function drawSnapflower(g: Phaser.GameObjects.Graphics, snapping: boolean): void {
  // 茎与托叶
  g.fillStyle(0x3d7a34, 1);
  g.fillRect(12, 12, 4, 12);
  g.fillEllipse(8, 21, 10, 5);
  g.fillEllipse(20, 23, 10, 5);
  // 花头外瓣
  g.fillStyle(OUTLINE, 1);
  g.fillCircle(14, 8, 10);
  g.fillStyle(0x7a3a52, 1);
  g.fillCircle(14, 8, 9);
  // 花瓣尖（外圈六瓣）
  g.fillStyle(0x9a4a6a, 1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    g.fillTriangle(
      14 + c * 5,
      8 + s * 5,
      14 + c * 10,
      8 + s * 10,
      14 + c * 4 + -s * 3.2,
      8 + s * 4 + c * 3.2,
    );
  }
  if (snapping) {
    // 开咬：深色大口 + 上下牙
    g.fillStyle(0x2a1420, 1);
    g.fillEllipse(14, 9, 11, 9);
    g.fillStyle(0xf2f4f8, 1);
    g.fillTriangle(10, 6, 12, 9, 14, 6);
    g.fillTriangle(14, 6, 16, 9, 18, 6);
    g.fillTriangle(10, 12, 12, 9, 14, 12);
    g.fillTriangle(14, 12, 16, 9, 18, 12);
  } else {
    // 抿口：一条细缝
    g.fillStyle(0x2a1420, 1);
    g.fillRect(9, 8, 10, 2);
  }
}

/** 敌人与补给机贴图：齿轮虫(4帧)/无人机(2帧)/炮台/喷火龟/焰灵(2帧)/刺壳甲虫(2帧)/孢翼蛾(2帧)/食人花(2帧)/爆刺栗(2帧)/补给机(2帧眨眼) */
export function makeEnemyTextures(make: MakeTexture): void {
  for (let f = 0; f < 4; f++) make(`gearbug${f}`, 32, 22, (gg) => drawGearbug(gg, f));
  make("gearbug", 32, 22, (gg) => drawGearbug(gg, 0));
  for (let f = 0; f < 2; f++) make(`drone${f}`, 28, 18, (gg) => drawDrone(gg, f));
  make("drone", 28, 18, (gg) => drawDrone(gg, 0));
  make("turret", 30, 26, (gg) => drawTurret(gg, false));
  make("turret-fire", 30, 26, (gg) => drawTurret(gg, true));
  make("spitter", 30, 24, (gg) => drawSpitter(gg, false));
  make("spitter-fire", 30, 24, (gg) => drawSpitter(gg, true));
  for (let f = 0; f < 2; f++) make(`ember${f}`, 18, 24, (gg) => drawEmber(gg, f === 1));
  make("ember", 18, 24, (gg) => drawEmber(gg, false));
  for (let f = 0; f < 2; f++) make(`beetle${f}`, 24, 22, (gg) => drawBeetle(gg, f === 1));
  make("beetle", 24, 22, (gg) => drawBeetle(gg, false));
  for (let f = 0; f < 2; f++) make(`moth${f}`, 26, 20, (gg) => drawMoth(gg, f === 0));
  make("moth", 26, 20, (gg) => drawMoth(gg, true));
  make("snapflower", 28, 26, (gg) => drawSnapflower(gg, false));
  make("snapflower-snap", 28, 26, (gg) => drawSnapflower(gg, true));
  for (let f = 0; f < 2; f++) make(`thornbur${f}`, 24, 20, (gg) => drawThornbur(gg, f === 1));
  make("thornbur", 24, 20, (gg) => drawThornbur(gg, false));
  make("merchant0", 26, 40, (gg) => drawMerchant(gg, true));
  make("merchant1", 26, 40, (gg) => drawMerchant(gg, false));
}
