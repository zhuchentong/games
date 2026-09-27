import Phaser from "phaser";
import { blink } from "../systems/Fx";
import { Music } from "../systems/Music";
import { SaveManager } from "../systems/SaveManager";
import { Sfx } from "../systems/Sfx";
import { fadeIn, fadeTo } from "../systems/Transitions";
import { FONT, GAME, type RunStats } from "../types";
import { formatClock } from "../utils/math";
import { TitleScene } from "./TitleScene";

const RANK: Record<string, number> = { S: 3, A: 2, B: 1, C: 0 };

function gradeOf(stats: RunStats): "S" | "A" | "B" | "C" {
  if (!stats.victory) return "C";
  if (stats.hitsTaken === 0 && stats.timeMs < 180000) return "S";
  if (stats.hitsTaken <= 3 || stats.timeMs < 240000) return "A";
  return "B";
}

/** 通关结算：用时/受击/齿轮币 + 评分，写入存档 */
export class ResultScene extends Phaser.Scene {
  static readonly KEY = "Result";

  constructor() {
    super(ResultScene.KEY);
  }

  create(): void {
    Music.play("victory");
    const data = this.scene.settings.data as RunStats | undefined;
    // 调试跳转时使用样例数据
    const stats: RunStats =
      data && typeof data.timeMs === "number"
        ? data
        : {
            characterId: "tiger",
            levelId: 2,
            timeMs: 96000,
            hitsTaken: 4,
            coins: 46,
            victory: true,
          };

    const grade = gradeOf(stats);
    const save = SaveManager.load();
    const newBest = !save.bestGrade || RANK[grade] > RANK[save.bestGrade];
    SaveManager.update((d) => {
      if (newBest) d.bestGrade = grade;
      d.coins += stats.coins;
      if (stats.victory) d.cleared = true;
    });

    this.cameras.main.setBackgroundColor("#101418");
    // 像素化对齐主场景：zoom 2 + 布局对半；scroll 取 -w/4 对准布局区
    this.cameras.main.setZoom(GAME.zoom);
    this.cameras.main.setScroll(-GAME.width / 4, -GAME.height / 4);
    if (stats.victory) Sfx.victory();
    fadeIn(this);

    this.add.rectangle(GAME.width / 4, 125, 260, 165, 0x1d2b3a).setStrokeStyle(2, 0xffd23e);

    this.add
      .text(GAME.width / 4, 60, `第${stats.levelId ?? 1}关 · 通关结算`, {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#ffe08a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME.width / 4, 92, grade, {
        fontFamily: FONT,
        fontSize: "36px",
        color: grade === "S" ? "#ffd23e" : "#8fdcb5",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    if (newBest) {
      this.add
        .text(GAME.width / 4 + 46, 82, "新纪录!", {
          fontFamily: FONT,
          fontSize: "11px",
          color: "#ff6b5e",
        })
        .setOrigin(0.5);
    }

    this.add
      .text(
        GAME.width / 4,
        142,
        `用时　${formatClock(stats.timeMs)}\n受击　${stats.hitsTaken} 次\n齿轮币　+${stats.coins}`,
        {
          fontFamily: FONT,
          fontSize: "13px",
          color: "#c8d2e0",
          align: "center",
          lineSpacing: 7,
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME.width / 4, 180, `累计齿轮币 ${SaveManager.load().coins}`, {
        fontFamily: FONT,
        fontSize: "11px",
        color: "#d7a94f",
      })
      .setOrigin(0.5);

    const back = this.add
      .text(GAME.width / 4, 200, "按 回车 返回标题", {
        fontFamily: FONT,
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    blink(this, back, { alpha: 0.2 });

    const toTitle = (): void => {
      fadeTo(this, TitleScene.KEY);
    };
    const kb = this.input.keyboard;
    if (kb) {
      kb.once("keydown-ENTER", toTitle);
      kb.once("keydown-SPACE", toTitle);
    }
    if (this.game.registry.get("debugAuto") === true) {
      this.time.delayedCall(900, toTitle);
    }
  }
}
