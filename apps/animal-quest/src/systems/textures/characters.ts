import type Phaser from "phaser";
import { CHARACTER_IDS, type CharacterId } from "../../types";
import { OUTLINE, type MakeTexture } from "./shared";

export type CharKind = "idle" | "run" | "atk" | "jump" | "fall";

export interface CharFrame {
  kind: CharKind;
  f: number;
}

/** 身体垂直起伏：跑步 1px、待机呼吸 1px、下落 1px，攻击/上升 0 */
function bodyDy(fr: CharFrame): number {
  if (fr.kind === "run") return fr.f % 2 === 1 ? 1 : 0;
  if (fr.kind === "idle") return fr.f;
  if (fr.kind === "fall") return 1;
  return 0;
}

/** 跑步步幅：前后肢交替 ±2px */
function stride(fr: CharFrame): number {
  return fr.kind === "run" ? [2, 0, -2, 0][fr.f] : 0;
}

/** 攻击挥砍弧线（白色主弧 + 金色前缘 + 内侧残影，随帧自后向前扫过）；非攻击帧不画 */
function slash(g: Phaser.GameObjects.Graphics, fr: CharFrame): void {
  if (fr.kind !== "atk") return;
  const start = -1.2 + (fr.f / 3) * 1.5;
  const end = start + 1.1;
  g.lineStyle(4, 0xffffff, 0.95);
  g.beginPath();
  g.arc(12.5, 15, 13, start, end);
  g.strokePath();
  g.lineStyle(2, 0xffd23e, 0.9);
  g.beginPath();
  g.arc(12.5, 15, 13, end - 0.5, end);
  g.strokePath();
  g.lineStyle(2, 0xffffff, 0.35);
  g.beginPath();
  g.arc(12.5, 15, 9.5, start + 0.15, end - 0.15);
  g.strokePath();
}

function legsStride(
  g: Phaser.GameObjects.Graphics,
  dy: number,
  st: number,
  color: number,
  legs: Array<[number, number, number, number]>,
): void {
  g.fillStyle(color, 1);
  legs.forEach(([x, y, w, h], i) => {
    const off = i % 2 === 0 ? st : -st;
    const lift = st !== 0 && off !== 0 ? 1 : 0;
    g.fillRect(x + off, y + dy - lift, w, h + lift);
  });
}

function drawBase(g: Phaser.GameObjects.Graphics, body: number, dy: number): void {
  g.fillStyle(OUTLINE, 1);
  g.fillRoundedRect(3, 9 + dy, 22, 24, 5);
  g.fillStyle(body, 1);
  g.fillRoundedRect(4, 10 + dy, 20, 22, 4);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(11, 19 + dy, 3);
  g.fillCircle(19, 19 + dy, 3);
  g.fillStyle(0x111111, 1);
  g.fillCircle(12, 19 + dy, 1.4);
  g.fillCircle(20, 19 + dy, 1.4);
}

