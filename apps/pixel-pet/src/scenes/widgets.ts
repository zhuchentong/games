/** 场景共用小部件：像素按钮与文本工厂。 */

import type Phaser from "phaser";
import { BTN_H, BTN_W, C } from "../config";
import { sfxClick, unlockAudio } from "../audio";
import { TEX } from "../textures";
import { FONT } from "../util";

export interface BtnSpec {
  label: string;
  icon?: string;
  onClick: () => void;
  scale?: number;
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  spec: BtnSpec,
): Phaser.GameObjects.Container {
  const s = spec.scale ?? 1;
  const c = scene.add.container(x, y).setDepth(120);
  const img = scene.add.image(0, 0, TEX.btn).setScale(s);
  const label = scene.add
    .text(0, spec.icon ? 9 : -1, spec.label, {
      fontFamily: FONT,
      fontSize: spec.icon ? "16px" : "20px",
      color: C.btnText,
    })
    .setOrigin(0.5);
  c.add([img, label]);
  if (spec.icon) {
    c.add([scene.add.image(0, -10, spec.icon).setScale(1.5)]);
  }
  c.setSize(BTN_W * s, BTN_H * s);
  c.setInteractive({ useHandCursor: true });
  c.on(
    "pointerdown",
    (_p: Phaser.Input.Pointer, _x: number, _y: number, event: { stopPropagation: () => void }) => {
      // 阻止冒泡到场景级点击(如标题页"点任意处开始")
      event.stopPropagation();
      unlockAudio();
      sfxClick();
      scene.tweens.add({ targets: c, scale: s * 0.92, duration: 60, yoyo: true });
      spec.onClick();
    },
  );
  return c;
}

export function setBtnEnabled(btn: Phaser.GameObjects.Container, enabled: boolean): void {
  btn.alpha = enabled ? 1 : 0.45;
  if (enabled) {
    btn.setInteractive({ useHandCursor: true });
  } else {
    btn.disableInteractive();
  }
}

export interface TextOpts {
  originX?: number;
  originY?: number;
  stroke?: string;
  strokeThickness?: number;
  depth?: number;
}

export function gameText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color: string,
  opts: TextOpts = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      stroke: opts.stroke,
      strokeThickness: opts.strokeThickness ?? (opts.stroke ? 4 : 0),
    })
    .setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5)
    .setDepth(opts.depth ?? 0);
}
