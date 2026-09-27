import Phaser from "phaser";
import { DEPTH, FONT } from "../types";

/**
 * 常用视觉效果的公共出口：飘字 / 粒子爆闪 / 受击闪色 / UI 闪烁 / 大字横幅。
 * 各实体不再自写 tween+destroy 样板，调参数即调手感。
 */

export interface FloatTextOptions {
  color?: string;
  /** 字号 px，默认 13 */
  size?: number;
  bold?: boolean;
  depth?: number;
  /** 消散时长 ms，默认 500 */
  duration?: number;
  /** 上浮距离 px，默认 24 */
  rise?: number;
}

/** 上升淡出的飘字（伤害/回复/提示通用），返回文本对象 */
export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: FloatTextOptions = {},
): Phaser.GameObjects.Text {
  const {
    color = "#ffffff",
    size = 13,
    bold = false,
    depth = DEPTH.floatText,
    duration = 500,
    rise = 24,
  } = opts;
  const t = scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      ...(bold ? { fontStyle: "bold" } : {}),
    })
    .setOrigin(0.5)
    .setDepth(depth);
  scene.tweens.add({
    targets: t,
    y: y - rise,
    alpha: 0,
    duration,
    onComplete: () => t.destroy(),
  });
  return t;
}

export interface BurstOptions {
  color?: number;
  /** 粒子数，默认 4 */
  count?: number;
  /** 初始半径 px，默认 4 */
  size?: number;
  /** 扩散目标半径 px，默认 10 */
  grow?: number;
  /** 消散时长 ms，默认 260 */
  duration?: number;
  /** 圆心抖动幅度 px，默认 10；传 0 即原地爆闪 */
  spreadX?: number;
  spreadY?: number;
  alpha?: number;
}

/** 扩散淡出的圆形粒子爆闪（死亡碎屑/拾取火花/爆炸通用） */
export function burst(scene: Phaser.Scene, x: number, y: number, opts: BurstOptions = {}): void {
  const {
    color = 0xffd23e,
    count = 4,
    size = 4,
    grow = 10,
    duration = 260,
    spreadX = 10,
    spreadY = 8,
    alpha = 0.9,
  } = opts;
  for (let i = 0; i < count; i++) {
    const spark = scene.add.circle(
      x + Phaser.Math.Between(-spreadX, spreadX),
      y + Phaser.Math.Between(-spreadY, spreadY),
      size,
      color,
      alpha,
    );
    scene.tweens.add({
      targets: spark,
      radius: grow,
      alpha: 0,
      duration,
      onComplete: () => spark.destroy(),
    });
  }
}

/** 受击/预警闪色：FILL 染色 ms 毫秒后自动清除（对象已销毁则跳过） */
export function flashTint(target: Phaser.GameObjects.Sprite, color = 0xffffff, ms = 70): void {
  target.setTint(color).setTintMode(Phaser.TintModes.FILL);
  target.scene.time.delayedCall(ms, () => {
    if (target.active) target.clearTint();
  });
}

export interface BlinkOptions {
  /** 谷值 alpha，默认 0.15 */
  alpha?: number;
  /** 单程时长 ms，默认 700 */
  duration?: number;
}

/** UI 提示文字循环闪烁（alpha yoyo 无限往返） */
export function blink(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Text,
  opts: BlinkOptions = {},
): void {
  const { alpha = 0.15, duration = 700 } = opts;
  scene.tweens.add({
    targets: target,
    alpha,
    duration,
    yoyo: true,
    repeat: -1,
  });
}

export interface BannerOptions {
  color?: string;
  /** 字号 px，默认 26 */
  size?: number;
  bold?: boolean;
  /** 淡入时长 ms，默认 250 */
  fadeInMs?: number;
  /** 高亮停留时长 ms，默认 800 */
  holdMs?: number;
  depth?: number;
}

/** 大字横幅：淡入 → 停留 → 淡出并销毁（Boss 报名/阶段警告） */
export function banner(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: BannerOptions = {},
): void {
  const {
    color = "#ff3b30",
    size = 26,
    bold = true,
    fadeInMs = 250,
    holdMs = 800,
    depth = DEPTH.overlay,
  } = opts;
  const t = scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      ...(bold ? { fontStyle: "bold" } : {}),
    })
    .setOrigin(0.5)
    .setDepth(depth)
    .setAlpha(0);
  scene.tweens.add({
    targets: t,
    alpha: 1,
    duration: fadeInMs,
    yoyo: true,
    hold: holdMs,
    onComplete: () => t.destroy(),
  });
}

