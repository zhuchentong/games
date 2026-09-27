import type Phaser from "phaser";

/** 生成贴图的绘制回调（在共享 Graphics 上作画，随后由 generateTexture 固化） */
export type Draw = (g: Phaser.GameObjects.Graphics) => void;

/** generateTexture 的薄封装：作画 → 固化为 key → 清空画布（一次 Boot 内全部贴图共用一个 Graphics） */
export type MakeTexture = (key: string, w: number, h: number, draw: Draw) => void;

/** 全项目像素画统一描边色 */
export const OUTLINE = 0x1a1d24;
