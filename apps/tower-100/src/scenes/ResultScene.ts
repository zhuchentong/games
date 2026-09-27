/** 结算覆盖层：失败原因 / 通关庆祝，支持快速重开。 */

import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, WIN_FLOOR } from "../config";
import { TEX } from "../textures";
import { FONT } from "../util";

interface ResultData {
  win: boolean;
  floor: number;
  reason: "fall" | "spike" | "knife";
  isNewBest: boolean;
}

const REASON_TEXT: Record<ResultData["reason"], string> = {
  fall: "体力不支，坠落了……",
  spike: "踩到了钉板！",
  knife: "被飞刀击中了……",
};

export class ResultScene extends Phaser.Scene {
  private resultData: ResultData = { win: false, floor: 0, reason: "fall", isNewBest: false };
  private finished = false;

  constructor() {
    super("result");
  }

  init(data: ResultData): void {
    this.resultData = {
      win: Boolean(data?.win),
      floor: Number(data?.floor ?? 0),
      reason: data?.reason ?? "fall",
      isNewBest: Boolean(data?.isNewBest),
    };
    this.finished = false;
  }

  create(): void {
    const { win, floor, isNewBest } = this.resultData;

    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.62)
      .setDepth(0);

    const title = win ? "恭喜通关！" : "游戏结束";
    this.add
      .text(GAME_WIDTH / 2, 190, title, {
        fontFamily: FONT,
        fontSize: "52px",
        color: win ? "#f9ca24" : "#ff6b6b",
        stroke: "#2f3640",
        strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setDepth(1);

    const sub = win
      ? `成功登顶 ${WIN_FLOOR} 层，你是真·男人！`
      : REASON_TEXT[this.resultData.reason];
    this.add
      .text(GAME_WIDTH / 2, 256, sub, {
        fontFamily: FONT,
        fontSize: "22px",
        color: "#f5f6fa",
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.add
      .text(GAME_WIDTH / 2, 320, `到达：第 ${floor} 层`, {
        fontFamily: FONT,
        fontSize: "30px",
        color: "#9dd6ff",
        stroke: "#1b3a55",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(1);

    if (isNewBest && floor > 0) {
      const badge = this.add
        .text(GAME_WIDTH / 2, 372, "★ 新纪录 ★", {
          fontFamily: FONT,
          fontSize: "24px",
          color: "#2ed573",
          stroke: "#103d20",
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(1);
      this.tweens.add({ targets: badge, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
    }

    if (win) {
      this.add
        .particles(0, -20, TEX.star, {
          x: { min: 0, max: GAME_WIDTH },
          speedY: { min: 90, max: 200 },
          speedX: { min: -40, max: 40 },
          lifespan: 2600,
          scale: { start: 1.4, end: 0.3 },
          rotate: { min: 0, max: 360 },
          frequency: 90,
        })
        .setDepth(2);
    }

    const hint = this.add
      .text(GAME_WIDTH / 2, 470, "空格 / 点击  再来一次", {
        fontFamily: FONT,
        fontSize: "26px",
        color: "#ffffff",
        stroke: "#2f3640",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(1);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 550, yoyo: true, repeat: -1 });

    this.add
      .text(GAME_WIDTH / 2, 520, "按 T 返回标题", {
        fontFamily: FONT,
        fontSize: "17px",
        color: "#c8d6e5",
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.input.keyboard?.on("keydown-SPACE", () => this.restart());
    this.input.keyboard?.on("keydown-T", () => this.toTitle());
    this.input.on("pointerdown", () => this.restart());
  }

  private restart(): void {
    if (this.finished) return;
    this.finished = true;
    this.scene.stop("game");
    this.scene.start("game");
  }

  private toTitle(): void {
    if (this.finished) return;
    this.finished = true;
    this.scene.stop("game");
    this.scene.start("title");
  }
}
