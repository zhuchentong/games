/** 标题场景：吉祥物展示 / 继续或开始养育 / 静音开关。 */

import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SPECIES, petTexKey, randomOf } from "../config";
import { isMuted, startBgm, stopBgm, toggleMuted, unlockAudio } from "../audio";
import { TEX } from "../textures";
import { SaveManager } from "../systems/SaveManager";
import { gameText, makeButton, setBtnEnabled } from "./widgets";

export class TitleScene extends Phaser.Scene {
  private mascot: Phaser.GameObjects.Image | null = null;
  private mascotKey = "";
  private frameTimer = 0;
  private frame = 0;
  private resetBtn: Phaser.GameObjects.Container | null = null;
  private resetArmed = false;

  constructor() {
    super("title");
  }

  create(): void {
    this.mascot = null;
    this.resetBtn = null;
    this.resetArmed = false;

    // 背景装饰：飘浮的星星与爱心
    this.add.particles(0, 0, TEX.sparkle, {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: GAME_HEIGHT * 0.55, max: GAME_HEIGHT },
      speedY: { min: -40, max: -14 },
      lifespan: 3600,
      scale: { start: 1.2, end: 0.2 },
      alpha: { start: 0.9, end: 0 },
      frequency: 420,
    });
    this.add.particles(0, 0, TEX.heart, {
      x: { min: 40, max: GAME_WIDTH - 40 },
      y: GAME_HEIGHT + 20,
      speedY: { min: -34, max: -16 },
      lifespan: 4200,
      scale: { start: 1, end: 0.4 },
      alpha: { start: 0.7, end: 0 },
      frequency: 900,
    });

    // 吉祥物（随机一只幼年宠物）
    const species = randomOf(SPECIES);
    const variant = Math.random() < 0.5 ? 0 : 1;
    this.frame = 0;
    this.mascotKey = petTexKey(species.id, "s1", variant, 0);
    this.mascot = this.add.image(GAME_WIDTH / 2, 348, this.mascotKey).setScale(4);
    this.tweens.add({
      targets: this.mascot,
      y: 336,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    gameText(this, GAME_WIDTH / 2, 132, "像素电子宠物", 56, "#ffe9a8", {
      stroke: "#5b3a21",
      strokeThickness: 10,
      depth: 10,
    });
    gameText(this, GAME_WIDTH / 2, 186, "喂食 · 玩耍 · 清洁 · 睡觉", 22, "#fdf3e0", {
      depth: 10,
    });
    gameText(this, GAME_WIDTH / 2, 216, "喂它·陪它·看它长大", 18, "#c8d6e5", { depth: 10 });

    const hasSave = SaveManager.load() !== null;
    if (hasSave) {
      makeButton(this, GAME_WIDTH / 2, 452, { label: "继续养育", onClick: () => this.go("game") });
      this.resetBtn = makeButton(this, GAME_WIDTH / 2, 522, {
        label: "重新孵化",
        onClick: () => this.onReset(),
      });
      makeButton(this, GAME_WIDTH / 2, 592, {
        label: "图鉴与记录",
        onClick: () => this.go("dex"),
      });
    } else {
      makeButton(this, GAME_WIDTH / 2, 476, { label: "开始养成", onClick: () => this.go("hatch") });
      makeButton(this, GAME_WIDTH / 2, 546, {
        label: "图鉴与记录",
        onClick: () => this.go("dex"),
      });
    }

    const mute = gameText(
      this,
      GAME_WIDTH - 16,
      16,
      isMuted() ? "♪ 已静音" : "♪ 音乐开",
      15,
      isMuted() ? "#77848f" : "#fdf3e0",
      {
        originX: 1,
        originY: 0,
        depth: 10,
      },
    );
    mute.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      unlockAudio();
      toggleMuted();
      mute.setText(isMuted() ? "♪ 已静音" : "♪ 音乐开");
      mute.setColor(isMuted() ? "#77848f" : "#fdf3e0");
    });

    gameText(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 22,
      "猫狗兔鸡随机 4 选 1 · 照顾得越好长得越神气",
      14,
      "#77848f",
      {
        depth: 10,
      },
    );

    this.events.once("shutdown", () => stopBgm());
    startBgm();
  }

  private go(key: string): void {
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(key));
  }

  private onReset(): void {
    if (!this.resetArmed) {
      this.resetArmed = true;
      if (this.resetBtn) {
        setBtnEnabled(this.resetBtn, true);
        const label = this.resetBtn.list[1] as Phaser.GameObjects.Text;
        label.setText("再点一次");
        label.setColor("#d63031");
      }
      return;
    }
    SaveManager.clearPet();
    this.go("hatch");
  }

  update(_time: number, delta: number): void {
    this.frameTimer += delta;
    if (this.frameTimer >= 520) {
      this.frameTimer = 0;
      this.frame = 1 - this.frame;
      if (this.mascot) {
        // mascotKey 形如 pet-<species>-baby-<v>-<f>，仅替换末尾帧号
        this.mascot.setTexture(`${this.mascotKey.slice(0, -1)}${this.frame}`);
      }
    }
  }
}
