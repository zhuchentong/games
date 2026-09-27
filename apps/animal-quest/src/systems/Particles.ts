import Phaser from "phaser";
import { DEPTH, GAME } from "../types";

/**
 * 粒子效果公共出口（基于 Phaser 粒子发射器，与 Fx 的手绘 tween 特效互补）：
 * explosion 一次性爆裂（拾币火花/敌人碎屑/技能迸发）· dust 地面尘土（蹬地/奔跑/落地）·
 * ambientEmitter 关卡氛围粒子（森林飘叶/熔厂上升烬/黑暗森林荧光孢子，发射区随镜头贴边）。
 * 全部视觉层，不碰任何玩法状态。
 */

/** 三关环境氛围粒子的种类（关卡描述符声明） */
export type AmbientKind = "forest" | "furnace" | "darkwood";

/** 氛围层级：场景物件(4~6)之上、战斗特效(12)之下——飘叶/烬星/微光落在角色前面更有空气感 */
const AMBIENT_DEPTH = 7;
/** 氛围发射区随镜头逐帧贴边：可视区(480×270)四周外扩余量，避免边缘穿帮 */
const AMBIENT_MARGIN = 48;

export interface ExplosionOptions {
  /** 粒子贴图（白色底供染色），默认 px 方块火花 */
  texture?: string;
  /** 每粒随机染色，默认金白 */
  tints?: number[];
  /** 粒子数，默认 10 */
  count?: number;
  /** 出射速度区间，默认 50~150 */
  speed?: [number, number];
  /** 出射角度区间（度，0=右，-90=上，90=下），默认全向 */
  angle?: [number, number];
  /** 寿命区间 ms，默认 320~620 */
  life?: [number, number];
  /** 附加垂直重力（正值下坠/负值上飘），默认 480 */
  gravityY?: number;
  /** 初始缩放，默认 1 */
  scale?: number;
  /** 初始 alpha，默认 0.95 */
  alpha?: number;
  /** 渲染层级，默认 fx */
  depth?: number;
}

/** 一次性粒子爆裂：创建即 explode，寿命上限后自动回收发射器——一切"打一波粒子"的统一出口 */
export function explosion(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: ExplosionOptions = {},
): Phaser.GameObjects.Particles.ParticleEmitter {
  const {
    texture = "px",
    tints = [0xffd23e, 0xffffff],
    count = 10,
    speed = [50, 150],
    angle = [0, 360],
    life = [320, 620],
    gravityY = 480,
    scale = 1,
    alpha = 0.95,
    depth = DEPTH.fx,
  } = opts;
  const emitter = scene.add
    .particles(x, y, texture, {
      speed: { min: speed[0], max: speed[1] },
      angle: { min: angle[0], max: angle[1] },
      lifespan: { min: life[0], max: life[1] },
      gravityY,
      scale: { start: scale, end: 0 },
      alpha: { start: alpha, end: 0 },
      tint: tints,
      emitting: false,
    })
    .setDepth(depth);
  emitter.explode(count);
  scene.time.delayedCall(life[1] + 120, () => {
    if (emitter.active) emitter.destroy();
  });
  return emitter;
}

/** 地面尘土（蹬地跳/奔跑扬尘/落地砸地共用）：浅棕小簇向上扇形散开后消散 */
export function dust(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count = 3,
  angle: [number, number] = [200, 340],
): void {
  explosion(scene, x, y, {
    tints: [0xc9b99a, 0xb2a288, 0xa08e74],
    count,
    speed: [18, 62],
    angle,
    life: [260, 440],
    gravityY: -36,
    scale: 1,
    alpha: 0.85,
  });
}

/** 落地砸尘：左右横扫两扇 + 正上一小簇（大落差落地专用，比奔跑尘更重） */
export function dustLand(scene: Phaser.Scene, x: number, y: number): void {
  dust(scene, x, y, 4, [155, 205]);
  dust(scene, x, y, 4, [-25, 25]);
  dust(scene, x, y, 3, [240, 300]);
}

