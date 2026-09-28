/** 标题页：动画演示 + 开始入口。 */

import Phaser from "phaser";
import { GAME_WIDTH } from "../config";
import { isMuted, sfxStart, toggleMuted, unlockAudio } from "../audio";
import { TEX } from "../textures";
import { FONT, loadBest } from "../util";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }

  create(): void {
    const best = loadBest();

    this.add
      .text(GAME_WIDTH / 2, 130, "是男人", {
        fontFamily: FONT,
        fontSize: "64px",
        color: "#f9ca24",
        stroke: "#2f3640",
        strokeThickness: 10,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 205, "就上 100 层", {
        fontFamily: FONT,
        fontSize: "48px",
        color: "#ffffff",
        stroke: "#2f3640",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    if (best > 0) {
      this.add
        .text(GAME_WIDTH / 2, 262, `历史最高：第 ${best} 层`, {
          fontFamily: FONT,
          fontSize: "20px",
          color: "#9dd6ff",
        })
        .setOrigin(0.5);
    }

    // 演示小人：在平台上方不停弹跳
    const platY = 400;
    this.add.image(GAME_WIDTH / 2, platY, TEX.platNormal).setDisplaySize(150, 22);
    const demo = this.add.sprite(GAME_WIDTH / 2, platY - 40, TEX.hero);
    this.tweens.add({
      targets: demo,
      y: platY - 150,
      duration: 520,
      ease: "Quad.easeOut",
      yoyo: true,
      onYoyo: (t) => {
        t.pause();
        this.time.delayedCall(120, () => t.resume());
      },
      repeat: -1,
    });

    const rules = [
      "← → 或 A D 移动，踩到平台会自动弹跳",
      "弹簧弹得高 · 传送带会推你走",
      "小心：钉板和飞刀都会扣血",
      "易碎的板子只能踩一次",
      "掉落道具：金心扩容 · 弹跳强化 · 护盾 · 时间减缓",
      "屏幕会不断上移，掉出画面即失败",
      "按 M 或点右上角 ♪ 切换音乐",
    ];
    this.add
      .text(GAME_WIDTH / 2, 480, rules, {
        fontFamily: FONT,
        fontSize: "17px",
        color: "#c8d6e5",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    const start = this.add
      .text(GAME_WIDTH / 2, 590, "- 点击或按任意键开始 -", {
        fontFamily: FONT,
        fontSize: "24px",
        color: "#2ed573",
        stroke: "#103d20",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

    // —— 音乐开关（右上角 ♪）——
    const mute = this.add
      .text(GAME_WIDTH - 12, 12, isMuted() ? "♪ 已静音" : "♪ 音乐开", {
        fontFamily: FONT,
        fontSize: "15px",
        color: isMuted() ? "#77848f" : "#f5f6fa",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    mute.on(
      "pointerdown",
      (
        _p: Phaser.Input.Pointer,
        _x: number,
        _y: number,
        event: { stopPropagation: () => void },
      ) => {
        event.stopPropagation();
        unlockAudio();
        const muted = toggleMuted();
        mute.setText(muted ? "♪ 已静音" : "♪ 音乐开");
        mute.setColor(muted ? "#77848f" : "#f5f6fa");
      },
    );

    this.input.keyboard?.on("keydown", (ev: KeyboardEvent) => {
      // M 只切换音乐，不开始游戏
      if (ev.key === "m" || ev.key === "M") return;
      this.startGame();
    });
    this.input.on("pointerdown", () => this.startGame());
  }

  private startGame(): void {
    unlockAudio();
    sfxStart();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("game"));
  }
}
