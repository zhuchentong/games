import Phaser from "phaser";
import { CHARACTERS } from "../data/characters";
import { Music } from "../systems/Music";
import { SaveManager } from "../systems/SaveManager";
import { fadeIn, fadeTo } from "../systems/Transitions";
import { CHARACTER_IDS, FONT, GAME, type CharacterId } from "../types";
import { sceneKeyForLevel } from "./levelKeys";

// zoom 2 半分辨率布局：5 卡片 88×124 + 6 间距 = 464，可视宽 480 留 8 边距；
// 属性行 HP/速 与 跳 拆两行（一行三值 ~98px 超出 88 卡宽，相邻卡文字会互相叠压）
const CARD_W = 88;
const CARD_H = 124;
const CARD_TOP = 52;
const CARD_GAP = 6;

export class CharacterSelectScene extends Phaser.Scene {
  static readonly KEY = "Select";

  private index = 0;
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private detail!: Phaser.GameObjects.Text;

  constructor() {
    super(CharacterSelectScene.KEY);
  }

  create(): void {
    this.cards = [];
    const save = SaveManager.load();
    this.index = Math.max(0, CHARACTER_IDS.indexOf(save.lastCharacter ?? "tiger"));
    Music.play("title");

    this.cameras.main.setBackgroundColor("#14202c");
    // 像素化对齐主场景：zoom 2 + 布局对半（中文小字号不低于 10px）；scroll 取 -w/4 对准布局区
    this.cameras.main.setZoom(GAME.zoom);
    this.cameras.main.setScroll(-GAME.width / 4, -GAME.height / 4);

    this.add
      .text(GAME.width / 4, 24, "选择你的动物", {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#ffe08a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const startX = (GAME.width / 2 - (CARD_W * 5 + CARD_GAP * 4)) / 2;
    CHARACTER_IDS.forEach((id, i) => {
      this.makeCard(id, startX + i * (CARD_W + CARD_GAP));
    });

    // 技能/被动描述：必须 origin(0.5,0) 居中——默认左上原点会从中线起排，长句溢出画布右缘
    this.detail = this.add.text(GAME.width / 4, 190, "", {
      fontFamily: FONT,
      fontSize: "12px",
      color: "#c8d2e0",
      align: "center",
      lineSpacing: 3,
    });
    this.detail.setOrigin(0.5, 0);

    this.refresh();

    const kb = this.input.keyboard;
    if (kb) {
      kb.on("keydown-LEFT", () => this.move(-1));
      kb.on("keydown-A", () => this.move(-1));
      kb.on("keydown-RIGHT", () => this.move(1));
      kb.on("keydown-D", () => this.move(1));
      kb.on("keydown-ENTER", () => this.confirm());
      kb.on("keydown-SPACE", () => this.confirm());
    }

    if (this.game.registry.get("debugAuto") === true) {
      this.time.delayedCall(900, () => this.confirm());
    }
    fadeIn(this);
  }

  private makeCard(id: CharacterId, left: number): void {
    const c = CHARACTERS[id];
    const cx = left + CARD_W / 2;
    const bg = this.add
      .rectangle(cx, CARD_TOP + CARD_H / 2, CARD_W, CARD_H, 0x1d2b3a)
      .setStrokeStyle(2, 0x3a4556);

    this.add.image(cx, CARD_TOP + 29, c.texture).setScale(1.5);
    this.add
      .text(cx, CARD_TOP + 56, c.name, {
        fontFamily: FONT,
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(cx, CARD_TOP + 70, `定位 · ${c.role}`, {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#8fdcb5",
      })
      .setOrigin(0.5);
    this.add
      .text(cx, CARD_TOP + 85, `HP${c.hp} 速${c.speed}`, {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#8a93a5",
      })
      .setOrigin(0.5);
    this.add
      .text(cx, CARD_TOP + 97, `跳${c.jumpVelocity}`, {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#8a93a5",
      })
      .setOrigin(0.5);
    this.add
      .text(cx, CARD_TOP + 112, `技 · ${c.skill.name}`, {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#ffd23e",
      })
      .setOrigin(0.5);

    this.cards.push(bg);
  }

  private move(dir: number): void {
    const next = (this.index + dir + CHARACTER_IDS.length) % CHARACTER_IDS.length;
    if (next === this.index) return;
    this.index = next;
    this.refresh();
  }

  private refresh(): void {
    this.cards.forEach((card, i) => {
      const active = i === this.index;
      card.setStrokeStyle(3, active ? 0xffd23e : 0x3a4556);
      card.setFillStyle(active ? 0x27394e : 0x1d2b3a);
    });
    const c = CHARACTERS[CHARACTER_IDS[this.index]];
    this.detail.setText(
      `【${c.skill.name}】${c.skill.desc}\n【被动 · ${c.passiveName}】${c.passiveDesc}`,
    );
  }

  private confirm(): void {
    const id = CHARACTER_IDS[this.index];
    SaveManager.update((d) => {
      d.lastCharacter = id;
    });
    // 续玩：进入存档所在关（拾取前关核心后存档 level 推进）
    const key = sceneKeyForLevel(SaveManager.load().level);
    fadeTo(this, key, { characterId: id });
  }
}
