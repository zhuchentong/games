import Phaser from "phaser";
import { blink } from "../systems/Fx";
import { Music } from "../systems/Music";
import { SaveManager } from "../systems/SaveManager";
import { fadeIn, fadeTo } from "../systems/Transitions";
import { FONT, GAME } from "../types";
import { CharacterSelectScene } from "./CharacterSelectScene";

export class TitleScene extends Phaser.Scene {
  static readonly KEY = "Title";

  constructor() {
    super(TitleScene.KEY);
  }

  create(): void {
    const save = SaveManager.load();
    Music.play("title");

    this.cameras.main.setBackgroundColor("#16241f");
    // 像素化对齐主场景：zoom 2 + 布局按 960×540 对半折算（中文小字号不低于 11px 保证可读）
    // zoom 视图中心 = scroll+画布半宽，故 scroll 取 -width/4 才能让视图对准 [0,w/2]×[0,h/2] 布局区
    this.cameras.main.setZoom(GAME.zoom);
    this.cameras.main.setScroll(-GAME.width / 4, -GAME.height / 4);

    // 远山与树林剪影
    this.add.rectangle(0, GAME.height / 2 - 30, GAME.width / 2, 30, 0x1c2b1a).setOrigin(0);
    for (let i = 0; i < 8; i++) {
      const x = 20 + i * 65;
      this.add.triangle(x, GAME.height / 2 - 30, 0, 0, 35, -55, 70, 0).setFillStyle(0x233a22);
    }
    this.add.rectangle(0, GAME.height / 2 - 12, GAME.width / 2, 12, 0x5d4030).setOrigin(0);
    this.add.rectangle(0, GAME.height / 2 - 15, GAME.width / 2, 3, 0x3f7a3a).setOrigin(0);

    const title = this.add
      .text(GAME.width / 4, 75, "动物斗恶龙", {
        fontFamily: FONT,
        fontSize: "32px",
        color: "#ffe08a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: title,
      y: 79,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    this.add
      .text(GAME.width / 4, 110, "—— 森林 · 断桥 · 锯木厂 · 机龙巢径 ——", {
        fontFamily: FONT,
        fontSize: "12px",
        color: "#8fdcb5",
      })
      .setOrigin(0.5);

    const record: string[] = [];
    if (save.cleared) record.push("已通关 ✓");
    if (save.bestGrade) record.push(`最佳评分 ${save.bestGrade}`);
    if (save.coins > 0) record.push(`齿轮币 ${save.coins}`);
    if (record.length > 0) {
      this.add
        .text(GAME.width / 4, 131, record.join("　｜　"), {
          fontFamily: FONT,
          fontSize: "12px",
          color: "#d7a94f",
        })
        .setOrigin(0.5);
    }

    const press = this.add
      .text(GAME.width / 4, 180, "按 回车 或 空格 开始", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    blink(this, press);

    this.add
      .text(GAME.width / 4, 215, "←→ 选择动物　J 普通攻击　K 技能", {
        fontFamily: FONT,
        fontSize: "11px",
        color: "#6f7a6d",
      })
      .setOrigin(0.5);

    this.startOnConfirm();
    if (this.game.registry.get("debugAuto") === true) {
      this.time.delayedCall(800, () => this.toSelect());
    }
    fadeIn(this);
  }

  private startOnConfirm(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    const enter = kb.addKey("ENTER");
    const space = kb.addKey("SPACE");
    const tryStart = (): void => {
      if (Phaser.Input.Keyboard.JustDown(enter) || Phaser.Input.Keyboard.JustDown(space)) {
        this.toSelect();
      }
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, tryStart);
    // 场景重启（stop→start）不会自动清 UPDATE 监听，随 shutdown 显式移除防跨次累积
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, tryStart);
    });
  }

  private toSelect(): void {
    fadeTo(this, CharacterSelectScene.KEY);
  }
}
