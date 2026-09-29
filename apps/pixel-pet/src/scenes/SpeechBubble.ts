/** 宠物台词气泡：头顶弹出、跟随宠物、到时收起。纯视图，说话时机与台词策略留在 GameScene。 */

import Phaser from "phaser";
import { FLOOR_Y } from "../config";
import { sfxSpeak } from "../audio";
import { TEX } from "../textures";
import { clamp } from "../util";
import { gameText } from "./widgets";

const SHOW_SEC = 2.8;
const X_MIN = 130;
const X_MAX = 350;
const Y = FLOOR_Y - 180;

export class SpeechBubble {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private label: Phaser.GameObjects.Text;
  /** > 0 = 显示中，倒计时后收起 */
  private hideSec = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(240, Y).setDepth(20).setVisible(false);
    const img = scene.add.image(0, 0, TEX.speech);
    this.label = gameText(scene, 0, -6, "", 16, "#5b3a21", { depth: 21 });
    this.container.add([img, this.label]);
  }

  say(line: string, followX: number): void {
    this.scene.tweens.killTweensOf(this.container);
    this.container.setPosition(clamp(followX, X_MIN, X_MAX), Y);
    this.label.setText(line);
    this.container.setVisible(true).setAlpha(1).setScale(0.5);
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 180,
      ease: "Back.easeOut",
    });
    this.hideSec = SHOW_SEC;
    sfxSpeak();
  }

  hide(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(false);
    this.hideSec = 0;
  }

  /** 每帧：倒计时收起 + 跟随宠物横移。返回 true = 空闲中，可以开新话。 */
  update(dt: number, followX: number): boolean {
    if (this.hideSec > 0) {
      this.hideSec -= dt;
      if (this.hideSec <= 0) {
        this.hide();
      } else {
        this.container.x = clamp(followX, X_MIN, X_MAX);
      }
    }
    return this.hideSec <= 0;
  }
}