const CHAR_DRAWERS: Record<CharacterId, (g: Phaser.GameObjects.Graphics, fr: CharFrame) => void> = {
  tiger: (g, fr) => {
    const dy = bodyDy(fr);
    g.fillStyle(OUTLINE, 1);
    g.fillTriangle(5, 12 + dy, 9, 2 + dy, 13, 11 + dy);
    g.fillTriangle(15, 11 + dy, 19, 2 + dy, 23, 12 + dy);
    drawBase(g, 0xe8863a, dy);
    g.fillStyle(0x2f2008, 1);
    if (fr.kind === "atk") {
      // 前扑收腿
      g.fillRect(8, 24 + dy, 3, 7);
      g.fillRect(20, 24 + dy, 3, 7);
    } else if (fr.kind === "jump") {
      // 腾空收腿
      g.fillRect(9, 22 + dy, 3, 6);
      g.fillRect(18, 23 + dy, 3, 6);
    } else if (fr.kind === "fall") {
      // 下落伸腿
      g.fillRect(8, 25 + dy, 3, 9);
      g.fillRect(20, 25 + dy, 3, 9);
    } else {
      legsStride(g, dy, stride(fr), 0x2f2008, [
        [8, 24, 3, 8],
        [14, 26, 3, 6],
        [20, 24, 3, 8],
      ]);
    }
    slash(g, fr);
  },
  wolf: (g, fr) => {
    const dy = bodyDy(fr);
    g.fillStyle(OUTLINE, 1);
    g.fillTriangle(5, 12 + dy, 9, 1 + dy, 13, 11 + dy);
    g.fillTriangle(15, 11 + dy, 19, 1 + dy, 23, 12 + dy);
    drawBase(g, 0x9aa3b2, dy);
    // 尾巴（跑动时上扬）
    g.fillStyle(0xc9d1dc, 1);
    g.fillRoundedRect(20, 22 + dy + (fr.kind === "run" ? -2 : 0), 7, 5, 2);
    g.fillStyle(0x2b2f38, 1);
    if (fr.kind === "jump") {
      g.fillRect(8, 23 + dy, 4, 5);
    } else if (fr.kind === "fall") {
      g.fillRect(6, 27 + dy, 4, 7);
    } else {
      legsStride(g, dy, stride(fr), 0x2b2f38, [[6, 26, 4, 6]]);
    }
    slash(g, fr);
  },
  frog: (g, fr) => {
    // 青蛙无腿：跑动 = 小幅 hop（身体上浮）；跳起拉伸 / 下落压扁
    const dy =
      fr.kind === "run" && fr.f % 2 === 1
        ? -2
        : fr.kind === "jump"
          ? -3
          : fr.kind === "fall"
            ? 2
            : bodyDy(fr);
    g.fillStyle(OUTLINE, 1);
    g.fillCircle(10, 12 + dy, 5);
    g.fillCircle(18, 12 + dy, 5);
    g.fillStyle(0x5cb85c, 1);
    g.fillCircle(10, 12 + dy, 4);
    g.fillCircle(18, 12 + dy, 4);
    drawBase(g, 0x5cb85c, dy);
    g.fillStyle(0x111111, 1);
    g.fillCircle(10, 12 + dy, 1.6);
    g.fillCircle(18, 12 + dy, 1.6);
    slash(g, fr);
  },
  bird: (g, fr) => {
    const dy = bodyDy(fr);
    // 翅膀：跑动扇动 / 上升高举 / 下落微垂 / 攻击抬起
    const flap =
      fr.kind === "run"
        ? [0, -3, 0, -1][fr.f]
        : fr.kind === "jump"
          ? -4
          : fr.kind === "fall"
            ? 1
            : fr.kind === "atk"
              ? -2
              : 0;
    g.fillStyle(0xe8933a, 1);
    g.fillTriangle(8, 14 + dy + flap, 12, 8 + dy + flap, 16, 14 + dy + flap);
    g.fillStyle(OUTLINE, 1);
    g.fillRoundedRect(4, 14 + dy, 20, 18, 6);
    g.fillStyle(0x6cc6e8, 1);
    g.fillRoundedRect(5, 15 + dy, 18, 16, 5);
    g.fillStyle(0x8fdcf5, 1);
    g.fillRoundedRect(8, 20 + dy, 10, 7, 3);
    g.fillStyle(0xe8933a, 1);
    g.fillTriangle(23, 19 + dy, 28, 21 + dy, 23, 23 + dy);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(17, 19 + dy, 3);
    g.fillStyle(0x111111, 1);
    g.fillCircle(18, 19 + dy, 1.4);
    slash(g, fr);
  },
  rabbit: (g, fr) => {
    const dy = bodyDy(fr);
    const earDy = fr.kind === "run" && fr.f % 2 === 1 ? 1 : 0;
    g.fillStyle(OUTLINE, 1);
    g.fillRoundedRect(7, earDy, 6, 14, 3);
    g.fillRoundedRect(15, earDy, 6, 14, 3);
    g.fillStyle(0xd78ab0, 1);
    g.fillRoundedRect(8, 1 + earDy, 4, 12, 2);
    g.fillRoundedRect(16, 1 + earDy, 4, 12, 2);
    drawBase(g, 0xd78ab0, dy);
    if (fr.kind === "jump") {
      g.fillStyle(0xf2c4d8, 1);
      g.fillRect(11, 25 + dy, 6, 4);
    } else if (fr.kind === "fall") {
      g.fillStyle(0xf2c4d8, 1);
      g.fillRect(11, 28 + dy, 6, 4);
    } else {
      legsStride(g, dy, stride(fr), 0xf2c4d8, [[11, 27, 6, 4]]);
    }
    slash(g, fr);
  },
};

/** 五角色贴图（28×36）：每角色基础帧（=idle 第 0 帧）+ idle×2 / run×4 / atk×4 / jump / fall */
export function makeCharacterTextures(make: MakeTexture): void {
  CHARACTER_IDS.forEach((id) => {
    const drawer = CHAR_DRAWERS[id];
    make(`char-${id}`, 28, 36, (gg) => drawer(gg, { kind: "idle", f: 0 }));
    for (let f = 0; f < 2; f++)
      make(`char-${id}-idle${f}`, 28, 36, (gg) => drawer(gg, { kind: "idle", f }));
    for (let f = 0; f < 4; f++)
      make(`char-${id}-run${f}`, 28, 36, (gg) => drawer(gg, { kind: "run", f }));
    for (let f = 0; f < 4; f++)
      make(`char-${id}-atk${f}`, 28, 36, (gg) => drawer(gg, { kind: "atk", f }));
    make(`char-${id}-jump`, 28, 36, (gg) => drawer(gg, { kind: "jump", f: 0 }));
    make(`char-${id}-fall`, 28, 36, (gg) => drawer(gg, { kind: "fall", f: 0 }));
  });
}
