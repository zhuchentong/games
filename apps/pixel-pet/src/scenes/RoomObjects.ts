/** 房间可交互物件：窗户昼夜 / 架子木球 / 盆栽开花。视觉与物理在此，宠物联动与奖励走钩子。 */

import Phaser from "phaser";
import { ROOM_Y } from "../config";
import { sfxClick, sfxHatchPop, sfxPlop } from "../audio";
import { TEX } from "../textures";
import { clamp, randRange } from "../util";

export type WeatherKind = "clear" | "rain" | "snow";

export interface RoomHooks {
  /** 木球只有在这时才能点落（非睡觉/演出/弹窗） */
  canInteract(): boolean;
  tip(msg: string): void;
  burst(texture: string, x: number, y: number, count: number): void;
  /** 点击房间地板：宠物走过去 */
  onFloorTap(worldX: number): void;
  /** 球落地弹开 → 宠物来追 */
  onBallLanded(): void;
  /** 球被拱够滚回架子 → 庆祝 */
  onBallReturned(): void;
  /** 盆栽开花 → 加心情 */
  onPlantBloomed(): void;
}

export class RoomObjects {
  private scene: Phaser.Scene;
  private hooks: RoomHooks;
  private windowImg: Phaser.GameObjects.Image;
  private ballImg: Phaser.GameObjects.Image;
  private plantImg: Phaser.GameObjects.Image;
  private artImg: Phaser.GameObjects.Image | null = null;
  private bedImg: Phaser.GameObjects.Image | null = null;
  private weather: WeatherKind = "clear";
  private weatherImg: Phaser.GameObjects.Image | null = null;
  private isNight = false;
  private plantTaps = 0;
  private plantBloomed = false;
  private ballState: "shelf" | "dropping" | "floor" | "returning" = "shelf";
  private ballNudges = 0;
  private readonly ballFloorY = ROOM_Y + 430;
  private readonly ballShelfX = 342;
  private readonly ballShelfY = ROOM_Y + 125;

  constructor(scene: Phaser.Scene, hooks: RoomHooks) {
    this.scene = scene;
    this.hooks = hooks;
    const room = scene.add.image(0, ROOM_Y, TEX.room).setOrigin(0, 0).setDepth(0);
    room.setInteractive();
    room.on("pointerdown", (p: Phaser.Input.Pointer) => this.hooks.onFloorTap(p.worldX));

    this.windowImg = scene.add
      .image(46, ROOM_Y + 42, TEX.windowDay)
      .setOrigin(0, 0)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });
    this.windowImg.on("pointerdown", () => this.setNight(!this.isNight));

    this.ballImg = scene.add
      .image(this.ballShelfX, this.ballShelfY, TEX.ball)
      .setOrigin(0.5, 0.5)
      .setScale(2)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    this.ballImg.on("pointerdown", () => this.tapBall());

    this.plantImg = scene.add
      .image(386, ROOM_Y + 132, TEX.plant)
      .setOrigin(0.5, 1)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });
    this.plantImg.on("pointerdown", () => this.tapPlant());
  }

  /** 球在地板上、可以追拱 */
  ballOnFloor(): boolean {
    return this.ballState === "floor";
  }

  /** 摆放已购装饰(重复调用安全),档案拥有项进房间 */
  placeDecor(owned: string[]): void {
    if (owned.includes("art") && !this.artImg) {
      this.artImg = this.scene.add.image(262, ROOM_Y + 120, TEX.decorArt).setDepth(1);
    }
    if (owned.includes("bed") && !this.bedImg) {
      this.bedImg = this.scene.add.image(54, ROOM_Y + 452, TEX.decorBed).setDepth(2);
    }
  }

  ballX(): number {
    return this.ballImg.x;
  }

  ballY(): number {
    return this.ballFloorY;
  }

  setNight(night: boolean): void {
    if (this.isNight === night) return;
    this.isNight = night;
    this.windowImg.setTexture(night ? TEX.windowNight : TEX.windowDay);
    sfxClick();
    if (night) this.hooks.burst(TEX.sparkle, 132, ROOM_Y + 80, 4);
  }

  /** 窗内天气:雨为抖动雨丝,雪为轻摆雪点;clear 清除覆盖层 */
  setWeather(w: WeatherKind): void {
    if (this.weather === w) return;
    this.weather = w;
    if (this.weatherImg) {
      this.weatherImg.destroy();
      this.weatherImg = null;
    }
    if (w === "clear") return;
    this.weatherImg = this.scene.add
      .image(46, ROOM_Y + 42, w === "rain" ? TEX.weatherRain : TEX.weatherSnow)
      .setOrigin(0, 0)
      .setDepth(2);
    if (w === "rain") {
      this.scene.tweens.add({
        targets: this.weatherImg,
        alpha: { from: 1, to: 0.5 },
        duration: 420,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.scene.tweens.add({
        targets: this.weatherImg,
        y: ROOM_Y + 47,
        duration: 1700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  /** 宠物拱球：返回 "gone"=球不在了, "more"=球被拱走继续追, "done"=玩够滚回家 */
  nudge(walkDir: number): "gone" | "more" | "done" {
    if (this.ballState !== "floor") return "gone";
    this.ballNudges++;
    if (this.ballNudges >= 2) {
      this.ballState = "returning";
      this.scene.tweens.add({
        targets: this.ballImg,
        x: this.ballShelfX,
        y: this.ballShelfY,
        angle: 360,
        duration: 620,
        ease: "Quad.easeInOut",
        onComplete: () => {
          this.ballImg.setAngle(0);
          this.ballState = "shelf";
          this.hooks.onBallReturned();
        },
      });
      return "done";
    }
    // 球被拱走一段，宠物继续追
    const nx = clamp(this.ballImg.x + walkDir * randRange(46, 76), 120, 380);
    this.scene.tweens.add({
      targets: this.ballImg,
      x: nx,
      duration: 380,
      ease: "Quad.easeOut",
    });
    return "more";
  }

  private tapBall(): void {
    if (this.ballState !== "shelf" || !this.hooks.canInteract()) return;
    this.ballState = "dropping";
    sfxPlop();
    const rollX = randRange(160, 330);
    this.scene.tweens.add({
      targets: this.ballImg,
      y: this.ballFloorY,
      duration: 420,
      ease: "Bounce.easeOut",
      onComplete: () => {
        this.ballState = "floor";
        this.ballNudges = 0;
        this.scene.tweens.add({
          targets: this.ballImg,
          x: rollX,
          duration: 500,
          ease: "Quad.easeOut",
        });
        this.hooks.onBallLanded();
      },
    });
  }

  private tapPlant(): void {
    sfxClick();
    this.scene.tweens.add({
      targets: this.plantImg,
      angle: { from: -5, to: 5 },
      duration: 70,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.plantImg.setAngle(0),
    });
    if (this.plantBloomed) {
      if (Math.random() < 0.4) this.hooks.tip("花儿开得正好~");
      return;
    }
    this.plantTaps++;
    this.plantImg.setScale(1 + Math.min(4, this.plantTaps) * 0.04);
    if (this.plantTaps >= 5) {
      this.plantBloomed = true;
      this.plantImg.setTexture(TEX.plantBloom);
      sfxHatchPop();
      this.hooks.burst(TEX.sparkle, 386, ROOM_Y + 112, 8);
      this.hooks.tip("盆栽开花啦！小家伙好喜欢");
      this.hooks.onPlantBloomed();
    }
  }
}
