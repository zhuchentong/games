import Phaser from "phaser";
import type { BossDialogueLine } from "../data/boss";
import type { CharacterId } from "../types";
import { FONT, GAME } from "../types";

/** 已解析的一行对话（按角色选定声线后的纯展示数据） */
interface ResolvedLine {
  who: "boss" | "player";
  name: string;
  text: string;
}

/** 打字机速度（ms/字） */
const CHAR_MS = 28;
const PANEL_H = 74;

/**
 * Boss 入场对话面板（UIScene 图层，zoom 1 清晰渲染）：底部暗幕信息条 + 说话人名 + 打字机正文。
 * 只管显示与推进节奏（advance 返回 false = 播毕）；物理暂停、Boss 待命/放行等流程由关卡场景驱动。
 */
export class DialogueBox {
  private readonly container: Phaser.GameObjects.Container;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;
  private lines: ResolvedLine[] = [];
  private index = 0;
  /** 当前行已显示字符数（浮点累积，打字机） */
  private revealed = 0;
  private lastShown = -1;
  private activeFlag = false;

  constructor(scene: Phaser.Scene) {
    const w = GAME.width;
    const top = GAME.height - PANEL_H;
    this.container = scene.add.container(0, 0).setVisible(false).setDepth(30);

    this.container.add(scene.add.rectangle(w / 2, top + PANEL_H / 2, w, PANEL_H, 0x05070a, 0.82));
    this.container.add(scene.add.rectangle(w / 2, top, w, 2, 0xffd23e, 0.85));

    this.nameText = scene.add
      .text(24, top + 18, "", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#ffe08a",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    this.bodyText = scene.add.text(24, top + 32, "", {
      fontFamily: FONT,
      fontSize: "13px",
      color: "#e8edf5",
      wordWrap: { width: w - 250, useAdvancedWrap: true },
      lineSpacing: 4,
    });
    this.container.add([this.nameText, this.bodyText]);

    this.container.add(
      scene.add
        .text(w - 20, top + PANEL_H - 12, "E/J/空格 继续 · Q/ESC 跳过", {
          fontFamily: FONT,
          fontSize: "11px",
          color: "#8a93a5",
        })
        .setOrigin(1, 1),
    );
  }

  /** 是否正在播放对话（E2E 经 UIScene.dialogueActive 断言） */
  get active(): boolean {
    return this.activeFlag;
  }

  /** 开始播放：script 为 Boss 配置原文，在此按角色选定玩家声线 */
  start(
    script: BossDialogueLine[],
    opts: { bossName: string; playerName: string; charId: CharacterId },
  ): void {
    this.lines = script.map((line) =>
      line.who === "boss"
        ? { who: "boss", name: opts.bossName, text: line.text }
        : { who: "player", name: opts.playerName, text: line.lines[opts.charId] },
    );
    this.index = 0;
    this.revealed = 0;
    this.lastShown = -1;
    this.activeFlag = true;
    this.container.setVisible(true);
    this.renderName();
    this.renderBody();
  }

  /** 推进：打字中 → 整行显出；已显完 → 下一行；末行 → 播毕收面板。返回是否仍在进行 */
  advance(): boolean {
    if (!this.activeFlag) return false;
    const full = this.lines[this.index].text.length;
    if (this.revealed < full) {
      this.revealed = full;
      this.renderBody();
      return true;
    }
    if (this.index < this.lines.length - 1) {
      this.index += 1;
      this.revealed = 0;
      this.lastShown = -1;
      this.renderName();
      this.renderBody();
      return true;
    }
    this.hide();
    return false;
  }

  /** 直接收面板（跳过/场景收尾共用） */
  hide(): void {
    this.activeFlag = false;
    this.lines = [];
    this.index = 0;
    this.revealed = 0;
    this.container.setVisible(false);
  }

  /** UIScene.update 每帧驱动打字机 */
  update(delta: number): void {
    if (!this.activeFlag) return;
    const target = this.lines[this.index].text.length;
    if (this.revealed >= target) return;
    this.revealed = Math.min(target, this.revealed + delta / CHAR_MS);
    this.renderBody();
  }

  private renderName(): void {
    const line = this.lines[this.index];
    this.nameText.setText(line.name).setColor(line.who === "boss" ? "#ff8a80" : "#ffe08a");
  }

  private renderBody(): void {
    const shown = Math.floor(this.revealed);
    if (shown === this.lastShown) return;
    this.lastShown = shown;
    this.bodyText.setText(this.lines[this.index].text.slice(0, shown));
  }
}
