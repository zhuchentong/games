/** 结局场景：宠物离家出走后的告别与重开入口。 */

import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";
import { sfxRunaway, startBgm, stopBgm } from "../audio";
import { TEX } from "../textures";
import { gameText, makeButton } from "./widgets";

export interface EndData {
  days: number;
  finalName: string;
}

export class EndScene extends Phaser.Scene {
  constructor() {
    super("end");
  }

  create(data: EndData): void {
    const days = Math.max(0, Math.floor(data?.days ?? 0));
    const finalName = data?.finalName ?? "小家伙";

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x141829);

    // 飘落的泪滴
    this.add.particles(0, 0, TEX.sweat, {
      x: { min: 60, max: GAME_WIDTH - 60 },
      y: -20,
      speedY: { min: 40, max: 90 },
      lifespan: 5200,
      scale: { start: 1.4, end: 0.6 },
      alpha: { start: 0.5, end: 0 },
      frequency: 700,
    });

    gameText(this, GAME_WIDTH / 2, 168, "离家出走了……", 44, "#ff9f9f", {
      stroke: "#3a2030",
      strokeThickness: 9,
    });
    gameText(this, GAME_WIDTH / 2, 238, `${finalName} 背上小包袱，头也不回地走了`, 20, "#c8d6e5");
    gameText(this, GAME_WIDTH / 2, 282, `你们一起度过了 ${days} 天`, 22, "#fdf3e0");
    gameText(this, GAME_WIDTH / 2, 346, "记得按时喂食、清理房间、陪它玩耍。", 17, "#77848f");
    gameText(this, GAME_WIDTH / 2, 376, "照顾得越好，它就会进化得越耀眼。", 17, "#77848f");

    makeButton(this, GAME_WIDTH / 2, 470, { label: "再养一只", onClick: () => this.go("hatch") });
    makeButton(this, GAME_WIDTH / 2, 540, { label: "回到标题", onClick: () => this.go("title") });

    sfxRunaway();
    this.events.once("shutdown", () => stopBgm());
    startBgm();
  }

  private go(key: string): void {
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(key));
  }
}