/** 氛围粒子规格：单发射器一种贴图，白色底贴图 + 实例染色 */
interface AmbientSpec {
  texture: string;
  tints: number[];
  speedX: [number, number];
  speedY: [number, number];
  /** 出生高度带（0=可视区顶，270=可视区底；上升型粒子从下带出生才能贯穿全屏） */
  zoneY: [number, number];
  life: [number, number];
  scaleFrom: number;
  alphaFrom: number;
  /** 每粒随机初始旋转（飘叶翻滚用） */
  rotate: boolean;
  frequency: number;
  maxAlive: number;
}

const AMBIENT_SPECS: Record<AmbientKind, AmbientSpec> = {
  // 一关森林：绿叶缓落翻滚 + 微微逆风漂移
  forest: {
    texture: "pt-leaf",
    tints: [0x7ab86a, 0x9fce8a, 0x5f9e52],
    speedX: [-18, 8],
    speedY: [14, 34],
    zoneY: [-70, 330],
    life: [7000, 11000],
    scaleFrom: 1,
    alphaFrom: 0.55,
    rotate: true,
    frequency: 330,
    maxAlive: 44,
  },
  // 二关熔火机厂：橙红烬星自下而上飘，越飘越暗
  furnace: {
    texture: "px",
    tints: [0xff9f1a, 0xffd23e, 0xff5e2e],
    speedX: [-10, 10],
    speedY: [-60, -18],
    zoneY: [90, 350],
    life: [5000, 8000],
    scaleFrom: 0.85,
    alphaFrom: 0.85,
    rotate: false,
    frequency: 240,
    maxAlive: 48,
  },
  // 三关黑暗森林：荧光孢子幽幽明灭，缓升如林间鬼火
  darkwood: {
    texture: "pt-glow",
    tints: [0x9fe86a, 0xd4ff7a, 0xc9f0ff],
    speedX: [-12, 10],
    speedY: [-20, 6],
    zoneY: [-30, 340],
    life: [6000, 9500],
    scaleFrom: 0.75,
    alphaFrom: 0.55,
    rotate: false,
    frequency: 300,
    maxAlive: 42,
  },
};

/** 关卡环境氛围粒子：发射区取镜头可视区外扩一圈（场景 update 里 trackAmbient 逐帧贴边） */
export function ambientEmitter(
  scene: Phaser.Scene,
  kind: AmbientKind,
): Phaser.GameObjects.Particles.ParticleEmitter {
  const spec = AMBIENT_SPECS[kind];
  // 发射区：横向覆盖可视区 + 两侧余量；纵向按规格的高度带（可视区坐标系，换算到发射器局部再 + 余量）
  const zone = new Phaser.Geom.Rectangle(
    0,
    spec.zoneY[0] + AMBIENT_MARGIN,
    GAME.width / GAME.zoom + AMBIENT_MARGIN * 2,
    spec.zoneY[1] - spec.zoneY[0],
  );
  // 直传 Rectangle 会因 Phaser 4 类型里 getRandomPoint(Vector2) 与回调契约(Vector2Like)签名互斥而报错；
  // 语义相同的适配器（方法简写，运行时仅写 x/y）
  const source = {
    getRandomPoint(point: Phaser.Types.Math.Vector2Like): void {
      point.x = zone.x + Math.random() * zone.width;
      point.y = zone.y + Math.random() * zone.height;
    },
  };
  return scene.add
    .particles(0, 0, spec.texture, {
      speedX: { min: spec.speedX[0], max: spec.speedX[1] },
      speedY: { min: spec.speedY[0], max: spec.speedY[1] },
      ...(spec.rotate ? { rotate: { min: 0, max: 360 } } : {}),
      lifespan: { min: spec.life[0], max: spec.life[1] },
      scale: { start: spec.scaleFrom, end: spec.scaleFrom * 0.35 },
      alpha: { start: spec.alphaFrom, end: 0 },
      tint: spec.tints,
      frequency: spec.frequency,
      maxAliveParticles: spec.maxAlive,
      emitZone: [{ type: "random", source }],
    })
    .setDepth(AMBIENT_DEPTH);
}

/** 氛围发射区贴到镜头可视区左上角（随视差层一起在场景 update 调用） */
export function trackAmbient(
  emitter: Phaser.GameObjects.Particles.ParticleEmitter,
  view: Phaser.Geom.Rectangle,
): void {
  emitter.setPosition(view.x - AMBIENT_MARGIN, view.y - AMBIENT_MARGIN);
}