export interface SlashArcOptions {
  /** 整体缩放，默认 1 */
  scale?: number;
  /** 扫过时长 ms，默认 200 */
  duration?: number;
}

/** 近战挥砍：大幅月牙弧自上向前扫过（白弧即时 + 金芯延迟跟进），普攻强化通用 */
export function slashArc(
  scene: Phaser.Scene,
  x: number,
  y: number,
  facing: 1 | -1,
  opts: SlashArcOptions = {},
): void {
  const { scale = 1, duration = 200 } = opts;
  const layer = (tint: number, s0: number, s1: number, delay: number): void => {
    const arc = scene.add
      .image(x, y, "fx-slash")
      .setOrigin(0.5)
      .setFlipX(facing < 0)
      .setTint(tint)
      .setRotation(-1.05 * facing)
      .setScale(s0 * scale)
      .setAlpha(0.95)
      .setDepth(DEPTH.fx);
    // 扫掠全程保持高亮（ease 前段快），只在后 60% 淡出，避免弧还没扫完就看不见
    scene.tweens.add({
      targets: arc,
      rotation: 0.5 * facing,
      scale: s1 * scale,
      delay,
      duration,
      ease: "Cubic.Out",
    });
    scene.tweens.add({
      targets: arc,
      alpha: 0,
      delay: delay + duration * 0.4,
      duration: duration * 0.6,
      onComplete: () => arc.destroy(),
    });
  };
  layer(0xffffff, 0.65, 1.25, 0);
  layer(0xffd23e, 0.45, 0.95, 45);
}

export interface HitSparkOptions {
  color?: number;
  /** 整体缩放，默认 1 */
  scale?: number;
}

/** 命中火花：白闪 + 四芒星 + 色屑四溅，一切打中敌人的反馈出口 */
export function hitSpark(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: HitSparkOptions = {},
): void {
  const { color = 0xffd23e, scale = 1 } = opts;
  const flash = scene.add.circle(x, y, 5 * scale, 0xffffff, 0.95).setDepth(DEPTH.fx);
  scene.tweens.add({
    targets: flash,
    radius: 14 * scale,
    alpha: 0,
    duration: 130,
    onComplete: () => flash.destroy(),
  });
  const star = scene.add
    .image(x, y, "fx-spark")
    .setOrigin(0.5)
    .setRotation(Phaser.Math.FloatBetween(0, Math.PI))
    .setScale(0.7 * scale)
    .setDepth(DEPTH.fx);
  scene.tweens.add({
    targets: star,
    scale: 1.5 * scale,
    alpha: 0,
    duration: 170,
    ease: "Cubic.Out",
    onComplete: () => star.destroy(),
  });
  burst(scene, x, y, { color, count: 5, size: 3, grow: 13, spreadX: 5, spreadY: 5, duration: 210 });
}

export interface AfterimageOptions {
  tint?: number;
  /** 初始 alpha，默认 0.45 */
  alpha?: number;
  /** 淡出时长 ms，默认 200 */
  duration?: number;
}

/** 残影：按当前帧复制一份淡出的幽灵像（突进/高速位移通用） */
export function afterimage(
  scene: Phaser.Scene,
  source: Phaser.GameObjects.Sprite,
  opts: AfterimageOptions = {},
): void {
  const { tint = 0x8fd9ff, alpha = 0.45, duration = 200 } = opts;
  const ghost = scene.add
    .image(source.x, source.y, source.texture.key)
    .setOrigin(source.originX, source.originY)
    .setFlipX(source.flipX)
    .setScale(source.scaleX, source.scaleY)
    .setAlpha(alpha)
    .setTint(tint)
    .setDepth(source.depth);
  scene.tweens.add({ targets: ghost, alpha: 0, duration, onComplete: () => ghost.destroy() });
}

export interface ShockRingOptions {
  color?: number;
  /** 起始半径 px，默认 12 */
  from?: number;
  /** 扩散目标半径 px，默认 110 */
  to?: number;
  lineWidth?: number;
  duration?: number;
}

/** 扩散冲击环（技能震波/爆发通用） */
export function shockRing(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: ShockRingOptions = {},
): void {
  const { color = 0xffd23e, from = 12, to = 110, lineWidth = 4, duration = 320 } = opts;
  const ring = scene.add.circle(x, y, from).setStrokeStyle(lineWidth, color, 1).setDepth(DEPTH.fx);
  scene.tweens.add({
    targets: ring,
    radius: to,
    alpha: 0,
    duration,
    ease: "Cubic.Out",
    onComplete: () => ring.destroy(),
  });
}
